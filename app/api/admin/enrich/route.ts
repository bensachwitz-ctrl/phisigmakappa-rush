import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isAdminAuthed } from "@/lib/auth";
import { guardOfficer, guardOfficerOrAdmin } from "@/lib/permissions";
import { getChapterIdentity } from "@/lib/chapter-identity";
import { quickLinks } from "@/lib/enrich";
import { audit } from "@/lib/audit";
import { runEnrichment } from "@/lib/enrichment/provider";
import {
  parseEnvelope,
  serializeEnvelope,
  readConsentState,
  applyConsent,
  applyOptOut,
  applyResult,
} from "@/lib/enrichment/store";
import {
  canEnrich,
  explainGate,
  makeEnrichmentConsent,
  makeEnrichmentOptOut,
  ENRICHMENT_DISCLOSURE_TEXT,
  ENRICHMENT_DISCLOSURE_VERSION,
} from "@/lib/enrichment/consent";
import { summarizeHits, describeHits } from "@/lib/enrichment/protected-class";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IdSchema = z.object({ rushId: z.string().min(1) });

/**
 * POST /api/admin/enrich — RUN a public-source enrichment lookup for one PNM.
 *
 * #44 GUARDRAILS enforced here:
 *   • CONSENT GATE — canEnrich() blocks the lookup unless consent is on file and
 *     the candidate has not opted out (403 with a friendly reason otherwise).
 *   • PROTECTED-CLASS FIREWALL — runEnrichment() redacts race/religion/health/
 *     orientation signals before the result is ever persisted.
 *   • PROVENANCE — the stored result carries source + fetchedAt.
 *   • AUDIT — every lookup is logged (provider + redaction summary), success or
 *     block.
 */
export async function POST(req: Request) {
  if (!isAdminAuthed()) return NextResponse.json({ ok: false }, { status: 401 });
  // Members can't fire enrichment; officers holding rushPipeline:write or admin.
  const denied = await guardOfficer("rushPipeline", "write");
  if (denied) return denied;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = IdSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  const rush = await prisma.rush.findUnique({
    where: { id: parsed.data.rushId },
    select: {
      id: true,
      name: true,
      hometown: true,
      major: true,
      year: true,
      enrichmentData: true,
    },
  });
  if (!rush) return NextResponse.json({ ok: false, error: "Rush not found" }, { status: 404 });

  const env = parseEnvelope(rush.enrichmentData);

  // CONSENT GATE — the single guardrail every enrichment run passes through.
  const gate = canEnrich(readConsentState(env));
  if (!gate.ok) {
    await audit({
      action: "RUSH_ENRICH_BLOCKED",
      subjectType: "Rush",
      subjectId: rush.id,
      subjectName: rush.name,
      details: `blocked: ${gate.reason}`,
      req,
    });
    return NextResponse.json(
      { ok: false, reason: gate.reason, message: explainGate(gate) },
      { status: 403 },
    );
  }

  const identity = await getChapterIdentity();

  let out;
  try {
    out = await runEnrichment({
      name: rush.name,
      hometown: rush.hometown,
      major: rush.major,
      year: rush.year,
      schoolName: identity.schoolName,
      schoolShort: identity.schoolShort,
      schoolUrl: identity.schoolUrl,
      fetchedBy: "admin",
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Enrichment failed" }, { status: 500 });
  }
  if (!out) {
    return NextResponse.json({ ok: false, error: "No enrichment provider available" }, { status: 500 });
  }

  const redactionSummary = summarizeHits(out.redactions);
  const nextEnv = applyResult(env, out.result, out.providerId, redactionSummary);

  const updated = await prisma.rush.update({
    where: { id: rush.id },
    data: { enrichmentData: serializeEnvelope(nextEnv), enrichedAt: new Date() },
  });

  // AUDIT every lookup (PII-free: provider + redaction categories/counts only).
  await audit({
    action: "RUSH_ENRICH",
    subjectType: "Rush",
    subjectId: rush.id,
    subjectName: rush.name,
    details: `provider=${out.providerId}; redacted=${describeHits(out.redactions) || "none"}`,
    req,
  });

  return NextResponse.json({
    ok: true,
    enrichment: out.result,
    provenance: out.result.provenance,
    redactions: redactionSummary,
    enrichedAt: updated.enrichedAt,
    gate: canEnrich(readConsentState(nextEnv)),
  });
}

/**
 * PUT /api/admin/enrich — record the disclosure + consent for one PNM (the
 * Recruitment Chair attests a lawful/on-file basis before running enrichment).
 * Snapshots the verbatim disclosure text + version onto the record.
 */
export async function PUT(req: Request) {
  if (!isAdminAuthed()) return NextResponse.json({ ok: false }, { status: 401 });
  const denied = await guardOfficer("rushPipeline", "write");
  if (denied) return denied;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = IdSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  const rush = await prisma.rush.findUnique({
    where: { id: parsed.data.rushId },
    select: { id: true, name: true, enrichmentData: true },
  });
  if (!rush) return NextResponse.json({ ok: false, error: "Rush not found" }, { status: 404 });

  const env = parseEnvelope(rush.enrichmentData);
  const consent = makeEnrichmentConsent({ method: "admin-attested", capturedBy: "admin" });
  const nextEnv = applyConsent(env, consent);

  await prisma.rush.update({
    where: { id: rush.id },
    data: { enrichmentData: serializeEnvelope(nextEnv) },
  });
  await audit({
    action: "RUSH_ENRICH_CONSENT",
    subjectType: "Rush",
    subjectId: rush.id,
    subjectName: rush.name,
    details: `consent recorded (admin-attested), disclosure ${ENRICHMENT_DISCLOSURE_VERSION}`,
    req,
  });

  return NextResponse.json({ ok: true, consent, gate: canEnrich(readConsentState(nextEnv)) });
}

/**
 * DELETE /api/admin/enrich?rushId=… — opt the PNM OUT of enrichment AND delete
 * everything gathered (right-to-delete): purges the stored result + provenance,
 * records the opt-out, and clears enrichedAt. Consent history is retained as a
 * record that it was withdrawn.
 */
export async function DELETE(req: Request) {
  if (!isAdminAuthed()) return NextResponse.json({ ok: false }, { status: 401 });
  const denied = await guardOfficer("rushPipeline", "write");
  if (denied) return denied;

  const url = new URL(req.url);
  const rushId = url.searchParams.get("rushId");
  if (!rushId) return NextResponse.json({ ok: false }, { status: 400 });

  const rush = await prisma.rush.findUnique({
    where: { id: rushId },
    select: { id: true, name: true, enrichmentData: true },
  });
  if (!rush) return NextResponse.json({ ok: false, error: "Rush not found" }, { status: 404 });

  const env = parseEnvelope(rush.enrichmentData);
  const nextEnv = applyOptOut(env, makeEnrichmentOptOut({ by: "officer" }));

  await prisma.rush.update({
    where: { id: rush.id },
    data: { enrichmentData: serializeEnvelope(nextEnv), enrichedAt: null },
  });
  await audit({
    action: "RUSH_ENRICH_OPTOUT",
    subjectType: "Rush",
    subjectId: rush.id,
    subjectName: rush.name,
    details: "opted out + gathered data deleted",
    req,
  });

  return NextResponse.json({ ok: true });
}

/**
 * GET /api/admin/enrich?rushId=… — read the stored (redacted) enrichment + its
 * consent/opt-out state + the gate decision + fresh research quick-links.
 */
export async function GET(req: Request) {
  const denied = await guardOfficerOrAdmin();
  if (denied) return denied;

  const url = new URL(req.url);
  const rushId = url.searchParams.get("rushId");
  if (!rushId) return NextResponse.json({ ok: false }, { status: 400 });

  const rush = await prisma.rush.findUnique({
    where: { id: rushId },
    select: { enrichmentData: true, enrichedAt: true, name: true },
  });
  if (!rush) return NextResponse.json({ ok: false }, { status: 404 });

  const env = parseEnvelope(rush.enrichmentData);
  const consentState = readConsentState(env);
  const identity = await getChapterIdentity();

  return NextResponse.json({
    ok: true,
    // flat result stays back-compat with existing readers
    enrichment: env.summary || env.bullets || env.links ? env : null,
    provenance: env._enrichProvenance ?? null,
    redactions: env._enrichRedactions ?? null,
    consent: consentState.consent ?? null,
    optOut: consentState.optOut ?? null,
    gate: canEnrich(consentState),
    disclosure: { version: ENRICHMENT_DISCLOSURE_VERSION, text: ENRICHMENT_DISCLOSURE_TEXT },
    enrichedAt: rush.enrichedAt,
    quickLinks: quickLinks(rush.name, identity.schoolName, identity.schoolShort, identity.schoolUrl),
  });
}

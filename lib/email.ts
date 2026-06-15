import { Resend } from "resend";
import { getChapterIdentity } from "./chapter-identity";
import { getResendConfig, getListmonkConfig, type ListmonkConfig } from "./messaging-config";

/**
 * Unified chapter email sender + list management.
 *
 * PROVIDER INTERFACE (degrades gracefully behind env vars — no fake "sent"):
 *
 *   1. listmonk  — when LISTMONK_URL/LISTMONK_USER/LISTMONK_PASS (or the
 *      per-tenant SiteConfig listmonk.* keys) are set AND a transactional
 *      template id is configured. listmonk also owns durable subscriber LISTS
 *      (brothers/alumni segments) used for announcements/onboarding/renewals.
 *   2. Resend    — the existing transactional path (RESEND_API_KEY / tenant
 *      resend.* keys). Used when listmonk isn't configured.
 *   3. mock      — neither configured → log + return { ok, mock: true } so dev
 *      and unconfigured chapters never throw and never claim a real send.
 *
 * `sendEmail()` keeps its original signature so every existing caller works
 * unchanged; it now just picks the best available provider. The new
 * list-management helpers (ensureList / upsertSubscriber / syncSegment) are
 * additive and only do anything when listmonk is configured.
 */

export type EmailResult =
  | { ok: true; provider: "listmonk" | "resend" | "mock"; id?: string; mock?: boolean }
  | { ok: false; provider: "listmonk" | "resend"; error: string };

export type SendEmailOpts = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
};

// ── listmonk REST helpers ────────────────────────────────────────────────────

/** Basic-auth header for listmonk's api_user:token scheme. */
function listmonkAuthHeader(cfg: ListmonkConfig): string {
  const raw = `${cfg.user}:${cfg.pass}`;
  // btoa isn't available in all Node runtimes used by Next route handlers;
  // Buffer is. This file is server-only (imports next-server identity helpers).
  return "Basic " + Buffer.from(raw, "utf-8").toString("base64");
}

/**
 * The transactional template id listmonk should render for raw HTML sends.
 * listmonk's /api/tx requires a template_id; we read it from env/cfg. When
 * absent, listmonk is treated as "not usable for transactional send" and we
 * fall through to Resend — but listmonk's LIST features still work.
 *
 * The configured template MUST contain `{{ .Tx.Data.body }}` (and ideally
 * `{{ .Tx.Data.subject }}`) so the per-message HTML we pass through renders.
 */
function listmonkTxTemplateId(): number | null {
  const raw =
    process.env.LISTMONK_TX_TEMPLATE_ID?.trim() ||
    process.env.LISTMONK_TEMPLATE_ID?.trim();
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Send transactional HTML via listmonk /api/tx in `external` subscriber mode
 * (sends to arbitrary addresses without requiring DB subscribers). Returns a
 * boolean-ish result; throws on a hard network/HTTP error so the caller can
 * fall back.
 */
async function listmonkTxSend(
  cfg: ListmonkConfig,
  templateId: number,
  opts: { to: string[]; subject: string; html: string; fromEmail?: string },
): Promise<void> {
  const res = await fetch(`${cfg.url}/api/tx`, {
    method: "POST",
    headers: {
      Authorization: listmonkAuthHeader(cfg),
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      subscriber_mode: "external",
      subscriber_emails: opts.to,
      template_id: templateId,
      subject: opts.subject,
      content_type: "html",
      ...(opts.fromEmail ? { from_email: opts.fromEmail } : {}),
      // The template reads these via {{ .Tx.Data.* }}.
      data: { subject: opts.subject, body: opts.html },
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`listmonk /api/tx ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`);
  }
}

// ── public list-management surface (listmonk subscriber lists) ───────────────

export type ListmonkList = { id: number; name: string };

/** True when listmonk is fully configured for THIS tenant/request. */
export async function isListmonkConfigured(): Promise<boolean> {
  const cfg = await getListmonkConfig();
  return !!(cfg.url && cfg.user && cfg.pass);
}

/**
 * Find-or-create a listmonk list by name (idempotent). Used to maintain the
 * chapter's durable segments — e.g. "Brothers", "Alumni". Returns null when
 * listmonk isn't configured so callers can no-op gracefully.
 */
export async function ensureList(name: string): Promise<ListmonkList | null> {
  const cfg = await getListmonkConfig();
  if (!cfg.url || !cfg.user || !cfg.pass) return null;
  const auth = listmonkAuthHeader(cfg);

  try {
    // Look for an existing list with this exact name first.
    const listRes = await fetch(`${cfg.url}/api/lists?per_page=all`, {
      headers: { Authorization: auth },
    });
    if (listRes.ok) {
      const json: any = await listRes.json().catch(() => null);
      const results: any[] = json?.data?.results || json?.data || [];
      const existing = results.find(
        (l) => (l?.name || "").trim().toLowerCase() === name.trim().toLowerCase(),
      );
      if (existing?.id) return { id: existing.id, name: existing.name };
    }
    // Create it.
    const createRes = await fetch(`${cfg.url}/api/lists`, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ name, type: "private", optin: "single" }),
    });
    if (!createRes.ok) return null;
    const created: any = await createRes.json().catch(() => null);
    const id = created?.data?.id;
    return id ? { id, name } : null;
  } catch (err) {
    console.warn("[email] ensureList failed (non-fatal):", err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Upsert a subscriber into listmonk and (optionally) onto a list. Idempotent:
 * a duplicate-email create is treated as success. No-op (returns false) when
 * listmonk isn't configured.
 */
export async function upsertSubscriber(opts: {
  email: string;
  name: string;
  listIds?: number[];
  attribs?: Record<string, unknown>;
}): Promise<boolean> {
  const cfg = await getListmonkConfig();
  if (!cfg.url || !cfg.user || !cfg.pass) return false;
  if (!opts.email?.trim()) return false;
  const auth = listmonkAuthHeader(cfg);

  try {
    const res = await fetch(`${cfg.url}/api/subscribers`, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({
        email: opts.email.trim(),
        name: opts.name?.trim() || opts.email.trim(),
        status: "enabled",
        lists: opts.listIds || [],
        // Confirm immediately for single-opt-in private chapter lists so the
        // member doesn't have to click a second confirmation.
        preconfirm_subscriptions: true,
        attribs: opts.attribs || {},
      }),
    });
    if (res.ok) return true;
    // 409 = already exists → idempotent success. Anything else is a real error.
    if (res.status === 409) return true;
    const body = await res.text().catch(() => "");
    // listmonk returns 400 with a "already exists" message on dup email in some
    // versions; treat that as success too.
    if (/already exists|duplicate/i.test(body)) return true;
    console.warn(`[email] upsertSubscriber ${res.status}: ${body.slice(0, 160)}`);
    return false;
  } catch (err) {
    console.warn("[email] upsertSubscriber failed (non-fatal):", err instanceof Error ? err.message : err);
    return false;
  }
}

/**
 * Sync a roster segment (brothers / alumni) into a named listmonk list. Ensures
 * the list exists, then upserts every member onto it. Best-effort + idempotent;
 * returns a count summary. No-op when listmonk isn't configured.
 *
 * Wire this from roster-mutation surfaces (member add/import, alumni onboard)
 * so the chapter's email lists stay current without a manual export.
 */
export async function syncSegment(
  listName: string,
  members: Array<{ email: string | null | undefined; name: string }>,
): Promise<{ ok: boolean; configured: boolean; listId: number | null; synced: number; total: number }> {
  const list = await ensureList(listName);
  if (!list) {
    return { ok: false, configured: false, listId: null, synced: 0, total: members.length };
  }
  let synced = 0;
  const withEmail = members.filter((m) => m.email && m.email.trim());
  for (const m of withEmail) {
    const ok = await upsertSubscriber({ email: m.email!, name: m.name, listIds: [list.id] });
    if (ok) synced += 1;
  }
  return { ok: true, configured: true, listId: list.id, synced, total: withEmail.length };
}

// ── send ─────────────────────────────────────────────────────────────────────

/**
 * Send one email, preferring listmonk (when configured + a tx template id is
 * set) and falling back to Resend, then mock. Backward-compatible with the
 * original Resend-only signature — every existing caller keeps working.
 */
export async function sendEmail(opts: SendEmailOpts): Promise<EmailResult> {
  const toList = Array.isArray(opts.to) ? opts.to : [opts.to];

  // Chapter-aware from-NAME (unchanged from the original implementation).
  let fromName = "Greekstack";
  try {
    const identity = await getChapterIdentity();
    fromName = identity.chapterAttribution || identity.fraternityName || fromName;
  } catch {
    // ignore — keep neutral default
  }

  // ── Provider 1: listmonk transactional (only when a tx template is set) ──
  const listmonk = await getListmonkConfig();
  const txTemplate = listmonkTxTemplateId();
  if (listmonk.url && listmonk.user && listmonk.pass && txTemplate) {
    try {
      await listmonkTxSend(listmonk, txTemplate, {
        to: toList,
        subject: opts.subject,
        html: opts.html,
      });
      return { ok: true, provider: "listmonk" };
    } catch (err: any) {
      // Hard failure → fall through to Resend rather than dropping the message.
      console.warn("[email] listmonk send failed, falling back to Resend:", err?.message || err);
    }
  }

  // ── Provider 2: Resend ──
  const { apiKey, fromEmail } = await getResendConfig();
  const fromAddr = fromEmail?.trim() || "no-reply@greekstack.vercel.app";
  const from = `${fromName} <${fromAddr}>`;

  if (!apiKey) {
    // ── Provider 3: mock (no real send — explicit) ──
    console.log(`[Mock Email] to: ${opts.to}, subject: ${opts.subject}`);
    return { ok: true, provider: "mock", mock: true };
  }

  const resend = new Resend(apiKey);

  // Single send attempt against a given From header. Normalizes both the
  // structured `res.error` and a thrown exception into one shape so the
  // caller can decide whether the failure is the recoverable
  // "domain-not-verified" case and re-route.
  async function attempt(
    fromHeader: string,
  ): Promise<{ ok: true; id?: string } | { ok: false; error: string }> {
    try {
      const res = await resend.emails.send({
        from: fromHeader,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        text: opts.text || opts.subject,
        replyTo: opts.replyTo,
      });
      if ("error" in res && res.error) {
        return { ok: false, error: res.error.message };
      }
      return { ok: true, id: (res as any).id };
    } catch (err: any) {
      return { ok: false, error: err?.message || "Unknown error" };
    }
  }

  // A send fails with this when the From-DOMAIN isn't verified in the Resend
  // account (the dominant misconfiguration: a chapter pastes a Resend key but
  // never verifies its custom sending domain, or RESEND_FROM_EMAIL points at an
  // unverified domain). Resend returns a 403 whose message names the domain and
  // says it "is not verified". Match defensively on the wording.
  function isUnverifiedDomainError(msg: string): boolean {
    const m = msg.toLowerCase();
    return m.includes("not verified") || (m.includes("domain") && m.includes("verif"));
  }

  // Resend lets EVERY account send from this shared, always-verified address
  // (no domain setup required). We re-route to it when the chapter's own
  // From-domain is unverified so a transactional email (password reset, alumni
  // invite, booking confirmation) still LANDS instead of silently failing.
  // The chapter-aware from-NAME is preserved; only the address changes.
  const RESEND_FALLBACK_ADDR = "onboarding@resend.dev";

  const first = await attempt(from);
  if (first.ok) {
    return { ok: true, provider: "resend", id: first.id };
  }

  if (isUnverifiedDomainError(first.error) && fromAddr !== RESEND_FALLBACK_ADDR) {
    console.warn(
      `[email] Resend From-domain unverified ("${fromAddr}"); re-routing via ${RESEND_FALLBACK_ADDR}. ` +
        `Verify the domain in Resend (or set resend.fromEmail / RESEND_FROM_EMAIL to a verified sender) to brand the From address.`,
    );
    const fallback = await attempt(`${fromName} <${RESEND_FALLBACK_ADDR}>`);
    if (fallback.ok) {
      return { ok: true, provider: "resend", id: fallback.id };
    }
    console.error("Resend fallback send failed:", fallback.error);
    return { ok: false, provider: "resend", error: fallback.error };
  }

  console.error("Resend API error:", first.error);
  return { ok: false, provider: "resend", error: first.error };
}

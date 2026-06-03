import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isAdminAuthed, isAdminRole } from "@/lib/auth";
import { getChapterIdentity } from "@/lib/chapter-identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Schema = z.object({ rushId: z.string().min(1) });

type Enrichment = {
  summary?: string;
  bullets?: string[];
  links?: { label: string; url: string }[];
  raw?: any;
  source: "tavily" | "search-links" | "manual";
  searchedAt: string;
};

// Chapter-aware quickLinks: school in queries + directory label / host derived
// from cfg. Reference defaults preserve USC-pinned behavior for existing deploys.
function quickLinks(
  name: string,
  schoolName: string,
  schoolShort: string,
  schoolUrl: string,
) {
  const q = encodeURIComponent(`${name} ${schoolName}`);
  const qSimple = encodeURIComponent(name);
  const directoryHost = schoolUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return [
    { label: "Google", url: `https://www.google.com/search?q=${q}` },
    { label: "LinkedIn", url: `https://www.linkedin.com/search/results/people/?keywords=${q}` },
    { label: "Instagram", url: `https://www.instagram.com/explore/search/keyword/?q=${qSimple}` },
    { label: "Facebook", url: `https://www.facebook.com/search/people/?q=${q}` },
    { label: `${schoolShort} directory`, url: `https://${directoryHost}/about/directory/?q=${qSimple}` },
    { label: "MaxPreps (HS sports)", url: `https://www.maxpreps.com/search/default.aspx?search=${qSimple}` },
  ];
}

async function tavilySearch(name: string, hints: string, schoolName: string, schoolHost: string) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return null;
  const query = `${name} ${schoolName} ${hints}`.trim();
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: "basic",
      include_answer: true,
      max_results: 8,
      include_domains: [
        "linkedin.com", "instagram.com", "facebook.com",
        schoolHost, "maxpreps.com", "athletic.net",
      ],
    }),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function POST(req: Request) {
  if (!isAdminAuthed()) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  // Tavily API costs money per call (1k free / month, then paid). Members
  // shouldn't be able to fire enrichment lookups; admin-only.
  if (!isAdminRole()) {
    return NextResponse.json({ ok: false, error: "Admins only" }, { status: 403 });
  }

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  const rush = await prisma.rush.findUnique({ where: { id: parsed.data.rushId } });
  if (!rush) return NextResponse.json({ ok: false, error: "Rush not found" }, { status: 404 });

  // Chapter identity scopes the enrichment search to the chapter's school
  // (Beta Sigma @ Maryland will Google "Joe Schmo University of Maryland" not
  // "Joe Schmo University of South Carolina"). Reference defaults preserve
  // existing Phi Sig USC behavior.
  const identity = await getChapterIdentity();
  const hints = [rush.hometown, rush.major, rush.year].filter(Boolean).join(" ");

  let result: Enrichment;
  try {
    const schoolHost = identity.schoolUrl.replace(/^https?:\/\//, "").replace(/\/$/, "").replace(/^www\./, "");
    const tav = await tavilySearch(rush.name, hints, identity.schoolName, schoolHost);
    if (tav) {
      const bullets = (tav.results || [])
        .slice(0, 6)
        .map((r: any) => {
          const host = (() => {
            try { return new URL(r.url).hostname.replace("www.", ""); } catch { return r.url; }
          })();
          return `[${host}] ${r.title}${r.content ? ` — ${r.content.slice(0, 220)}` : ""}`;
        });
      result = {
        summary: tav.answer || undefined,
        bullets,
        links: (tav.results || []).slice(0, 8).map((r: any) => ({ label: r.title?.slice(0, 80) || r.url, url: r.url })),
        raw: { query: tav.query, count: (tav.results || []).length },
        source: "tavily",
        searchedAt: new Date().toISOString(),
      };
    } else {
      result = {
        summary: `Auto-enrichment is in manual mode. Set TAVILY_API_KEY in Vercel to auto-pull from the web. Use the links below to research ${rush.name} manually.`,
        links: quickLinks(rush.name, identity.schoolName, identity.schoolShort, identity.schoolUrl),
        source: "search-links",
        searchedAt: new Date().toISOString(),
      };
    }
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Enrichment failed" }, { status: 500 });
  }

  const updated = await prisma.rush.update({
    where: { id: rush.id },
    data: {
      enrichmentData: JSON.stringify(result),
      enrichedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true, enrichment: result, enrichedAt: updated.enrichedAt });
}

export async function GET(req: Request) {
  if (!isAdminAuthed()) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const url = new URL(req.url);
  const rushId = url.searchParams.get("rushId");
  if (!rushId) return NextResponse.json({ ok: false }, { status: 400 });

  const rush = await prisma.rush.findUnique({
    where: { id: rushId },
    select: { enrichmentData: true, enrichedAt: true, name: true },
  });
  if (!rush) return NextResponse.json({ ok: false }, { status: 404 });

  // Chapter identity for the quickLinks builder so the surfaced research
  // shortcuts are scoped to the chapter's school.
  const identity = await getChapterIdentity();
  return NextResponse.json({
    ok: true,
    enrichment: rush.enrichmentData ? JSON.parse(rush.enrichmentData) : null,
    enrichedAt: rush.enrichedAt,
    quickLinks: quickLinks(rush.name, identity.schoolName, identity.schoolShort, identity.schoolUrl),
  });
}

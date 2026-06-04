/**
 * PNM auto-enrichment — searches the web for additional info about a rushee
 * (LinkedIn, Instagram, the chapter's school directory, MaxPreps athletics,
 * etc.) and returns a structured summary. Fires automatically when a new PNM
 * submits the form, so the admin sees enriched info the moment they open the
 * rushee's profile.
 *
 * Falls back gracefully to "search-links" mode when TAVILY_API_KEY isn't set —
 * the admin still gets one-click research links to Google / LinkedIn / IG.
 *
 * School scoping is chapter-driven: callers pass cfg-derived school values, or
 * leave them blank — NEVER a hardcoded reference school. Blank simply omits the
 * school from the query / the school-directory link, so no specific chapter's
 * school ever leaks into another tenant's enrichment.
 */

import { getSiteConfig } from "@/lib/site-config";

export type Enrichment = {
  summary?: string;
  bullets?: string[];
  links?: { label: string; url: string }[];
  raw?: any;
  source: "tavily" | "search-links" | "manual";
  searchedAt: string;
};

export function quickLinks(name: string, schoolName = "", schoolShort = "", schoolUrl = "") {
  const q = encodeURIComponent([name, schoolName].filter(Boolean).join(" "));
  const qSimple = encodeURIComponent(name);
  // Strip protocol + trailing slash from schoolUrl for the directory URL pattern;
  // most universities expose a /about/directory search at the canonical host.
  const directoryHost = schoolUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const links = [
    { label: "Google", url: `https://www.google.com/search?q=${q}` },
    { label: "LinkedIn", url: `https://www.linkedin.com/search/results/people/?keywords=${q}` },
    { label: "Instagram", url: `https://www.instagram.com/explore/search/keyword/?q=${qSimple}` },
    { label: "Facebook", url: `https://www.facebook.com/search/people/?q=${q}` },
  ];
  // Only surface the school-directory shortcut when the chapter has a school URL.
  if (directoryHost) {
    links.push({
      label: `${[schoolShort, "directory"].filter(Boolean).join(" ")}`,
      url: `https://${directoryHost}/about/directory/?q=${qSimple}`,
    });
  }
  links.push({ label: "MaxPreps (HS sports)", url: `https://www.maxpreps.com/search/default.aspx?search=${qSimple}` });
  return links;
}

async function tavilySearch(name: string, hints: string, schoolName = "", schoolUrl = "") {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return null;
  const query = [name, schoolName, hints].filter(Boolean).join(" ").trim();
  // Derive the chapter's school host from cfg-supplied schoolUrl instead of a
  // hardcoded reference domain, so the domain filter scopes to THIS chapter's
  // school. Blank schoolUrl simply omits the school domain from the filter.
  const schoolHost = schoolUrl.replace(/^https?:\/\//, "").replace(/\/$/, "").split("/")[0];
  try {
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
          ...(schoolHost ? [schoolHost] : []),
          "maxpreps.com", "athletic.net",
        ],
      }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function enrichRushee(opts: {
  name: string;
  hometown?: string | null;
  major?: string | null;
  year?: string | null;
  // Optional chapter context — pass cfg-derived values to scope the search to
  // the right school. When omitted, falls back to THIS chapter's SiteConfig
  // (never a hardcoded reference school), so a tenant that hasn't set a school
  // simply runs an unscoped name search instead of leaking another chapter's.
  schoolName?: string;
  schoolShort?: string;
  schoolUrl?: string;
}): Promise<Enrichment> {
  // Resolve school scoping from explicit opts first, then SiteConfig, then "".
  let cfgSchoolName = "";
  let cfgSchoolShort = "";
  let cfgSchoolUrl = "";
  if (opts.schoolName === undefined || opts.schoolShort === undefined || opts.schoolUrl === undefined) {
    try {
      const cfg = await getSiteConfig();
      cfgSchoolName = cfg["chapter.schoolName"] || "";
      cfgSchoolShort = cfg["chapter.schoolShort"] || "";
      cfgSchoolUrl = cfg["chapter.schoolUrl"] || "";
    } catch {
      /* unscoped search if cfg is unavailable */
    }
  }
  const schoolName = opts.schoolName ?? cfgSchoolName;
  const schoolShort = opts.schoolShort ?? cfgSchoolShort;
  const schoolUrl = opts.schoolUrl ?? cfgSchoolUrl;
  const hints = [opts.hometown, opts.major, opts.year].filter(Boolean).join(" ");
  const tav = await tavilySearch(opts.name, hints, schoolName, schoolUrl);
  if (tav) {
    const bullets = (tav.results || [])
      .slice(0, 6)
      .map((r: any) => {
        const host = (() => {
          try { return new URL(r.url).hostname.replace("www.", ""); } catch { return r.url; }
        })();
        return `[${host}] ${r.title}${r.content ? ` — ${r.content.slice(0, 220)}` : ""}`;
      });
    return {
      summary: tav.answer || undefined,
      bullets,
      links: (tav.results || []).slice(0, 8).map((r: any) => ({
        label: r.title?.slice(0, 80) || r.url,
        url: r.url,
      })),
      raw: { query: tav.query, count: (tav.results || []).length },
      source: "tavily",
      searchedAt: new Date().toISOString(),
    };
  }
  return {
    summary: `Auto-enrichment is in manual mode. Set TAVILY_API_KEY in Vercel to auto-pull from the web. Use the links below to research ${opts.name} manually.`,
    links: quickLinks(opts.name, schoolName, schoolShort, schoolUrl),
    source: "search-links",
    searchedAt: new Date().toISOString(),
  };
}

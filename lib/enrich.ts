/**
 * PNM auto-enrichment — searches the web for additional info about a rushee
 * (LinkedIn, Instagram, USC directory, MaxPreps athletics, etc.) and returns
 * a structured summary. Fires automatically when a new PNM submits the form,
 * so the admin sees enriched info the moment they open the rushee's profile.
 *
 * Falls back gracefully to "search-links" mode when TAVILY_API_KEY isn't set —
 * the admin still gets one-click research links to Google / LinkedIn / IG.
 */

export type Enrichment = {
  summary?: string;
  bullets?: string[];
  links?: { label: string; url: string }[];
  raw?: any;
  source: "tavily" | "search-links" | "manual";
  searchedAt: string;
};

export function quickLinks(name: string) {
  const q = encodeURIComponent(`${name} University of South Carolina`);
  const qSimple = encodeURIComponent(name);
  return [
    { label: "Google", url: `https://www.google.com/search?q=${q}` },
    { label: "LinkedIn", url: `https://www.linkedin.com/search/results/people/?keywords=${q}` },
    { label: "Instagram", url: `https://www.instagram.com/explore/search/keyword/?q=${qSimple}` },
    { label: "Facebook", url: `https://www.facebook.com/search/people/?q=${q}` },
    { label: "USC directory", url: `https://www.sc.edu/about/directory/?q=${qSimple}` },
    { label: "MaxPreps (HS sports)", url: `https://www.maxpreps.com/search/default.aspx?search=${qSimple}` },
  ];
}

async function tavilySearch(name: string, hints: string) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return null;
  const query = `${name} University of South Carolina ${hints}`.trim();
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
          "sc.edu", "maxpreps.com", "athletic.net",
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
}): Promise<Enrichment> {
  const hints = [opts.hometown, opts.major, opts.year].filter(Boolean).join(" ");
  const tav = await tavilySearch(opts.name, hints);
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
    links: quickLinks(opts.name),
    source: "search-links",
    searchedAt: new Date().toISOString(),
  };
}

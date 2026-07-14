import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { getSiteConfig } from "@/lib/site-config";
import { chapterIdentityFromCfg } from "@/lib/chapter-identity";
import { cleanUrl, cleanMailto, cleanTel, titleCaseAddress } from "@/lib/utils";

/**
 * Presentational footer — PURE (no hooks, no async, no I/O). It takes a fully
 * resolved SiteConfig map and renders the markup, so it is safe to render from
 * BOTH a Server Component tree (via <PublicFooter/>) and a Client Component tree
 * (via <PublicFooterClient/> in components/site/footer-client.tsx).
 *
 * WHY THIS SPLIT EXISTS: the original <PublicFooter/> was an ASYNC Server
 * Component (it awaits getSiteConfig(), which reads the DB + request headers).
 * Rendering an async Server Component from inside a "use client" page throws
 * "Error: Not implemented." at request time — which 500'd the whole
 * /alumni/onboard/[token] route and silently broke the footer on the
 * reset-password and alumni/register client pages. Keeping the markup here as a
 * synchronous, prop-driven view lets the client pages render it without ever
 * awaiting a server function in the browser.
 */
export function PublicFooterView({ cfg }: { cfg: Record<string, string> }) {
  // Term-aware identity so the motto fallback re-genders per orgType.
  const identity = chapterIdentityFromCfg(cfg);
  // White-label fallbacks: any unset chapter-identity field falls back to a
  // NEUTRAL placeholder (never a specific reference chapter), so the footer
  // reads correctly on a fresh deploy / the apex before /admin/setup has run.
  // Empties are filtered out of joined lines so nothing renders as ", at ".
  const fraternityName = cfg["chapter.fraternityName"] || "Your Chapter";
  const greekLetters = cfg["chapter.greekLetters"] || "";
  const schoolName = cfg["chapter.schoolName"] || "";
  const foundingYear = cfg["chapter.foundingYear"] || "";
  const cardinalPrinciples = identity.cardinalPrinciples;
  const nationalHqUrl = cfg["chapter.nationalHqUrl"] || "";
  return (
    <footer className="border-t border-border/70 mt-12">
      <div className="container py-10 grid sm:grid-cols-[1.4fr_1fr] items-start gap-6">
        <div>
          <Wordmark variant="compact" />
          <p className="mt-3 text-xs text-muted-foreground max-w-sm">
            {[
              [fraternityName, greekLetters ? `${greekLetters} chapter` : ""].filter(Boolean).join(", "),
              schoolName ? `at ${schoolName}` : "",
            ].filter(Boolean).join(" ")}.
            Three Cardinal Principles: {cardinalPrinciples}.
          </p>
          <p className="mt-3 text-xs text-muted-foreground max-w-sm">
            <span className="font-medium text-foreground">Chapter advisor:</span>{" "}
            {cfg["contact.advisorName"]}
            {cfg["contact.advisorTitle"] && (<>, {cfg["contact.advisorTitle"]}</>)} - {" "}
            <a href={cleanMailto(cfg["contact.advisorEmail"])} className="text-brand-red hover:underline">{cfg["contact.advisorEmail"]}</a>.
          </p>
        </div>
        <div className="text-xs text-muted-foreground space-y-1 text-left sm:text-right">
          <p>© {new Date().getFullYear()} {[
            [fraternityName, greekLetters].filter(Boolean).join(", "),
            cfg["chapter.schoolShort"] ? `at ${cfg["chapter.schoolShort"]}` : "",
          ].filter(Boolean).join(" ")}</p>
          <p>{titleCaseAddress(cfg["contact.address"])} · {titleCaseAddress(cfg["contact.cityState"])}</p>
          {cfg["contact.rushPhone"] && (
            <p>
              <a href={cleanTel(cfg["contact.rushPhone"])} className="hover:text-foreground transition-colors">
                {cfg["contact.rushPhone"]}
              </a>
            </p>
          )}
          {/* Footer link order signals chapter priorities. Anti-hazing hotline
              is placed FIRST so it's the most visible safety lifeline for
              skeptical parents and any concerned PNM — every page on the site
              ends with this link in the most-noticed position. National HQ
              second to reinforce authenticity. */}
          <p className="flex flex-wrap gap-x-3 gap-y-1 sm:justify-end pt-1">
            <a
              href={cleanUrl(cfg["antiHazing.hotlineUrl"])}
              target="_blank"
              rel="noreferrer noopener"
              className="font-medium text-brand-red hover:text-brand-red-dark transition-colors"
            >
              Anti-hazing hotline
            </a>
            {nationalHqUrl && (
              <>
                <span aria-hidden>·</span>
                <a href={cleanUrl(nationalHqUrl)} target="_blank" rel="noreferrer noopener" className="hover:text-foreground transition-colors">National HQ</a>
              </>
            )}
            <span aria-hidden>·</span>
            <Link href="/parents" className="hover:text-foreground transition-colors">For Parents</Link>
            <span aria-hidden>·</span>
            <Link href="/alumni" className="hover:text-foreground transition-colors">Alumni</Link>
            <span aria-hidden>·</span>
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <span aria-hidden>·</span>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <span aria-hidden>·</span>
            <a href={cleanMailto(cfg["contact.rushEmail"])} className="hover:text-foreground transition-colors">Contact</a>
            <span aria-hidden>·</span>
            {/* Talk to sales — links to the Greekstack APEX sales/contact surface
                (/contact). Distinct from the chapter "Contact" mailto above: this
                reaches the PLATFORM owner about Greekstack itself (demo, pricing,
                custom build), not the chapter's rush inbox. */}
            <Link href="/contact" className="hover:text-foreground transition-colors">Talk to sales</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}

/**
 * Server-Component footer — loads the chapter's SiteConfig (DB + request
 * headers) and renders the presentational view. Used by every SERVER page
 * (app/page.tsx, app/privacy, donate/success, etc.). Async by nature, so it
 * must NEVER be rendered from inside a "use client" tree — those use
 * <PublicFooterClient/> instead.
 */
export async function PublicFooter() {
  const cfg = await getSiteConfig();
  return <PublicFooterView cfg={cfg} />;
}

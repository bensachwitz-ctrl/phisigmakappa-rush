import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { getSiteConfig } from "@/lib/site-config";
import { chapterIdentityFromCfg } from "@/lib/chapter-identity";
import { cleanUrl, cleanMailto, cleanTel, titleCaseAddress } from "@/lib/utils";

export async function PublicFooter() {
  const cfg = await getSiteConfig();
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
  // The bundled /brand/phisigmakappa-letters.jpg is the ΦΣΚ national wordmark —
  // correct ONLY for a Phi Sig chapter. On any other chapter it would brand the
  // footer with the wrong fraternity, so we gate the national-logo strip on
  // this chapter actually being Phi Sig (same check as components/brand/wordmark.tsx).
  // Non-Phi-Sig chapters keep the auto-branded <Wordmark/> above; the national
  // strip is simply omitted (no generic national logo asset exists to swap in).
  const isPhiSig = fraternityName.toLowerCase().includes("phi sigma kappa");
  return (
    <footer className="border-t border-border/70 mt-12">
      <div className="container py-10 grid sm:grid-cols-[1.4fr_1fr] items-start gap-6">
        <div>
          <Wordmark variant="compact" />
          {/* National brand wordmark — discrete affirmation that this is an
              authorized chapter site, not a rogue clone. The wordmark above
              shows the chapter; this strip below shows the parent fraternity.
              Gated on isPhiSig: the bundled /brand/phisigmakappa-letters.jpg is
              the ΦΣΚ national wordmark and would mis-brand any other chapter,
              so non-Phi-Sig deploys omit the strip (the auto-branded Wordmark
              above already represents the chapter). */}
          {isPhiSig && (
            <div className="mt-4 inline-flex items-center gap-3 rounded-md border border-border/60 bg-secondary/40 px-3 py-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/phisigmakappa-letters.jpg"
                alt={fraternityName}
                width={86}
                height={32}
                className="h-6 w-auto"
                loading="lazy"
                decoding="async"
              />
              <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                National brotherhood · Founded {foundingYear}
              </span>
            </div>
          )}
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
            {cfg["contact.advisorTitle"] && (<>, {cfg["contact.advisorTitle"]}</>)} —{" "}
            <a href={cleanMailto(cfg["contact.advisorEmail"])} className="text-phisig-red hover:underline">{cfg["contact.advisorEmail"]}</a>.
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
              className="font-medium text-phisig-red hover:text-phisig-red-dark transition-colors"
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

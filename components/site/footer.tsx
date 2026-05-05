import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { getSiteConfig } from "@/lib/site-config";
import { cleanUrl, cleanMailto, cleanTel, titleCaseAddress } from "@/lib/utils";

export async function PublicFooter() {
  const cfg = await getSiteConfig();
  return (
    <footer className="border-t border-border/70 mt-12">
      <div className="container py-10 grid sm:grid-cols-[1.4fr_1fr] items-start gap-6">
        <div>
          <Wordmark variant="compact" />
          {/* National brand wordmark — discrete affirmation that this is an
              authorized Phi Sigma Kappa chapter site, not a rogue clone. The
              chapter wordmark above shows USC; this strip below shows the
              parent fraternity. */}
          <div className="mt-4 inline-flex items-center gap-3 rounded-md border border-border/60 bg-secondary/40 px-3 py-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/phisigmakappa-letters.jpg"
              alt="Phi Sigma Kappa"
              width={86}
              height={32}
              className="h-6 w-auto"
              loading="lazy"
            />
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              National brotherhood · Founded 1873
            </span>
          </div>
          <p className="mt-3 text-xs text-muted-foreground max-w-sm">
            Phi Sigma Kappa, Gamma Triton chapter at the University of South Carolina.
            Three Cardinal Principles: Brotherhood, Scholarship, Character.
          </p>
          <p className="mt-3 text-xs text-muted-foreground max-w-sm">
            <span className="font-medium text-foreground">Chapter advisor:</span>{" "}
            {cfg["contact.advisorName"]}
            {cfg["contact.advisorTitle"] && (<>, {cfg["contact.advisorTitle"]}</>)} —{" "}
            <a href={cleanMailto(cfg["contact.advisorEmail"])} className="text-phisig-red hover:underline">{cfg["contact.advisorEmail"]}</a>.
          </p>
        </div>
        <div className="text-xs text-muted-foreground space-y-1 text-left sm:text-right">
          <p>© {new Date().getFullYear()} Phi Sigma Kappa, Gamma Triton at USC</p>
          <p>{titleCaseAddress(cfg["contact.address"])} · {titleCaseAddress(cfg["contact.cityState"])}</p>
          {cfg["contact.rushPhone"] && (
            <p>
              <a href={cleanTel(cfg["contact.rushPhone"])} className="hover:text-foreground transition-colors">
                {cfg["contact.rushPhone"]}
              </a>
            </p>
          )}
          <p className="flex flex-wrap gap-x-3 gap-y-1 sm:justify-end pt-1">
            <Link href="/parents" className="hover:text-foreground transition-colors">For Parents</Link>
            <span aria-hidden>·</span>
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <span aria-hidden>·</span>
            <a href="https://phisigmakappa.org" target="_blank" rel="noreferrer noopener" className="hover:text-foreground transition-colors">National HQ</a>
            <span aria-hidden>·</span>
            <a href={cleanUrl(cfg["antiHazing.hotlineUrl"])} target="_blank" rel="noreferrer noopener" className="hover:text-foreground transition-colors">Anti-hazing hotline</a>
            <span aria-hidden>·</span>
            <a href={cleanMailto(cfg["contact.rushEmail"])} className="hover:text-foreground transition-colors">Contact</a>
          </p>
        </div>
      </div>
    </footer>
  );
}

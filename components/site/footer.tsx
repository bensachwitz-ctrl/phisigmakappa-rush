import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";

export function PublicFooter() {
  return (
    <footer className="border-t border-border/70 mt-24">
      <div className="container py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <Wordmark variant="compact" />
          <p className="mt-3 text-xs text-muted-foreground max-w-sm">
            Phi Sigma Kappa, Gamma Triton chapter at the University of South Carolina.
            Three Cardinal Principles: Brotherhood, Scholarship, Character.
          </p>
        </div>
        <div className="text-xs text-muted-foreground space-y-1 text-left sm:text-right">
          <p>© {new Date().getFullYear()} Phi Sigma Kappa USC</p>
          <p>800 Lincoln St · Columbia, SC</p>
          <p className="flex flex-wrap gap-x-3 gap-y-1 sm:justify-end pt-1">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <span aria-hidden>·</span>
            <a href="https://phisigmakappa.org" target="_blank" rel="noreferrer" className="hover:text-foreground transition-colors">National HQ</a>
            <span aria-hidden>·</span>
            <a href="mailto:rush@phisig-usc.com" className="hover:text-foreground transition-colors">Contact</a>
          </p>
        </div>
      </div>
    </footer>
  );
}

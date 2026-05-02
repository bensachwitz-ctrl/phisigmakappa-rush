import { Wordmark } from "@/components/brand/wordmark";

export function PublicFooter() {
  return (
    <footer className="border-t border-border/70 mt-24">
      <div className="container py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <Wordmark variant="compact" />
          <p className="mt-3 text-xs text-muted-foreground max-w-sm">
            Phi Sigma Kappa, Eta-Pentaton chapter at the University of South Carolina.
            Three Cardinal Principles: Brotherhood, Scholarship, Character.
          </p>
        </div>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>© {new Date().getFullYear()} Phi Sigma Kappa USC</p>
          <p>800 Lincoln St · Columbia, SC</p>
        </div>
      </div>
    </footer>
  );
}

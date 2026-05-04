import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";
import { Home, Calendar } from "lucide-react";

export const metadata = {
  title: "Not found",
};

export default function NotFound() {
  return (
    <main className="min-h-screen bg-background flex flex-col">
      <div className="container py-6">
        <Link href="/" className="inline-flex items-center gap-2">
          <Wordmark variant="compact" />
        </Link>
      </div>
      <div className="flex-1 flex items-center justify-center px-4 pb-12">
        <div className="w-full max-w-lg text-center">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.18em] text-phisig-red">
            404 · Not found
          </span>
          <h1 className="mt-3 text-3xl sm:text-5xl font-semibold tracking-tight">
            That page doesn't exist.
          </h1>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Maybe a stale link. Try the rush page or jump to the schedule.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="group">
              <Link href="/">
                <Home className="h-4 w-4" /> Home
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/#schedule">
                <Calendar className="h-4 w-4" /> Rush schedule
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}

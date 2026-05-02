import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

export function PublicNav() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="hover:opacity-90 transition-opacity">
          <Wordmark variant="compact" />
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            href="#schedule"
            className="hidden sm:inline-flex h-9 items-center px-3 text-sm text-muted-foreground hover:text-foreground"
          >
            Schedule
          </Link>
          <Link
            href="#about"
            className="hidden sm:inline-flex h-9 items-center px-3 text-sm text-muted-foreground hover:text-foreground"
          >
            About
          </Link>
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link href="#register">Register</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/login" className="text-muted-foreground">
              <Lock className="h-3.5 w-3.5 mr-1.5" />
              Brothers
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}

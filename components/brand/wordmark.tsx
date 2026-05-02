import { cn } from "@/lib/utils";

export function Wordmark({
  className,
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "compact" | "white";
}) {
  if (variant === "compact") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-2 font-display text-base font-semibold tracking-tight",
          className
        )}
      >
        <Crest className="h-7 w-7 text-phisig-red" />
        <span>ΦΣΚ</span>
        <span className="text-muted-foreground font-normal text-sm">USC</span>
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-3 font-display tracking-tight",
        variant === "white" ? "text-white" : "text-foreground",
        className
      )}
    >
      <Crest
        className={cn(
          "h-9 w-9",
          variant === "white" ? "text-white" : "text-phisig-red"
        )}
      />
      <span className="flex flex-col leading-none">
        <span className="text-[11px] uppercase tracking-[0.22em] opacity-70">
          Phi Sigma Kappa
        </span>
        <span className="text-base font-semibold">University of South Carolina</span>
      </span>
    </span>
  );
}

export function Crest({ className }: { className?: string }) {
  // Simplified, original "ΦΣΚ" coat-of-arms style mark. No copyrighted artwork.
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M32 2 L60 12 V30 C60 47 47 58 32 62 C17 58 4 47 4 30 V12 Z"
        stroke="currentColor"
        strokeWidth="2.5"
        fill="currentColor"
        fillOpacity="0.06"
      />
      <text
        x="32"
        y="38"
        textAnchor="middle"
        fontFamily="Georgia, serif"
        fontWeight="700"
        fontSize="20"
        fill="currentColor"
        letterSpacing="0.5"
      >
        ΦΣΚ
      </text>
      <line x1="14" y1="46" x2="50" y2="46" stroke="currentColor" strokeWidth="1.2" opacity="0.5"/>
    </svg>
  );
}

export function Seal({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
      <defs>
        <radialGradient id="seal-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#C8102E" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#C8102E" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="98" fill="url(#seal-glow)" />
      <circle cx="100" cy="100" r="74" stroke="#C8102E" strokeWidth="1.5" fill="none" opacity="0.6" />
      <circle cx="100" cy="100" r="62" stroke="#C8102E" strokeWidth="0.6" fill="none" opacity="0.4" />
      <text
        x="100"
        y="112"
        textAnchor="middle"
        fontFamily="Georgia, serif"
        fontWeight="700"
        fontSize="44"
        fill="#C8102E"
      >
        ΦΣΚ
      </text>
      <text
        x="100"
        y="138"
        textAnchor="middle"
        fontFamily="Inter, sans-serif"
        fontSize="9"
        letterSpacing="3"
        fill="#0B0B0C"
        opacity="0.55"
      >
        FOUNDED 1873
      </text>
    </svg>
  );
}

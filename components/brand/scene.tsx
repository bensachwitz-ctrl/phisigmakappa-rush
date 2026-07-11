/**
 * Scene cards — branded, self-contained "photo placeholders" that look intentional.
 * No external image dependencies → never break.
 */
import { cn } from "@/lib/utils";
import { IconMembers as Users, IconStanding as Trophy, IconAward as Award, IconService as HandHeart, IconLibrary as BookOpen, IconMusic as Music, IconFlame as Flame, IconStar as Star, IconCrown as Crown, IconBuilding as Building2, IconPin as MapPin, IconHeart as Heart } from "@/components/brand/icons";
import { Crest } from "@/components/brand/wordmark";

export type SceneTheme =
  | "brotherhood"
  | "gameday"
  | "formals"
  | "philanthropy"
  | "scholarship"
  | "socials"
  | "chapter"
  | "tradition";

const THEMES: Record<
  SceneTheme,
  {
    label: string;
    icon: typeof Users;
    gradient: string;
    accent: string;
    pattern: "stripes" | "dots" | "rays" | "checker" | "arch";
    motif: "stars" | "torch" | "crown" | "shield" | "columns" | "letters";
  }
> = {
  brotherhood: {
    label: "Brotherhood",
    icon: Users,
    gradient: "from-phisig-red via-phisig-red-dark to-phisig-red-dark",
    accent: "#FCEFF1",
    pattern: "rays",
    motif: "letters",
  },
  gameday: {
    label: "Game Day",
    icon: Trophy,
    gradient: "from-phisig-red-dark via-phisig-red to-phisig-ink",
    accent: "#FFFFFF",
    pattern: "stripes",
    motif: "stars",
  },
  formals: {
    label: "Formals",
    icon: Award,
    gradient: "from-zinc-900 via-zinc-800 to-phisig-red-dark",
    accent: "#FCEFF1",
    pattern: "dots",
    motif: "crown",
  },
  philanthropy: {
    label: "Philanthropy",
    icon: HandHeart,
    gradient: "from-phisig-red-dark via-phisig-red to-phisig-red-soft",
    accent: "#FFFFFF",
    pattern: "arch",
    motif: "shield",
  },
  scholarship: {
    label: "Scholarship",
    icon: BookOpen,
    gradient: "from-phisig-ink via-zinc-800 to-phisig-red",
    accent: "#FCEFF1",
    pattern: "checker",
    motif: "columns",
  },
  socials: {
    label: "Socials",
    icon: Music,
    gradient: "from-phisig-red via-phisig-red-dark to-phisig-red",
    accent: "#FFFFFF",
    pattern: "rays",
    motif: "torch",
  },
  chapter: {
    label: "The Chapter",
    icon: Building2,
    gradient: "from-zinc-900 to-phisig-red-dark",
    accent: "#FCEFF1",
    pattern: "arch",
    motif: "shield",
  },
  tradition: {
    label: "Tradition",
    icon: Crown,
    gradient: "from-phisig-red-dark via-phisig-red to-phisig-red-dark",
    accent: "#FFFFFF",
    pattern: "stripes",
    motif: "letters",
  },
};

export function Scene({
  theme,
  className,
  caption,
  size = "default",
}: {
  theme: SceneTheme;
  className?: string;
  caption?: string;
  size?: "default" | "tall" | "wide";
}) {
  const t = THEMES[theme];
  const Pattern = patternMap[t.pattern];
  const Motif = motifMap[t.motif];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border lift",
        "bg-gradient-to-br",
        t.gradient,
        size === "tall" && "min-h-[420px]",
        size === "wide" && "aspect-[16/9]",
        size === "default" && "aspect-[4/3]",
        className
      )}
    >
      <Pattern className="absolute inset-0 text-white opacity-20" />
      <Motif className="absolute -bottom-6 -right-6 h-44 w-44 text-white opacity-15" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/0 to-black/0" />

      <div className="relative h-full flex flex-col justify-end p-5 sm:p-6">
        <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-white/95 backdrop-blur px-2.5 py-1 text-[11px] font-medium text-foreground shadow">
          <t.icon className="h-3 w-3 text-phisig-red" /> {t.label}
        </span>
        {caption && (
          <p className="mt-3 text-white text-base sm:text-lg font-semibold tracking-tight max-w-xs">
            {caption}
          </p>
        )}
      </div>
    </div>
  );
}

/* ─── PATTERNS ─── */

function StripesPattern({ className }: { className?: string }) {
  return (
    <svg className={className} preserveAspectRatio="none" viewBox="0 0 100 100" aria-hidden>
      <defs>
        <pattern id="stripes" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="8" stroke="currentColor" strokeWidth="1.5" />
        </pattern>
      </defs>
      <rect width="100" height="100" fill="url(#stripes)" />
    </svg>
  );
}

function DotsPattern({ className }: { className?: string }) {
  return (
    <svg className={className} preserveAspectRatio="xMidYMid slice" viewBox="0 0 100 100" aria-hidden>
      <defs>
        <pattern id="dots" patternUnits="userSpaceOnUse" width="6" height="6">
          <circle cx="3" cy="3" r="0.8" fill="currentColor" />
        </pattern>
      </defs>
      <rect width="100" height="100" fill="url(#dots)" />
    </svg>
  );
}

function RaysPattern({ className }: { className?: string }) {
  return (
    <svg className={className} preserveAspectRatio="xMidYMid slice" viewBox="0 0 200 200" aria-hidden>
      <defs>
        <radialGradient id="rays-fade" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.5" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>
      {Array.from({ length: 16 }).map((_, i) => (
        <line
          key={i}
          x1="100" y1="100"
          x2={100 + 200 * Math.cos((i / 16) * Math.PI * 2)}
          y2={100 + 200 * Math.sin((i / 16) * Math.PI * 2)}
          stroke="currentColor"
          strokeWidth="1.5"
        />
      ))}
      <circle cx="100" cy="100" r="40" fill="url(#rays-fade)" />
    </svg>
  );
}

function CheckerPattern({ className }: { className?: string }) {
  return (
    <svg className={className} preserveAspectRatio="none" viewBox="0 0 100 100" aria-hidden>
      <defs>
        <pattern id="checker" patternUnits="userSpaceOnUse" width="14" height="14">
          <rect x="0" y="0" width="7" height="7" fill="currentColor" />
          <rect x="7" y="7" width="7" height="7" fill="currentColor" />
        </pattern>
      </defs>
      <rect width="100" height="100" fill="url(#checker)" />
    </svg>
  );
}

function ArchPattern({ className }: { className?: string }) {
  return (
    <svg className={className} preserveAspectRatio="xMidYMid slice" viewBox="0 0 200 200" aria-hidden>
      {[20, 60, 100, 140, 180].map((cy, i) => (
        <circle key={i} cx="100" cy={cy + 80} r={50 + i * 20} fill="none" stroke="currentColor" strokeWidth="1" />
      ))}
    </svg>
  );
}

const patternMap = {
  stripes: StripesPattern,
  dots: DotsPattern,
  rays: RaysPattern,
  checker: CheckerPattern,
  arch: ArchPattern,
} as const;

/* ─── MOTIFS ─── */

function StarsMotif({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      {[
        [50, 30], [25, 55], [75, 55], [35, 75], [65, 75],
      ].map(([cx, cy], i) => (
        <path
          key={i}
          d={`M ${cx} ${cy - 6} l 1.6 4.6 4.8 0 -3.9 2.9 1.5 4.6 -4 -2.8 -4 2.8 1.5 -4.6 -3.9 -2.9 4.8 0 z`}
          fill="currentColor"
        />
      ))}
    </svg>
  );
}

function TorchMotif({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <path d="M50 18 C42 28 42 38 50 46 C58 38 58 28 50 18 Z" fill="currentColor" />
      <rect x="44" y="50" width="12" height="30" fill="currentColor" />
      <rect x="38" y="80" width="24" height="6" fill="currentColor" />
    </svg>
  );
}

function CrownMotif({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <path d="M20 60 L20 35 L35 50 L50 25 L65 50 L80 35 L80 60 Z M20 65 L80 65 L80 75 L20 75 Z" fill="currentColor" />
    </svg>
  );
}

function ShieldMotif({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <path d="M50 12 L82 20 V42 C82 64 70 80 50 88 C30 80 18 64 18 42 V20 Z" fill="currentColor" />
    </svg>
  );
}

function ColumnsMotif({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      {[20, 50, 80].map((x) => (
        <g key={x}>
          <rect x={x - 6} y="20" width="12" height="60" fill="currentColor" />
          <rect x={x - 10} y="14" width="20" height="6" fill="currentColor" />
          <rect x={x - 10} y="80" width="20" height="6" fill="currentColor" />
        </g>
      ))}
    </svg>
  );
}

function LettersMotif({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <text
        x="50" y="68"
        textAnchor="middle"
        fontFamily='ui-serif, "Iowan Old Style", "Apple Garamond", "Source Serif Pro", Cambria, "Times New Roman", serif'
        fontWeight="700"
        fontSize="60"
        fill="currentColor"
      >
        ΦΣΚ
      </text>
    </svg>
  );
}

const motifMap = {
  stars: StarsMotif,
  torch: TorchMotif,
  crown: CrownMotif,
  shield: ShieldMotif,
  columns: ColumnsMotif,
  letters: LettersMotif,
} as const;

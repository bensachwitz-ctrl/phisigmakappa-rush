import type { Config } from "tailwindcss";

// R44 — Tailwind's default breakpoint set, inlined so we can prepend an
// `xs` (480px) tier without pulling in tailwindcss/defaultTheme internals.
const defaultScreens = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
};

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: {
        "2xl": "1280px",
      },
    },
    // R44 — register the `xs` breakpoint (480px) so the responsive
    // `xs:grid-cols-2` polish added on the homepage contact grid actually
    // generates. Tailwind's default screen set has no `xs`, so the class
    // was silently dead before this. Spreading defaultTheme.screens keeps
    // sm/md/lg/xl/2xl intact and just prepends xs.
    screens: {
      xs: "480px",
      ...defaultScreens,
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Brand color tokens — bound to CSS custom properties so admin can
        // override at runtime via app/layout.tsx's inline <style> tag (which
        // reads from cfg["brand.primaryHex"], etc.). Default values match
        // the Phi Sigma Kappa cardinal ramp (#C8102E / #A20D26 / #FCEFF1).
        // Each chapter sets their own school color in /admin/settings without
        // a rebuild — every component using bg-phisig-red, text-phisig-red,
        // etc. picks up the override on next page load.
        phisig: {
          red: "var(--brand-primary, #C8102E)",
          "red-dark": "var(--brand-primary-dark, #A20D26)",
          "red-soft": "var(--brand-primary-soft, #FCEFF1)",
          ink: "#0B0B0C",
          paper: "#FFFFFF",
          mist: "#F5F5F7",
        },
        // ── Secondary / accent brand color (the platform's royal-blue+gold
        //    "gold"). Bound to the `--brand-secondary` CSS var that
        //    app/layout.tsx injects from cfg["brand.secondaryHex"], with the
        //    platform gold #f59e0b as the static fallback. The Modern (hero-split)
        //    + Bold (hero-banner) chapter-site templates read this via
        //    `bg-brand-secondary` / `text-brand-secondary` / `border-brand-secondary`
        //    so their accent recolors per chapter with no rebuild. The Classic
        //    template never references it, so Classic stays pixel-identical.
        "brand-secondary": "var(--brand-secondary, #f59e0b)",
        // ── R49 BRAND UNIFICATION ────────────────────────────────────────────
        // The logged-in member + alumni portals were originally painted off a
        // static maroon/cream ramp that had NOTHING to do with the royal-blue +
        // gold Greekstack identity, and — worse — ignored the per-chapter
        // `--brand-primary` override, so a navy/gold chapter still saw a maroon
        // dashboard (white-label was broken on the whole authenticated surface).
        //
        // Rather than touch-edit ~590 class references across 29 files (high
        // risk on CSS — see the "line-range strip is unsafe" rule), we REDEFINE
        // the two ramps here so every `text-maroon-900`, `bg-cream-50`,
        // `from-maroon-700`, etc. retints in place with the lightness ordering
        // preserved. The mid "brand" shades (500–700 / 850) are bound to the
        // live `--brand-primary*` CSS vars, so the dashboards now follow the
        // chapter's school color exactly like the rest of the product. The
        // structural extremes (deep navy ink at 900–950, pale blue tints at
        // 50–200) stay fixed so contrast/AA is stable regardless of school hue.
        //
        // `maroon-*` → structural NEUTRAL ramp with a live brand accent band.
        // R49 rebound the mid shades (400–700) to --brand-primary* so the portal
        // accents follow the chapter color — but the EXTREMES stayed a fixed
        // COOL-BLUE (50–300) + NAVY (750–950). On a non-blue chapter that reads
        // as "brand accents on the wrong-hue tints + navy ink" — the half-Phi-Sig
        // / two-tone bug on the authed surface. Fix: the STRUCTURAL tints + ink
        // are now HUE-NEUTRAL — low-saturation color-mix that pulls a whisper of
        // the LIVE --brand-primary into an otherwise neutral gray, so the tint
        // subtly harmonizes with ANY school hue instead of committing to blue.
        // The accent band (400–700) stays inside the live brand colors; contrast
        // is stable because the tints are near-white and the ink is near-black
        // regardless of hue. Each color-mix carries a neutral-gray static
        // fallback for the --brand-primary var and for no-color-mix engines.
        maroon: {
          50: 'color-mix(in srgb, var(--brand-primary, #2563eb) 5%, #f7f7f8)',   // near-white wash — card/section tints
          100: 'color-mix(in srgb, var(--brand-primary, #2563eb) 8%, #ededf0)',  // hairline borders / dividers
          200: 'color-mix(in srgb, var(--brand-primary, #2563eb) 12%, #e1e1e6)', // soft borders / chips
          300: 'color-mix(in srgb, var(--brand-primary, #2563eb) 18%, #cbcbd3)', // stronger borders
          // 400 → brand-DARK ramp (AA fix): the old fixed #5e8af0 is only ~3.30:1
          // on white and was used as informational text in ~20 portal spots, which
          // fails WCAG AA (4.5:1). Bind it to --brand-primary-dark (the AA-floored
          // dark token, ~6.7:1 default) so every text-maroon-400 clears AA while
          // icon/placeholder/decorative uses simply pick up the brand-dark hue.
          400: 'var(--brand-primary-dark, #1d4ed8)',
          // 500–700: the live brand band — follows the chapter's school color.
          500: 'var(--brand-primary, #2563eb)',
          600: 'var(--brand-primary, #2563eb)',
          650: 'var(--brand-primary-dark, #1d4ed8)',
          700: 'var(--brand-primary-dark, #1d4ed8)',
          // 750–950 → NEAR-NEUTRAL INK. Deep, near-black grays with only a faint
          // brand cast (color-mix) so body copy + dark gradient stops read on
          // white at AA on any chapter instead of committing to a fixed navy.
          750: 'color-mix(in srgb, var(--brand-primary, #2563eb) 22%, #2c2c31)',
          800: 'color-mix(in srgb, var(--brand-primary, #2563eb) 18%, #242429)', // deep gradient stop
          850: 'color-mix(in srgb, var(--brand-primary, #2563eb) 14%, #1c1c21)',
          900: 'color-mix(in srgb, var(--brand-primary, #2563eb) 10%, #17171b)', // primary body text — near-neutral ink (~16:1 on white)
          950: 'color-mix(in srgb, var(--brand-primary, #2563eb) 7%, #0e0e11)',  // darkest ink / on-accent text
        },
        // `cream-*` → warm ACCENT ramp for the ALUMNI surfaces. Rebound from a
        // FIXED parchment to the live --brand-secondary (platform gold #f59e0b by
        // default) via low-saturation color-mix into near-white paper, so the
        // alumni accent follows the chapter's secondary color instead of always
        // reading warm-gold on a navy chapter. Static gold fallbacks keep the
        // platform look pixel-close when no secondary override is set.
        cream: {
          50: 'color-mix(in srgb, var(--brand-secondary, #f59e0b) 5%, #fffdf6)',   // warmest paper — page/card backgrounds
          100: 'color-mix(in srgb, var(--brand-secondary, #f59e0b) 11%, #fdf8ec)', // soft accent surface
          200: 'color-mix(in srgb, var(--brand-secondary, #f59e0b) 22%, #f6ead0)', // accent border / band
          300: 'color-mix(in srgb, var(--brand-secondary, #f59e0b) 38%, #eeda9f)', // accent edge
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      // Named tokens for the spring/bounce easings + 380ms/1400ms durations used
      // across the marketing/onboarding surfaces and mobile shell. Promotes the
      // arbitrary ease-[cubic-bezier(...)] / duration-[...ms] classes (which
      // Tailwind logs as "ambiguous … matches multiple utilities" on every
      // build) to clean ease-gs-spring / ease-gs-bounce / duration-380 /
      // duration-1400 utilities.
      transitionTimingFunction: {
        "gs-spring": "cubic-bezier(0.16,1,0.3,1)",
        "gs-bounce": "cubic-bezier(0.34,1.56,0.64,1)",
      },
      transitionDuration: {
        "380": "380ms",
        "1400": "1400ms",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui"],
        // Cinzel — Trajan-inscription Roman capitals (the classical DISPLAY face).
        // Wordmark, headings, nav brand, CTA labels, login titles.
        display: ["var(--font-display)", "ui-serif", "Georgia", "serif"],
        // Cormorant Garamond — elegant classical serif for taglines + intro copy.
        serif: ["var(--font-serif)", "ui-serif", "Georgia", "serif"],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.4s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;

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
        // `maroon-*` → ROYAL-BLUE / NAVY ramp (50 pale → 950 deep navy ink).
        maroon: {
          50: '#eff5ff',   // pale blue wash (was near-white pink) — card/section tints
          100: '#dbe7fe',  // hairline borders / dividers
          200: '#bcd2fb',  // soft borders / chips
          300: '#93b4f8',
          400: '#5e8af0',
          // 500–700: the live brand band — follows the chapter's school color.
          500: 'var(--brand-primary, #2563eb)',
          600: 'var(--brand-primary, #2563eb)',
          650: 'var(--brand-primary-dark, #1d4ed8)',
          700: 'var(--brand-primary-dark, #1d4ed8)',
          750: '#1a3da8',
          800: '#17357f',  // deep navy gradient stop
          850: '#122a63',
          900: '#0f2350',  // primary body text — deep navy (≈11:1 on white)
          950: '#0a1838',  // darkest ink / on-gold text
        },
        // `cream-*` → warm GOLD / PARCHMENT ramp (light surfaces + on-navy text).
        cream: {
          50: '#fffdf6',   // warmest paper — page/card backgrounds on the portal
          100: '#fdf6e3',  // soft gold-tinted surface
          200: '#f8e7bf',  // gold border / band
          300: '#f0d089',  // gold accent edge
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      // Named tokens for the spring easing + 380ms duration used across the
      // marketing/onboarding surfaces. Promotes the arbitrary
      // ease-[cubic-bezier(0.16,1,0.3,1)] / duration-[380ms] classes (which
      // Tailwind logs as "ambiguous … matches multiple utilities" on every
      // build) to clean ease-gs-spring / duration-380 utilities.
      transitionTimingFunction: {
        "gs-spring": "cubic-bezier(0.16,1,0.3,1)",
      },
      transitionDuration: {
        "380": "380ms",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui"],
        display: ["var(--font-display)", "ui-serif", "Georgia"],
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

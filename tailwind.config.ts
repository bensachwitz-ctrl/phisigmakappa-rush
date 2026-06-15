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
        maroon: {
          50: '#fef2f2',
          100: '#fde6e7',
          200: '#f9c1c3',
          400: '#c8505a',
          500: '#a83040',
          600: '#8b2234',
          700: '#6f1b2a',
          800: '#5a1523',
          900: '#4a111d',
          950: '#2d0a12',
        },
        cream: {
          50: '#fefdfb',
          100: '#fdf8f0',
          200: '#f8ecd8',
          300: '#f2dbb8',
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

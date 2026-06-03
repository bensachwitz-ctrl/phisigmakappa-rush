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
        // Portal accent ramp — bound to CSS vars (HSL channels) so the whole
        // member-facing surface re-tints to the chapter brand color set in
        // app/layout.tsx. <alpha-value> keeps bg-maroon-600/20 opacity working.
        maroon: {
          50: "hsl(var(--maroon-50) / <alpha-value>)",
          100: "hsl(var(--maroon-100) / <alpha-value>)",
          200: "hsl(var(--maroon-200) / <alpha-value>)",
          400: "hsl(var(--maroon-400) / <alpha-value>)",
          500: "hsl(var(--maroon-500) / <alpha-value>)",
          600: "hsl(var(--maroon-600) / <alpha-value>)",
          700: "hsl(var(--maroon-700) / <alpha-value>)",
          800: "hsl(var(--maroon-800) / <alpha-value>)",
          900: "hsl(var(--maroon-900) / <alpha-value>)",
          950: "hsl(var(--maroon-950) / <alpha-value>)",
        },
        cream: {
          50: "hsl(var(--cream-50) / <alpha-value>)",
          100: "hsl(var(--cream-100) / <alpha-value>)",
          200: "hsl(var(--cream-200) / <alpha-value>)",
          300: "hsl(var(--cream-300) / <alpha-value>)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
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

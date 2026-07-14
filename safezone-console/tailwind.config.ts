import type { Config } from "tailwindcss";

/**
 * Swiss / International Typographic system.
 * Values live in src/app/globals.css as CSS custom properties; this file only
 * exposes them to Tailwind. Tailwind's default 4px spacing scale already
 * matches the module, so it is left alone.
 */
const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "2rem", screens: { "2xl": "1400px" } },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        "border-strong": "hsl(var(--border-strong))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },

        // Signal colors. Each is a pair: DEFAULT paints surfaces and rules,
        // `ink` is the contrast-checked text value. Never use DEFAULT for text.
        critical: {
          DEFAULT: "hsl(var(--critical))",
          ink: "hsl(var(--critical-ink))",
          foreground: "hsl(var(--critical-foreground))",
        },
        high: {
          DEFAULT: "hsl(var(--high))",
          ink: "hsl(var(--high-ink))",
          foreground: "hsl(var(--high-foreground))",
        },
        medium: {
          DEFAULT: "hsl(var(--medium))",
          ink: "hsl(var(--medium-ink))",
          foreground: "hsl(var(--medium-foreground))",
        },
        low: {
          DEFAULT: "hsl(var(--low))",
          ink: "hsl(var(--low-ink))",
          foreground: "hsl(var(--low-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          ink: "hsl(var(--success-ink))",
          foreground: "hsl(var(--success-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
      },

      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 1px)",
        sm: "calc(var(--radius) - 1px)",
      },

      // Named so they cannot collide with the signal color names above —
      // `border-l-medium` must be unambiguous.
      borderWidth: {
        hair: "var(--rule-hairline)",
        rule: "var(--rule-medium)",
        bar: "var(--rule-heavy)",
      },

      fontFamily: {
        sans: ["var(--font-archivo)", "var(--font-noto-lao)", "system-ui", "sans-serif"],
        lao: ["var(--font-noto-lao)", "Phetsarath OT", "sans-serif"],
        mono: ["var(--font-jetbrains)", "ui-monospace", "monospace"],
      },

      fontSize: {
        // Tailwind's default ramp is retained. These are the additions that
        // give the system its scale contrast.
        "2xs": ["var(--text-2xs)", { lineHeight: "var(--leading-normal)" }],
        stat: ["var(--text-2xl)", { lineHeight: "var(--leading-tight)", letterSpacing: "var(--tracking-tight)" }],
        hero: ["var(--text-4xl)", { lineHeight: "var(--leading-tight)", letterSpacing: "var(--tracking-tight)" }],
      },

      letterSpacing: {
        tightest: "var(--tracking-tight)",
        wide: "var(--tracking-wide)",
        wider: "var(--tracking-wider)",
      },

      lineHeight: {
        lao: "var(--leading-lao)",
      },

      boxShadow: {
        // Swiss is flat. Depth comes from rules. The only sanctioned shadows
        // are the focus ring and a true overlay (modal/dropdown).
        focus: "var(--shadow-focus)",
        overlay: "var(--shadow-overlay)",
        none: "none",
      },

      width: { sidebar: "var(--sidebar-width)" },
      maxWidth: { page: "var(--max-width-page)" },

      transitionTimingFunction: {
        DEFAULT: "var(--easing-default)",
        out: "var(--easing-out)",
      },
      transitionDuration: {
        fast: "var(--duration-fast)",
        DEFAULT: "var(--duration-normal)",
      },

      keyframes: {
        // Reserved for CRITICAL cases in the NEW state. Nothing else may pulse.
        "pulse-rule": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
      },
      animation: {
        "pulse-rule": "pulse-rule 1.6s var(--easing-default) infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;

import type { Config } from "tailwindcss";

export default {
  /* Dark mode remains configured as a class toggle, but no `.dark` block
   * is defined in index.css — Linear design is light-only (2026-04). */
  darkMode: "class",
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      screens: {
        "3xl": "1920px",
        "4xl": "2560px",
      },
      fontFamily: {
        sans: ['"Inter"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'system-ui', 'sans-serif'],
        display: ['"Inter"', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        serif: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        // Linear-scale
        "display-xl": ["26px", { lineHeight: "1.1", letterSpacing: "-0.03em", fontWeight: "600" }],
        "display-lg": ["22px", { lineHeight: "1.15", letterSpacing: "-0.025em", fontWeight: "600" }],
        "display-md": ["20px", { lineHeight: "1.2", letterSpacing: "-0.02em", fontWeight: "600" }],
        "display-sm": ["17px", { lineHeight: "1.25", letterSpacing: "-0.015em", fontWeight: "600" }],
        "eyebrow": ["10.5px", { lineHeight: "1", letterSpacing: "0.06em", fontWeight: "600" }],
        "kpi": ["26px", { lineHeight: "1.05", letterSpacing: "-0.02em", fontWeight: "600" }],
      },
      colors: {
        border: "hsl(var(--border))",
        "border-strong": "hsl(var(--border-strong))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",

        /* Surface tokens */
        bg: "hsl(var(--bg))",
        "bg-subtle": "hsl(var(--bg-subtle))",
        "bg-muted": "hsl(var(--bg-muted))",
        surface: "hsl(var(--surface))",

        /* Text */
        text: "hsl(var(--text))",
        "text-muted": "hsl(var(--text-muted))",
        "text-subtle": "hsl(var(--text-subtle))",

        /* Linear accent */
        "accent-soft": "hsl(var(--accent-soft))",
        "accent-text": "hsl(var(--accent-text))",
        "accent-hover": "hsl(var(--accent-hover))",

        /* Brand legacy */
        navy: {
          DEFAULT: "hsl(var(--navy))",
          soft: "hsl(var(--navy-soft))",
          deep: "hsl(var(--navy-deep))",
        },
        turquoise: {
          DEFAULT: "hsl(var(--turquoise))",
          dark: "hsl(var(--turquoise-dark))",
          soft: "hsl(var(--turquoise-soft))",
        },

        /* Editorial legacy shims */
        cream: "hsl(var(--cream))",
        paper: "hsl(var(--paper))",
        ink: "hsl(var(--ink))",
        stone: "hsl(var(--stone))",
        dust: "hsl(var(--dust))",
        clay: "hsl(var(--clay))",
        gold: "hsl(var(--gold))",

        /* Semantic */
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
          soft: "hsl(var(--accent-soft))",
          text: "hsl(var(--accent-text))",
          hover: "hsl(var(--accent-hover))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        status: {
          green: "hsl(var(--status-green))",
          "green-soft": "hsl(var(--status-green-soft))",
          amber: "hsl(var(--status-amber))",
          "amber-soft": "hsl(var(--status-amber-soft))",
          yellow: "hsl(var(--status-amber))",
          red: "hsl(var(--status-red))",
          "red-soft": "hsl(var(--status-red-soft))",
          blue: "hsl(var(--status-blue))",
          "blue-soft": "hsl(var(--status-blue-soft))",
          purple: "hsl(var(--status-purple))",
          "purple-soft": "hsl(var(--status-purple-soft))",
        },
        prio: {
          urgent: "hsl(var(--prio-urgent))",
          high: "hsl(var(--prio-high))",
          med: "hsl(var(--prio-med))",
          low: "hsl(var(--prio-low))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      boxShadow: {
        "ds-sm": "var(--shadow-sm)",
        "ds-md": "var(--shadow-md)",
        "ds-lg": "var(--shadow-lg)",
        "popup": "var(--shadow-popup)",
        "editorial": "var(--shadow-sm)",
        "editorial-lg": "var(--shadow-lg)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
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
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "blink": {
          "50%": { opacity: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.18s ease-out",
        "accordion-up": "accordion-up 0.18s ease-out",
        "fade-in": "fade-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-up": "slide-up 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        "blink": "blink 1s infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;

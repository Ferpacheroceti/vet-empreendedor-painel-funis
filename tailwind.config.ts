import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        brand: {
          purple: "#5003ef",
          orange: "#ff5000",
        },
        card: {
          DEFAULT: "#12121a",
          foreground: "rgba(255,255,255,0.87)",
        },
        border: "rgba(255,255,255,0.07)",
        input: "rgba(255,255,255,0.07)",
        ring: "#5003ef",
        primary: {
          DEFAULT: "#5003ef",
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "#ff5000",
          foreground: "#ffffff",
        },
        muted: {
          DEFAULT: "#1a1a26",
          foreground: "rgba(255,255,255,0.5)",
        },
        accent: {
          DEFAULT: "#1e1e2e",
          foreground: "rgba(255,255,255,0.87)",
        },
        destructive: {
          DEFAULT: "#ef4444",
          foreground: "#ffffff",
        },
        popover: {
          DEFAULT: "#12121a",
          foreground: "rgba(255,255,255,0.87)",
        },
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.375rem",
      },
      fontFamily: {
        syne: ["var(--font-syne)", "sans-serif"],
        "dm-mono": ["var(--font-dm-mono)", "monospace"],
        "dm-sans": ["var(--font-dm-sans)", "sans-serif"],
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
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "pulse-slow": "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;

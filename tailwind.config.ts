import type { Config } from "tailwindcss";

// Brand tokens from the Online Data Sub logo; expanded for a premium fintech feel.
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "#2C5AA0",
          blueDark: "#1A3A6B",
          blueDeep: "#122848",
          blueSoft: "#E8F0FA",
          red: "#A3342E",
          redSoft: "#FCECEA",
          gold: "#8C6A22",
          goldSoft: "#F7F1E3",
          ink: "#0F172A",
          muted: "#64748B",
          line: "#E8ECF2",
          surface: "#F4F4FA",
        },
      },
      fontFamily: {
        display: ["var(--font-sora)", "Sora", "system-ui", "sans-serif"],
        body: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        soft: "0 4px 24px -4px rgba(15, 23, 42, 0.08)",
        card: "0 8px 30px -8px rgba(44, 90, 160, 0.14)",
        glow: "0 12px 40px -12px rgba(44, 90, 160, 0.45)",
        nav: "0 -8px 30px -12px rgba(15, 23, 42, 0.12)",
        pin: "0 2px 8px rgba(15, 23, 42, 0.06)",
      },
      borderRadius: {
        "2.5xl": "1.25rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      backgroundImage: {
        // Keep in sync with --mesh-light in globals.css
        "mesh-light":
          "radial-gradient(ellipse 90% 55% at 15% -8%, rgba(124, 92, 196, 0.07), transparent 70%), linear-gradient(180deg, #F9F8FC 0%, #EEEEF7 52%, #F9F8FC 100%)",
        "wallet-card":
          "linear-gradient(145deg, #3B6BB8 0%, #2C5AA0 42%, #1A3A6B 100%)",
        "gold-card":
          "linear-gradient(150deg, #F8F1DF 0%, #FFFFFF 55%, #F3ECDA 100%)",
      },
      animation: {
        "fade-up": "fadeUp 0.45s ease-out both",
        "scale-in": "scaleIn 0.25s ease-out both",
      },
      keyframes: {
        // Opacity only — a lasting transform breaks position:sticky headers
        fadeUp: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
    },
  },
  darkMode: "class",
  plugins: [],
};
export default config;

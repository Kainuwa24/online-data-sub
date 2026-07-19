import type { Config } from "tailwindcss";

// Brand tokens pulled from the "Online Data Sub" logo: chrome blue + red,
// gold reserved only for the Watch (gold & stocks) page.
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "#2C5AA0",
          blueDark: "#1E4478",
          red: "#A3342E",
          gold: "#8C6A22",
        },
      },
      fontFamily: {
        display: ["Sora", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  darkMode: "class",
  plugins: [],
};
export default config;

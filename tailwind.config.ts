import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: [
          "var(--font-display)",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
      },
      colors: {
        // Single red accent replaces gold — more editorial, less Vegas
        accent: {
          DEFAULT: "#EF4444",
          dim: "#7F1D1D",
        },
      },
      boxShadow: {
        "glow-accent": "0 0 60px -10px rgba(239, 68, 68, 0.45)",
        "glow-white": "0 0 50px -12px rgba(255, 255, 255, 0.18)",
        card: "0 24px 80px -32px rgba(0, 0, 0, 0.95)",
      },
    },
  },
  plugins: [],
};

export default config;

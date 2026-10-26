import type { Config } from "tailwindcss";

// Tailwind scans these folders for class names so they are included in the CSS.
// Design tokens follow design/STYLE.md (Cyber Serif, adapted). Motion lives here so every
// breathing, morphing and reveal effect is one class name.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#050505",
        bone: "#EBEBEB",
      },
      fontFamily: {
        serif: ["Newsreader", "Georgia", "'Times New Roman'", "serif"],
        sans: ["Inter", "system-ui", "-apple-system", "'Segoe UI'", "sans-serif"],
        grotesk: ["'Space Grotesk'", "Inter", "system-ui", "sans-serif"],
      },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        breathe: {
          "0%, 100%": { transform: "scale(1)", opacity: "0.55" },
          "50%": { transform: "scale(1.06)", opacity: "0.9" },
        },
        morph: {
          "0%": { borderRadius: "40% 60% 60% 40% / 70% 30% 70% 30%" },
          "100%": { borderRadius: "60% 40% 40% 60% / 30% 70% 30% 70%" },
        },
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        "fade-rise": {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "none" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(16,185,129,0), 0 0 22px rgba(16,185,129,0.22)" },
          "50%": { boxShadow: "0 0 0 6px rgba(16,185,129,0.06), 0 0 38px rgba(16,185,129,0.42)" },
        },
        "loader-ring": {
          "0%, 100%": { transform: "scale(0.82)", opacity: "0.35" },
          "50%": { transform: "scale(1.12)", opacity: "1" },
        },
        "dot-pulse": {
          "0%, 100%": { opacity: "0.35", transform: "scale(0.9)" },
          "50%": { opacity: "1", transform: "scale(1.1)" },
        },
        "rise-soft": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "none" },
        },
      },
      animation: {
        breathe: "breathe 5s ease-in-out infinite",
        "breathe-slow": "breathe 6s ease-in-out infinite",
        morph: "morph 8s ease-in-out infinite alternate",
        shimmer: "shimmer 4s linear infinite",
        "fade-rise": "fade-rise 0.9s cubic-bezier(0.16, 1, 0.3, 1) both",
        "glow-pulse": "glow-pulse 4.8s ease-in-out infinite",
        "loader-ring": "loader-ring 1.8s ease-in-out infinite",
        "dot-pulse": "dot-pulse 1.8s ease-in-out infinite",
        "rise-soft": "rise-soft 0.6s cubic-bezier(0.16, 1, 0.3, 1) both",
      },
    },
  },
  plugins: [],
};

export default config;

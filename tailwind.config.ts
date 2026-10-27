import type { Config } from "tailwindcss";

// Cyber Serif (dark). The palette is remapped so existing slate/blue/red classes render the spec colours.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#050505",
        surface: "#070707",
        ink: "#EBEBEB",
        muted: "#949494",
        emerald: { 500: "#10B981", 600: "#10B981", 700: "#34d399" },
        slate: {
          50: "#050505",
          100: "#171717",
          200: "rgba(255,255,255,0.1)",
          300: "rgba(255,255,255,0.14)",
          400: "#6b6b6b",
          500: "#949494",
          600: "#b5b5b5",
          700: "#cfcfcf",
          800: "#e0e0e0",
          900: "#EBEBEB",
        },
        blue: { 50: "#062d20", 100: "#0a3d2b", 200: "#0f5a41", 300: "#0f5a41", 400: "#34d399", 500: "#10B981", 600: "#10B981", 700: "#34d399", 800: "#6ee7b7" },
        red: { 50: "#2a0f0f", 100: "#3b1414", 200: "#5b1d1d", 300: "#fca5a5", 400: "#f87171", 500: "#ef4444", 600: "#dc2626", 700: "#f87171", 800: "#fecaca" },
        amber: { 50: "#2a200b", 100: "#2a200b", 200: "#5c4511", 300: "#fcd34d", 400: "#fbbf24", 500: "#f59e0b", 600: "#d97706", 700: "#fcd34d", 800: "#fde68a" },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        serif: ["var(--font-newsreader)", "Newsreader", "Georgia", "serif"],
        mono: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
      },
      borderRadius: { xl: "12px", "2xl": "12px", "3xl": "12px" },
      transitionTimingFunction: { snap: "cubic-bezier(0.16,1,0.3,1)" },
    },
  },
  plugins: [],
};

export default config;

import type { Config } from "tailwindcss";
const config: Config = { content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"], theme: { extend: { colors: { ink: "#050505", emerald: "#10B981" }, fontFamily: { display: ["Newsreader", "Georgia", "serif"], sans: ["Inter", "Arial", "sans-serif"] } } }, plugins: [] };
export default config;

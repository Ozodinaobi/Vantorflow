"use client";

import { ReactNode } from "react";

// Shared UI primitives for the Cyber Serif theme.

// Shimmer loader: a muted bar with a moving highlight, plus an optional label.
export function BreathingLoader({ label, className = "" }: { label?: string; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={`inline-flex flex-col gap-2 text-sm ${className}`} style={{ color: "#949494" }}>
      {label && <span>{label}</span>}
      <span className="shimmer block h-1 w-40 rounded-full" aria-hidden="true" />
      <span className="sr-only">{label ?? "Loading"}</span>
    </div>
  );
}

// Page-level loading state: a centred shimmer.
export function LoadingBlock({ label }: { label: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <BreathingLoader label={label} />
    </div>
  );
}

// Skeleton block for lists and cards while data loads.
export function Skeleton({ className = "h-4 w-full" }: { className?: string }) {
  return <div aria-hidden="true" className={`shimmer rounded ${className}`} />;
}

// Number display. Renders the value directly.
export function CountUp({ value, suffix = "" }: { value: number; suffix?: string }) {
  return (
    <span className="tabular-nums">
      {value}
      {suffix}
    </span>
  );
}

// Wrapper kept for layout consistency. Renders children immediately.
export function Reveal({ children, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  return <div className={className}>{children}</div>;
}

// Glass card: 2% fill, 1px 10% white border, backdrop blur.
export function SpotlightCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`card ${className}`}>{children}</div>;
}

// Kept as an empty element so existing call sites still compile.
export function GlowOrbs({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`pointer-events-none absolute inset-0 ${className}`} />;
}

// Vantorflow mark: an open ring in #EBEBEB, with an emerald arc and terminal dot.
// With wordmark=true it also renders the "Vantorflow" name in Newsreader.
export function LogoMark({ size = 32, wordmark = false, className = "" }: { size?: number; wordmark?: boolean; className?: string }) {
  const mark = (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
      {/* Open ring in #EBEBEB, leaving the upper-right gap. */}
      <path d="M19.794 7.5 A9 9 0 1 1 3 12" stroke="#EBEBEB" strokeWidth="2.2" strokeLinecap="round" />
      {/* Emerald accent arc closing the upper-left quadrant. */}
      <path d="M3 12 A9 9 0 0 1 12 3" stroke="#10B981" strokeWidth="2.2" strokeLinecap="round" />
      {/* Emerald terminal dot at the open end. */}
      <circle cx="19.794" cy="7.5" r="1.9" fill="#10B981" />
    </svg>
  );
  if (!wordmark) return <span className={`inline-flex ${className}`}>{mark}</span>;
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      {mark}
      <span className="font-serif font-medium leading-none tracking-tight" style={{ fontSize: size * 0.82, color: "#EBEBEB" }}>
        Vantorflow
      </span>
    </span>
  );
}

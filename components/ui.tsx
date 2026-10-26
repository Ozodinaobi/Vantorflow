"use client";

import { ReactNode } from "react";

// Shared UI primitives. Static, enterprise-style: no pulsing, no count-up, no cursor effects.

// Simple spinner (CSS rotation only, no pulsing or breathing).
export function BreathingLoader({ label, className = "" }: { label?: string; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={`inline-flex items-center gap-2.5 text-sm text-slate-500 ${className}`}>
      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" aria-hidden="true" />
      {label && <span>{label}</span>}
      <span className="sr-only">{label ?? "Loading"}</span>
    </div>
  );
}

// Page-level loading state: a centred spinner.
export function LoadingBlock({ label }: { label: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <BreathingLoader label={label} />
    </div>
  );
}

// Skeleton block for lists and cards while data loads.
export function Skeleton({ className = "h-4 w-full" }: { className?: string }) {
  return <div aria-hidden="true" className={`rounded bg-slate-200 ${className}`} />;
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

// Plain white card (formerly the cursor-spotlight card).
export function SpotlightCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`card ${className}`}>{children}</div>;
}

// Decorative glow removed. Kept as an empty element so existing call sites still compile.
export function GlowOrbs({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`pointer-events-none absolute inset-0 ${className}`} />;
}

// Logo: a blue rounded square with the same command glyph, no spin.
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex items-center justify-center rounded-lg bg-blue-600 text-white"
      style={{ width: size, height: size }}
    >
      <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 9V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V9z" />
      </svg>
    </span>
  );
}

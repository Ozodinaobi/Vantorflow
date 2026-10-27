"use client";

import { ReactNode } from "react";

// Shared UI primitives for the Cyber Serif theme.

// Breathing loader: three emerald dots with a staggered pulse, plus an sr-only label.
export function BreathingLoader({ label, className = "" }: { label?: string; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={`inline-flex flex-col items-center gap-3 text-sm ${className}`} style={{ color: "#949494" }}>
      <span className="flex items-center gap-1.5" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span key={i} className="breathe-dot h-1.5 w-1.5 rounded-full bg-emerald-500" style={{ animationDelay: `${i * 0.18}s` }} />
        ))}
      </span>
      {label && <span>{label}</span>}
      <span className="sr-only">{label ?? "Loading"}</span>
    </div>
  );
}

// Premium empty state: glass card, breathing ring, serif headline, one action.
export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state enter">
      <div className="empty-ring">{icon ?? <span className="breathe-dot h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />}</div>
      <h3 className="text-ink">{title}</h3>
      <p>{body}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

// Page-level loading state: a centred breathing loader.
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
      {/* Open ring in #EBEBEB, black gap at the top (measured from the approved reference artwork). */}
      <path d="M 16.408 8.339 A 5.752 5.752 0 1 1 7.408 8.574" stroke="#EBEBEB" strokeWidth="1.8" fill="none" />
      {/* Emerald arc across the top of the gap, on the same radius. */}
      <path d="M 10.035 6.631 A 5.752 5.752 0 0 1 15.699 7.630" stroke="#10B981" strokeWidth="1.8" fill="none" />
      {/* Emerald dot, top-right. */}
      <circle cx="19.031" cy="4.968" r="1.311" fill="#10B981" />
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

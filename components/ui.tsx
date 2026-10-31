"use client";

import { ReactNode, useEffect, useRef, useState, MouseEvent } from "react";

// ---------- Breathing loader: a soft pulsing emerald ring with a dot. Replaces every spinner. ----------
export function BreathingLoader({ label, className = "" }: { label?: string; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={`inline-flex items-center gap-3 ${className}`}>
      <span className="relative flex h-6 w-6 items-center justify-center" aria-hidden="true">
        <span className="absolute inset-0 rounded-full border border-emerald-500/60 animate-loader-ring" />
        <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.8)] animate-dot-pulse" />
      </span>
      {label && <span className="text-sm text-white/50">{label}</span>}
      <span className="sr-only">{label ?? "Loading"}</span>
    </div>
  );
}

// Full-width loading block for page-level states.
export function LoadingBlock({ label }: { label: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <BreathingLoader label={label} />
    </div>
  );
}

// ---------- Count-up number. Animates once when it scrolls into view. Respects reduced motion. ----------
export function CountUp({ value, suffix = "", duration = 1400 }: { value: number; suffix?: string; duration?: number }) {
  const [shown, setShown] = useState(0);
  const ref = useRef<HTMLSpanElement | null>(null);
  const started = useRef(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const el = ref.current;
    if (!el) return;
    const run = () => {
      if (started.current) return;
      started.current = true;
      if (reduce) {
        setShown(value);
        return;
      }
      const t0 = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - t0) / duration);
        const eased = 1 - Math.pow(1 - p, 4); // ease-out quart, close to the house curve
        setShown(Math.round(value * eased));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    if (!("IntersectionObserver" in window)) {
      run();
      return;
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && run()),
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [value, duration]);

  return (
    <span ref={ref} className="tabular-nums">
      {shown}
      {suffix}
    </span>
  );
}

// ---------- Scroll reveal: fades and rises when the element enters the viewport. ----------
export function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${inView ? "is-in" : ""} ${className}`}
      style={{ ["--reveal-delay" as string]: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

// ---------- Spotlight card: a radial emerald glow follows the cursor. ----------
export function SpotlightCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  function onMove(e: MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
  }
  return (
    <div onMouseMove={onMove} className={`spotlight glass rounded-3xl ${className}`}>
      {children}
    </div>
  );
}

// ---------- Morphing glow orbs. Decorative, aria-hidden, clipped by the parent. ----------
export function GlowOrbs({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <span className="glow-orb h-96 w-96 -left-24 top-10 opacity-60" />
      <span
        className="glow-orb h-80 w-80 right-[-60px] bottom-0 opacity-40"
        style={{ animationDelay: "-3s, -2s", animationDuration: "8s, 6s" }}
      />
    </div>
  );
}

// ---------- Logo: approved mark on its dark background, spins 360 degrees on hover. ----------
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <img
      src="/logo-mark.png"
      alt=""
      aria-hidden="true"
      className="group/logo inline-flex rounded-xl bg-[#050505] object-cover transition-transform duration-[900ms] hover:rotate-[360deg]"
      style={{ width: size, height: size, transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1)" }}
    />
  );
}

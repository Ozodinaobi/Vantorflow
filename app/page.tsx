"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { GlowOrbs, LogoMark, Reveal, SpotlightCard, CountUp } from "@/components/ui";

// ---------- Top navigation: transparent at the top, blurred glass after scrolling ----------
function TopNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { href: "#features", label: "Features" },
    { href: "#workflow", label: "Workflow" },
    { href: "#cta", label: "Get started" },
  ];

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,backdrop-filter,border-color] duration-700 ease-out-expo ${
        scrolled || open ? "border-b border-white/5 bg-black/80 backdrop-blur-xl" : "border-b border-transparent bg-transparent"
      }`}
    >
      <nav aria-label="Main" className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex min-h-[44px] items-center gap-3" aria-label="Vantorflow home">
          <LogoMark />
          <span className="font-serif text-xl tracking-tight">Vantorflow</span>
        </Link>

        <ul className="hidden items-center gap-2 md:flex">
          {links.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="link-u px-3 text-sm">
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-3 md:flex">
          <Link href="/login" className="link-u inline-flex min-h-[44px] min-w-[44px] items-center justify-center px-3 text-sm">
            Log in
          </Link>
          <Link href="/dashboard" className="btn-primary !px-5 !py-2 text-sm">
            Open app
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="landing-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 md:hidden"
        >
          <span className="relative block h-3.5 w-5" aria-hidden="true">
            <span className={`absolute left-0 top-0 h-px w-5 bg-current transition-transform duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] ${open ? "translate-y-[6.5px] rotate-45" : ""}`} />
            <span className={`absolute left-0 top-[6.5px] h-px w-5 bg-current transition-opacity duration-300 ${open ? "opacity-0" : ""}`} />
            <span className={`absolute left-0 top-[13px] h-px w-5 bg-current transition-transform duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] ${open ? "-translate-y-[6.5px] -rotate-45" : ""}`} />
          </span>
        </button>
      </nav>

      <div
        id="landing-menu"
        className={`overflow-hidden px-6 transition-[max-height,opacity] duration-700 ease-out-expo md:hidden ${
          open ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="flex flex-col gap-1 pb-6">
          {links.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="flex min-h-[44px] items-center rounded-2xl px-3 text-base text-bone/80 hover:bg-white/[0.04]">
              {l.label}
            </a>
          ))}
          <Link href="/login" className="flex min-h-[44px] items-center rounded-2xl px-3 text-base text-bone/80 hover:bg-white/[0.04]">
            Log in
          </Link>
          <Link href="/dashboard" className="btn-primary mt-3 w-full">
            Open app
          </Link>
        </div>
      </div>
    </header>
  );
}

// ---------- Floating glass UI mockup with a light parallax on scroll and pointer movement ----------
function Mockup() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const center = rect.top + rect.height / 2 - window.innerHeight / 2;
      el.style.setProperty("--py", `${Math.max(-40, Math.min(40, -center * 0.08))}px`);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    const onMove = (e: PointerEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 14;
      const y = (e.clientY / window.innerHeight - 0.5) * 10;
      el.style.setProperty("--px", `${x}px`);
      el.style.setProperty("--pxy", `${y}px`);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={ref}
      className="relative mx-auto w-full max-w-[520px] [transform:translate3d(var(--px,0),calc(var(--py,0px)+var(--pxy,0px)),0)] transition-transform duration-[900ms] ease-out-expo"
    >
      <div className="glass animate-fade-rise rounded-3xl p-6 shadow-[0_40px_120px_-30px_rgba(16,185,129,0.25)]" style={{ animationDelay: "200ms" }}>
        <div className="flex items-center justify-between">
          <span className="label-mono">Sample opportunity</span>
          <span className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-emerald-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/60" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            Example
          </span>
        </div>

        <div className="mt-6 rounded-3xl border border-white/10 bg-black/40 p-5">
          <p className="font-serif text-xl leading-snug">Supply of office IT equipment 2027</p>
          <p className="mt-1 text-xs text-white/40">Ministry of Finance · due 5 Nov</p>
          <div className="mt-5 flex items-end justify-between">
            <div>
              <p className="label-mono !text-[9px]">Readiness</p>
              <p className="font-serif text-5xl leading-none text-emerald-400">
                <CountUp value={86} suffix="%" />
              </p>
            </div>
            <div className="h-12 w-28 overflow-hidden rounded-full bg-white/5">
              <span className="block h-full w-[86%] rounded-full bg-gradient-to-r from-emerald-500/20 to-emerald-400/70" />
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {[
            ["Requirements extracted", "34"],
            ["Mapped to sections", "29"],
            ["Drafts written", "4 / 5"],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between rounded-2xl border border-white/5 px-4 py-3 text-sm">
              <span className="text-white/55">{k}</span>
              <span className="tabular-nums">{v}</span>
            </div>
          ))}
        </div>
      </div>

      <div
        className="glass absolute -bottom-6 -left-6 hidden rounded-2xl px-4 py-3 text-xs sm:block animate-fade-rise"
        style={{ animationDelay: "600ms" }}
        aria-hidden="true"
      >
        <span className="label-mono !text-[9px]">Next step</span>
        <p className="mt-1 text-bone/80">Generate drafts</p>
      </div>
    </div>
  );
}

// ---------- Feature grid (3 spotlight cards, staggered reveal) ----------
const FEATURES = [
  {
    title: "Structured intake",
    body: "Paste an RFQ once. Buyer, deadline, value and scope are captured against the opportunity so nothing lives in loose email.",
    icon: "M4 4h16v16H4zM8 9h8M8 13h8M8 17h5",
  },
  {
    title: "Requirement extraction",
    body: "Gemini reads the tender and lists every requirement with its category. You review the list before a single line is saved.",
    icon: "M5 12l4 4 10-10",
  },
  {
    title: "Traceable drafting",
    body: "Map each requirement to a response section, then draft Executive Summary through Compliance with the source requirements in view.",
    icon: "M4 6h16M4 12h10M4 18h13",
  },
];

// ---------- Landing page ----------
export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <TopNav />

      {/* Hero: 100vh split layout */}
      <section className="relative flex min-h-[100svh] items-center overflow-hidden px-6 pb-16 pt-28">
        <GlowOrbs />
        <div className="mx-auto grid w-full max-w-7xl items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8">
          <div className="relative z-10">
            <p className="label-mono animate-fade-rise inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.02] px-4 py-2">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/60" />
                <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              Bid and tender operations
            </p>
            <h1
              className="animate-fade-rise mt-8 font-serif font-medium tracking-tighter text-bone [font-size:clamp(3.25rem,8.2vw,100px)] [line-height:0.9]"
              style={{ animationDelay: "120ms" }}
            >
              Win the bid with a <em className="italic text-emerald-400">clear</em> record.
            </h1>
            <p className="animate-fade-rise mt-8 max-w-xl text-base leading-relaxed text-white/70 sm:text-lg" style={{ animationDelay: "260ms" }}>
              Vantorflow turns a tender into requirements, maps every one to a response section, and drafts the answer. One place for each opportunity, from intake to submission.
            </p>
            <div className="animate-fade-rise mt-10 flex flex-wrap items-center gap-4" style={{ animationDelay: "380ms" }}>
              <Link href="/signup" className="btn-primary">
                Start an opportunity
              </Link>
              <Link href="/login" className="btn-secondary">
                Log in
              </Link>
            </div>
          </div>

          <div className="relative z-10 flex justify-center lg:justify-end">
            <Mockup />
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section id="features" className="relative px-6 py-28 sm:py-36">
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <p className="label-mono mb-4">Capabilities</p>
            <h2 className="max-w-3xl font-serif text-4xl font-medium leading-[0.95] tracking-tighter sm:text-6xl">
              Every requirement, <em className="italic text-white/50">accounted for.</em>
            </h2>
          </Reveal>
          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 140}>
                <SpotlightCard className="shimmer-border h-full p-10">
                  <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] transition-transform duration-[900ms] ease-out-expo hover:rotate-[360deg]">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d={f.icon} />
                    </svg>
                  </span>
                  <h3 className="mt-8 font-serif text-2xl tracking-tight">{f.title}</h3>
                  <p className="mt-4 text-sm leading-relaxed text-white/65">{f.body}</p>
                </SpotlightCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow stats with count-up */}
      <section id="workflow" className="relative px-6 py-20">
        <div className="mx-auto grid max-w-7xl gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/5 sm:grid-cols-3">
          {[
            { v: 7, label: "pipeline stages", note: "Intake to outcome" },
            { v: 5, label: "response sections", note: "Drafted from your requirements" },
            { v: 2, label: "signals in readiness", note: "Requirements mapped and sections drafted, averaged" },
          ].map((s) => (
            <div key={s.label} className="bg-ink p-10">
              <p className="font-serif text-6xl leading-none text-emerald-400">
                <CountUp value={s.v} />
              </p>
              <p className="mt-4 text-base text-bone">{s.label}</p>
              <p className="mt-1 text-sm text-white/60">{s.note}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA with gradient-text headline */}
      <section id="cta" className="relative overflow-hidden px-6 py-32 text-center">
        <GlowOrbs />
        <Reveal className="relative z-10 mx-auto max-w-4xl">
          <h2 className="font-serif text-5xl font-medium leading-[0.92] tracking-tighter sm:text-7xl">
            <span className="text-gradient-shift block">Your next bid, ready</span>
            <span className="text-gradient-shift block italic">before the deadline.</span>
          </h2>
          <p className="mx-auto mt-8 max-w-xl text-white/65">
            Start with the RFQ you have open right now. Extraction and drafting take minutes, and every saved change stays traceable.
          </p>
          <div className="mt-12 flex justify-center">
            <Link href="/signup" className="btn-primary !px-10 !py-4 text-base">
              Get started
            </Link>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <LogoMark size={28} />
            <span className="font-serif text-lg">Vantorflow</span>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
            <a href="#features" className="link-u text-sm">Features</a>
            <Link href="/login" className="link-u inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-sm">Log in</Link>
            <Link href="/signup" className="link-u text-sm">Sign up</Link>
          </nav>
          <p className="label-mono !text-[9px]">© {new Date().getFullYear()} Vantorflow</p>
        </div>
      </footer>
    </div>
  );
}

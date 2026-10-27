"use client";

import Link from "next/link";
import { LogoMark } from "@/components/ui";

// Landing page. Dark emerald-on-black system per design/DESIGN_SYSTEM.md:
// 4px spacing grid, Newsreader headings, Inter body, glass cards, breathing aurora.
const FEATURES = [
  { title: "Pipeline board", body: "Every bid sits in one of seven stages, from intake to outcome. Move it with one click." },
  { title: "Requirement extraction", body: "Paste an RFQ and get numbered requirements, each categorised with a match level (high, medium, low) that shows how strongly the text fits its category." },
  { title: "Response drafting", body: "Draft each response section from your requirements, then check readiness before you submit." },
  { title: "Deadlines at a glance", body: "Relative countdowns (in 5 days, due tomorrow) with overdue deadlines flagged in red." },
  { title: "Approvals and outcomes", body: "Record win or loss results and reasons for each bid, and approval decisions on each one." },
  { title: "Export to PDF", body: "Export a one-page opportunity summary, or the full response document, as PDF." },
];

const STAGES = ["Intake", "Analysis", "Requirements", "Response", "Approval", "Submission", "Outcome"];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050505] text-[#EBEBEB]">
      <div aria-hidden="true" className="aurora pointer-events-none absolute inset-x-0 top-0 h-[560px]" />

      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#050505]/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-6">
          <Link href="/" aria-label="Vantorflow home" className="focus-ring rounded-md">
            <LogoMark size={26} wordmark />
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-8 text-[13px] md:flex">
            <a href="#features" className="ghost-link text-[#949494] hover:text-[#EBEBEB]">Features</a>
            <a href="#workflow" className="ghost-link text-[#949494] hover:text-[#EBEBEB]">Workflow</a>
            <Link href="/login" className="ghost-link text-[#949494] hover:text-[#EBEBEB]">Log in</Link>
            <Link href="/signup" className="btn-primary">Get started</Link>
          </nav>
          <div className="flex items-center gap-2 md:hidden">
            <Link href="/login" className="btn-secondary">Log in</Link>
          </div>
        </div>
      </header>

      <section className="relative mx-auto grid max-w-[1280px] items-center gap-12 px-6 pb-16 pt-16 lg:grid-cols-12 lg:pb-24 lg:pt-24">
        <div className="lg:col-span-6">
          <p className="eyebrow mb-4 animate-enter">Bid and tender operations</p>
          <h1 className="animate-enter font-serif text-[44px] font-medium leading-[52px] tracking-[-0.02em] sm:text-[60px] sm:leading-[68px] lg:text-[72px] lg:leading-[76px]">
            Run every bid from one workspace.
          </h1>
          <p className="animate-enter mt-6 max-w-xl text-[16px] leading-6 text-[#949494] [animation-delay:80ms]">
            Vantorflow turns RFQs into requirements, tracks each opportunity through the pipeline, and keeps your
            deadlines, approvals and responses in one place.
          </p>
          <div className="animate-enter mt-8 flex flex-col gap-3 sm:flex-row [animation-delay:120ms]">
            <Link href="/signup" className="btn-primary px-6">Create an account</Link>
            <Link href="/login" className="btn-secondary px-6">Log in</Link>
          </div>
        </div>

        {/* Product mockup built from the real glass and row components. */}
        <div aria-hidden="true" className="glass animate-enter p-6 lg:col-span-6 [animation-delay:160ms]">
          <div className="flex items-center gap-2 border-b border-white/10 pb-4">
            <span className="h-2.5 w-2.5 rounded-full bg-[#262626]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#262626]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#262626]" />
          </div>
          <div className="grid grid-cols-3 gap-4 py-6">
            {[
              ["Open bids", "12"],
              ["Due in 7 days", "4"],
              ["Win rate", "38%"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <p className="text-[12px] text-[#949494]">{k}</p>
                <p className="mt-1 font-serif text-[32px] font-medium tabular-nums leading-[40px] text-[#EBEBEB]">{v}</p>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {[
              ["Ministry of Health supply tender", "Response", "in 3 days", "text-[#F59E0B] bg-[#F59E0B]/10"],
              ["Regional road maintenance RFQ", "Requirements", "in 12 days", "text-[#10B981] bg-[#10B981]/10"],
              ["IT managed services bid", "Approval", "Overdue 1d", "text-[#EF4444] bg-[#EF4444]/10"],
            ].map(([t, s, d, c]) => (
              <div key={t} className="row-hover flex items-center justify-between gap-3 rounded-xl border border-[#262626] px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-[#EBEBEB]">{t}</p>
                  <p className="text-[12px] text-[#6B6B6B]">{s}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-medium ${c}`}>{d}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-[1280px] px-6 py-16 lg:py-24">
        <p className="eyebrow">Features</p>
        <h2 className="mt-3 font-serif text-[32px] font-medium leading-10 tracking-[-0.01em]">Everything a bid team needs</h2>
        <p className="mt-3 max-w-2xl text-[15px] leading-6 text-[#949494]">
          Built for the work between receiving an RFQ and submitting a response.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="glass-interactive animate-enter p-6"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <h3 className="font-serif text-[18px] font-medium leading-[26px]">{f.title}</h3>
              <p className="mt-2 text-[13px] leading-5 text-[#949494]">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="workflow" className="border-y border-white/10 bg-[#0B0B0B]">
        <div className="mx-auto max-w-[1280px] px-6 py-16 lg:py-24">
          <p className="eyebrow">Workflow</p>
          <h2 className="mt-3 font-serif text-[32px] font-medium leading-10 tracking-[-0.01em]">From RFQ to outcome in seven stages</h2>
          <ol className="mt-10 grid gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {STAGES.map((s, i) => (
              <li key={s} className="glass-interactive p-4">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#949494]">Step {i + 1}</span>
                <p className="mt-1 text-[14px] font-medium text-[#EBEBEB]">{s}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="cta" className="mx-auto max-w-[1280px] px-6 py-16 text-center lg:py-24">
        <h2 className="font-serif text-[32px] font-medium leading-10 tracking-[-0.01em]">Start with your next RFQ</h2>
        <p className="mx-auto mt-3 max-w-xl text-[15px] leading-6 text-[#949494]">
          Create an account, paste an RFQ, and see the extracted requirements in minutes.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/signup" className="btn-primary px-6">Create an account</Link>
          <Link href="/login" className="btn-secondary px-6">Log in</Link>
        </div>
      </section>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1280px] flex-col items-center justify-between gap-2 px-6 py-6 text-[12px] text-[#6B6B6B] sm:flex-row">
          <span>Vantorflow</span>
          <span>Bid and tender operations</span>
        </div>
      </footer>
    </div>
  );
}

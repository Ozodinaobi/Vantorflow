"use client";

import Link from "next/link";
import { LogoMark } from "@/components/ui";

// Landing page: enterprise SaaS layout. Headline, product mockup, feature grid, CTA. No motion.
const FEATURES = [
  { title: "Pipeline board", body: "Every bid sits in one of seven stages, from intake to outcome. Move it with one click." },
  { title: "Requirement extraction", body: "Paste an RFQ and get numbered requirements, each categorised with a match level (high, medium, low) that shows how strongly the text fits its category." },
  { title: "Response drafting", body: "Draft each response section from your requirements, then check readiness before you submit." },
  { title: "Deadlines at a glance", body: "Relative countdowns (in 5 days, due tomorrow) with overdue deadlines flagged in red." },
  { title: "Approvals and outcomes", body: "Record win or loss results and reasons for each bid, and approval decisions on each one." },
  { title: "Export to PDF", body: "Export a one-page opportunity summary, or the full response document, as PDF." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen text-ink">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#050505]/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="Vantorflow home">
            <LogoMark size={26} wordmark />
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-6 text-sm md:flex">
            <a href="#features" className="text-muted hover:text-ink">Features</a>
            <a href="#workflow" className="text-muted hover:text-ink">Workflow</a>
            <Link href="/login" className="text-muted hover:text-ink">Log in</Link>
            <Link href="/signup" className="btn-primary">Get started</Link>
          </nav>
          <div className="flex items-center gap-2 md:hidden">
            <Link href="/login" className="btn-secondary">Log in</Link>
          </div>
        </div>
      </header>

      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div>
            <p className="label-mono mb-4">Bid and tender operations</p>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
              Run every bid from one workspace.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
              Vantorflow turns RFQs into requirements, tracks each opportunity through the pipeline, and keeps your
              deadlines, approvals and responses in one place.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/signup" className="btn-primary px-6">Create an account</Link>
              <Link href="/login" className="btn-secondary px-6">Log in</Link>
            </div>
          </div>

          {/* Product mockup: static screenshot-style panel built from real UI parts. */}
          <div aria-hidden="true" className="rounded-xl border border-slate-200 bg-white/[0.02] p-4">
            <div className="flex items-center gap-1.5 border-b border-slate-100 pb-3">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
            </div>
            <div className="grid grid-cols-3 gap-3 py-4">
              {[
                ["Open bids", "12"],
                ["Due in 7 days", "4"],
                ["Win rate", "38%"],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl border border-slate-200 p-3">
                  <p className="text-xs text-slate-500">{k}</p>
                  <p className="mt-1 text-xl font-semibold text-slate-900">{v}</p>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {[
                ["Ministry of Health supply tender", "Response", "in 3 days", "bg-amber-100 text-amber-800"],
                ["Regional road maintenance RFQ", "Requirements", "in 12 days", "bg-emerald-500/15 text-emerald-400"],
                ["IT managed services bid", "Approval", "Overdue 1d", "bg-red-100 text-red-800"],
              ].map(([t, s, d, c]) => (
                <div key={t} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{t}</p>
                    <p className="text-xs text-slate-500">{s}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${c}`}>{d}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Everything a bid team needs</h2>
        <p className="mt-3 max-w-2xl text-slate-600">Built for the work between receiving an RFQ and submitting a response.</p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card">
              <h3 className="text-base font-semibold text-slate-900">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="workflow" className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">From RFQ to outcome in seven stages</h2>
          <ol className="mt-10 grid gap-3 text-sm sm:grid-cols-4 lg:grid-cols-7">
            {["Intake", "Analysis", "Requirements", "Response", "Approval", "Submission", "Outcome"].map((s, i) => (
              <li key={s} className="rounded-xl border border-slate-200 bg-white/[0.02] px-3 py-3">
                <span className="text-xs text-slate-500">Step {i + 1}</span>
                <p className="font-medium text-slate-900">{s}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="cta" className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6">
        <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Start with your next RFQ</h2>
        <p className="mx-auto mt-3 max-w-xl text-slate-600">Create an account, paste an RFQ, and see the extracted requirements in minutes.</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/signup" className="btn-primary px-6">Create an account</Link>
          <Link href="/login" className="btn-secondary px-6">Log in</Link>
        </div>
      </section>

      <footer className="border-t border-slate-200">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-slate-500 sm:flex-row sm:px-6">
          <span>Vantorflow</span>
          <span>Bid and tender operations</span>
        </div>
      </footer>
    </div>
  );
}

"use client";

import { DeadlinePanel } from "@/components/DeadlinePanel";
export default function DeadlinesPage() { return <section className="space-y-7"><div className="border-b border-white/[0.07] pb-7"><p className="label-mono mb-3">Portfolio control</p><h1 className="font-serif text-4xl tracking-tight sm:text-6xl">Deadline radar</h1><p className="mt-3 text-sm text-white/45">Every upcoming submission, prioritized by time remaining.</p></div><DeadlinePanel /></section>; }

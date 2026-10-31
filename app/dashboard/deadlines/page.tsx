"use client";

import { DeadlinePanel } from "@/components/DeadlinePanel";
export default function DeadlinesPage() { return <section className="space-y-8"><div><p className="label-mono mb-3">Portfolio control</p><h1 className="font-serif text-4xl tracking-tight sm:text-5xl">Deadline radar</h1><p className="mt-3 text-sm text-white/50">Every upcoming submission, prioritized by time remaining.</p></div><DeadlinePanel /></section>; }

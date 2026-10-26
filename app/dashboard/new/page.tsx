"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { api, errorText } from "@/lib/api";
import { BreathingLoader, Reveal } from "@/components/ui";

// Intake form. The server creates the opportunity and its RFQ text together, or keeps neither.
export default function NewRfqPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [buyer, setBuyer] = useState("");
  const [deadline, setDeadline] = useState("");
  const [value, setValue] = useState("");
  const [rfqText, setRfqText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!title.trim() || !buyer.trim()) {
      setError("Title and buyer organisation are required.");
      return;
    }
    if (rfqText.trim().length < 20) {
      setError("Paste the RFQ text (at least a few sentences).");
      return;
    }
    setBusy(true);
    try {
      const d = await api<{ opportunity: { id: string } }>("/api/opportunities", {
        method: "POST",
        body: { title, buyer, deadline, value, rfqText },
      });
      router.push(`/dashboard/${d.opportunity.id}`);
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  }

  return (
    <section className="max-w-3xl">
      <div className="mb-10">
        <p className="label-mono mb-3">Intake</p>
        <h1 className="font-sans text-4xl font-medium leading-[0.95] tracking-tighter sm:text-5xl">New RFQ intake</h1>
      </div>
      <Reveal>
        <form onSubmit={onSubmit} className="card space-y-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block text-sm sm:col-span-2">
              <span className="label-mono mb-2 block">Opportunity title</span>
              <input className="input" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Supply of office IT equipment 2027" />
            </label>
            <label className="block text-sm">
              <span className="label-mono mb-2 block">Buyer organisation</span>
              <input className="input" required value={buyer} onChange={(e) => setBuyer(e.target.value)} />
            </label>
            <label className="block text-sm">
              <span className="label-mono mb-2 block">Deadline</span>
              <input className="input" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </label>
            <label className="block text-sm">
              <span className="label-mono mb-2 block">Estimated value (optional)</span>
              <input className="input" type="number" min="0" step="any" value={value} onChange={(e) => setValue(e.target.value)} />
            </label>
          </div>
          <label className="block text-sm">
            <span className="label-mono mb-2 block">RFQ text</span>
            <textarea
              className="input min-h-[320px] rounded-3xl font-mono text-xs leading-relaxed"
              required
              value={rfqText}
              onChange={(e) => setRfqText(e.target.value)}
              placeholder="Paste the full RFQ or tender text here."
            />
            <span className="mt-2 block text-xs text-slate-500">{rfqText.length.toLocaleString("en-GB")} characters</span>
          </label>
          {error && <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
          <div className="flex gap-3">
            <button type="submit" disabled={busy} className="btn-primary">
              {busy ? <BreathingLoader label="Saving" /> : "Create opportunity"}
            </button>
          </div>
        </form>
      </Reveal>
    </section>
  );
}

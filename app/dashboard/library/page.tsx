"use client";

import { FormEvent, useEffect, useState } from "react";
import { api, errorText } from "@/lib/api";
import { BreathingLoader, LoadingBlock, Reveal } from "@/components/ui";

interface Entry {
  id: string;
  question: string;
  answer: string;
  updated_at: string;
}

// Answer library: approved question and answer pairs. Drafting uses matching entries as context.
export default function LibraryPage() {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [setupRequired, setSetupRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState<string | null>(null);

  async function load() {
    try {
      const d = await api<{ entries: Entry[] }>("/api/library");
      setEntries(d.entries);
      setSetupRequired(false);
    } catch (e: any) {
      setEntries([]);
      if (e?.setupRequired) setSetupRequired(true);
      else setError(`Could not load the library: ${errorText(e)}`);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(null);
    setSaving(true);
    try {
      await api("/api/library", { method: "POST", body: { question, answer } });
      setQuestion("");
      setAnswer("");
      setOk("Saved to the library. Drafts will use it where it matches.");
      await load();
    } catch (err) {
      setError(`Not saved: ${errorText(err)}`);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    setError(null);
    try {
      await api(`/api/library/${id}`, { method: "DELETE" });
      setEntries((prev) => prev?.filter((x) => x.id !== id) ?? prev);
    } catch (err) {
      setError(`Not deleted: ${errorText(err)}`);
    }
  }

  if (!entries) return <LoadingBlock label="Loading the library" />;

  return (
    <section className="space-y-8">
      <div>
        <p className="label-mono mb-3">Reusable</p>
        <h1 className="font-serif text-4xl font-medium tracking-tighter sm:text-5xl">Answer library</h1>
        <p className="mt-3 max-w-2xl text-sm text-white/50">
          Save answers you have already approved. When a draft is written, matching answers are passed to Gemini as context.
        </p>
      </div>

      {setupRequired && (
        <p role="status" className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-sm text-white/60">
          The answer library is coming online after setup. Run the FEATURES MIGRATION SQL once in Supabase, then reload.
        </p>
      )}
      {error && <p role="alert" className="rounded-2xl border border-red-500/20 bg-red-500/[0.06] p-4 text-sm text-red-300">{error}</p>}
      {ok && <p role="status" className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-4 text-sm text-emerald-200">{ok}</p>}

      <Reveal>
        <form onSubmit={save} className="card space-y-4">
          <p className="label-mono">New entry</p>
          <label className="block text-sm">
            <span className="mb-1.5 block text-white/60">Question</span>
            <input
              required
              maxLength={500}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. Describe your quality management system"
              className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-emerald-500/50"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block text-white/60">Approved answer</span>
            <textarea
              required
              maxLength={5000}
              rows={5}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-emerald-500/50"
            />
          </label>
          <button type="submit" disabled={saving || setupRequired} className="btn-primary">
            {saving ? "Saving" : "Save answer"}
          </button>
        </form>
      </Reveal>

      {entries.length === 0 && !setupRequired && (
        <div className="glass rounded-3xl border-dashed p-10 text-center">
          <p className="font-serif text-2xl">No saved answers yet</p>
          <p className="mt-2 text-sm text-white/50">Save the answers you reuse most, like certifications or insurance.</p>
        </div>
      )}

      <div className="space-y-4">
        {entries.map((x) => (
          <Reveal key={x.id}>
            <article className="glass rounded-3xl p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <h2 className="font-serif text-lg leading-snug">{x.question}</h2>
                <button type="button" onClick={() => remove(x.id)} className="link-u shrink-0 text-xs text-white/40">
                  Delete
                </button>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-white/70">{x.answer}</p>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

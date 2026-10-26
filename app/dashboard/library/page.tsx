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
        <h1 className="font-sans text-4xl font-medium tracking-tighter sm:text-5xl">Answer library</h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-500">
          Save answers you have already approved. When a draft is written, matching answers are passed to Gemini as context.
        </p>
      </div>

      {setupRequired && (
        <p role="status" className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
          The answer library is coming online after setup. Run the FEATURES MIGRATION SQL once in Supabase, then reload.
        </p>
      )}
      {error && <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {ok && <p role="status" className="rounded-2xl border border-blue-200 bg-blue-600/[0.06] p-4 text-sm text-blue-700">{ok}</p>}

      <Reveal>
        <form onSubmit={save} className="card space-y-4">
          <p className="label-mono">New entry</p>
          <label className="block text-sm">
            <span className="mb-1.5 block text-slate-500">Question</span>
            <input
              required
              maxLength={500}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. Describe your quality management system"
              className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm outline-none focus:border-blue-200"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block text-slate-500">Approved answer</span>
            <textarea
              required
              maxLength={5000}
              rows={5}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm outline-none focus:border-blue-200"
            />
          </label>
          <button type="submit" disabled={saving || setupRequired} className="btn-primary">
            {saving ? "Saving" : "Save answer"}
          </button>
        </form>
      </Reveal>

      {entries.length === 0 && !setupRequired && (
        <div className="glass rounded-3xl border-dashed p-10 text-center">
          <p className="font-sans text-2xl">No saved answers yet</p>
          <p className="mt-2 text-sm text-slate-500">Save the answers you reuse most, like certifications or insurance.</p>
        </div>
      )}

      <div className="space-y-4">
        {entries.map((x) => (
          <Reveal key={x.id}>
            <article className="glass rounded-3xl p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <h2 className="font-sans text-lg leading-snug">{x.question}</h2>
                <button type="button" onClick={() => remove(x.id)} className="link-u shrink-0 text-xs text-slate-500">
                  Delete
                </button>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{x.answer}</p>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

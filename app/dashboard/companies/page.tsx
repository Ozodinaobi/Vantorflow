"use client";

import { FormEvent, useEffect, useState } from "react";
import { api, errorText } from "@/lib/api";
import { LoadingBlock, Reveal } from "@/components/ui";

interface Company {
  id: string;
  name: string;
  kind: string;
  contact: string | null;
  notes: string | null;
}

const KINDS = ["Company", "Contractor", "Subcontractor", "Partner"];

// Companies and contractors registry. The generation dropdown reads from this list.
export default function CompaniesPage() {
  const [rows, setRows] = useState<Company[] | null>(null);
  const [setupRequired, setSetupRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", kind: "Company", contact: "", notes: "" });
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const d = await api<{ companies: Company[] }>("/api/companies");
      setRows(d.companies);
      setSetupRequired(false);
    } catch (e: any) {
      setRows([]);
      if (e?.setupRequired) setSetupRequired(true);
      else setError(`Could not load companies: ${errorText(e)}`);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function add(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(null);
    setSaving(true);
    try {
      await api("/api/companies", { method: "POST", body: form });
      setForm({ name: "", kind: "Company", contact: "", notes: "" });
      setOk("Added to the registry.");
      await load();
    } catch (err) {
      setError(`Not added: ${errorText(err)}`);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    setError(null);
    try {
      await api(`/api/companies/${id}`, { method: "DELETE" });
      setRows((prev) => prev?.filter((c) => c.id !== id) ?? prev);
    } catch (err) {
      setError(`Not deleted: ${errorText(err)}`);
    }
  }

  if (!rows) return <LoadingBlock label="Loading companies" />;

  return (
    <section className="space-y-8">
      <div>
        <p className="label-mono mb-3">Registry</p>
        <p className="label-mono">Directory</p>
          <h1 className="font-serif text-4xl font-medium tracking-tight sm:text-5xl">Companies</h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-500">
          Companies and contractors you bid with. The generation dropdown on each opportunity uses this list.
        </p>
      </div>

      {setupRequired && (
        <p role="status" className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
          The companies registry is coming online after setup. Run the FEATURES MIGRATION SQL once in Supabase, then reload.
        </p>
      )}
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {ok && <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] p-4 text-sm text-emerald-400">{ok}</p>}

      <Reveal>
        <form onSubmit={add} className="card grid gap-4 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-1">
            <span className="mb-1.5 block text-slate-500">Name</span>
            <input
              required
              maxLength={200}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm outline-none focus:border-emerald-500/30"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block text-slate-500">Type</span>
            <select
              value={form.kind}
              onChange={(e) => setForm({ ...form, kind: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm outline-none focus:border-emerald-500/30"
            >
              {KINDS.map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block text-slate-500">Contact (optional)</span>
            <input
              maxLength={300}
              value={form.contact}
              onChange={(e) => setForm({ ...form, contact: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm outline-none focus:border-emerald-500/30"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block text-slate-500">Notes (optional)</span>
            <input
              maxLength={2000}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm outline-none focus:border-emerald-500/30"
            />
          </label>
          <div className="sm:col-span-2">
            <button type="submit" disabled={saving || setupRequired} className="btn-primary">
              {saving ? "Adding" : "Add company"}
            </button>
          </div>
        </form>
      </Reveal>

      {rows.length === 0 && !setupRequired && (
        <div className="glass rounded-xl border-dashed p-10 text-center">
          <p className="font-serif text-2xl">No companies yet</p>
          <p className="mt-2 text-sm text-slate-500">Add the companies and contractors you bid with.</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {rows.map((c) => (
          <Reveal key={c.id}>
            <article className="glass rounded-xl p-5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-serif text-lg leading-snug">{c.name}</h2>
                <span className="label-mono shrink-0 rounded-full border border-slate-200 px-2.5 py-1 !text-[9px]">{c.kind}</span>
              </div>
              {c.contact && <p className="mt-2 break-words text-sm text-slate-500">{c.contact}</p>}
              {c.notes && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-500">{c.notes}</p>}
              <button type="button" onClick={() => remove(c.id)} className="link-u mt-4 text-xs text-slate-500">
                Remove
              </button>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

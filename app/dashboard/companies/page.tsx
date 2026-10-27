"use client";

import { FormEvent, useEffect, useState } from "react";
import { api, errorText } from "@/lib/api";
import { LoadingBlock, Reveal } from "@/components/ui";
import { CompanyProfile, EMPTY_PROFILE, hasProfile } from "@/lib/companyProfile";

interface Company {
  id: string;
  name: string;
  kind: string;
  contact: string | null;
  notes: string | null;
  profile: CompanyProfile;
}

const inputCls = "w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm outline-none focus:border-emerald-500/30";

function emptyForm() {
  return { name: "", kind: "Company", contact: "", notes: "", profile: structuredClone(EMPTY_PROFILE) };
}

const KINDS = ["Company", "Contractor", "Subcontractor", "Partner"];

// Companies and contractors registry. The generation dropdown reads from this list.
export default function CompaniesPage() {
  const [rows, setRows] = useState<Company[] | null>(null);
  const [setupRequired, setSetupRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);

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
      setForm(emptyForm());
      setOk("Added to the registry.");
      await load();
    } catch (err) {
      setError(`Not added: ${errorText(err)}`);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(c: Company) {
    setEditingId(c.id);
    setEditForm({ name: c.name, kind: c.kind, contact: c.contact ?? "", notes: c.notes ?? "", profile: structuredClone(c.profile ?? EMPTY_PROFILE) });
    setError(null);
    setOk(null);
  }

  async function saveEdit(id: string) {
    setError(null);
    setOk(null);
    setSaving(true);
    try {
      await api(`/api/companies/${id}`, { method: "PATCH", body: editForm });
      setEditingId(null);
      setOk("Company saved.");
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
          <ProfileEditor value={form} onChange={setForm} />
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
              {editingId === c.id ? (
                <div className="mt-4 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm">
                      <span className="mb-1.5 block text-slate-500">Name</span>
                      <input required maxLength={200} value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className={inputCls} />
                    </label>
                    <label className="block text-sm">
                      <span className="mb-1.5 block text-slate-500">Type</span>
                      <select value={editForm.kind} onChange={(e) => setEditForm({ ...editForm, kind: e.target.value })} className={inputCls}>
                        {KINDS.map((k) => <option key={k}>{k}</option>)}
                      </select>
                    </label>
                  </div>
                  <ProfileEditor value={editForm} onChange={setEditForm} />
                  <div className="flex gap-3">
                    <button type="button" disabled={saving} onClick={() => saveEdit(c.id)} className="btn-primary">
                      {saving ? "Saving" : "Save"}
                    </button>
                    <button type="button" onClick={() => setEditingId(null)} className="link-u text-xs text-slate-500">Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  {hasProfile(c.profile ?? EMPTY_PROFILE) && (
                    <div className="mt-3 space-y-1 text-xs text-slate-500">
                      {c.profile.legalName && <p>Legal name: {c.profile.legalName}</p>}
                      {c.profile.certifications.length > 0 && <p>Certifications: {c.profile.certifications.join("; ")}</p>}
                      {c.profile.caseStudies.length > 0 && <p>Case studies: {c.profile.caseStudies.length}</p>}
                    </div>
                  )}
                  <div className="mt-4 flex gap-4">
                    <button type="button" onClick={() => startEdit(c)} className="link-u text-xs text-slate-500">Edit profile</button>
                    <button type="button" onClick={() => remove(c.id)} className="link-u text-xs text-slate-500">Remove</button>
                  </div>
                </>
              )}
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

// The structured profile fields. Lists are one item per line in the textarea.
function ProfileEditor({
  value,
  onChange,
}: {
  value: { name: string; kind: string; contact: string; notes: string; profile: CompanyProfile };
  onChange: (v: any) => void;
}) {
  const p = value.profile;
  const setP = (next: Partial<CompanyProfile>) => onChange({ ...value, profile: { ...p, ...next } });
  const lines = (arr: string[]) => arr.join("\n");
  // Keep blank lines while typing; the server trims and drops empty items.
  const parseLines = (text: string) => text.split("\n");

  return (
    <div className="space-y-4 sm:col-span-2">
      <p className="label-mono">Company profile</p>
      <label className="block text-sm">
        <span className="mb-1.5 block text-slate-500">Legal name</span>
        <input maxLength={200} value={p.legalName} onChange={(e) => setP({ legalName: e.target.value })} className={inputCls} />
      </label>
      <label className="block text-sm">
        <span className="mb-1.5 block text-slate-500">About the company (summary)</span>
        <textarea rows={4} maxLength={2000} value={p.summary} onChange={(e) => setP({ summary: e.target.value })} className={inputCls} />
      </label>
      <label className="block text-sm">
        <span className="mb-1.5 block text-slate-500">Certifications (one per line, e.g. ISO 9001:2015, cert no., valid to)</span>
        <textarea rows={3} value={lines(p.certifications)} onChange={(e) => setP({ certifications: parseLines(e.target.value) })} className={inputCls} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1.5 block text-slate-500">Public liability</span>
          <input maxLength={200} value={p.insurance.publicLiability} onChange={(e) => setP({ insurance: { ...p.insurance, publicLiability: e.target.value } })} className={inputCls} />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-slate-500">Employers liability</span>
          <input maxLength={200} value={p.insurance.employersLiability} onChange={(e) => setP({ insurance: { ...p.insurance, employersLiability: e.target.value } })} className={inputCls} />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-slate-500">Professional indemnity</span>
          <input maxLength={200} value={p.insurance.professionalIndemnity} onChange={(e) => setP({ insurance: { ...p.insurance, professionalIndemnity: e.target.value } })} className={inputCls} />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-slate-500">Other insurance</span>
          <input maxLength={200} value={p.insurance.other} onChange={(e) => setP({ insurance: { ...p.insurance, other: e.target.value } })} className={inputCls} />
        </label>
      </div>
      <div className="space-y-3">
        <p className="text-sm text-slate-500">Key case studies</p>
        {p.caseStudies.map((cs, i) => (
          <div key={i} className="glass space-y-3 rounded-xl p-4">
            <input placeholder="Title" maxLength={200} value={cs.title} onChange={(e) => setP({ caseStudies: p.caseStudies.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })} className={inputCls} />
            <input placeholder="Client" maxLength={200} value={cs.client} onChange={(e) => setP({ caseStudies: p.caseStudies.map((x, j) => (j === i ? { ...x, client: e.target.value } : x)) })} className={inputCls} />
            <textarea placeholder="What was delivered and the result" rows={3} maxLength={1000} value={cs.summary} onChange={(e) => setP({ caseStudies: p.caseStudies.map((x, j) => (j === i ? { ...x, summary: e.target.value } : x)) })} className={inputCls} />
            <button type="button" onClick={() => setP({ caseStudies: p.caseStudies.filter((_, j) => j !== i) })} className="link-u text-xs text-slate-500">Remove case study</button>
          </div>
        ))}
        {p.caseStudies.length < 20 && (
          <button type="button" onClick={() => setP({ caseStudies: [...p.caseStudies, { title: "", client: "", summary: "" }] })} className="link-u text-xs text-slate-500">
            Add case study
          </button>
        )}
      </div>
    </div>
  );
}

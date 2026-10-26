"use client";

import { FormEvent, useEffect, useState } from "react";
import { api, errorText } from "@/lib/api";
import { BreathingLoader, Reveal } from "@/components/ui";

interface Tpl {
  id: string;
  name: string;
  kind: "letterhead" | "proposal";
  content: string;
}

const PLACEHOLDERS = "{{title}} {{buyer}} {{deadline}} {{company}} {{date}} {{content}}";

// Templates wrap generated documents. Put {{content}} where the draft text should go.
export default function TemplatesPage() {
  const [items, setItems] = useState<Tpl[] | null>(null);
  const [editing, setEditing] = useState<Partial<Tpl> | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  async function load() {
    try {
      const d = await api<{ templates: Tpl[] }>("/api/templates");
      setItems(d.templates);
    } catch (e) {
      setItems([]);
      setMessage({ kind: "error", text: errorText(e) });
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    setMessage(null);
    try {
      if (editing.id) {
        await api(`/api/templates/${editing.id}`, { method: "PATCH", body: editing });
      } else {
        await api("/api/templates", { method: "POST", body: editing });
      }
      setEditing(null);
      setMessage({ kind: "ok", text: "Template saved." });
      await load();
    } catch (err) {
      setMessage({ kind: "error", text: errorText(err) });
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    try {
      await api(`/api/templates/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setMessage({ kind: "error", text: errorText(err) });
    }
  }

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-mono mb-3">Templates</p>
          <h1 className="font-serif text-4xl tracking-tight">Document templates</h1>
          <p className="mt-2 text-sm text-white/50">Letterheads and proposal wrappers applied to every generated document.</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setEditing({ kind: "proposal", name: "", content: "" })}>
          New template
        </button>
      </div>

      {message && <p className={`text-sm ${message.kind === "ok" ? "text-emerald-300" : "text-red-300"}`}>{message.text}</p>}

      {editing && (
        <Reveal>
          <form onSubmit={save} className="glass space-y-4 rounded-3xl p-6 sm:p-8">
            <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
              <input className="input" required placeholder="Template name" aria-label="Template name" value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              <select className="input" aria-label="Kind" value={editing.kind ?? "proposal"} onChange={(e) => setEditing({ ...editing, kind: e.target.value as Tpl["kind"] })}>
                <option value="proposal">Proposal</option>
                <option value="letterhead">Letterhead</option>
              </select>
            </div>
            <textarea className="input min-h-[220px] font-mono text-sm" aria-label="Template content" placeholder={`ACME Ltd\nRe: {{title}} for {{buyer}}\n\n{{content}}\n\nSubmitted {{date}}`} value={editing.content ?? ""} onChange={(e) => setEditing({ ...editing, content: e.target.value })} />
            <p className="text-xs text-white/40">Placeholders: {PLACEHOLDERS}</p>
            <div className="flex gap-3">
              <button type="submit" className="btn-primary" disabled={busy}>{busy ? "Saving" : "Save template"}</button>
              <button type="button" className="btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </form>
        </Reveal>
      )}

      {items === null ? (
        <BreathingLoader label="Loading templates" />
      ) : items.length === 0 ? (
        <div className="glass rounded-3xl p-8 text-center text-sm text-white/50">No templates yet. Add a letterhead or proposal wrapper.</div>
      ) : (
        <ul className="space-y-3">
          {items.map((t) => (
            <li key={t.id} className="glass flex flex-col gap-3 rounded-2xl p-5 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{t.name}</p>
                <p className="text-xs uppercase tracking-[0.2em] text-white/40">{t.kind}</p>
              </div>
              <div className="flex gap-3">
                <button type="button" className="btn-secondary" onClick={() => setEditing(t)}>Edit</button>
                <button type="button" className="btn-secondary" onClick={() => remove(t.id)}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

"use client";

import { FormEvent, useEffect, useState } from "react";
import { api, errorText } from "@/lib/api";
import { formatDateTime } from "@/lib/time";
import { BreathingLoader, Reveal } from "@/components/ui";

type Msg = { kind: "ok" | "error"; text: string } | null;

const SETUP_NOTE = "Coming online after setup. Run the features migration to turn this on.";

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Reveal>
      <div className="glass mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
        <h2 className="font-sans text-xl text-slate-900">{title}</h2>
        <div className="mt-4">{children}</div>
      </div>
    </Reveal>
  );
}

// ---------- F9: audit history for this opportunity ----------
export function HistoryTab({ oppId }: { oppId: string }) {
  const [events, setEvents] = useState<any[] | null>(null);
  const [setupRequired, setSetupRequired] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ events: any[] }>(`/api/opportunities/${oppId}/audit`)
      .then((d) => setEvents(d.events))
      .catch((e) => {
        if (e?.setupRequired) setSetupRequired(true);
        else setError(errorText(e));
        setEvents([]);
      });
  }, [oppId]);

  return (
    <Shell title="History">
      {events === null ? (
        <BreathingLoader label="Loading history" />
      ) : setupRequired ? (
        <p className="text-sm text-slate-500">{SETUP_NOTE}</p>
      ) : error ? (
        <p className="text-sm text-red-700">{error}</p>
      ) : events.length === 0 ? (
        <p className="text-sm text-slate-500">No history yet. Changes to this opportunity will appear here.</p>
      ) : (
        <ol className="space-y-3">
          {events.map((ev) => (
            <li key={ev.id} className="flex flex-col gap-1 border-l border-blue-200 pl-4 text-sm">
              <span className="text-slate-900">{String(ev.action).replace(/_/g, " ")}</span>
              <span className="text-xs text-slate-500">{formatDateTime(ev.created_at)}</span>
              {ev.detail && Object.keys(ev.detail).length > 0 && (
                <span className="break-words text-xs text-slate-500">{JSON.stringify(ev.detail)}</span>
              )}
            </li>
          ))}
        </ol>
      )}
    </Shell>
  );
}

// ---------- F10 helper: win-rate performance card (reads /api/performance) ----------
export function PerformanceCard() {
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api<any>("/api/performance")
      .then(setData)
      .catch((e) => setError(errorText(e)));
  }, []);

  function copyText() {
    if (!data) return;
    const text = `Vantorflow Performance: win rate ${data.winRate ?? 0}% | bids run ${data.bidsRun} | avg readiness ${data.avgReadiness}%`;
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <Shell title="Vantorflow Performance">
      {error ? (
        <p className="text-sm text-red-700">{error}</p>
      ) : !data ? (
        <BreathingLoader label="Loading performance" />
      ) : (
        <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-600/[0.10] to-transparent p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-blue-700/80">Vantorflow Performance</p>
          <div className="mt-3 grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="font-sans text-3xl text-slate-900">{data.winRate ?? 0}%</p>
              <p className="text-xs text-slate-500">win rate</p>
            </div>
            <div>
              <p className="font-sans text-3xl text-slate-900">{data.bidsRun ?? 0}</p>
              <p className="text-xs text-slate-500">bids run</p>
            </div>
            <div>
              <p className="font-sans text-3xl text-slate-900">{data.avgReadiness ?? 0}%</p>
              <p className="text-xs text-slate-500">avg readiness</p>
            </div>
          </div>
          <button
            type="button"
            onClick={copyText}
            className="mt-4 min-h-11 rounded-lg border border-blue-200 px-4 text-sm text-blue-700 hover:bg-blue-50"
          >
            {copied ? "Copied" : "Copy summary"}
          </button>
        </div>
      )}
    </Shell>
  );
}

// ---------- F11: attachments (10MB max; degrades to storage pending) ----------
export function AttachmentsPanel({ oppId, onMessage }: { oppId: string; onMessage: (m: Msg) => void }) {
  const [rows, setRows] = useState<any[] | null>(null);
  const [ready, setReady] = useState(true);
  const [busy, setBusy] = useState(false);

  function load() {
    api<{ attachments: any[]; storageReady: boolean }>(`/api/opportunities/${oppId}/attachments`)
      .then((d) => {
        setRows(d.attachments);
        setReady(d.storageReady);
      })
      .catch((e) => {
        setRows([]);
        setReady(false);
        onMessage({ kind: "error", text: errorText(e) });
      });
  }

  useEffect(load, [oppId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      onMessage({ kind: "error", text: "File is over 10MB. Upload a smaller file." });
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/opportunities/${oppId}/attachments`, { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Upload failed.");
      onMessage({ kind: "ok", text: `Uploaded ${file.name}.` });
      load();
    } catch (err) {
      onMessage({ kind: "error", text: errorText(err) });
    } finally {
      setBusy(false);
    }
  }

  async function download(id: string, name: string) {
    try {
      const d = await api<{ url: string; name: string }>(`/api/attachments/${id}`);
      const a = document.createElement("a");
      a.href = d.url;
      a.download = name;
      a.rel = "noopener";
      a.click();
    } catch (err) {
      onMessage({ kind: "error", text: errorText(err) });
    }
  }

  return (
    <Shell title="Attachments">
      {rows === null ? (
        <BreathingLoader label="Loading attachments" />
      ) : !ready ? (
        <p className="text-sm text-slate-500">Storage pending. {SETUP_NOTE}</p>
      ) : (
        <>
          <label className="inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-blue-200 px-4 text-sm text-blue-700 hover:bg-blue-50">
            {busy ? "Uploading..." : "Upload file (max 10MB)"}
            <input type="file" className="hidden" onChange={upload} disabled={busy} />
          </label>
          {rows.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No files yet.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {rows.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <span className="break-all text-slate-900">{r.name}</span>
                  <span className="flex items-center gap-3 text-xs text-slate-500">
                    {Math.round((r.size ?? 0) / 1024)} KB
                    <button type="button" onClick={() => download(r.id, r.name)} className="text-blue-700 hover:underline">
                      Download
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Shell>
  );
}

// ---------- F12: go/no-go matrix ----------
export function GoNoGoPanel({ oppId, onMessage }: { oppId: string; onMessage: (m: Msg) => void }) {
  const [criteria, setCriteria] = useState<{ key: string; label: string; score: number; weight: number }[] | null>(null);
  const [result, setResult] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<any>(`/api/opportunities/${oppId}/go-no-go`)
      .then((d) => {
        const saved: any[] = d.goNoGo?.criteria ?? [];
        setCriteria(
          d.criteria.map((c: any) => {
            const s = saved.find((x) => x.key === c.key);
            return { key: c.key, label: c.label, score: s?.score ?? 3, weight: s?.weight ?? 3 };
          }),
        );
        setResult(d.goNoGo ?? null);
      })
      .catch((e) => {
        setCriteria([]);
        onMessage({ kind: "error", text: errorText(e) });
      });
  }, [oppId]); // eslint-disable-line react-hooks/exhaustive-deps

  function update(key: string, field: "score" | "weight", value: number) {
    setCriteria((prev) => (prev ? prev.map((c) => (c.key === key ? { ...c, [field]: value } : c)) : prev));
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!criteria) return;
    setSaving(true);
    try {
      const d = await api<any>(`/api/opportunities/${oppId}/go-no-go`, {
        method: "PUT",
        body: { criteria: criteria.map(({ key, score, weight }) => ({ key, score, weight })) },
      });
      setResult(d.goNoGo);
      onMessage({ kind: "ok", text: "Go/no-go saved." });
    } catch (err) {
      onMessage({ kind: "error", text: errorText(err) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Shell title="Go / No-Go matrix">
      {!criteria ? (
        <BreathingLoader label="Loading matrix" />
      ) : (
        <form onSubmit={save} className="space-y-4">
          {criteria.map((c) => (
            <div key={c.key} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-center">
              <span className="text-sm text-slate-900">{c.label}</span>
              <label className="flex items-center gap-2 text-xs text-slate-500">
                Score
                <select value={c.score} onChange={(e) => update(c.key, "score", Number(e.target.value))} className="min-h-11 rounded-lg border border-slate-200 bg-slate-100 px-2 text-slate-900">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-500">
                Weight
                <select value={c.weight} onChange={(e) => update(c.key, "weight", Number(e.target.value))} className="min-h-11 rounded-lg border border-slate-200 bg-slate-100 px-2 text-slate-900">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </label>
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-4">
            <button type="submit" disabled={saving} className="min-h-11 rounded-lg bg-blue-600 px-5 text-sm font-medium text-white disabled:opacity-50">
              {saving ? "Saving..." : "Score it"}
            </button>
            {result && (
              <span className={`rounded-full border px-3 py-1 text-sm ${result.suggestion === "GO" ? "border-blue-200 text-blue-700" : "border-red-200 text-red-700"}`}>
                {result.percent}% {result.suggestion === "GO" ? "suggests GO" : "suggests NO-GO"}
              </span>
            )}
          </div>
        </form>
      )}
    </Shell>
  );
}

// ---------- F13: comments with @mention highlight ----------
function renderBody(body: string) {
  return body.split(/(@[\w.+-]+@[\w-]+\.[\w.-]+)/g).map((part, i) =>
    part.startsWith("@") ? (
      <span key={i} className="rounded bg-blue-50 px-1 text-blue-700">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export function CommentsPanel({ oppId, onMessage }: { oppId: string; onMessage: (m: Msg) => void }) {
  const [rows, setRows] = useState<any[] | null>(null);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);

  function load() {
    api<{ comments: any[] }>(`/api/opportunities/${oppId}/comments`)
      .then((d) => setRows(d.comments))
      .catch((e) => {
        setRows([]);
        onMessage({ kind: "error", text: errorText(e) });
      });
  }

  useEffect(load, [oppId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function post(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setPosting(true);
    try {
      await api(`/api/opportunities/${oppId}/comments`, { method: "POST", body: { body: text.trim() } });
      setText("");
      load();
    } catch (err) {
      onMessage({ kind: "error", text: errorText(err) });
    } finally {
      setPosting(false);
    }
  }

  return (
    <Shell title="Comments">
      <form onSubmit={post} className="flex flex-col gap-2 sm:flex-row">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a comment. Mention a teammate as @name@example.com"
          maxLength={2000}
          className="min-h-11 flex-1 rounded-lg border border-slate-200 bg-slate-100 px-3 text-sm text-slate-900 placeholder:text-slate-500"
        />
        <button type="submit" disabled={posting || !text.trim()} className="min-h-11 rounded-lg bg-blue-600 px-5 text-sm font-medium text-white disabled:opacity-40">
          {posting ? "Posting..." : "Post"}
        </button>
      </form>
      {rows === null ? (
        <BreathingLoader label="Loading comments" />
      ) : rows.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No comments yet.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((c) => (
            <li key={c.id} className="rounded-lg border border-slate-200 px-3 py-2">
              <p className="whitespace-pre-wrap break-words text-sm text-slate-700">{renderBody(c.body)}</p>
              <p className="mt-1 text-xs text-slate-500">{formatDateTime(c.created_at)}</p>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}

// ---------- F15: bid checklists with checkboxes ----------
export function ChecklistPanel({ oppId, onMessage }: { oppId: string; onMessage: (m: Msg) => void }) {
  const [lists, setLists] = useState<any[] | null>(null);
  const [setupRequired, setSetupRequired] = useState(false);

  function load() {
    api<{ checklists: any[] }>(`/api/opportunities/${oppId}/checklists`)
      .then((d) => setLists(d.checklists))
      .catch((e) => {
        if (e?.setupRequired) setSetupRequired(true);
        else onMessage({ kind: "error", text: errorText(e) });
        setLists([]);
      });
  }

  useEffect(load, [oppId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function toggle(list: any, index: number) {
    const items = list.items.map((it: any, i: number) => (i === index ? { ...it, done: !it.done } : it));
    setLists((prev) => (prev ? prev.map((l) => (l.id === list.id ? { ...l, items } : l)) : prev));
    try {
      await api(`/api/opportunities/${oppId}/checklists`, { method: "PATCH", body: { id: list.id, items } });
    } catch (err) {
      onMessage({ kind: "error", text: errorText(err) });
      load();
    }
  }

  return (
    <Shell title="Bid checklists">
      {lists === null ? (
        <BreathingLoader label="Loading checklists" />
      ) : setupRequired ? (
        <p className="text-sm text-slate-500">{SETUP_NOTE}</p>
      ) : lists.length === 0 ? (
        <p className="text-sm text-slate-500">No checklists yet.</p>
      ) : (
        <div className="space-y-6">
          {lists.map((l) => (
            <div key={l.id}>
              <p className="text-sm font-medium text-slate-900">{l.title}</p>
              <ul className="mt-2 space-y-2">
                {l.items.map((it: any, i: number) => (
                  <li key={i}>
                    <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-slate-700">
                      <input type="checkbox" checked={!!it.done} onChange={() => toggle(l, i)} className="h-5 w-5 accent-blue-600" />
                      <span className={it.done ? "text-slate-500 line-through" : ""}>{it.text}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}

// Everything the opportunity page needs for features 9 to 15, in one place.
export function OpportunityExtras({ oppId, onMessage }: { oppId: string; onMessage: (m: Msg) => void }) {
  return (
    <>
      <GoNoGoPanel oppId={oppId} onMessage={onMessage} />
      <ChecklistPanel oppId={oppId} onMessage={onMessage} />
      <AttachmentsPanel oppId={oppId} onMessage={onMessage} />
      <CommentsPanel oppId={oppId} onMessage={onMessage} />
      <HistoryTab oppId={oppId} />
    </>
  );
}

"use client";

// Cmd/Ctrl+K search overlay. Desktop shortcut; mobile uses the Search tab.
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Hit { type: string; id: string; title: string; subtitle: string; href: string }

export default function CommandSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    document.addEventListener("vf:open-search", onOpen);
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("vf:open-search", onOpen);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    if (q.trim().length < 2) { setHits([]); return; }
    let alive = true;
    const t = setTimeout(() => {
      api<{ results: Hit[] }>(`/api/search?q=${encodeURIComponent(q.trim())}`)
        .then((d) => alive && setHits(d.results.slice(0, 8)))
        .catch(() => alive && setHits([]));
    }, 250);
    return () => { alive = false; clearTimeout(t); };
  }, [q]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-slate-900/40 p-4 pt-24 sm:p-6" onClick={() => setOpen(false)}>
      <div className="card w-full max-w-xl p-4" role="dialog" aria-label="Search" onClick={(e) => e.stopPropagation()}>
        <input autoFocus className="input w-full" placeholder="Search opportunities, requirements, answers, companies" value={q} onChange={(e) => setQ(e.target.value)} />
        <ul className="mt-3 max-h-[50vh] space-y-1 overflow-y-auto">
          {hits.map((h) => (
            <li key={`${h.type}-${h.id}`}>
              <Link href={h.href} onClick={() => setOpen(false)} className="block rounded-xl px-3 py-2 hover:bg-slate-50">
                <p className="truncate text-sm">{h.title}</p>
                <p className="truncate text-xs text-slate-500">{h.type} {h.subtitle ? "· " + h.subtitle : ""}</p>
              </Link>
            </li>
          ))}
        </ul>
        {q.trim().length >= 2 && hits.length === 0 && <p className="px-3 py-2 text-sm text-slate-500">No matches.</p>}
        <p className="mt-3 text-[11px] text-slate-500">Ctrl/Cmd+K or / to open · Esc to close</p>
      </div>
    </div>
  );
}

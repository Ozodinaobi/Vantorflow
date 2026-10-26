"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, errorText } from "@/lib/api";
import { BreathingLoader, Reveal } from "@/components/ui";
import { formatDateTime } from "@/lib/time";

interface Note {
  id: string;
  title: string;
  body: string;
  kind: string;
  read: boolean;
  created_at: string;
}

export default function NotificationsPage() {
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [error, setError] = useState("");

  async function load() {
    try {
      const d = await api<{ notifications: Note[] }>("/api/notifications");
      setNotes(d.notifications);
    } catch (e) {
      setNotes([]);
      setError(errorText(e));
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function markAll() {
    await api("/api/notifications", { method: "PATCH", body: { all: true } }).catch((e) => setError(errorText(e)));
    load();
  }
  async function markOne(id: string) {
    await api("/api/notifications", { method: "PATCH", body: { ids: [id] } }).catch((e) => setError(errorText(e)));
    load();
  }

  const unread = notes?.filter((n) => !n.read).length ?? 0;

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-mono mb-3">Notifications</p>
          <h1 className="font-sans text-4xl tracking-tight">Notification center</h1>
          <p className="mt-2 text-sm text-slate-500">{unread} unread. Email digests are coming; they are not sent yet.</p>
        </div>
        {unread > 0 && (
          <button type="button" className="btn-secondary" onClick={markAll}>
            Mark all read
          </button>
        )}
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
      {notes === null ? (
        <BreathingLoader label="Loading notifications" />
      ) : notes.length === 0 ? (
        <div className="glass rounded-3xl p-8 text-center text-sm text-slate-500">
          Nothing yet. Deadlines, stage changes and approvals will appear here.
        </div>
      ) : (
        <ul className="space-y-3">
          {notes.map((n, i) => (
            <Reveal key={n.id} delay={Math.min(i, 8) * 40}>
              <li className={`glass flex flex-col gap-2 rounded-2xl p-5 sm:flex-row sm:items-start ${n.read ? "opacity-60" : ""}`}>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{n.title}</p>
                  {n.body && <p className="mt-1 text-sm text-slate-500">{n.body}</p>}
                  <p className="mt-2 text-xs text-slate-500">{formatDateTime(n.created_at)}</p>
                </div>
                <div className="flex gap-3 self-start">
                  {!n.read && (
                    <button type="button" className="min-h-[44px] text-sm text-blue-700" onClick={() => markOne(n.id)}>
                      Mark read
                    </button>
                  )}
                  <Link href="/dashboard" className="min-h-[44px] text-sm text-slate-500">Dashboard</Link>
                </div>
              </li>
            </Reveal>
          ))}
        </ul>
      )}
    </section>
  );
}

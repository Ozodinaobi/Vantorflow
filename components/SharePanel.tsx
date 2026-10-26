"use client";

import { useEffect, useState } from "react";
import { api, errorText } from "@/lib/api";
import { LoadingBlock } from "@/components/ui";

interface ShareLink {
  token: string;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
}

// Client portal controls on the opportunity page: create a read-only share link, see and revoke active ones.
export default function SharePanel({ oppId, setupRequired }: { oppId: string; setupRequired?: boolean }) {
  const [links, setLinks] = useState<ShareLink[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => setOrigin(window.location.origin), []);

  async function load() {
    try {
      const d = await api<{ links: ShareLink[] }>(`/api/opportunities/${oppId}/share`);
      setLinks(d.links);
    } catch (e) {
      setLinks([]);
      setMessage({ kind: "error", text: errorText(e) });
    }
  }
  useEffect(() => {
    load();
  }, [oppId]);

  async function create() {
    setBusy(true);
    setMessage(null);
    try {
      await api(`/api/opportunities/${oppId}/share`, { method: "POST", body: { days: 14 } });
      setMessage({ kind: "ok", text: "Share link created. Valid for 14 days." });
      await load();
    } catch (e) {
      setMessage({ kind: "error", text: errorText(e) });
    } finally {
      setBusy(false);
    }
  }

  async function revoke(token: string) {
    setMessage(null);
    try {
      await api(`/api/opportunities/${oppId}/share?token=${encodeURIComponent(token)}`, { method: "DELETE" });
      setMessage({ kind: "ok", text: "Link revoked. It no longer works." });
      await load();
    } catch (e) {
      setMessage({ kind: "error", text: errorText(e) });
    }
  }

  const active = (links ?? []).filter((l) => !l.revoked_at && new Date(l.expires_at).getTime() > Date.now());

  return (
    <div className="glass rounded-3xl p-6 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-mono mb-3">Client portal</p>
          <h2 className="font-sans text-2xl">Share a read-only proposal</h2>
          <p className="mt-2 text-sm text-slate-500">Anyone with the link can view sections and status. They cannot edit.</p>
        </div>
        <button type="button" className="btn-primary" disabled={busy || setupRequired} onClick={create}>
          {busy ? "Creating" : "Create share link"}
        </button>
      </div>

      {setupRequired && (
        <p className="mt-4 text-sm text-amber-700/80">Share links come online after the features migration is run once.</p>
      )}
      {message && (
        <p className={`mt-4 text-sm ${message.kind === "ok" ? "text-blue-700" : "text-red-700"}`}>{message.text}</p>
      )}

      <div className="mt-5 space-y-3">
        {links === null && <LoadingBlock label="Loading share links" />}
        {links !== null && active.length === 0 && (
          <p className="text-sm text-slate-500">No active share links.</p>
        )}
        {active.map((l) => {
          const url = `${origin}/share/${l.token}`;
          return (
            <div key={l.token} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-100 p-4 sm:flex-row sm:items-center">
              <code className="min-w-0 flex-1 break-all text-xs text-blue-700">{url}</code>
              <div className="flex gap-2">
                <button type="button" className="btn-secondary" onClick={() => navigator.clipboard?.writeText(url)}>
                  Copy
                </button>
                <button type="button" className="btn-secondary" onClick={() => revoke(l.token)}>
                  Revoke
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

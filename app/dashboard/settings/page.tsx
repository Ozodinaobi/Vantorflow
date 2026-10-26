"use client";

import { FormEvent, useEffect, useState } from "react";
import { api, errorText } from "@/lib/api";
import { Skeleton } from "@/components/ui";

type Profile = { email: string; name: string; created_at: string | null };

// Settings: profile (display name, email), password change, and the email-in ingest address.
export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [nameMsg, setNameMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [savingName, setSavingName] = useState(false);

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [savingPw, setSavingPw] = useState(false);

  const [copied, setCopied] = useState(false);
  const ingestUrl = typeof window !== "undefined" ? `${window.location.origin}/api/email-in` : "/api/email-in";

  useEffect(() => {
    api<Profile>("/api/account")
      .then((p) => {
        setProfile(p);
        setName(p.name);
      })
      .catch((e) => setNameMsg({ ok: false, text: `Could not load your profile: ${errorText(e)}` }));
  }, []);

  async function saveName(e: FormEvent) {
    e.preventDefault();
    setSavingName(true);
    setNameMsg(null);
    try {
      const res = await api<{ name: string }>("/api/account", { method: "PATCH", body: { name } });
      setProfile((p) => (p ? { ...p, name: res.name } : p));
      setNameMsg({ ok: true, text: "Profile saved." });
    } catch (err) {
      setNameMsg({ ok: false, text: errorText(err) });
    } finally {
      setSavingName(false);
    }
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    if (next.length < 8) return setPwMsg({ ok: false, text: "The new password must be at least 8 characters." });
    if (next !== confirm) return setPwMsg({ ok: false, text: "The new passwords do not match." });
    setSavingPw(true);
    try {
      await api("/api/account", { method: "PATCH", body: { current_password: current, new_password: next } });
      setPwMsg({ ok: true, text: "Password changed. Use the new one next time you sign in." });
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err) {
      setPwMsg({ ok: false, text: errorText(err) });
    } finally {
      setSavingPw(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(ingestUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <p className="label-mono mb-1">Settings</p>
        <h1 className="text-2xl font-semibold sm:text-3xl">Settings</h1>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold">Profile</h2>
        {!profile ? (
          <div className="mt-4 space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <form onSubmit={saveName} className="mt-4 space-y-4">
            <div>
              <label htmlFor="pf-email" className="label-mono mb-1 block">Email</label>
              <input id="pf-email" className="input w-full" value={profile.email} disabled readOnly />
              <p className="mt-1 text-xs text-slate-500">Your sign-in email. It cannot be changed here.</p>
            </div>
            <div>
              <label htmlFor="pf-name" className="label-mono mb-1 block">Display name</label>
              <input id="pf-name" className="input w-full" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />
            </div>
            {nameMsg && (
              <p role="status" className={`text-sm ${nameMsg.ok ? "text-slate-600" : "text-red-700"}`}>{nameMsg.text}</p>
            )}
            <button type="submit" className="btn-primary" disabled={savingName}>
              {savingName ? "Saving..." : "Save profile"}
            </button>
          </form>
        )}
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold">Change password</h2>
        <form onSubmit={changePassword} className="mt-4 space-y-4">
          <div>
            <label htmlFor="pw-current" className="label-mono mb-1 block">Current password</label>
            <input id="pw-current" type="password" autoComplete="current-password" className="input w-full" value={current} onChange={(e) => setCurrent(e.target.value)} />
          </div>
          <div>
            <label htmlFor="pw-new" className="label-mono mb-1 block">New password</label>
            <input id="pw-new" type="password" autoComplete="new-password" className="input w-full" value={next} onChange={(e) => setNext(e.target.value)} />
            <p className="mt-1 text-xs text-slate-500">At least 8 characters.</p>
          </div>
          <div>
            <label htmlFor="pw-confirm" className="label-mono mb-1 block">Confirm new password</label>
            <input id="pw-confirm" type="password" autoComplete="new-password" className="input w-full" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          {pwMsg && <p role="status" className={`text-sm ${pwMsg.ok ? "text-slate-600" : "text-red-700"}`}>{pwMsg.text}</p>}
          <button type="submit" className="btn-primary" disabled={savingPw || !current || !next || !confirm}>
            {savingPw ? "Changing..." : "Change password"}
          </button>
        </form>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold">Email in</h2>
        <p className="mt-2 text-sm text-slate-600">
          Forwarded RFQ emails become opportunities automatically once the mailbox is connected. Use this ingest address then.
          Setup steps are in EMAIL_IN_SETUP.md in the repo.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <code className="min-w-0 flex-1 break-all rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
            {ingestUrl}
          </code>
          <button type="button" className="btn-secondary" onClick={copy}>
            {copied ? "Copied" : "Copy address"}
          </button>
        </div>
      </div>
    </section>
  );
}

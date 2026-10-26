"use client";

import { FormEvent, useEffect, useState } from "react";
import { api, errorText } from "@/lib/api";
import { BreathingLoader, Reveal } from "@/components/ui";

interface Member {
  id: string;
  member_email: string;
  role: "owner" | "bidder" | "approver";
  status: "invited" | "active";
  created_at: string;
}

// Team directory: invite teammates by email with a role. Multi-tenancy is a later phase, so this is a directory.
export default function TeamPage() {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Member["role"]>("bidder");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  async function load() {
    try {
      const d = await api<{ members: Member[] }>("/api/team");
      setMembers(d.members);
    } catch (e) {
      setMembers([]);
      setMessage({ kind: "error", text: errorText(e) });
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function invite(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const d = await api<{ note: string }>("/api/team", { method: "POST", body: { email, role } });
      setEmail("");
      setMessage({ kind: "ok", text: `Invited as ${role}. ${d.note}` });
      await load();
    } catch (err) {
      setMessage({ kind: "error", text: errorText(err) });
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    try {
      await api(`/api/team?id=${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setMessage({ kind: "error", text: errorText(err) });
    }
  }

  return (
    <section className="space-y-8">
      <div>
        <p className="label-mono mb-3">Team</p>
        <h1 className="font-sans text-4xl tracking-tight">Your team</h1>
        <p className="mt-2 text-sm text-slate-500">Invite bidders and approvers. Roles: owner, bidder, approver.</p>
      </div>

      <Reveal>
        <form onSubmit={invite} className="glass rounded-3xl p-6 sm:p-8">
          <p className="label-mono mb-3">Invite by email</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              className="input min-w-0 flex-1"
              type="email"
              required
              placeholder="colleague@company.com"
              aria-label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <select className="input sm:w-40" aria-label="Role" value={role} onChange={(e) => setRole(e.target.value as Member["role"])}>
              <option value="owner">Owner</option>
              <option value="bidder">Bidder</option>
              <option value="approver">Approver</option>
            </select>
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? "Inviting" : "Invite"}
            </button>
          </div>
          <p className="mt-3 text-xs text-slate-500">Invite emails ship with notifications. For now the invite is saved as pending.</p>
          {message && (
            <p className={`mt-3 text-sm ${message.kind === "ok" ? "text-blue-700" : "text-red-700"}`}>{message.text}</p>
          )}
        </form>
      </Reveal>

      {members === null ? (
        <BreathingLoader label="Loading team" />
      ) : members.length === 0 ? (
        <div className="glass rounded-3xl p-8 text-center text-sm text-slate-500">No team members yet. Invite someone above.</div>
      ) : (
        <ul className="space-y-3">
          {members.map((m) => (
            <li key={m.id} className="glass flex flex-col gap-3 rounded-2xl p-5 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{m.member_email}</p>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{m.role} · {m.status}</p>
              </div>
              <button type="button" className="btn-secondary self-start sm:self-auto" onClick={() => remove(m.id)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

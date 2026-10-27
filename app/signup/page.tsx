"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, errorText } from "@/lib/api";
import { BreathingLoader, LogoMark } from "@/components/ui";

// Email + password sign up. The server creates the account already confirmed and signs you in.
export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setBusy(true);
    try {
      await api("/api/auth/signup", { method: "POST", body: { email: email.trim(), password } });
      router.replace("/dashboard");
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 sm:px-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <LogoMark size={36} wordmark />
          <span className="text-xl font-semibold text-ink">Vantorflow</span>
        </div>
        <div className="card">
        <h1 className="text-2xl font-bold text-ink">Create your account</h1>
        <p className="mt-1 text-sm text-muted">Start your bid workspace.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-slate-700">Email</span>
            <input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-slate-700">Password (6+ characters)</span>
            <input className="input" type="password" autoComplete="new-password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? <BreathingLoader label="Creating account" /> : "Sign up"}
          </button>
        </form>
        </div>
        <p className="mt-6 text-center text-sm text-muted">
          Already have an account? <Link href="/login" className="font-medium text-emerald-400 hover:underline">Log in</Link>
        </p>
      </div>
    </main>
  );
}

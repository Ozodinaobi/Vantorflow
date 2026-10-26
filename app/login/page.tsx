"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, errorText } from "@/lib/api";
import { BreathingLoader, GlowOrbs, LogoMark } from "@/components/ui";

// Email + password login. The server checks the password and sets a signed session cookie.
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api("/api/auth/login", { method: "POST", body: { email: email.trim(), password } });
      router.replace("/dashboard");
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12 sm:px-6">
      <GlowOrbs />
      <div className="card animate-fade-rise relative w-full max-w-sm">
        <div className="mb-8 flex items-center gap-3">
          <LogoMark size={36} />
          <span className="font-serif text-xl">Vantorflow</span>
        </div>
        <p className="label-mono mb-3">Sign in</p>
        <h1 className="font-serif text-4xl font-medium leading-[0.95] tracking-tighter">Log in</h1>
        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <label className="block text-sm">
            <span className="label-mono mb-2 block">Email</span>
            <input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="label-mono mb-2 block">Password</span>
            <input className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {error && <p role="alert" className="rounded-2xl border border-red-500/20 bg-red-500/[0.06] p-3 text-sm text-red-300">{error}</p>}
          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? <BreathingLoader label="Logging in" /> : "Log in"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-white/50">
          No account yet? <Link href="/signup" className="link-u font-medium text-bone">Sign up</Link>
        </p>
      </div>
    </main>
  );
}

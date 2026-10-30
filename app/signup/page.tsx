"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, errorText } from "@/lib/api";
import { BreathingLoader, LogoMark } from "@/components/ui";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"signup" | "verify">("signup");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(null); setBusy(true);
    try {
      if (step === "signup") {
        if (password.length < 6) throw new Error("Password must be at least 6 characters.");
        const result = await api<{ ok: boolean; requiresVerification?: boolean }>("/api/auth/signup", { method: "POST", body: { email: email.trim(), password } });
        if (!result.requiresVerification) throw new Error("Could not start email verification.");
        setStep("verify");
        setPassword("");
      } else {
        await api("/api/auth/signup", { method: "POST", body: { email: email.trim(), verifyEmail: true, code } });
        router.replace("/login?verified=1");
      }
    } catch (err) { setError(errorText(err)); } finally { setBusy(false); }
  }
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050505] px-4 py-12 sm:px-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2.5"><LogoMark size={36} wordmark /><span className="text-xl font-semibold text-ink">Vantorflow</span></div>
        <div className="card">
          <h1 className="text-2xl font-bold text-ink">{step === "signup" ? "Create your account" : "Verify your email"}</h1>
          <p className="mt-1 text-sm text-muted">{step === "signup" ? "Start your bid workspace." : `Enter the 6-digit code sent to ${email}.`}</p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {step === "signup" ? <>
              <label className="block text-sm"><span className="mb-1.5 block font-medium text-muted">Email</span><input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
              <label className="block text-sm"><span className="mb-1.5 block font-medium text-muted">Password (6+ characters)</span><input className="input" type="password" autoComplete="new-password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></label>
            </> : <label className="block text-sm"><span className="mb-1.5 block font-medium text-muted">Verification code</span><input className="input tracking-[0.4em]" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} /></label>}
            {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <button type="submit" disabled={busy} className="btn-primary w-full">{busy ? <BreathingLoader label={step === "signup" ? "Creating account" : "Verifying email"} /> : step === "signup" ? "Sign up" : "Verify email"}</button>
            {step === "verify" && <><button type="button" disabled={busy} className="btn-secondary w-full" onClick={async () => { setBusy(true); setError(null); try { await api("/api/auth/signup", { method: "POST", body: { email: email.trim(), resendVerification: true } }); setError("If this account needs verification, a new code has been sent."); } catch (err) { setError(errorText(err)); } finally { setBusy(false); } }}>Resend code</button><button type="button" className="btn-secondary w-full" onClick={() => { setStep("signup"); setCode(""); setError(null); }}>Back</button></>}
          </form>
        </div>
        <p className="mt-6 text-center text-sm text-muted">Already have an account? <Link href="/login" className="font-medium text-emerald-400 hover:underline">Log in</Link></p>
      </div>
    </main>
  );
}

"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, errorText } from "@/lib/api";
import { BreathingLoader, LogoMark } from "@/components/ui";

// Login: centred card on a light background. The server checks the password and sets a signed session cookie.
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<"password" | "code">("password");
  const [code, setCode] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [challengeMethod, setChallengeMethod] = useState<"password" | "passkey">("password");
  const [passkeyBusy, setPasskeyBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(null); setBusy(true);
    try {
      if (step === "code") {
        const result = challengeMethod === "password"
          ? await api<{ ok: boolean }>("/api/auth/login", { method: "POST", body: { email: email.trim(), challengeId, password, code } })
          : await api<{ ok: boolean }>("/api/auth/passkey", { method: "PATCH", body: { email: email.trim(), challengeId, code } });
        router.replace("/dashboard"); router.refresh();
        return;
      }
      const result = await api<{ ok: boolean; requiresTwoFactor?: boolean; challengeId?: string }>("/api/auth/login", { method: "POST", body: { email: email.trim(), password } });
      if (result.requiresTwoFactor && result.challengeId) { setChallengeId(result.challengeId); setChallengeMethod("password"); setStep("code"); return; }
      router.replace("/dashboard"); router.refresh();
    } catch (err) { setError(errorText(err)); } finally { setBusy(false); }
  }
  async function passkeyLogin() {
    setError(null); setPasskeyBusy(true);
    try {
      if (!email.trim()) throw new Error("Enter your email first.");
      const { startAuthentication } = await import("@simplewebauthn/browser");
      const options = await api<any>("/api/auth/passkey", { method: "POST", body: { email: email.trim() } });
      const assertion = await startAuthentication({ optionsJSON: options });
      const result = await api<{ requiresTwoFactor?: boolean; challengeId?: string }>("/api/auth/passkey", { method: "PUT", body: assertion });
      if (result.requiresTwoFactor && result.challengeId) { setChallengeId(result.challengeId); setChallengeMethod("passkey"); setPassword(""); setStep("code"); return; }
      router.replace("/dashboard"); router.refresh();
    } catch (err) { setError(errorText(err)); } finally { setPasskeyBusy(false); }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050505] px-4 py-12 sm:px-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <LogoMark size={36} wordmark />
          <span className="text-xl font-semibold text-ink">Vantorflow</span>
        </div>
        <div className="card">
            <h1 className="text-2xl font-bold text-ink">{step === "password" ? "Log in" : "Check your email"}</h1>
            <p className="mt-1 text-sm text-muted">{step === "password" ? "Sign in to your bid workspace." : `Enter the 6-digit sign-in code sent to ${email}.`}</p>
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-muted">Email</span>
                <input className="input" type="email" autoComplete="email" required readOnly={step === "code"} value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>
              {step === "password" ? <label className="block text-sm"><span className="mb-1.5 block font-medium text-muted">Password</span><input className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label> : <label className="block text-sm"><span className="mb-1.5 block font-medium text-muted">Email code</span><input className="input tracking-[0.4em]" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} /></label>}
            {error && (
              <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}
            <button type="submit" disabled={busy} className="btn-primary w-full">{busy ? <BreathingLoader label={step === "code" ? "Verifying code" : "Logging in"} /> : step === "code" ? "Verify and sign in" : "Log in"}</button>
            {step === "password" && <button type="button" disabled={passkeyBusy} onClick={passkeyLogin} className="btn-secondary w-full">{passkeyBusy ? "Checking passkey..." : "Sign in with passkey"}</button>}
            {step === "code" && <button type="button" className="btn-secondary w-full" onClick={() => { setStep("password"); setCode(""); }}>Back</button>}
          </form>
</div>
        <p className="mt-6 text-center text-sm text-muted">
          No account yet?{" "}
          <Link href="/signup" className="font-medium text-emerald-400 hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}

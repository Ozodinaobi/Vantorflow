"use client";

import { useState } from "react";
import { Reveal } from "@/components/ui";

// Settings: the email-in ingest URL (copyable) and the email-digest placeholder.
export default function SettingsPage() {
  const [copied, setCopied] = useState(false);
  const ingestUrl = typeof window !== "undefined" ? `${window.location.origin}/api/email-in` : "/api/email-in";

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
    <section className="space-y-8">
      <div>
        <p className="label-mono mb-3">Settings</p>
        <h1 className="font-serif text-4xl tracking-tight">Settings</h1>
      </div>

      <Reveal>
        <div className="glass rounded-3xl p-6 sm:p-8">
          <p className="label-mono mb-3">Email in</p>
          <h2 className="font-serif text-2xl">Forward RFQs by email</h2>
          <p className="mt-2 text-sm text-white/50">
            Forwarded RFQ emails will become opportunities automatically. The mailbox is not connected yet, so this is
            the ingest address to use once it is. Setup steps are in EMAIL_IN_SETUP.md in the repo.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <code className="min-w-0 flex-1 break-all rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-emerald-300">
              {ingestUrl}
            </code>
            <button type="button" className="btn-secondary" onClick={copy}>
              {copied ? "Copied" : "Copy URL"}
            </button>
          </div>
          <p className="mt-3 text-xs text-white/40">
            Requests need the x-vf-ingest-secret header. The secret lives in the server environment, not on this page.
          </p>
        </div>
      </Reveal>

      <Reveal>
        <div className="glass rounded-3xl p-6 sm:p-8">
          <p className="label-mono mb-3">Notifications</p>
          <h2 className="font-serif text-2xl">Email digest</h2>
          <p className="mt-2 text-sm text-white/50">
            Email digests (deadline reminders and approval alerts) are coming with the email provider. In-app
            notifications already work from the bell icon.
          </p>
        </div>
      </Reveal>
    </section>
  );
}

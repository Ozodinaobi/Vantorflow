"use client";

import { useState } from "react";
import { SCHEMA_SQL } from "@/lib/schemaSql";

// Shown when the database tables are missing. One paste into the Supabase SQL editor fixes it.
export function SetupScreen({ missing, onRecheck }: { missing: string[]; onRecheck: () => void }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  async function copy() {
    setCopyError(false);
    try {
      await navigator.clipboard.writeText(SCHEMA_SQL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard can be blocked on some phones. The text is also shown below for manual copy.
      setCopyError(true);
    }
  }

  return (
    <div className="card space-y-4">
      <h1 className="text-xl font-bold">One-time database setup</h1>
      <p className="text-sm text-slate-700">
        Vantorflow needs its tables in your Supabase database. Missing: {missing.join(", ") || "all tables"}.
      </p>
      <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-700">
        <li>Tap the copy button below.</li>
        <li>
          Open your Supabase project, then SQL Editor, then New query. Paste and press Run.
        </li>
        <li>Come back here and tap &quot;I have run it&quot;.</li>
      </ol>
      <button type="button" className="btn-primary w-full" onClick={copy}>
        {copied ? "Copied" : "Copy the setup SQL"}
      </button>
      {copyError && <p className="text-sm text-amber-800">Copy was blocked. Select the text below and copy it by hand.</p>}
      <textarea readOnly className="input h-48 font-mono text-xs" value={SCHEMA_SQL} onFocus={(e) => e.currentTarget.select()} />
      <button type="button" className="btn-secondary w-full" onClick={onRecheck}>
        I have run it
      </button>
    </div>
  );
}

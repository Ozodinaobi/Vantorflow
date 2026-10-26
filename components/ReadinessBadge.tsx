import type { Readiness } from "@/lib/readiness";
import { CountUp } from "@/components/ui";

// Shows the readiness score. Always pass the output of computeReadiness() so the number is consistent.
// Emerald is used for the number and a thin progress track only, never as a large block.
export function ReadinessBadge({ readiness }: { readiness: Readiness }) {
  const high = readiness.score >= 80;
  const mid = readiness.score >= 40 && !high;
  return (
    <div className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 py-1.5 pl-4 pr-2">
      <span className="label-mono">Readiness</span>
      <span className={`font-sans text-2xl leading-none ${mid ? "text-slate-700" : "text-blue-700"}`}>
        <CountUp value={readiness.score} suffix="%" />
      </span>
      <span className="relative h-1 w-14 overflow-hidden rounded-full bg-slate-50" aria-hidden="true">
        <span
          className={`absolute inset-y-0 left-0 rounded-full ${high ? "bg-blue-600" : mid ? "bg-slate-50" : "bg-slate-50"}`}
          style={{ width: `${readiness.score}%`, transition: "width 1.4s cubic-bezier(0.16,1,0.3,1)" }}
        />
      </span>
    </div>
  );
}

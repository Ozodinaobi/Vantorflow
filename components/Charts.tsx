// Simple horizontal bar chart (CSS bars, no animation). Labels and values are real counts from the server.
export function BarChart({ bars }: { bars: { label: string; value: number }[] }) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  return (
    <ul className="space-y-3">
      {bars.map((b) => (
        <li key={b.label}>
          <div className="mb-1 flex justify-between text-sm">
            <span className="text-slate-700">{b.label}</span>
            <span className="tabular-nums text-slate-500">{b.value}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(b.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

"use client";

import { STAGES, Stage } from "@/lib/types";

interface PipelineProps {
  current: Stage;
  disabled?: boolean;
  onChange: (stage: Stage) => void;
}

// Clickable stage pipeline. Clicking a stage calls onChange; the parent saves it to the database.
// Done stages carry a thin emerald rule, the active stage a breathing white pill.
export function Pipeline({ current, disabled, onChange }: PipelineProps) {
  const currentIndex = STAGES.indexOf(current);
  return (
    <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
      {STAGES.map((stage, i) => {
        const isActive = i === currentIndex;
        const isDone = i < currentIndex;
        const tone = isActive
          ? "border-slate-200 bg-blue-600 text-white "
          : isDone
          ? "border-blue-200 bg-blue-600/[0.06] text-blue-700"
          : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-200 hover:text-slate-900";
        return (
          <li key={stage}>
            <button
              type="button"
              disabled={disabled || isActive}
              onClick={() => onChange(stage)}
              aria-current={isActive ? "step" : undefined}
              className={`min-h-[44px] w-full rounded-full border px-3 py-2 text-xs font-medium transition-colors duration-500 disabled:cursor-default ${tone}`}
            >
              <span className="label-mono mr-1.5 !text-[9px] !text-current opacity-60">{i + 1}</span>
              {stage}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

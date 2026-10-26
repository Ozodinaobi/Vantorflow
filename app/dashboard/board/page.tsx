"use client";

import { useEffect, useRef, useState, PointerEvent as RPointerEvent } from "react";
import Link from "next/link";
import { api, errorText } from "@/lib/api";
import { STAGES, Stage, Opportunity } from "@/lib/types";
import { daysUntil, deadlineTone, countdownLabel } from "@/lib/deadline";
import { formatDate } from "@/lib/time";
import { BreathingLoader, LoadingBlock, Reveal } from "@/components/ui";

// Kanban: opportunities as cards across the 7 stages. Desktop: drag with the pointer. Mobile: move buttons.
// Every move saves through the same PATCH route the opportunity page uses, so it persists and is owner-scoped.
export default function BoardPage() {
  const [rows, setRows] = useState<Opportunity[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<Stage | null>(null);
  const columnRefs = useRef<Partial<Record<Stage, HTMLDivElement | null>>>({});

  useEffect(() => {
    api<{ opportunities: Opportunity[] }>("/api/opportunities")
      .then((d) => setRows(d.opportunities))
      .catch((e) => setError(`Could not load the board: ${errorText(e)}`));
  }, []);

  async function move(id: string, stage: Stage) {
    const current = rows?.find((r) => r.id === id);
    if (!current || current.status === stage) return;
    const before = rows;
    setRows((prev) => prev?.map((r) => (r.id === id ? { ...r, status: stage } : r)) ?? prev);
    setSaving(id);
    setError(null);
    try {
      await api(`/api/opportunities/${id}`, { method: "PATCH", body: { status: stage } });
    } catch (e) {
      setRows(before);
      setError(`Move was NOT saved: ${errorText(e)}`);
    } finally {
      setSaving(null);
    }
  }

  // Pointer-event drag. On release, find the column under the pointer and move the card there.
  function onPointerDown(e: RPointerEvent<HTMLDivElement>, id: string) {
    if (e.pointerType === "touch") return; // touch uses the move buttons so scrolling keeps working
    setDragId(id);
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e: RPointerEvent<HTMLDivElement>) {
    if (!dragId) return;
    const hit = STAGES.find((s) => {
      const el = columnRefs.current[s];
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    });
    setOverStage(hit ?? null);
  }
  function onPointerUp() {
    if (dragId && overStage) move(dragId, overStage);
    setDragId(null);
    setOverStage(null);
  }

  if (!rows && !error) return <LoadingBlock label="Loading the board" />;

  const byStage = (s: Stage) => (rows ?? []).filter((r) => r.status === s);

  return (
    <section className="space-y-8">
      <div>
        <p className="label-mono mb-3">Pipeline</p>
        <h1 className="font-serif text-4xl font-medium tracking-tighter sm:text-5xl">Board</h1>
        <p className="mt-3 text-sm text-white/50">
          Drag a card to another stage on desktop, or use the move buttons on mobile. Every move is saved.
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-2xl border border-red-500/20 bg-red-500/[0.06] p-4 text-sm text-red-300">
          {error}
        </p>
      )}

      {rows && rows.length === 0 && (
        <div className="glass rounded-3xl border-dashed p-10 text-center">
          <p className="font-serif text-2xl">Nothing on the board yet</p>
          <p className="mt-2 text-sm text-white/50">Add an RFQ and its opportunity will appear in the Intake column.</p>
          <Link href="/dashboard/new" className="btn-primary mt-6">Add an RFQ</Link>
        </div>
      )}

      {rows && rows.length > 0 && (
        <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0" onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
          <div className="grid min-w-max grid-flow-col auto-cols-[minmax(230px,1fr)] gap-4">
            {STAGES.map((stage) => {
              const cards = byStage(stage);
              const hot = overStage === stage;
              return (
                <div
                  key={stage}
                  ref={(el) => {
                    columnRefs.current[stage] = el;
                  }}
                  className={`glass flex min-h-[200px] flex-col rounded-3xl p-3 transition-colors duration-500 ${
                    hot ? "border-emerald-400/60 bg-emerald-500/[0.05]" : ""
                  }`}
                >
                  <div className="mb-3 flex items-center justify-between px-2">
                    <p className="label-mono !text-[10px]">{stage}</p>
                    <span className="text-xs tabular-nums text-white/40">{cards.length}</span>
                  </div>
                  <div className="flex flex-1 flex-col gap-3">
                    {cards.length === 0 && <p className="px-2 py-6 text-center text-xs text-white/30">Empty</p>}
                    {cards.map((opp) => (
                      <BoardCard
                        key={opp.id}
                        opp={opp}
                        stage={stage}
                        saving={saving === opp.id}
                        dragging={dragId === opp.id}
                        onPointerDown={(e) => onPointerDown(e, opp.id)}
                        onMove={(s) => move(opp.id, s)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

function BoardCard({
  opp,
  stage,
  saving,
  dragging,
  onPointerDown,
  onMove,
}: {
  opp: Opportunity;
  stage: Stage;
  saving: boolean;
  dragging: boolean;
  onPointerDown: (e: RPointerEvent<HTMLDivElement>) => void;
  onMove: (s: Stage) => void;
}) {
  const days = daysUntil(opp.deadline);
  const tone = deadlineTone(days);
  const idx = STAGES.indexOf(stage);
  const toneClass =
    tone === "overdue" || tone === "urgent"
      ? "border-red-500/40 text-red-300"
      : tone === "soon"
      ? "border-emerald-500/40 text-emerald-300 animate-glow-pulse"
      : "border-white/10 text-white/50";
  return (
    <div
      onPointerDown={onPointerDown}
      className={`glass touch-pan-y rounded-2xl border border-white/10 p-4 transition-opacity duration-300 ${
        dragging ? "opacity-50" : ""
      } ${saving ? "animate-pulse" : ""}`}
    >
      <Link href={`/dashboard/${opp.id}`} className="font-serif text-base leading-snug hover:underline">
        {opp.title}
      </Link>
      <p className="mt-1 truncate text-xs text-white/40">{opp.buyer || "no buyer"}</p>
      <span className={`mt-3 inline-block rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-wider ${toneClass}`}>
        {countdownLabel(days)}
      </span>
      <p className="mt-1 text-[11px] text-white/35">{formatDate(opp.deadline)}</p>
      <div className="mt-3 flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label="Move to previous stage"
          disabled={idx === 0 || saving}
          onClick={() => onMove(STAGES[idx - 1])}
          className="min-h-[36px] min-w-[36px] rounded-full border border-white/10 text-sm disabled:opacity-30"
        >
          ‹
        </button>
        {saving ? <BreathingLoader /> : <span className="label-mono !text-[9px]">{idx + 1}/{STAGES.length}</span>}
        <button
          type="button"
          aria-label="Move to next stage"
          disabled={idx === STAGES.length - 1 || saving}
          onClick={() => onMove(STAGES[idx + 1])}
          className="min-h-[36px] min-w-[36px] rounded-full border border-white/10 text-sm disabled:opacity-30"
        >
          ›
        </button>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api";

type State = { completed: boolean; currentStep: number; completedSteps: number[]; skippedSteps: number[]; selectedTemplate: "branded" | "plain" | null };
const steps = [
  { title: "Create your company profile", text: "Add your organisation details so bid responses can start from the right context.", detail: "Save your company name, sector and website in Settings.", href: "/dashboard/settings", action: "Open company settings" },
  { title: "Upload your first RFQ", text: "Add a tender document or paste the RFQ text to start an opportunity.", detail: "Create an opportunity from a tender request. It will be saved to your workspace.", href: "/dashboard/new", action: "Open New RFQ" },
  { title: "Pick a proposal template", text: "Choose a branded presentation or a clean plain response.", detail: "This is your starting preference and can be changed later for any opportunity.", href: "/dashboard", action: "Choose a template" },
  { title: "Run your first generation", text: "Review requirements and generate your first response draft.", detail: "Open an opportunity, save requirements, map at least one, then generate drafts.", href: "/dashboard", action: "Open opportunities" },
];
const STEP_COUNT = steps.length;

export function OnboardingGuide({ initial }: { initial: State }) {
  const [state, setState] = useState(initial);
  const [open, setOpen] = useState(!initial.completed);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const pathname = usePathname();
  const step = steps[state.currentStep] || steps[0];

  async function update(action: "complete" | "finish" | "template" | "restart", template?: "branded" | "plain", stepOverride?: number) {
    setSaving(true); setError("");
    try {
      const next = await api<State>("/api/onboarding", { method: "PATCH", body: { action, step: stepOverride ?? state.currentStep, template } });
      setState(next); if (next.completed) setOpen(false);
    } catch { setError("Your progress could not be saved. Please try again."); }
    finally { setSaving(false); }
  }

  useEffect(() => {
    const openGuide = () => { setError(""); setOpen(true); };
    const restart = () => { void update("restart", undefined, 0); setOpen(true); };
    const completeStep = (event: Event) => {
      const index = (event as CustomEvent<{step?: number}>).detail?.step;
      if (Number.isInteger(index) && index! >= 0 && index! < STEP_COUNT) void update("complete", undefined, index);
    };
    const finishStep = (event: Event) => {
      const index = (event as CustomEvent<{step?: number}>).detail?.step;
      if (Number.isInteger(index) && index! >= 0 && index! < STEP_COUNT) void update("finish", undefined, index);
    };
    window.addEventListener("vf:onboarding-open", openGuide);
    window.addEventListener("vf:onboarding-restart", restart);
    window.addEventListener("vf:onboarding-step-complete", completeStep);
    window.addEventListener("vf:onboarding-step-finish", finishStep);
    return () => {
      window.removeEventListener("vf:onboarding-open", openGuide);
      window.removeEventListener("vf:onboarding-restart", restart);
      window.removeEventListener("vf:onboarding-step-complete", completeStep);
      window.removeEventListener("vf:onboarding-step-finish", finishStep);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    const previous = document.body.style.overflow; document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = previous; document.removeEventListener("keydown", onKeyDown); };
  }, [open]);

  useEffect(() => {
    const target = pathname === "/dashboard/settings" && state.currentStep === 0 ? "settings" : pathname === "/dashboard/new" && state.currentStep === 1 ? "new-rfq" : "";
    if (target) document.documentElement.dataset.onboardingTarget = target;
    else delete document.documentElement.dataset.onboardingTarget;
    return () => { delete document.documentElement.dataset.onboardingTarget; };
  }, [pathname, state.currentStep]);

  const done = state.completedSteps.length + state.skippedSteps.length;
  const previous = Math.max(0, state.currentStep - 1);
  return <>
    {!open && !state.completed && <button type="button" onClick={() => setOpen(true)} className="fixed bottom-20 right-4 z-40 rounded-full border border-emerald-400/30 bg-[#07110d]/95 px-4 py-3 text-sm text-emerald-100 shadow-xl backdrop-blur-xl md:bottom-6">Resume setup <span className="ml-2 text-emerald-300">{done}/{STEP_COUNT}</span></button>}
    {open && <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/75 p-3 backdrop-blur-md sm:p-6" role="presentation">
      <section className="glass shimmer-border breathing-panel relative my-auto w-full max-w-3xl rounded-[1.75rem] border border-emerald-400/20 bg-[#080b09]/95 p-5 shadow-[0_24px_100px_rgba(0,0,0,.75)] backdrop-blur-2xl sm:p-8" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
        <div className="flex items-start justify-between gap-4"><div><p className="label-mono mb-2 !text-emerald-300/80">Your guided setup · {state.currentStep + 1} of {STEP_COUNT}</p><h2 id="onboarding-title" className="font-serif text-2xl leading-tight sm:text-3xl">{step.title}</h2></div><button type="button" onClick={() => setOpen(false)} className="shrink-0 rounded-full border border-white/10 px-4 py-2 text-xs text-white/60">Later</button></div>
        <div className="mt-6 h-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-emerald-400 transition-[width] duration-700" style={{width:`${Math.max(8, done / STEP_COUNT * 100)}%`}} /></div>
        <ol className="mt-4 grid grid-cols-4 gap-1.5" aria-label="Onboarding checklist">{steps.map((item,index)=><li key={item.title} title={item.title} className={`h-1 rounded-full ${state.completedSteps.includes(index)||state.skippedSteps.includes(index)?"bg-emerald-400":index===state.currentStep?"bg-emerald-400/60":"bg-white/10"}`} />)}</ol>
        <div className="mx-auto max-w-xl py-5 sm:py-10"><p className="text-base leading-relaxed text-white/70 sm:text-lg">{step.text}</p><p className="mt-3 text-sm leading-relaxed text-white/45">{step.detail}</p>
          {state.currentStep===2&&<div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">{(["branded","plain"] as const).map(template=><button key={template} type="button" disabled={saving} onClick={()=>update("template",template)} className={`rounded-2xl border p-4 text-left transition ${state.selectedTemplate===template?"border-emerald-400/60 bg-emerald-400/10":"border-white/10 bg-white/[0.02] hover:border-white/25"}`}><span className="block font-serif text-lg">{template==="branded"?"Branded":"Plain"}</span><span className="mt-1 block text-xs text-white/45">{template==="branded"?"Your identity, front and centre":"A clean, unstyled response"}</span></button>)}</div>}
          {error&&<p role="alert" className="mt-5 text-sm text-red-300">{error}</p>}
          <div className="mt-7 flex flex-wrap items-center gap-2">{state.currentStep===2?<button type="button" disabled={saving||!state.selectedTemplate} onClick={()=>update("complete")} className="btn-primary !min-h-11 !px-5">{saving?"Saving…":"Save choice & continue"}</button>:state.currentStep===3?<><Link href={step.href} className="btn-primary !min-h-11 !px-5">{step.action}</Link><button type="button" onClick={()=>setOpen(false)} className="btn-secondary !min-h-11 !px-4">Later</button></>:<><Link href={step.href} className="btn-secondary !min-h-11 !px-4">{step.action}</Link><button type="button" disabled={saving} onClick={()=>update("complete")} className="btn-primary !min-h-11 !px-5">{saving?"Saving…":"Continue"}</button></>}</div>
          <div className="mt-5 flex items-center justify-between border-t border-white/5 pt-4"><span className="text-[11px] text-white/35">Progress saves automatically</span><div className="flex items-center gap-4">{state.completed && <button type="button" disabled={saving} onClick={() => update("restart", undefined, 0)} className="text-xs text-white/45 hover:text-white/75">Restart setup</button>}{state.currentStep>0&&<button type="button" disabled={saving} onClick={()=>update("complete",undefined,previous)} className="text-xs text-white/45 hover:text-white/75">Previous step</button>}</div></div>
        </div>
      </section>
    </div>}
  </>;
}

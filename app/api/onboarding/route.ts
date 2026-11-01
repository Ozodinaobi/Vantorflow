import { NextResponse } from "next/server";
import { DbError, errorResponse, rest, authCall } from "@/lib/db";
import { requireUser } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";
type Onboarding = { completed: boolean; currentStep: number; completedSteps: number[]; skippedSteps: number[]; selectedTemplate: "branded" | "plain" | null };
type Row = { onboarding_completed: boolean; current_step: number; completed_steps: number[]; skipped_steps: number[]; selected_template: "branded" | "plain" | null };
const LAST_STEP = 3;
const blank = (): Onboarding => ({ completed: false, currentStep: 0, completedSteps: [], skippedSteps: [], selectedTemplate: null });
function isMissingTable(error: unknown) { return error instanceof DbError && (error.code === "PGRST205" || /Could not find the table/i.test(error.message)); }
function normalizeStep(value: unknown) { return typeof value === "number" && Number.isInteger(value) ? Math.min(LAST_STEP, Math.max(0, value)) : 0; }
function fromMetadata(metadata: Record<string, unknown>): Onboarding {
  if (metadata.vf_onboarding_completed !== false) return { ...blank(), completed: true };
  const valid = (value: unknown) => Array.isArray(value) ? value.filter((x): x is number => Number.isInteger(x) && x >= 0 && x <= LAST_STEP) : [];
  return { completed: false, currentStep: normalizeStep(metadata.vf_onboarding_step), completedSteps: valid(metadata.vf_onboarding_completed_steps), skippedSteps: valid(metadata.vf_onboarding_skipped_steps), selectedTemplate: metadata.vf_onboarding_template === "branded" || metadata.vf_onboarding_template === "plain" ? metadata.vf_onboarding_template : null };
}
function toClient(row: Row): Onboarding { return { completed: row.onboarding_completed, currentStep: normalizeStep(row.current_step), completedSteps: row.completed_steps ?? [], skippedSteps: row.skipped_steps ?? [], selectedTemplate: row.selected_template ?? null }; }
async function userMetadata(userId: string): Promise<Record<string, unknown>> {
  const result = await authCall("GET", `/admin/users/${encodeURIComponent(userId)}`);
  if (!result.ok) throw new DbError("Could not load onboarding state.", result.status, null);
  return (result.data?.user?.user_metadata ?? result.data?.user_metadata ?? {}) as Record<string, unknown>;
}
async function readState(userId: string) {
  try {
    const rows = await rest<Row[]>("GET", "vf_onboarding", { query: `?user_id=eq.${encodeURIComponent(userId)}&select=onboarding_completed,current_step,completed_steps,skipped_steps,selected_template&limit=1` });
    if (rows[0]) return toClient(rows[0]);
  } catch (error) { if (!isMissingTable(error)) throw error; }
  return fromMetadata(await userMetadata(userId));
}
async function saveState(userId: string, state: Onboarding) {
  try {
    await rest("POST", "vf_onboarding", { query: "?on_conflict=user_id", body: { user_id: userId, onboarding_completed: state.completed, current_step: state.currentStep, completed_steps: state.completedSteps, skipped_steps: state.skippedSteps, selected_template: state.selectedTemplate }, prefer: "resolution=merge-duplicates,return=minimal" });
    return;
  } catch (error) { if (!isMissingTable(error)) throw error; }
  const metadata = await userMetadata(userId);
  const result = await authCall("PATCH", `/admin/users/${encodeURIComponent(userId)}`, { user_metadata: { ...metadata, vf_onboarding_completed: state.completed, vf_onboarding_step: state.currentStep, vf_onboarding_completed_steps: state.completedSteps, vf_onboarding_skipped_steps: state.skippedSteps, vf_onboarding_template: state.selectedTemplate } });
  if (!result.ok) throw new DbError("Could not save onboarding progress.", result.status, null);
}
export async function GET() {
  const auth = await requireUser(); if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });
  try { return NextResponse.json(await readState(auth.userId)); } catch (error) { return errorResponse(error); }
}
export async function PATCH(request: Request) {
  const auth = await requireUser(); if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });
  let body: { action?: unknown; step?: unknown; template?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 }); }
  const action = body.action;
  if (action === "restart") {
    if (body.step !== 0) return NextResponse.json({ error: "Invalid onboarding restart." }, { status: 400 });
    try { const reset = blank(); await saveState(auth.userId, reset); return NextResponse.json(reset); } catch (error) { return errorResponse(error); }
  }
  const step = body.step;
  if (typeof step !== "number" || !Number.isInteger(step) || step < 0 || step > LAST_STEP || !["complete", "finish", "template"].includes(String(action))) return NextResponse.json({ error: "Invalid onboarding update." }, { status: 400 });
  if (action === "template" && body.template !== "branded" && body.template !== "plain") return NextResponse.json({ error: "Choose a valid response template." }, { status: 400 });
  try {
    const current = await readState(auth.userId);
    const completedSteps = [...new Set(current.completedSteps)];
    let completed = current.completed; let currentStep = step; let selectedTemplate = current.selectedTemplate;
    if (action === "complete") { if (!completedSteps.includes(step)) completedSteps.push(step); currentStep = Math.min(LAST_STEP, step + 1); }
    else if (action === "template") selectedTemplate = body.template as "branded" | "plain";
    else if (action === "finish") { if (!completedSteps.includes(step)) completedSteps.push(step); completed = true; currentStep = LAST_STEP; }
    const next = { completed, currentStep, completedSteps, skippedSteps: current.skippedSteps, selectedTemplate };
    await saveState(auth.userId, next);
    return NextResponse.json(next);
  } catch (error) { return errorResponse(error); }
}

import { NextResponse } from "next/server";
import { DbError, errorResponse, rest, authCall } from "@/lib/db";
import { requireUser } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

type Onboarding = {
  completed: boolean;
  currentStep: number;
  completedSteps: number[];
  skippedSteps: number[];
  selectedTemplate: "branded" | "plain" | null;
};

type OnboardingRow = {
  onboarding_completed: boolean;
  current_step: number;
  completed_steps: number[];
  skipped_steps: number[];
  selected_template: "branded" | "plain" | null;
};

function fromMetadata(metadata: Record<string, unknown> | undefined): Onboarding {
  if (metadata?.vf_onboarding_completed === false) {
    return {
      completed: false,
      currentStep: Number.isInteger(metadata.vf_onboarding_step) ? Number(metadata.vf_onboarding_step) : 0,
      completedSteps: Array.isArray(metadata.vf_onboarding_completed_steps) ? metadata.vf_onboarding_completed_steps.filter(Number.isInteger) as number[] : [],
      skippedSteps: Array.isArray(metadata.vf_onboarding_skipped_steps) ? metadata.vf_onboarding_skipped_steps.filter(Number.isInteger) as number[] : [],
      selectedTemplate: metadata.vf_onboarding_template === "branded" || metadata.vf_onboarding_template === "plain" ? metadata.vf_onboarding_template : null,
    };
  }
  // Accounts created before onboarding was introduced stay out of the walkthrough.
  return { completed: true, currentStep: 0, completedSteps: [], skippedSteps: [], selectedTemplate: null };
}

function toClient(row: OnboardingRow): Onboarding {
  return {
    completed: row.onboarding_completed,
    currentStep: row.current_step,
    completedSteps: row.completed_steps ?? [],
    skippedSteps: row.skipped_steps ?? [],
    selectedTemplate: row.selected_template ?? null,
  };
}

async function userMetadata(userId: string): Promise<Record<string, unknown>> {
  const result = await authCall("GET", `/admin/users/${encodeURIComponent(userId)}`);
  if (!result.ok) throw new DbError("Could not load onboarding state.", result.status, null);
  return (result.data?.user?.user_metadata ?? result.data?.user_metadata ?? {}) as Record<string, unknown>;
}

function isMissingTable(error: unknown) {
  return error instanceof DbError && (error.code === "PGRST205" || /Could not find the table/i.test(error.message));
}

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });
  try {
    try {
      const rows = await rest<OnboardingRow[]>("GET", "vf_onboarding", {
        query: `?user_id=eq.${encodeURIComponent(auth.userId)}&select=onboarding_completed,current_step,completed_steps,skipped_steps,selected_template&limit=1`,
      });
      if (rows[0]) return NextResponse.json(toClient(rows[0]));
    } catch (error) {
      if (!isMissingTable(error)) throw error;
    }
    return NextResponse.json(fromMetadata(await userMetadata(auth.userId)));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });
  let body: { action?: unknown; step?: unknown; template?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const step = typeof body.step === "number" && Number.isInteger(body.step) && body.step >= 0 && body.step <= 4 ? body.step : null;
  const action = body.action;
  if (action === "restart" && step === 0) {
    try {
      const metadata = await userMetadata(auth.userId);
      const reset = {
        ...metadata,
        vf_onboarding_completed: false,
        vf_onboarding_step: 0,
        vf_onboarding_completed_steps: [],
        vf_onboarding_skipped_steps: [],
        vf_onboarding_template: null,
      };
      let tableSaved = false;
      try {
        await rest("POST", "vf_onboarding", {
          query: "?on_conflict=user_id",
          body: { user_id: auth.userId, onboarding_completed: false, current_step: 0, completed_steps: [], skipped_steps: [], selected_template: null },
          prefer: "resolution=merge-duplicates,return=minimal",
        });
        tableSaved = true;
      } catch (error) {
        if (!isMissingTable(error)) throw error;
      }
      if (!tableSaved) {
        const saved = await authCall("PATCH", `/admin/users/${encodeURIComponent(auth.userId)}`, { user_metadata: reset });
        if (!saved.ok) throw new DbError("Could not reopen onboarding.", saved.status, null);
      }
      return NextResponse.json({ completed: false, currentStep: 0, completedSteps: [], skippedSteps: [], selectedTemplate: null });
    } catch (error) {
      return errorResponse(error);
    }
  }
  if (step === null || !["complete", "skip", "finish", "template"].includes(String(action))) {
    return NextResponse.json({ error: "Invalid onboarding update." }, { status: 400 });
  }
  if (action === "skip" && ![1, 2, 3].includes(step)) {
    return NextResponse.json({ error: "This step cannot be skipped." }, { status: 400 });
  }
  if (action === "template" && body.template !== "branded" && body.template !== "plain") {
    return NextResponse.json({ error: "Choose a valid response template." }, { status: 400 });
  }
  try {
    const current = await (async () => {
      try {
        const rows = await rest<OnboardingRow[]>("GET", "vf_onboarding", {
          query: `?user_id=eq.${encodeURIComponent(auth.userId)}&select=onboarding_completed,current_step,completed_steps,skipped_steps,selected_template&limit=1`,
        });
        if (rows[0]) return toClient(rows[0]);
      } catch (error) {
        if (!isMissingTable(error)) throw error;
      }
      return fromMetadata(await userMetadata(auth.userId));
    })();

    const completedSteps = [...new Set(current.completedSteps)];
    const skippedSteps = [...new Set(current.skippedSteps)];
    let currentStep = step;
    let completed = current.completed;
    let selectedTemplate = current.selectedTemplate;
    if (action === "complete") {
      if (!completedSteps.includes(step)) completedSteps.push(step);
      if (step < 4) currentStep = step + 1;
    } else if (action === "skip") {
      if (!skippedSteps.includes(step)) skippedSteps.push(step);
      if (step < 4) currentStep = step + 1;
    } else if (action === "template") {
      selectedTemplate = body.template as "branded" | "plain";
    } else if (action === "finish") {
      completed = true;
      if (!completedSteps.includes(4)) completedSteps.push(4);
      currentStep = 4;
    }

    const next: Onboarding = { completed, currentStep, completedSteps, skippedSteps, selectedTemplate };
    const row = {
      user_id: auth.userId,
      onboarding_completed: next.completed,
      current_step: next.currentStep,
      completed_steps: next.completedSteps,
      skipped_steps: next.skippedSteps,
      selected_template: next.selectedTemplate,
    };

    let tableSaved = false;
    try {
      await rest("POST", "vf_onboarding", { query: "?on_conflict=user_id", body: row, prefer: "resolution=merge-duplicates,return=minimal" });
      tableSaved = true;
    } catch (error) {
      if (!isMissingTable(error)) throw error;
    }

    // The table is the primary durable store. Use auth metadata only when the optional
    // progress table has not been installed, so a metadata lookup cannot break a valid table write.
    if (!tableSaved) {
      const metadata = await userMetadata(auth.userId);
      const metaUpdate = await authCall("PATCH", `/admin/users/${encodeURIComponent(auth.userId)}`, {
        user_metadata: {
          ...metadata,
          vf_onboarding_completed: next.completed,
          vf_onboarding_step: next.currentStep,
          vf_onboarding_completed_steps: next.completedSteps,
          vf_onboarding_skipped_steps: next.skippedSteps,
          vf_onboarding_template: next.selectedTemplate,
        },
      });
      if (!metaUpdate.ok) throw new DbError("Could not save onboarding progress.", metaUpdate.status, null);
    }
    return NextResponse.json(next);
  } catch (error) {
    return errorResponse(error);
  }
}

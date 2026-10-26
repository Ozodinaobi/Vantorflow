// Audit trail writer. Best effort: never breaks the action being audited.
import { rest } from "@/lib/db";

export async function audit(userId: string, opportunityId: string | null, action: string, detail: Record<string, unknown> = {}): Promise<void> {
  try {
    await rest("POST", "vf_audit", {
      body: { user_id: userId, opportunity_id: opportunityId, action, detail },
      prefer: "return=minimal",
    });
  } catch {
    // The audit table may not exist yet (migration pending). Never fail the user's action.
  }
}

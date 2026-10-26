// SERVER ONLY. Maps live Supabase rows (see the verified live schema) to the shapes the UI uses.
// Live columns: opportunities(buyer_organization, deadline_date, estimated_value text, rfq_id),
// rfqs(buyer_organization, deadline_date, rfq_text), requirements(description, section, opportunity_id, rfq_id),
// response_sections(content, section, opportunity_id, rfq_id). Requirements have no number column, so the
// number is the position in created_at order (rows are inserted with explicit, increasing created_at).

export function toOpportunity(row: any) {
  return {
    id: row.id,
    user_id: row.user_id,
    rfq_id: row.rfq_id ?? null,
    title: row.title,
    buyer: row.buyer_organization ?? "",
    deadline: row.deadline_date ?? null,
    // estimated_value is stored as text. Kept as text; the UI formats it for display.
    value: row.estimated_value ?? null,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    // Outcome columns come from the FEATURES MIGRATION. Null until the owner runs it.
    outcome_result: row.outcome_result ?? null,
    outcome_reason: row.outcome_reason ?? null,
    outcome_notes: row.outcome_notes ?? null,
    outcome_at: row.outcome_at ?? null,
  };
}

export function toRfq(row: any) {
  return {
    id: row.id,
    title: row.title,
    buyer: row.buyer_organization ?? "",
    deadline: row.deadline_date ?? null,
    rfq_text: row.rfq_text ?? "",
    created_at: row.created_at,
  };
}

// Requirement number = 1-based position in created_at order.
export function toRequirements(rows: any[]) {
  const sorted = [...rows].sort((a, b) => {
    const t = String(a.created_at).localeCompare(String(b.created_at));
    return t !== 0 ? t : String(a.id).localeCompare(String(b.id));
  });
  return sorted.map((r, i) => ({
    id: r.id,
    opportunity_id: r.opportunity_id,
    number: i + 1,
    text: r.description ?? "",
    category: r.category ?? "Other",
    section: r.section ?? null,
  }));
}

export function toDraft(row: any) {
  return {
    id: row.id,
    opportunity_id: row.opportunity_id,
    section: row.section,
    draft: row.content ?? "",
    updated_at: row.updated_at,
  };
}

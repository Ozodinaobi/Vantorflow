# Vantorflow premium feature roadmap

## Product aim

A $5,000/month tier should sell a measurable bid-operation outcome, not a longer feature checklist: fewer missed deadlines, faster and safer responses, stronger bid decisions, and a clear audit trail across a team or agency portfolio. The premium experience should feel like an expert bid operations room for UK and US teams, with Vantorflow's existing near-black canvas, emerald accents, Newsreader headings, Inter body text, and restrained glass surfaces.

This is a product plan only. No application code, schema, deployment, or Git changes are included.

## Current foundation and implementation note

The checked-in app has opportunity, RFQ, requirements, response-section, company/settings, approval, qualification, and answer-library concepts. Its route handlers cover opportunity listing/detail and stage updates, requirement replacement, draft save, RFQ extraction, generation, onboarding, settings, and branded email sending. The checked-in `supabase-schema.sql` is not fully aligned with all live route payloads or the context's legacy table names. Before any feature implementation, reconcile the deployed schema and existing APIs against the actual Supabase project, preserve data, and treat current route/table names below as extension points rather than permission to rename or drop tables.

Complexity is a relative delivery estimate: S = focused feature using existing flows; M = new workflow or moderate persistence/integration; L = multiple services, robust permissions, or substantial data and reliability work. It excludes a full redesign and assumes phased rollout.

## Feature set

### Phase 1: Visible premium value and bid control

1. **Deadline Radar**. See every live bid deadline, next action, and risk signal in one prioritized view so the team can act before a submission becomes urgent. **Complexity: M.** Extends `opportunities.deadline`, `opportunities.status`, `/api/opportunities`, `/api/opportunities/[id]`; add persisted task/reminder records and a scheduled notification worker.

2. **Bid Calendar and Reminder Rules**. Put milestones on a shared bid calendar and send configurable reminders for clarification cutoffs, reviews, approvals, and submission deadlines. **Complexity: M.** Extends `opportunities`, `/api/opportunities/[id]`; add `bid_milestones` and `notification_preferences`, plus a scheduled delivery API/job.

3. **Go/No-Go Decision Brief**. Turn fit, mandatory eligibility, capacity, value, risk, and strategic fit into a documented pursue/pass recommendation that leaders can review. **Complexity: M.** Extends `opportunities`, `requirements`, `vf_qualifications`, and the opportunity detail API; add decision fields or `bid_decisions` with a rationale and reviewer.

4. **Win-Probability Scorecard**. Show a transparent, evidence-linked win-likelihood range and the factors that raise or lower it, improving as the team records outcomes. **Complexity: L.** Extends `opportunities.status`, `opportunities.value`, `requirements`, and outcome handling in `/api/opportunities/[id]`; add `bid_outcomes` and versioned scoring snapshots. Keep scores explainable, not a guarantee.

5. **Bid Health and Readiness Board**. Surface missing requirements, stale drafts, overdue tasks, unapproved sections, and unanswered clarification items before they block submission. **Complexity: M.** Extends `requirements`, `response_sections`, `vf_approvals`, and opportunity detail/readiness APIs.

6. **Submission Countdown and Critical Path**. Work backward from the buyer's deadline into review, pricing, sign-off, and production milestones, with visible ownership and slippage. **Complexity: M.** Extends `opportunities.deadline`, `opportunities.status`, `/api/opportunities/[id]`; add `bid_milestones` and task assignment fields.

7. **Clarification Question Tracker**. Draft, assign, and track buyer clarification questions and answers with due dates and links back to affected requirements. **Complexity: M.** Extends `rfqs`, `requirements`, `/api/opportunities/[id]/requirements`, and `/api/email/send`; add `clarification_threads`.

8. **Portfolio Pipeline Forecast**. Forecast bid value, weighted pipeline, stage aging, and deadline load across all opportunities for an agency or bid director. **Complexity: M.** Extends `opportunities.value`, `opportunities.status`, `/api/opportunities`; add outcome and probability data only as it becomes available.

### Phase 2: Team execution, assurance, and control

9. **Team Roles and Workspace Access**. Give bid managers, writers, reviewers, finance, and client stakeholders appropriately scoped access without sharing one account. **Complexity: L.** Extends `companies`, `vf_companies`, and current server auth in `/api/auth/*`; add `workspace_members` and role-aware authorization across APIs.

10. **Task Ownership and Workload View**. Assign each response section and bid task to a person, see workload by deadline, and make handoffs explicit. **Complexity: M.** Extends `requirements`, `response_sections`, `opportunities`, `/api/opportunities/[id]`; add `bid_tasks` and membership references.

11. **Inline Comments and Review Threads**. Discuss a specific requirement or draft passage in context so review decisions do not disappear into separate email chains. **Complexity: M.** Extends `requirements`, `response_sections`, and draft APIs; add `review_comments` with anchor, author, status, and timestamps.

12. **Version History and Restore**. Compare edits and restore an earlier approved answer or proposal section with a clear author and timestamp. **Complexity: M.** Extends `response_sections` and `/api/opportunities/[id]/drafts`; add append-only `response_section_versions`.

13. **Approval Policies and Delegation**. Route commercial, technical, legal, and executive sign-offs to the right approvers, including delegation and escalation. **Complexity: L.** Extends `vf_approvals`, `response_sections`, and opportunity APIs; add policy, approver, and approval-event records.

14. **Audit Trail and Evidence Log**. Produce a searchable record of who changed a bid, approved a response, exported a pack, or sent an issuer email. **Complexity: L.** Extends all opportunity and approval APIs; add append-only `audit_events` and centralized server-side event capture.

15. **Compliance Matrix Auto-Check**. Map every tender clause to a response, evidence item, owner, and compliance state, and flag gaps before approval. **Complexity: M.** Extends `requirements`, `response_sections`, `vf_qualifications`, and extraction/generation APIs; add requirement status/evidence mapping fields or `requirement_evidence`.

16. **Mandatory Eligibility Gate**. Distinguish pass/fail mandatory conditions from scored criteria and stop teams from treating a disqualifying gap as ordinary drafting work. **Complexity: M.** Extends `requirements`, `vf_qualifications`, RFQ extraction, and readiness APIs; add explicit mandatory/eligibility result and evidence fields.

17. **Evidence Expiry and Credential Alerts**. Track expiry dates for insurance, certifications, policies, and personnel credentials, warning bid teams before evidence becomes unusable. **Complexity: M.** Extends `vf_qualifications`, `companies`, and settings APIs; add expiry, owner, renewal, and document-reference fields.

18. **Risk Register and Mitigation Owners**. Record delivery, legal, commercial, and dependency risks beside each bid, with mitigation owner and review status. **Complexity: M.** Extends `opportunities`, `requirements`, and opportunity detail APIs; add `bid_risks`.

### Phase 3: Reusable knowledge and response quality

19. **AI Answer Library Reuse**. Find approved answers by meaning, requirement, buyer, and sector, then reuse them with source attribution instead of rewriting from scratch. **Complexity: L.** Extends `vf_answer_library`, `response_sections`, and `/api/generate`; add semantic indexing, reuse references, and approval freshness metadata.

20. **Answer Freshness and Owner Review**. Flag approved answers that have become stale and send them to a named owner for reconfirmation before reuse. **Complexity: M.** Extends `vf_answer_library` and company settings; add review dates, owner, and freshness state.

21. **Case-Study and Reference Library**. Store vetted project examples, outcomes, metrics, and customer-approved references so writers can select credible evidence for a specific criterion. **Complexity: M.** Extends `vf_answer_library`, `vf_companies`, and `/api/generate`; add `case_studies` and approval/consent metadata.

22. **Proof-Point and Claim Checker**. Highlight unsupported claims, missing evidence, and numerical assertions in drafts before they reach a client or buyer. **Complexity: L.** Extends `response_sections`, `vf_qualifications`, `vf_answer_library`, and `/api/generate`; add claim-to-evidence links and review results.

23. **Buyer and Sector Voice Profiles**. Adapt tone, terminology, and emphasis to a buyer or sector using approved examples while retaining the team's own verified facts. **Complexity: M.** Extends `vf_answer_library`, `companies`, and `/api/generate`; add versioned style profiles.

24. **Cross-Bid Content Reuse Map**. Show where a response has appeared before, which version was approved, and what needs tailoring for the current tender. **Complexity: M.** Extends `response_sections`, `rfqs`, `opportunities`, and draft APIs; add reuse lineage metadata.

25. **Response Quality Rubric**. Score clarity, evidence, requirement coverage, differentiation, and readability with actionable feedback against a configurable bid rubric. **Complexity: M.** Extends `requirements`, `response_sections`, and `/api/generate`; add rubric definitions and versioned evaluations.

26. **Red-Team Review Mode**. Let an independent reviewer challenge assumptions, identify weak answers, and record unresolved issues before sign-off. **Complexity: M.** Extends `response_sections`, `vf_approvals`, and review APIs; add review sessions and issue records.

27. **Buyer Feedback and Debrief Capture**. Record debrief scores and buyer feedback after an outcome, then connect the lessons to future bids and content improvements. **Complexity: M.** Extends opportunity outcome handling and `vf_answer_library`; add `bid_debriefs` and outcome detail.

### Phase 4: Commercial readiness and client-facing delivery

28. **Structured Pricing Workbench**. Build auditable pricing tables for rates, units, options, assumptions, and totals, then link commercial answers to the same controlled figures. **Complexity: L.** Extends `response_sections` Pricing, `opportunities.value`, and `/api/opportunities/[id]/drafts`; add `pricing_schedules` and line items.

29. **Pricing Scenario and Margin Guardrails**. Compare bid price scenarios and flag margin or approval-policy breaches before a commercial offer is released. **Complexity: L.** Extends pricing schedules, `vf_approvals`, and company settings; add scenario snapshots and configurable thresholds.

30. **Client-Ready Branded Proposal Packs**. Export a polished, branded response pack with a contents page, consistent styles, and selected evidence, ready for client review or submission. **Complexity: M.** Extends `response_sections`, `vf_companies`, and existing DOCX/PDF export paths; add export profile fields.

31. **Submission Packaging and Checklist**. Assemble final documents with a versioned file manifest, format checks, naming rules, and a completion checklist to reduce portal-upload mistakes. **Complexity: M.** Extends `response_sections`, `requirements`, and export APIs; add `submission_packages` and manifest records.

32. **CSV and ZIP Export Bundles**. Export opportunity data, requirements, owners, and selected evidence in portable CSV/ZIP bundles for client handoff and internal reporting. **Complexity: S.** Extends `/api/opportunities`, requirement APIs, and export paths; no new table required for a first version.

33. **White-Label Client Review Links**. Share a branded, permission-limited proposal review page with a client, collect comments, and revoke access without exposing the internal workspace. **Complexity: L.** Extends `companies`, `response_sections`, and approvals; add expiring `share_links`, scoped access, and comment capture.

34. **Client Portal and Multi-Client Workspaces**. Give bid agencies a separated view of each client's opportunities, deliverables, approvals, and activity while retaining agency-level oversight. **Complexity: L.** Extends `companies`, `vf_companies`, `opportunities`, and auth; add tenant boundaries and client workspace membership.

### Phase 5: Intelligence, integrations, and enterprise scale

35. **Competitor Intelligence Profiles**. Track known competitors, their strengths, relevant past outcomes, and team-entered observations to sharpen positioning without presenting guesses as facts. **Complexity: M.** Extends `opportunities`, outcome/debrief data, and `vf_answer_library`; add `competitor_profiles` and sourced observations.

36. **Buyer and Tender Relationship CRM**. Keep buyer contacts, prior engagements, meeting notes, and follow-up ownership connected to the opportunity history. **Complexity: M.** Extends `opportunities`, `companies`, and `/api/email/send`; add `buyer_contacts` and interaction records.

37. **Issuer Email Sequences and Follow-Up Tasks**. Prepare compliant, human-reviewed clarification and relationship follow-up sequences with stop conditions and a complete sent-history. **Complexity: L.** Extends `/api/email/send`, `opportunities`, and clarification tracking; add `email_sequences`, `sequence_events`, and consent/suppression controls. Existing email sending alone is not a sequence engine.

38. **Tender Feed and Opportunity Discovery**. Match monitored public tender feeds to company capabilities and surface potentially relevant opportunities for a human to qualify. **Complexity: L.** Extends `vf_qualifications`, company profiles, and `/api/opportunities`; add sourced `tender_feed_items` and deduplication. Requires source and licensing review before launch.

39. **Portfolio Analytics and Win/Loss Dashboard**. Report win rate, value, cycle time, stage conversion, buyer patterns, and reason-coded losses across a team's portfolio. **Complexity: M.** Extends `opportunities`, outcomes, `vf_approvals`, and `/api/opportunities`; add normalized outcome/reason records and exportable aggregates.

40. **Executive Bid Review Pack**. Generate a concise leadership brief with decision, value, deadline, risks, readiness, owners, and requested approvals for each strategic bid. **Complexity: M.** Extends `opportunities`, `requirements`, `vf_approvals`, and export APIs; add a configurable report template.

41. **Integrations and Event Webhooks**. Connect approved CRM, document storage, and notification systems, and emit secured events when a bid changes stage or receives approval. **Complexity: L.** Extends opportunity, approval, and auth APIs; add integration credentials stored securely, webhook subscriptions, delivery logs, and retry handling.

42. **Enterprise Data Retention and Admin Controls**. Configure workspace retention, export, deletion, and access policies with an auditable administrator view for procurement-sensitive work. **Complexity: L.** Extends `companies`, auth, and all data APIs; add policy records and enforce them server-side. Requires security and legal review.

## Phased build order

### Phase 1: Control the bid and prove immediate value

Build features 1-8, starting with Deadline Radar, Bid Health, and Go/No-Go briefs. These make the dashboard visibly useful on day one and connect the existing pipeline to actions and decision quality. Follow with milestones, clarification tracking, and forecast views. Deliver reliable ownership and notification behavior before promising automated reminders.

### Phase 2: Make team delivery dependable

Build features 9-18 in dependency order: workspace membership and roles first, then tasks/comments/versioning, approval policy and audit trail, followed by compliance, eligibility, expiry, and risk controls. This phase turns an individual drafting workflow into a governed team operation suitable for a premium contract.

### Phase 3: Make every response smarter over time

Build features 19-27: curated answer reuse and freshness first, then case studies and evidence checks, followed by quality review, red-team, and debrief learning. The sequence puts trusted content and provenance ahead of broader AI claims.

### Phase 4: Deliver commercial and client-ready outputs

Build features 28-34: structured pricing and guardrails before branded packs, submission manifests, and export bundles; then white-label sharing and agency/client workspaces. This makes Vantorflow valuable beyond drafting by controlling pricing, handoff, and client experience.

### Phase 5: Expand into intelligence and enterprise operations

Build features 35-42: competitor and buyer intelligence using sourced/entered data, then email sequences and tender discovery only after consent, source, and compliance controls; add portfolio analytics and executive packs, followed by integrations and retention controls. These features deepen a $5k/month tier for larger teams, but should follow the dependable workflow and data model established in earlier phases.

## Premium-tier packaging principles

- Sell team outcomes: deadline control, compliance confidence, faster reuse, and review governance, not access to AI alone.
- Keep recommendations explainable and traceable to tender text, approved evidence, and recorded outcomes.
- Make automation opt-in and reviewable, especially for buyer communications, eligibility decisions, pricing, and external sharing.
- Treat permissions, tenant isolation, auditability, and document access as foundations for the premium tier, not later polish.
- Keep the existing Vantorflow visual language: near-black surfaces, emerald emphasis, Newsreader headings, Inter body copy, and restrained glass cards. Avoid surfacing internal model or extraction machinery in client-facing views.

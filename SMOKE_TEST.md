# Vantorflow smoke test (live app, localhost:3000, production build)

Re-run after aligning code to the live schema (opportunities, rfqs, requirements, response_sections). Database not changed.
Test users: smoke.1793030506@vantorflow.com (created this run). test@vantorflow.com exists but its password is not known to this run, so it was not used.
Opportunity created this run: 118ea531-2bde-475e-aafe-778f7894d279 (TEST RFQ 001 - Office Equipment Supply).

| # | Step | Result | Detail |
|---|------|--------|--------|
| 1 | Build (npm run build) | PASS | Compiled, 17 static pages, all routes built. |
| 2 | Server start | PASS | next start on :3000, production build. |
| 3 | Setup status | PASS | ready=true, configured=true, missing=[] against the live tables. |
| 4 | Signup | PASS | 200 {ok:true} on a fresh user. |
| 5 | Login and session persists | PASS | Login 200 sets vf_session (Secure, HttpOnly). With the cookie sent, /api/auth/session returns signedIn true. Without a cookie: 401. |
| 6 | Dashboard gate | PASS | Earlier run: no cookie gives 307 to /login; valid cookie gives 200. Not re-run this round. |
| 7 | Forged cookie on dashboard | PASS | Earlier run: page shell 200, data routes 401 because signature verification is server-side. Not re-run this round. |
| 8 | Create opportunity + RFQ | PASS | 201. Creates rfqs row (rfq_text, buyer_organization, deadline_date) then opportunities row linked by rfq_id. estimated_value stored as text "250000". |
| 9 | Re-fetch persistence | PASS | GET /api/opportunities/[id] returns title, buyer, deadline 2026-11-30, value 250000, rfq_text 1253 chars. |
| 10 | AI extraction (Gemini) | PASS | 200. buyer, deadline, scope extracted; 11 requirements with categories. |
| 11 | Save 11 requirements with categories | PASS | PUT returns 11 requirements numbered 1 to 11; re-fetch returns 11 with categories Technical, Delivery, Compliance, Commercial. |
| 12 | Map requirement to section, coverage count | PASS | PATCH to "Technical Solution" returns 200. Coverage goes from 0 to 2 of 11 after mapping two requirements. Section names are the five in lib/types.ts. |
| 13 | Section draft (Gemini) | PASS | /api/generate returns a draft citing Requirement 1; saved via PUT drafts; re-fetch returns 1 draft of 1435 chars. |
| 14 | .docx download valid | PASS | lib/docx.ts logic run in Node against the live opportunity data. Output is a zip with word/document.xml; contains the draft text and Requirement 11 in the traceability appendix. Browser download itself not clicked. |

Bugs fixed this round:
- Code used opportunity_records and rfq_records. Changed to opportunities and rfqs (lib/db.ts TABLES and all routes).
- Live column names differ (buyer_organization, deadline_date, description, content). Added lib/mappers.ts so the UI keeps its field names.
- Requirements need rfq_id and created_at order gives the number. Routes now write rfq_id, description, mandatory, and created_at.
- response_sections has no unique (opportunity_id, section) constraint, so the upsert returned 42P10. Replaced with update-or-insert per section.
- response_sections requires title and sort_order. Both are now written.

Known remaining issues:
- lib/schemaSql.ts still holds the old DDL (opportunity_records, rfq_records) for the setup screen. The live database already has the correct tables, so the setup screen will show ready. The text is stale and should be updated before anyone copies it.
- The existing test@vantorflow.com password is unknown, so that account was not logged into.

# Vantorflow production control desk and launch plan

Prepared 31 October 2026. Desk target: `desk.vantorflow.com.ng`. Separate Next.js 14 App Router application, independently deployed from the main product. Existing main-site schema observed in the repository uses `public.opportunities` and `public.rfqs`; account identities live in Supabase Auth. Do not expose the service-role key to browser code.

## Phase 0: decisions, access, and baseline
- Confirm Frank's GitHub fine-grained token with minimum repository permissions, desk repo strategy, Vercel project, DNS ownership and Supabase project access. No credentials are embedded in this scaffold.
- Inventory deployed schema and auth settings in Supabase before migration. The checked-in app documents the live work tables as `opportunities`, `rfqs`, `requirements`, and `response_sections`; desk uses the first two for aggregates.
- Set policy decisions: retention periods, usage cap defaults, what counts as an AI call, suspension criteria, privacy contact/data processor list, and lawful basis. Obtain Nigerian counsel review, plus UK/EU/US review as applicable.

## Phase 1: security and schema foundation
Ships: isolated desk app scaffold; exact-email allowlist for `admin@vantorflow.com.ng`; password verification against Supabase Auth; signed, HttpOnly, Secure-in-production, SameSite=Strict eight-hour session; server-only service key; origin checks on mutations; login attempt throttle migration; admin MFA-ready configuration path; audit tables; RLS enabled with no browser policies.
- Provision the designated admin Auth account manually in Supabase; disable public admin creation. Other desk emails are rejected before password check. Desk has no signup route.
- Apply and verify migration in staging, then add production secrets through Vercel. MFA is not yet enabled in this scaffold; enable Supabase Auth MFA before production access.

## Phase 2: visibility and activity instrumentation
Ships: dashboard summary for accounts, RFQs, opportunities, monthly AI events; account detail view; usage and activity history; recent abuse flags. The desk reads real auth identities plus `opportunities` and `rfqs`.
- Instrument every AI endpoint in the main app to record `ai_usage_events` with feature, input/output tokens, outcome, request ID, and privacy-preserving IP hash. Until this is done, usage totals are incomplete and zero does not prove no use.
- Existing activity has no historical event table. Activity history starts after migration and server-side instrumentation; no earlier activity is reconstructed.
- Add pagination/filtering, CSV export, and operational alerting before account counts exceed the current Auth API page size of 100.

## Phase 3: moderation and abuse controls
Ships: per-user monthly call cap settings, suspend/unsuspend, soft-terminate, activity audit events, global policy record and flags panel. Account termination in this scaffold is a soft block, not Auth-user deletion, to preserve audit and support privacy review.
- Main app must check user status and cap before each AI invocation, atomically reserve/charge usage, reject suspended/terminated users, and prevent race-condition overages. The UI setting alone does not enforce caps.
- Implement server-side detectors: rate bursts (default policy seed 60/minute, tune from baseline), cap overrun, repeated auth/validation failures, abnormal request patterns. Emit deduplicated `abuse_flags`. Run monitor-only first; auto-suspension stays off until tested with false-positive review and rollback.
- Add alert delivery and admin flag triage; log every admin action including actor, target, timestamp, before/after and reason. Add reason capture UI and transactional RPC for moderation plus audit to ensure no partial state.

## Phase 4: main-site trust, legal and privacy readiness
Ships: Terms of Service, Privacy Policy, Acceptable Use draft in `legal/`; linked support contact `support@vantorflow.com.ng`; email verification and password reset flow; cookie consent banner; data export and account-deletion requests; sitemap and robots metadata.
- The legal drafts are working copy, not legal advice or publication approval. Populate legal entity name/address, effective date, subprocessors, retention periods, cross-border transfers and complaint/regulator route with counsel.
- Signup must require verified email. Add resend verification, reset-password request and secure recovery callback; rate-limit all mail/auth endpoints. Do not break current server-side `vf_session` design.
- Export user-owned records (including RFQs, opportunities, requirements and drafts) as an authenticated, expiring download. Deletion should be a verified request with documented retention exceptions, dependency handling and audit evidence. Never silently delete a user's records via a desk button.
- Cookie banner must classify necessary vs analytics cookies and respect opt-in/withdrawal; do not load nonessential analytics before consent.

## Phase 5: monitoring, recovery, and launch hardening
Ships: health checks and error monitoring for both apps, Supabase backup/export routine, security headers, incident runbook, staging smoke test and launch checklist.
- Configure Vercel deployment for the separate desk project; add `desk.vantorflow.com.ng` in Vercel, then create/verify the DNS record in Cloudflare. Verify TLS and canonical URL after DNS propagates.
- Schedule encrypted Supabase backups/exports to a separate controlled storage account, define retention and restore tests. A backup job without a successful restore test is not verified recovery.
- Add uptime checks for main and desk, server error reporting with secrets/PII scrubbed, and alerts to support. Test auth lockout, MFA, unauthorized account, rate limits, backups, restores, deletion/export, and every moderation action.
- Complete accessibility, mobile, dependency, security, privacy and load review before production.

## Ready in workspace
- Separate Next.js desk scaffold, premium dark/emerald presentation, login-only route, authenticated overview API, user detail API, cap/suspend/unsuspend/soft-terminate actions, abuse policy record UI, and server-only Supabase/Auth REST helpers.
- SQL migration at `supabase/migrations/0001_admin_control_plane.sql`.
- Main-site policy drafts and implementation scaffolds in this project.

## Not done / requires Frank or live credentials
- GitHub push/deploy is blocked until Frank provides a fresh fine-grained token in chat. Do not reuse previously pasted tokens.
- Cloudflare DNS and Vercel project/domain configuration require account access and approval. This workspace change did not alter Cloudflare, Vercel, or Supabase.
- Frank must provision the sole admin Auth identity, configure secrets, run the SQL migration, and confirm existing live table columns. Desk data and moderation are not live-verified yet.
- AI usage totals/caps/abuse enforcement require main-site endpoint instrumentation and enforcement; current desk controls persist configuration and read logs but cannot retroactively count requests.
- Main-site verification/reset, export/deletion workflows, cookie consent UI, email monitoring, backups/restore and telemetry are called out for implementation/verification. Do not present this project as production-ready until completed.

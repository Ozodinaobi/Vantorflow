# Production-readiness worklist

## Main site
- [ ] Turn on Supabase email confirmation; verify signup confirmation and resend behavior.
- [ ] Add password reset request and secure callback using current auth architecture; throttle requests and avoid account enumeration.
- [ ] Add cookie-consent UI for any non-essential cookies; map cookie inventory and block optional trackers until consent.
- [ ] Add `/sitemap.xml`, `robots.txt`, canonical metadata, page descriptions and social preview metadata; exclude authenticated routes.
- [ ] Add authenticated, expiring user export for RFQs/opportunities/requirements/response drafts and a verified account deletion request with retention exceptions.
- [ ] Add status/cap checks and atomic usage accounting to all AI endpoints; insert `ai_usage_events` and audit relevant actions.
- [ ] Add plan/tier entitlement checks only when billing is introduced; no charge flow exists in this scaffold.
- [ ] Link support@vantorflow.com.ng in Terms, Privacy and product support surfaces.

## Desk
- [ ] Create/provision only `admin@vantorflow.com.ng`; ensure no public desk signup route exists.
- [ ] Configure a strong `ADMIN_SESSION_SECRET`; rotate on suspected compromise. Add Supabase Auth MFA (TOTP) and test recovery.
- [ ] Migration includes five-failure/15-minute admin lockout, but validate at an edge proxy too and review lockout recovery.
- [ ] Add per-user control detail beyond first 50 usage/activity entries, reason capture, and verify account-to-usage joins.
- [ ] Reconcile auth banning with SQL moderation atomically. Current API applies Supabase Auth ban then calls a SQL transaction, so a failed second step needs manual repair.
- [ ] Configure Supabase MFA (TOTP) and test recovery; session scaffold is password-only today.
- [ ] Instrument every AI endpoint in main app; cap settings currently do not enforce requests.
- [ ] Add cursor pagination past first 100 identities, alerts, before/after audit and production rate limit at edge.
- [ ] Verify table names and `created_at`/`tokens_total` columns in deployed Supabase schema; dashboard reads are bounded and not yet paginated.

## Operations
- [ ] Separate Vercel project for desk, add domain `desk.vantorflow.com.ng`, configure DNS in Cloudflare, verify TLS and redirects.
- [ ] Add health endpoints and uptime/error monitoring to main site and desk. Scrub tokens, RFQ content, email and personal data from telemetry.
- [ ] Establish encrypted scheduled Supabase backups/exports to separate storage, documented retention, access control, and restore test.
- [ ] Run staging migration; check schema names/columns, auth flows, access-control tests, legal review, privacy requests, accessibility, dependency audit, load tests and incident exercise.

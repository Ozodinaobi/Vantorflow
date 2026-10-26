# Vantorflow

Bid and tender operations platform. Next.js 14 (App Router, TypeScript), Tailwind, Supabase, Gemini.

## Setup (first time)

1. Install Node.js 18 or newer.
2. Copy `.env.example` to `.env.local` and paste your real keys:
   - NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY from Supabase (Project Settings > API)
   - GEMINI_API_KEY from Google AI Studio
3. In Supabase, open SQL Editor, paste the file `supabase/migrations/0001_vantorflow_init.sql`, and run it.
4. In Supabase Authentication settings, turn email sign-up on (and turn off email confirmation while testing if you want instant login).
5. Run `npm install`, then `npm run dev`, and open http://localhost:3000.

## Commands

- `npm run dev` starts the app for development.
- `npm run build` checks that the whole app compiles.
- `npm start` runs the built app.

## Pages

- /login and /signup: email and password accounts.
- /dashboard: list of opportunities (protected).
- /dashboard/new: paste an RFQ and create an opportunity.
- /dashboard/[id]: stages, requirements extraction and review, mapping to response sections, drafts, .docx download.


No anon key is needed. The database tables are created once by pasting supabase-schema.sql into the Supabase SQL Editor (the app shows the SQL and a copy button when they are missing).

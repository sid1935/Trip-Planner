# Trip Planner

A group trip planner for friends who can never agree on where to go. Everyone fills in a
2-minute form with their budget, dates, and vibe; the app scores every destination/weekend/length
combination against **everyone's** answers and ranks the options that actually work for the whole
group. The organiser freezes a shortlist, everyone votes, and the first option **everyone** says
"I'm in" on gets locked as the trip.

Runs as a small set of Vercel serverless functions with a Postgres (Supabase) backend, and
optionally uses Gemini to speed up filling in preferences and to suggest destinations.

## How it works

1. **Preferences** — each friend picks their name, sets a 4-digit PIN (so only they can edit their
   own answers or vote as themselves), and fills in home city, budget, trip length, blocked
   weekends, vibe ratings, pace, travel tolerance, dealbreakers and nice-to-haves.
2. **Scoring** — for every destination × weekend × trip length combination, each person is either
   *blocked* (busy that weekend, budget exceeded, a dealbreaker tag, too far to travel, etc.) or
   scored 0–100 on vibe/budget/pace/travel/interests. An option only makes the top list if
   **nobody** is blocked.
3. **Ranking** — two modes: *Fairest* (ranks by the least-happy person's score, so nobody gets
   dragged along) or *Best average* (ranks by the group's average score).
4. **Voting** — the organiser freezes the top options into a shortlist; everyone marks each one
   ✅ in / 🤔 maybe / ❌ can't. The first option where everyone is ✅ wins and locks the trip.
5. **If nothing matches** — the app diagnoses *why* instead of showing an empty list. The most
   common cause is structural: nobody shares a trip length (e.g. some only want a weekend, others
   only want a long weekend), which blocks every single candidate. That gets called out explicitly,
   both on the results screen and in the admin panel.

## Project structure

```
public/index.html    The friend-facing app: name/PIN → preferences wizard → results → voting
public/admin.html     Organiser dashboard, gated by ADMIN_KEY
api/rpc.js            Single API endpoint (POST /api/rpc) that dispatches to lib/core.js
lib/core.js           All server logic: preferences, scoring engine, voting, PINs, admin tools
lib/db.js             Storage layer — Supabase (Postgres) in production, in-memory for local dev
lib/gemini.js          Minimal Gemini REST client (JSON-schema structured output)
lib/destinations.js   Built-in fallback list of 25 destinations (used if AI destinations are off)
supabase/schema.sql    Run once in the Supabase SQL editor to create the required tables
dev-server.js          Local dev server (mimics Vercel's routing) — not part of the deployment
test/run.js            Smoke tests covering the reset flow and the no-fit diagnosis
```

## Setup

### 1. Database (Supabase)

Create a Supabase project, then open **SQL Editor** and run [`supabase/schema.sql`](supabase/schema.sql).
It's idempotent (`if not exists` / `or replace`) so it's safe to run again later.

### 2. Environment variables

Set these in Vercel → Project → Settings → Environment Variables:

| Variable | Required | Purpose |
|---|---|---|
| `SUPABASE_URL` | Yes | Supabase project URL (added automatically if you connect Supabase via Vercel's integration) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service-role key — the server needs full access, not the public anon key |
| `ADMIN_KEY` | Yes | Password for `/admin`. Without it, the admin page is disabled entirely |
| `GEMINI_API_KEY` | Optional | Enables AI preference-filling, AI result summaries, and AI-generated destinations |
| `GEMINI_MODEL` | Optional | Overrides the default model (`gemini-flash-latest`, falling back to `gemini-2.5-flash`) |
| `PIN_SALT` | Optional | Fixed salt for hashing PINs; auto-generated and stored in the DB if omitted |

### 3. Deploy

The project is git-connected to Vercel — push to `main` and it deploys automatically.
`vercel.json` sets `api/rpc.js`'s `maxDuration` to 60s (the AI destination generator is a heavier
Gemini call than the others).

## Local development

```bash
npm install
npm run dev      # starts dev-server.js on http://localhost:3000
```

Without `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` set, storage falls back to a plain in-memory
store (`lib/db.js`) — fine for local testing, but data resets every time the process restarts.
The admin key falls back to `dev` when `ADMIN_KEY` isn't set and `VERCEL` isn't in the environment.

## Tests

```bash
npm test    # node test/run.js — a handful of smoke tests, no test framework required
```

Covers: destination validation after manual edits, sample-data flows, freezing/voting, the
"reset everything" admin action, and the no-shared-trip-length diagnosis.

## Admin panel (`/admin`)

Log in with `ADMIN_KEY` to reach:

- **Settings** — friend list, organiser, trip date window, preferences deadline, ranking mode.
- **Tools** — reset everything to start a new trip (clears answers + the current vote, keeps
  PINs), sample-data helpers for testing, voting reset, PIN resets, delete an individual response.
- **Destinations** — edit the destination list by hand, reset to the built-in list, or (with
  Gemini enabled) have AI propose a fresh set of real destinations with realistic per-city travel
  time and cost, instead of relying on the fixed built-in list.
- **Export** — download all responses as CSV or the full state as JSON.

A "Organising this trip? Admin login →" link on the main app's landing screen points here, since
it's a separate, password-protected page from the regular name + PIN flow everyone else uses.

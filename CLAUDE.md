# BioARC — Claude Manifest

→ Project identity: [`context/project.md`](context/project.md)
→ Key decisions: [`context/decisions.md`](context/decisions.md)

---

## Session Protocol

### On session start — load in this order:
1. `context/state.md` — current tech stack, completed/blocked work, known issues
2. `context/task-queue.md` — what is pending / in progress / done
3. Relevant `spec/<task>.md` if working on a specific task

### On session end — update:
1. `context/state.md` — reflect any state changes
2. `context/task-queue.md` — move tasks, add new ones discovered
3. `memory/sessions/YYYY-MM-DD.md` — one-paragraph summary of what changed

---

## File Map

```
CLAUDE.md                  ← this file (manifest + protocol)
context/
  state.md                 ← live project state snapshot
  task-queue.md            ← pending / in progress / done tasks
spec/
  species-api.md           ← iNaturalist/GBIF species search spec
  auth.md                  ← authentication options spec (pending decision)
  dashboard.md             ← dashboard options spec (pending decision)
memory/
  modules/                 ← reusable patterns discovered during dev
  sessions/                ← per-session change summaries
design/
  ui-card-spec.md          ← color system, card anatomy, component rules
  content-spec.md          ← all form fields, validation, API endpoints
src/
  App.jsx                  ← step router + global form state
  index.css                ← all CSS (custom properties + components)
  steps/                   ← Step1–Step5 card components
  components/ProgressBar   ← step progress indicator
  utils/
    environmentApi.js      ← Open-Elevation, Open-Meteo, ESA WorldCover
    koboApi.js             ← builds the OpenRosa XML submission, POSTs to /api/kobo-submit
api/
  kobo-submit.js           ← Vercel serverless proxy: forwards submission to KoboToolbox, holds the API key server-side
```

---

## Development Rules

- **Card UI spec is the source of truth** — all new components follow `design/ui-card-spec.md`
- **No new dependencies without noting in state.md** — keep bundle small
- **KoboToolbox field names are snake_case** — match exactly what's in the KoboToolbox form
- **Never commit `.env`** — use `.env.example` for reference
- **KoboToolbox submission goes through `/api/kobo-submit`, never straight from the browser** — Kobo's OpenRosa endpoint sends no CORS headers, so a direct browser `fetch` to `kf.kobotoolbox.org` always fails. The Vercel function in `api/kobo-submit.js` is a same-origin proxy that also keeps the API token server-side.
- **Only `VITE_KOBO_ASSET_UID` is client-exposed** — `KOBO_API_KEY` / `KOBO_BASE_URL` / `KOBO_OWNER_USERNAME` are server-only env vars (no `VITE_` prefix) read by `api/kobo-submit.js`; set them in the Vercel dashboard, not just `.env`
- **Species stored as scientific name + taxon_id** — common name is display-only. Not yet true in practice: `Step1Specimen.jsx` still uses a hardcoded placeholder species list unrelated to the Kobo form's `species` choices (tracked in task-queue.md)


# Task Queue
_Last updated: 2026-06-16_

Format: `[priority] Task title — spec pointer`

---

## In Progress

- [ ] **[HIGH] Species search — iNaturalist API live autocomplete**
  Replace static species list in `Step1Specimen.jsx` with real-time search against iNaturalist Taxa API.
  → `spec/species-api.md`

---

## Pending

### Requires supervisor decision first
- [ ] **[BLOCKED] Authentication / sign-in**
  Does the reporting form require login? Who can submit?
  → `spec/auth.md`

- [ ] **[BLOCKED] Dashboard**
  Use KoboToolbox built-in dashboard or build custom viewer?
  → `spec/dashboard.md`

### Ready to develop
- [ ] **[HIGH] Photo upload to KoboToolbox media endpoint**
  Currently photos are previewed only; need to POST binary files to KoboToolbox attachment API alongside the submission.
  → no spec yet (straightforward — document endpoint and implement)

- [ ] **[MEDIUM] Open-Meteo date edge case**
  Archive API returns empty if date is today. Detect and switch to forecast endpoint for today/future dates.
  → `src/utils/environmentApi.js` — small fix, no separate spec needed

- [ ] **[MEDIUM] Vercel deployment**
  Set env vars in Vercel dashboard, verify build passes, confirm submission flow works end-to-end.
  → no spec needed

- [ ] **[LOW] Multi-language UI**
  KoboToolbox form supports EN/ES/FR/PT. React app is English only.
  Pending decision on whether this is needed for demo.

- [ ] **[LOW] Offline support / local queue**
  Service worker to queue submissions when network is unavailable.
  Only needed if field researchers have unreliable connectivity.

---

## Done

- [x] Vite + React project scaffold (package.json, vite.config.js, index.html)
- [x] Global CSS design system (`src/index.css`)
- [x] App shell + 5-step router (`src/App.jsx`)
- [x] Progress bar component (`src/components/ProgressBar.jsx`)
- [x] Step 1 — Specimen card (`src/steps/Step1Specimen.jsx`)
- [x] Step 2 — Location card with Leaflet map (`src/steps/Step2Location.jsx`)
- [x] Step 3 — Environment auto-fetch card (`src/steps/Step3Environment.jsx`)
- [x] Step 4 — Collection info card (`src/steps/Step4Collection.jsx`)
- [x] Step 5 — Review + KoboToolbox submit (`src/steps/Step5Review.jsx`)
- [x] KoboToolbox API utility (`src/utils/koboApi.js`)
- [x] Environment data API utility (`src/utils/environmentApi.js`)
- [x] `.env` with VITE_ prefix, `.env.example`, `.gitignore`
- [x] Design specs (`design/ui-card-spec.md`, `design/content-spec.md`)
- [x] Pushed to GitHub

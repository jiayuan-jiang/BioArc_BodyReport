# Project State Snapshot
_Last updated: 2026-06-16_

---

## Tech Stack

| Layer | Choice | Version |
|-------|--------|---------|
| Build tool | Vite | ^5.4.1 |
| UI framework | React | ^18.3.1 |
| Map | react-leaflet + leaflet | ^4.2.1 / ^1.9.4 |
| Styling | Custom CSS (single index.css) | — |
| Backend storage | KoboToolbox API v2 | — |
| Elevation API | Open-Elevation (SRTM) | free, no key |
| Weather API | Open-Meteo archive | free, no key |
| Land cover API | ESA WorldCover WCS + OSM Overpass fallback | free, no key |
| Deployment | Vercel (planned) | — |
| Hosting repo | GitHub (pushed) | — |

---

## Environment Variables

| Variable | Purpose | Where set |
|----------|---------|-----------|
| `VITE_KOBO_API_KEY` | KoboToolbox auth token | `.env` (local) / Vercel dashboard (prod) |
| `VITE_KOBO_ASSET_UID` | Target KoboToolbox project | `.env` / Vercel |
| `VITE_KOBO_BASE_URL` | `https://kf.kobotoolbox.org` | `.env` / Vercel |

---

## Work Status

### Completed
- [x] Vite + React project scaffold
- [x] Global CSS design system (custom properties, card anatomy, all component styles)
- [x] 5-step card form flow (App.jsx + ProgressBar)
- [x] Step 1 — Specimen: species dropdown (static list), preservation radio, photo upload with preview
- [x] Step 2 — Location: Leaflet map, click-to-pin, GPS auto-detect, coordinate fields, locality
- [x] Step 3 — Environment: auto-fetch DEM / LUCC / weather with skeleton loading + error states
- [x] Step 4 — Collection: date picker, collector name, institution, project, habitat, notes
- [x] Step 5 — Review + submit to KoboToolbox API v2
- [x] Success confirmation card
- [x] `.gitignore` (excludes .env, node_modules, dist, .DS_Store)
- [x] `.env.example` for onboarding
- [x] Pushed to GitHub
- [x] Design specs: `design/ui-card-spec.md`, `design/content-spec.md`

### In Progress
- [ ] Species search — migrate from static list to iNaturalist API live autocomplete
  → spec: `spec/species-api.md`

### Blocked / Pending Supervisor Decision
- [ ] Authentication — does the form require login?
  → spec: `spec/auth.md`
- [ ] Dashboard — use KoboToolbox built-in or build custom?
  → spec: `spec/dashboard.md`
- [ ] Photo storage — KoboToolbox attachment endpoint vs. external (S3/R2)
- [ ] Offline support — service worker / local queue for field use without internet
- [ ] Multi-language UI — form already has EN/ES/FR/PT in KoboToolbox; React app is English only

### Known Issues
- `VITE_KOBO_API_KEY` is baked into the JS bundle at build time — visible in DevTools.
  Acceptable for demo; production should proxy through a backend.
- ESA WorldCover WCS endpoint response format unverified in browser — fallback to OSM Overpass is in place.
- Open-Meteo `archive` endpoint requires the date to be in the past; today's date may return empty. Need to handle gracefully.
- Photo files are previewed client-side but NOT yet uploaded to KoboToolbox media endpoint — only metadata is submitted.

---

## KoboToolbox Reference

```
Project URL:  https://kf.kobotoolbox.org/#/forms/azjgv2kJ6sHnYgYdoVRmM4/summary
Asset UID:    azjgv2kJ6sHnYgYdoVRmM4
Base URL:     https://kf.kobotoolbox.org
Submit:       POST /api/v2/assets/{uid}/submissions/
Auth header:  Authorization: Token {VITE_KOBO_API_KEY}
```

---

## Key File Locations

| Purpose | Path |
|---------|------|
| Form step router | `src/App.jsx` |
| All styles | `src/index.css` |
| Step 1 (Specimen) | `src/steps/Step1Specimen.jsx` |
| Step 2 (Location) | `src/steps/Step2Location.jsx` |
| Step 3 (Environment) | `src/steps/Step3Environment.jsx` |
| Step 4 (Collection) | `src/steps/Step4Collection.jsx` |
| Step 5 (Review/Submit) | `src/steps/Step5Review.jsx` |
| KoboToolbox API call | `src/utils/koboApi.js` |
| Env data fetch | `src/utils/environmentApi.js` |

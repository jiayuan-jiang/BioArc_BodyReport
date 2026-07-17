# Project State Snapshot
_Last updated: 2026-07-17_

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
| Deployment | Vercel (auto-deploy via GitHub App, live) | https://bio-514ojjzv3-jiayuan-jiangs-projects.vercel.app |
| Hosting repo | GitHub — jiayuan-jiang/BioArc_BodyReport | — |

---

## Environment Variables

| Variable | Purpose | Where set |
|----------|---------|-----------|
| `VITE_KOBO_ASSET_UID` | Target KoboToolbox project (client-safe, embedded in submission XML `id`) | `.env` / Vercel |
| `KOBO_API_KEY` | KoboToolbox auth token — **server-only**, read by `api/kobo-submit.js` | `.env` (local) / Vercel dashboard (prod) |
| `KOBO_BASE_URL` | `https://kf.kobotoolbox.org` — server-only | `.env` / Vercel |
| `KOBO_OWNER_USERNAME` | Kobo username that owns the asset (`derekv`) — the OpenRosa submission URL is `{BASE_URL}/{OWNER_USERNAME}/submission`, not the asset UID | `.env` / Vercel |

Note: `KOBO_*` (no `VITE_` prefix) are never bundled into client JS — Vite only exposes `VITE_`-prefixed vars to the browser. That's intentional now that submission goes through a server-side proxy.

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
- [x] Step 5 — Review + submit to KoboToolbox
- [x] Success confirmation card
- [x] `.gitignore` (excludes .env, node_modules, dist, .DS_Store)
- [x] `.env.example` for onboarding
- [x] Pushed to GitHub
- [x] Design specs: `design/ui-card-spec.md`, `design/content-spec.md`
- [x] **KoboToolbox submission actually works end-to-end** (2026-07-17). Previously the submit button silently 404'd —
  `koboApi.js` was POSTing JSON to `/api/v2/assets/{uid}/submissions/`, an endpoint that doesn't exist in KoboToolbox's
  REST API (that API has no "create submission" action; ODK/Kobo only accepts new submissions via the OpenRosa XML
  protocol). Fixed by: (1) adding the missing environment fields to the deployed Kobo form via the API
  (`dem_elevation_m`, `land_cover_lucc`, `weather_temperature`, `weather_precipitation`, `weather_wind_speed`,
  `weather_code`), (2) rewriting `koboApi.js` to build a proper OpenRosa XML instance (single `location` geopoint,
  `preservation_method` value mapping `frozen→freeze`/`dried→dry`, photo attached as a multipart file part), and
  (3) adding `api/kobo-submit.js`, a Vercel serverless function that proxies the submission server-side — Kobo's
  OpenRosa endpoint sends no CORS headers, so the browser can never call it directly. Verified with a real Playwright
  click-through of all 5 steps plus inspecting the resulting Kobo submission (fields + photo attachment all correct),
  then deleted the test record.
- [x] Photo upload to KoboToolbox — now uploaded as a real attachment on the submission (was: preview-only, metadata
  only). Closes the task-queue item.

### In Progress
- [ ] Species search — migrate from static list to iNaturalist API live autocomplete
  → spec: `spec/species-api.md`
  → **Now higher priority than before**: the current hardcoded species list (`Step1Specimen.jsx`) is North American
  wildlife (Mallard, Raccoon, Coyote, etc.) with slug-style ids (`procyon_lotor`), completely disjoint from the Kobo
  form's `species` select_one choices (Jaguar, Capybara, Llama, Macaw, Piranha, Anaconda, Toucan, Tapir — scientific
  names like `Panthera onca`). Submissions currently succeed but write a species value that doesn't match any Kobo
  choice. Confirmed via test submission: `species: "procyon_lotor"` landed as raw text, not matched against the form.

### Blocked / Pending Supervisor Decision
- [ ] Authentication — does the form require login?
  → spec: `spec/auth.md`
- [ ] Dashboard — use KoboToolbox built-in or build custom?
  → spec: `spec/dashboard.md`
- [ ] Offline support — service worker / local queue for field use without internet
- [ ] Multi-language UI — form already has EN/ES/FR/PT in KoboToolbox; React app is English only

### Known Issues
- ESA WorldCover WCS endpoint response format unverified in browser — fallback to OSM Overpass is in place.
- Open-Meteo `archive` endpoint requires the date to be in the past; today's date may return empty. Need to handle gracefully.
- `npm run dev` (plain Vite) does not serve `/api/*` — Vercel functions only run when deployed, or locally via
  `vercel dev`. Submit will fail with a 404 under plain `vite dev`; that's expected, not a regression.
- Only one photo attaches to the Kobo submission even if multiple are uploaded in Step 1 — the Kobo form's
  `survey_image` field is a single `image` type, not a repeat group. Would need a Kobo form change (repeat group) to
  support multiple photos per record.

---

## KoboToolbox Reference

```
Project URL:   https://kf.kobotoolbox.org/#/forms/azjgv2kJ6sHnYgYdoVRmM4/summary
Asset UID:     azjgv2kJ6sHnYgYdoVRmM4
Owner:         derekv  (BioARC app's token belongs to a collaborator, jiayuanj — the
               OpenRosa submission URL must use the owner's username, not the collaborator's)
Base URL:      https://kf.kobotoolbox.org

Read/manage:   REST API v2, e.g. GET /api/v2/assets/{uid}/data/?format=json  (list/read only —
               this API has no endpoint to create a submission; do not POST here)
Submit (new):  POST {BASE_URL}/{OWNER_USERNAME}/submission   (OpenRosa protocol)
               - multipart/form-data, field "xml_submission_file" = an OpenRosa XML instance
               - root element: <data id="{ASSET_UID}"> ... </data>  (id must be the asset UID,
                 not the form's xlsform id_string — Kobo remaps it internally)
               - version attribute is optional, not enforced
               - photo (if any): additional multipart part named after the survey_image filename
               - Auth: Authorization: Token {KOBO_API_KEY}, header X-OpenRosa-Version: 1.0
               - No CORS headers on this endpoint — must be called server-side (see api/kobo-submit.js)

Form fields (survey, in order): survey_intro (note), species (select_one), preservation_method
(select_one: freeze/alcohol/dry), survey_image (image), location (geopoint, "lat lon alt acc"),
dem_elevation_m (decimal), land_cover_lucc (text), weather_temperature (decimal),
weather_precipitation (decimal), weather_wind_speed (decimal), weather_code (integer),
collection_date (date), collector_name/institution/project_name/habitat_description/locality/notes (text)
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
| KoboToolbox XML builder + client call | `src/utils/koboApi.js` |
| KoboToolbox submission proxy (server-side) | `api/kobo-submit.js` |
| Env data fetch | `src/utils/environmentApi.js` |

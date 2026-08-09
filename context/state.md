# Project State Snapshot
_Last updated: 2026-08-09_

Note: this snapshot is from branch `feature/species-live-search` (worktree `../BioArc-species-search`),
based on the last commit on `main` (`03259db`). It does not include `main`'s uncommitted 2026-08-09 work
(weather rewrite, manual env-field editing, optional photo, `record_number`/`submitted_at` fields, etc.)
described in `main`'s own `context/state.md`. Those changes are already live on the deployed Kobo form
(confirmed via a live schema read while working on this branch) even though the code isn't committed yet.
Reconcile both docs when the branches merge.

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
- [x] Step 1 — Specimen: species search (live iNaturalist Taxa Autocomplete API), preservation radio, photo
  upload with preview
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
- [x] **Species search migrated to iNaturalist API live autocomplete** (2026-08-09). `Step1Specimen.jsx`'s
  hardcoded North American wildlife list (slug ids like `procyon_lotor`) replaced with a 300ms-debounced
  live call to `GET https://api.inaturalist.org/v1/taxa/autocomplete`, per `spec/species-api.md`. Dropdown
  shows photo, common name, scientific name, and an iconic-taxon badge (Aves/Mammalia/etc.); handles
  no-results and fetch-failure (falls back to the typed text, never blocks submission) states. Form state
  now stores `taxonId`, `speciesSci`, `speciesCommon`, `speciesIconic` instead of a slug id.
  Also changed the live Kobo form's `species` field from a closed 8-choice `select_one` (Jaguar, Capybara,
  Llama, Macaw, Piranha, Anaconda, Toucan, Tapir) to three fields (`species_scientific` text,
  `species_common` text, `species_taxon_id` integer) via `PATCH /api/v2/assets/{uid}/` +
  `PATCH /api/v2/assets/{uid}/deployment/`, since the closed list could never match a species coming from
  full-taxonomy search. `koboApi.js` updated to match. Verified with a real OpenRosa test submission
  (Mallard / Anas platyrhynchos), confirmed all three fields landed via the REST API, then deleted the
  test record.
  Before implementing, evaluated building a self-hosted search index from iNaturalist's official taxonomy
  export (`taxa.csv.gz`) instead of calling their live API. Downloaded and inspected it directly: 37.7MB
  compressed, 189MB uncompressed, 1.65M rows (1.28M at `rank=species`). Size was acceptable, but the export
  has no common/vernacular names at all, only scientific name plus a numeric ancestry chain, which would
  have broken the "search by common name in any language" requirement the spec exists for. Measured the
  live API's actual latency instead (5 sample queries, English and non-English): 190 to 300ms, well inside
  the existing 300ms debounce, removing the other reason to self-host. Kept the original spec's live-API
  design.
  Built in worktree `../BioArc-species-search` on branch `feature/species-live-search`, not yet merged
  into `main`.

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

Form fields (survey, in order): survey_intro (note), species_scientific (text), species_common (text),
species_taxon_id (integer), preservation_method (select_one: freeze/alcohol/dry), survey_image (image),
location (geopoint, "lat lon alt acc"), dem_elevation_m (decimal), land_cover_lucc (text),
weather_temperature (decimal), weather_precipitation (decimal), weather_wind_speed (decimal),
weather_code (integer), collection_date (date),
collector_name/institution/project_name/habitat_description/locality/notes (text)

Note: `species` was a closed 8-choice select_one (Jaguar, Capybara, Llama, Macaw, Piranha, Anaconda,
Toucan, Tapir) until 2026-08-09, replaced by the three species_* fields above so arbitrary iNaturalist
search results can be stored. The live form also already has additional fields (record_number,
weather_humidity, soil_temperature, soil_moisture, env_manual_fields, env_fetched_snapshot, submitted_at)
from `main`'s uncommitted 2026-08-09 work, not listed here since that work predates this branch; see the
note at the top of this file.
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

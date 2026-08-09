# Project State Snapshot
_Last updated: 2026-08-09_

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
- [x] **Photo now optional + client-side compression** (2026-08-09). `Step1Specimen.jsx` no longer requires a photo
  (validation + required-asterisk removed). Uploaded photos are resized to a 1280px max edge and re-encoded as JPEG
  @ 75% quality via `canvas.toBlob` before being stored in form state (no new dependency) — typically 100–300KB vs.
  several MB from a raw phone photo, since Kobo's 1GB free-tier storage cap (not the 5000/month submission cap) is
  the real bottleneck per the Account Plan Limits note below.
- [x] **Environmental fields are now manually editable via a per-field edit button** (2026-08-09). All 9
  auto-fetched values in `Step3Environment.jsx` (elevation, land cover, temperature, humidity, precipitation,
  wind speed, weather, soil temperature, soil moisture) default to read-only display, same as before — clicking a
  small pencil icon next to a field switches just that field into an editable input (weather becomes a `<select>`
  of WMO codes), pre-filled with the current value. Enter or blur commits and returns to read-only display; Escape
  cancels. A researcher with field instruments (altimeter, thermometer, soil probe, etc.) can overwrite any
  auto-fetched value this way without the rest of the card ever leaving its normal display mode. Edited fields are
  tracked in `form.manualEnvFields` (persistent form state, not local component state — needed so it survives
  navigation and can be submitted, see below) and their sub-label switches to a green "Manually entered" tag
  instead of the data-source caption. Verified end-to-end in the browser (dev server + real fetch + edit + commit).
- [x] **Added `record_number`, submission timestamp, and env-edit provenance fields** (2026-08-09). Four new
  fields, added to `App.jsx` initialForm, `Step4Collection.jsx`/`Step5Review.jsx` UI, `koboApi.js`, and the deployed
  Kobo schema (same API process as before, verified with a real test submission + deleted):
  - `record_number` (text, optional, no validation) — the traditional Darwin Core `recordNumber` field-notebook
    identifier a collector writes on the physical specimen tag. Deliberately left optional since the real-world
    naming convention isn't known yet — decided to wait for feedback after the presentation rather than guess.
  - `submitted_at` — ISO 8601 timestamp with millisecond precision, generated client-side in `koboApi.js` right
    before building the XML (distinct from Kobo's own server-side `_submission_time`, which reflects receipt
    time, not client submit time — matters once offline queuing exists per the task-queue item below).
  - `env_manual_fields` — comma-separated list of which of the 9 env fields were manually overridden in Step 3
    (empty/omitted if none were). Sourced from `form.manualEnvFields`.
  - `env_fetched_snapshot` — JSON string of all 9 env values exactly as fetched, captured once right when the
    fetch resolves (`form.envFetchedSnapshot`), before any possible manual edit. Always populated, not just when
    a field gets overridden — preserves the model's original output for every submission, so overriding a value
    never silently discards what the model said (useful later for model validation/bias-correction).
- [x] **Fixed: map didn't recenter on typed coordinates** (2026-08-09, found while testing the above). Leaflet's
  `center` prop only applies on initial mount; `Step2Location.jsx` worked around this with a `key={position ?
  'has-pos' : 'no-pos'}` remount hack, but that key only flips once — on the very first keystroke where both lat
  and lng fields are non-empty strings (even a lone `"-"` while typing a negative longitude), which is often before
  a valid number exists. The map's view locked onto that bad instant and never updated again as typing continued,
  even though the marker itself (a normal prop) kept moving correctly. Fixed by validating `Number.isFinite()` on
  both parsed coordinates before treating `position` as set, and replacing the remount hack with a `RecenterMap`
  helper that calls `map.setView()` imperatively whenever `position` changes. Verified by typing coordinates
  character-by-character in the browser — map now tracks correctly.
- [x] **Weather fetch rewritten: real-time `current` endpoint + humidity/soil temperature/soil moisture** (2026-08-09).
  `fetchWeather()` in `environmentApi.js` now branches on whether `collectionDate` is today: if so, calls Open-Meteo's
  `/v1/forecast?current=...` endpoint (~15 min resolution, real observation-model blend) instead of a same-day daily
  aggregate — this is the common case since `collectionDate` defaults to today. For past dates, falls back to the
  existing `archive` (ERA5, full history, 2–7 day processing lag) → `forecast` daily (no lag, ~92 days back, but no
  daily soil aggregate variables) chain. All three paths now also return humidity (`relative_humidity_2m`) and soil
  temperature/moisture (`soil_temperature_0cm`/`soil_moisture_0_to_1cm` for current, `soil_temperature_0_to_7cm_mean`/
  `soil_moisture_0_to_7cm_mean` for daily). New fields threaded through `App.jsx` initialForm, `Step3Environment.jsx`
  UI, `Step5Review.jsx`, all 4 i18n languages, and `koboApi.js` (`weather_humidity`, `soil_temperature`,
  `soil_moisture`, snake_case). Deployed Kobo form schema updated to match via the API (same process as the
  2026-07-17 fix) and verified with a real OpenRosa test submission + REST API read-back showing all three new fields
  landed correctly, then deleted. No new dependency — same Open-Meteo provider, no API key.
  **Known gap**: if a past date falls in the archive→forecast fallback path specifically (rare — only when ERA5
  hasn't processed a recent date yet), soil fields may come back null since Open-Meteo's forecast endpoint doesn't
  expose daily soil aggregates. Not fixed — narrow edge case, noted here for awareness.
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

### In Progress
(none)

### Blocked / Pending Supervisor Decision
- [ ] Authentication — does the form require login?
  → spec: `spec/auth.md`
  → **Follow-up once decided: "view/edit my past submissions" feature.** Design sketched 2026-07-18, not
  implemented — do this only after auth is decided:
    - Don't build a separate database to track submission ownership. Add the authenticated user's identity
      (email or user id, whatever auth ends up providing) as its own field on the Kobo submission itself, and
      look up "my submissions" via Kobo's REST API `query` param (Mongo-style filter), e.g.
      `GET /api/v2/assets/{uid}/data/?query={"submitted_by":"<user id>"}` — confirmed this query filtering
      works via a live test on `_uuid` and other fields. Kobo remains the single data store; no new
      infrastructure needed.
    - Do NOT rely on Kobo's own `_submitted_by` field for this — it's always the app's shared service-account
      identity (`jiayuanj`, from the one API key `api/kobo-submit.js` uses for every submission), not the
      end user, since all submissions currently go through one shared proxy/key. Ownership has to be its own
      explicit form field.
    - Reading a submission by its instanceID (the UUID `submitToKobo()` already generates and shows on the
      success screen) is separately confirmed to work today, with no auth needed —
      `query={"_uuid":"<instanceId>"}`. Useful as a lighter "look up this one record" path even before full
      auth exists, but by itself has no ownership check (anyone with the ID can look it up).
    - Editing is the harder part: Kobo's REST API has no generic "update submission" action (confirmed via
      `OPTIONS` on `/data/`). The supported path is Kobo's own Enketo edit webform, or resubmitting a new
      OpenRosa XML with the original instanceID set as `deprecatedID` — a real protocol detail to get right,
      not a quick add.
- [ ] Dashboard — use KoboToolbox built-in or build custom?
  → spec: `spec/dashboard.md`
- [ ] Offline support — service worker / local queue for field use without internet
- [ ] Multi-language UI — form already has EN/ES/FR/PT in KoboToolbox; React app is English only

### Known Issues
- ESA WorldCover WCS endpoint response format unverified in browser — fallback to OSM Overpass is in place.
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

Form fields (survey, in order): survey_intro (note), record_number (text, optional — field-notebook
identifier, matches Darwin Core recordNumber), species_scientific (text), species_common (text),
species_taxon_id (integer), preservation_method (select_one: freeze/alcohol/dry), survey_image (image),
location (geopoint, "lat lon alt acc"), dem_elevation_m (decimal), land_cover_lucc (text),
weather_temperature (decimal), weather_humidity (decimal), weather_precipitation (decimal),
weather_wind_speed (decimal), weather_code (integer), soil_temperature (decimal), soil_moisture (decimal),
env_manual_fields (text — comma-separated list of which env fields above were manually overridden),
env_fetched_snapshot (text — JSON of all env values as originally fetched, before any manual edit),
collection_date (date), collector_name/institution/project_name/habitat_description/locality/notes (text),
submitted_at (text — client-side ISO 8601 timestamp with ms precision, generated at submit time)

Note: `species` was a closed 8-choice select_one (Jaguar, Capybara, Llama, Macaw, Piranha, Anaconda,
Toucan, Tapir) until 2026-08-09, replaced by the three species_* fields above so arbitrary iNaturalist
search results can be stored.
```

### Account Plan Limits

Checked 2026-07-17 via `GET /api/v2/service_usage/?format=json` (Kobo free/community tier, resets monthly):

| Item | Limit | Used (2026-07-17) |
|------|-------|--------------------|
| Submissions | 5,000 / month | 0 |
| Storage | 1,000,000,000 bytes (≈1 GB) — includes photo attachments | 0 |
| ASR (speech-to-text) | 600 sec / month | 0 |
| Machine translation | 6,000 chars / month | 0 |
| LLM requests | 25 / month | 0 |

Current period: 2026-07-01 to 2026-08-01, resets automatically each month.

**Storage, not submission count, will be the real bottleneck.** Step 1 allows photo uploads up to 10 MB each;
at real-world phone photo sizes, the 1 GB cap will be hit long before 5,000 submissions if most records include
a photo. Re-check `service_usage` periodically once real field data starts coming in, and budget for a paid
Kobo plan or a periodic export+prune routine if volume grows.

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

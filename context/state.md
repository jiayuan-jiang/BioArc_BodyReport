# Project State Snapshot
_Last updated: 2026-08-11_

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
| Distance to road API | Mapbox Tilequery | free tier (100k/mo), needs `VITE_MAPBOX_TOKEN` |
| Distance to water API | OSM Overpass (`.fr` + `maps.mail.ru` mirrors) | free, no key |
| PWA / offline | vite-plugin-pwa (Workbox `generateSW`) + IndexedDB local queue | ^1.3.0, new 2026-08-10 |
| HEIC/HEIF photo decode | heic-to (WASM libheif, dynamic-imported only when a HEIC file is picked) | ^1.5.2, new 2026-08-12 |
| Testing | Vitest + React Testing Library (jsdom) | new 2026-08-12, devDependency only, `npm test` |
| Deployment | Vercel (auto-deploy via GitHub App, live) | https://bioarc.vercel.app |
| Hosting repo | GitHub — jiayuan-jiang/BioArc_BodyReport | — |

Note (2026-08-09): the URL above is the stable production alias (`vercel projects ls` shows it as the
project's "Latest Production URL"), and always points at the current production deployment. Per-deployment
URLs (the ones GitHub's commit status / `vercel` CLI output show right after a push, e.g.
`bio-<hash>-jiayuan-jiangs-projects.vercel.app`) are gated behind Vercel's SSO wall for anyone not logged
into the Vercel account and will look broken to an anonymous visitor. Always share/record the stable alias,
not a per-deployment URL.

---

## Environment Variables

| Variable | Purpose | Where set |
|----------|---------|-----------|
| `VITE_KOBO_ASSET_UID` | Target KoboToolbox project (client-safe, embedded in submission XML `id`) | `.env` / Vercel |
| `VITE_MAPBOX_TOKEN` | Mapbox public token (`pk.*`, client-safe by design), used by `fetchDistanceToRoadMapbox()` in `environmentApi.js` — added 2026-08-12, already had one via the PI, no new signup needed | `.env` / Vercel |
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
- [x] **Full offline submission support + PWA** (2026-08-10). Field use with no connectivity was the
  motivating case (task-queue item, previously `[LOW]`/deferred). Three parts, detailed in
  `spec/offline.md`:
  1. **PWA shell.** Added `vite-plugin-pwa` (new dev dependency, Workbox `generateSW` mode) so the app
     itself precaches and opens with zero network. Runtime `CacheFirst` caching added for OSM map tiles,
     the Leaflet marker-icon CDN, and Google Fonts (bonus: previously-viewed map areas still render
     offline). Live data APIs (iNaturalist, Open-Meteo, Open-Elevation, ESA WorldCover, `/api/kobo-submit`)
     are deliberately NOT cached, since offline handling for those is app-level (below), not stale SW
     responses. New icon set in `public/` (`icon.svg` rasterized via `rsvg-convert` from the existing
     header logo, no new asset design needed).
  2. **Deferred environment fetch.** `Step3Environment.jsx` skips the elevation/weather/land-cover fetch
     when offline (or defers if all three fail even while nominally online, e.g. a false `navigator.onLine`
     reading) instead of submitting blank fields. Sets `form.envFetchPending`; the manual edit-pencil UI
     stays available so a researcher with field instruments can still enter readings by hand. A new
     `resolveEnvironment(form)` in `environmentApi.js` re-fetches later using the form's *original*
     `collectionDate`/lat/lng, not the date it happens to sync on. `fetchEnvironmentData()` was extracted
     out of Step 3 so both the live UI and the sync queue share identical fetch/fallback logic.
  3. **Local submission queue.** New `src/offline/` module: `db.js` (IndexedDB, not `localStorage`,
     since queued records carry real `File`/`Blob` photo objects), `queue.js`
     (`enqueueSubmission`/`processQueue`, retried oldest-first, stops the batch on a genuine network
     error but keeps going past a one-off per-record failure), `OfflineContext.jsx` (`navigator.onLine` +
     `online`/`offline` events → `useOffline()`, auto-triggers `processQueue()` on reconnect + a 5-minute
     fallback poll for devices that don't fire the event reliably). `Step5Review.jsx` now queues instead
     of failing when offline or when a submit attempt hits a genuine connectivity error (`TypeError` from
     `fetch`, distinguished from a real Kobo 4xx/5xx rejection, which still surfaces to the user
     immediately rather than being silently queued forever). `koboApi.js`'s `submitToKobo()` takes an
     optional `instanceId` so a retried record keeps the same ID across attempts. New
     `OfflineBadge.jsx` header component shows connectivity + pending count, with a panel to inspect/
     manually sync/discard queued records.
  Verified with a production build and a full click-through against `vite preview` (offline simulated by
  overriding `navigator.onLine` + dispatching the `online`/`offline` events the app itself listens for):
  deferred env banner, offline "Save on This Device" success screen, queue panel, and auto-sync on
  reconnect all confirmed working. Caught a real bug this way: `processQueue()` was discarding a
  successful `resolveEnvironment()` backfill whenever the submit attempt right after it failed, because
  the error handler persisted the stale original `entry.form` instead of the updated one — fixed in
  `queue.js` (see `memory/sessions/2026-08-10.md` for the repro). See `spec/offline.md` for the full
  design writeup, including what's explicitly out of scope (offline map/
  species browsing beyond cached tiles, edit-after-sync, the Background Sync API).
- [x] **Added `distanceToRoad` / `distanceToWater` proximity fields** (2026-08-11). Two new Step 3 env
  fields, following the same auto-fetch + manual-override pattern as the existing nine: `fetchDistanceToRoad()`
  / `fetchDistanceToWater()` in `environmentApi.js` query OSM via the Overpass API (same public endpoint the
  existing land-cover fallback already uses), with an expanding search radius (2km → 10km → 50km, since a
  fixed small radius misses features in sparse rural areas) and a haversine distance to the nearest returned
  way/relation vertex (an approximation, not the true perpendicular distance to the line, acceptable given
  typical OSM vertex density). Wired through `fetchEnvironmentData()`/`resolveEnvironment()` (both generic
  over the `fetched` object, so no special-casing needed), Step 3 UI (two new `EnvItem` cards with the
  existing edit-pencil override), `koboApi.js` (`distance_to_road_m`/`distance_to_water_m`), `App.jsx`
  initial form state, Step 5 review rows, and all 4 i18n languages. Deployed Kobo form schema updated via
  the same `PATCH /api/v2/assets/{uid}/` + `PATCH .../deployment/` pattern as prior field additions (29
  survey rows now, was 27). Verified two ways: (1) a direct OpenRosa submission with test distance values,
  confirmed both fields landed via the REST API read-back, then deleted the test record; (2) a full browser
  click-through of Steps 1–3 against `vite dev`, confirming both new cards render with correct labels/sources
  and degrade to `—` gracefully on fetch failure (see Known Issues below re: what caused that failure in
  this run) rather than blocking the form.
  Motivation: discussion with the PI raised "distance to road" / "distance to water" as commonly-used
  proximity covariates in habitat/human-footprint literature (alongside elevation and land cover, both of
  which the app already captures), distinct from the point-in-time weather/soil readings.
- [x] **Added daily-average companions for all 7 live weather/soil fields** (2026-08-11). When Step 3 uses
  the live `current` reading (i.e. `collectionDate` is today), `fetchWeather()` now also fetches today's
  daily aggregate from the Open-Meteo forecast endpoint alongside it (best-effort — wrapped in its own
  try/catch so a failed companion fetch can't take down the already-successful live reading) and returns
  both. New `*Daily` fields: `temperatureDaily`, `humidityDaily`, `precipitationDaily`, `windSpeedDaily`,
  `weatherCodeDaily`, `soilTemperatureDaily`, `soilMoistureDaily`. Only fetched/shown when live (past-date
  submissions already show a single daily-aggregate value, no separate companion needed). Wired through
  `fetchEnvironmentData`, 7 new conditional `EnvItem` cards in Step 3 (rendered only when
  `form.weatherSource === 'current'`), `koboApi.js` (`weather_temperature_daily` etc., inserted right after
  each live counterpart), `App.jsx` initial form state, Step 5 review rows, and all 4 i18n languages.
  Deployed Kobo schema updated the same way as prior fields (36 survey rows now, was 29). Verified via a
  direct OpenRosa test submission with all 7 daily values (confirmed via REST read-back, record deleted) and
  a full browser click-through — daily values genuinely differ from live ones (e.g. 27.1°C daily vs 26.1°C
  live), confirming they're real distinct data points, not accidental duplicates.
  Initial version had a real gap: Soil Temperature/Moisture (Daily) always came back null on the live path,
  since Open-Meteo's `daily` block has no soil-aggregate variables at all (confirmed directly — the response
  comes back with unit `"undefined"` and a null value), and the archive endpoint that does have them can't
  cover "today" due to its 2–7 day processing lag. Fixed same-day by adding `fetchHourlySoilDailyAverage()`:
  the forecast endpoint's *hourly* soil variables ARE available for today, so the daily mean is now computed
  client-side from those 24 hourly readings instead of being left null. Verified in-browser (23.9°C / 0.204
  m³/m³ computed correctly for a real test point). Still degrades to `—` gracefully if this secondary fetch
  itself fails.
  Also fixed a semantic inconsistency: `DAILY_VARS` in `environmentApi.js` originally used
  `temperature_2m_max` for the "Temperature (Daily)" companion (and for the primary Temperature field on
  past-date submissions), while Soil Temperature/Moisture already used true `_mean` variables — an
  inconsistent mix of "daily max" and "daily mean" under the same "Daily" framing. Confirmed Open-Meteo
  exposes `temperature_2m_mean` on both the forecast and archive endpoints and switched to it, updating the
  `s3_sub_temp_daily` i18n string from "Daily max" to "Daily mean" (all 4 languages) to match. Verified
  in-browser (23°C daily mean vs 24.5°C live, correct label).
  Also added `.env-grid` max-height (520px) + internal scroll in `index.css`, since the card count roughly
  doubled (9 → 18 on a live/today submission) — verified the internal scrollbar reaches the last card
  (Distance to Water) correctly.
- [x] **Manual refetch icon for environmental data** (2026-08-11). Motivating case: GPS accuracy in Step 2
  can be off, and if a researcher goes back to correct it, Step 3's auto-fetch `useEffect` only runs once
  on mount (`if (form.elevation !== null) return` guard) — there was previously no way to pull fresh env
  data for the corrected coordinates without a page reload. Added a small circular-arrow icon button
  (`.card-header-refetch-btn`) in the top-right of the Step 3 card header, visible whenever a location is
  set and the form isn't idle, calling the same `runFetch()` used internally. Spins while loading, disabled
  during fetch.
  Also fixed a real bug this surfaced: `runFetch()` previously did an unconditional
  `update({ ...fetched, ... })`, which would have silently clobbered any manually-entered field
  (`form.manualEnvFields`) on a refetch. Fixed by merging the freshly fetched values with the existing form,
  keeping the manual value for any field the researcher already overrode — `envFetchedSnapshot` still
  captures the true as-fetched value regardless, so nothing is lost either way. Verified in-browser:
  manually set Elevation to a distinctive test value, clicked refetch, confirmed Elevation stayed manually
  overridden while Temperature/Humidity/etc. all refreshed with new live values.
  **Follow-up fix (2026-08-11, same day):** user reported the refetch icon disappeared after navigating back
  to Step 2 and forward to Step 3 again. Root cause: `status` is local `useState('idle')` state in
  `Step3Environment`, which unmounts on navigating away and remounts fresh on return — the actual fetched
  data lives in the parent `form` and survives fine, but `status` reset to `'idle'` on remount, and `'idle'`
  is exactly what hides the refetch button, the success banner, and the edit hint. The mount `useEffect`
  only handled the "never fetched yet" and "fetch is pending" cases, never the "already fetched successfully
  in a prior mount" case. Fixed by setting `status` to `'done'` immediately when `form.elevation !== null` on
  mount, instead of silently returning with `status` still at its initial value. Verified in-browser: fetched
  once, navigated Back to Step 2 then Next to Step 3, confirmed the refetch icon and success banner both
  persisted immediately with the same data (no unnecessary re-fetch).

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
- [ ] Multi-language UI — form already has EN/ES/FR/PT in KoboToolbox; React app is English only

### Known Issues
- **Fixed (2026-08-12): every uploaded photo showed as a broken image.** `Step1Specimen.jsx`'s `handleFiles`
  called `valid.map(compressImage)` — the classic `map` gotcha where the callback also receives `(index, array)`
  as extra arguments, which landed in `compressImage(file, maxDim = 1280, quality = 0.75)`'s `maxDim` and
  `quality` parameters. The first file in any batch got `maxDim = 0`, forcing `scale = 0` and a 0×0 canvas;
  `canvas.toBlob` on a 0×0 canvas resolves with a ~4-byte stub blob instead of throwing, so nothing ever
  errored. Reproduced directly in-browser: uploaded a real file, confirmed the resulting `blob:` URL fetched
  to 4 bytes with `naturalWidth`/`naturalHeight` both 0, then isolated it to the bare `[file].map(compressImage)`
  call outside React entirely. Fixed with `valid.map(f => compressImage(f))`. Verified in-browser after the
  fix: same file now produces a correct 800×600 / 3609-byte blob and renders in the thumbnail grid.
- **Fixed (2026-08-12): HEIC photos from an iPhone camera roll never actually worked**, despite the UI
  advertising "JPG, PNG, HEIC" (`design/ui-card-spec.md`, `content-spec.md`, `s1_drop_hint`). Two separate
  bugs, both confirmed live in-browser with a real .heic file: (1) `file.type` for a HEIC file comes back as
  `application/octet-stream` in Chrome, not `image/heic`, so the `f.type.startsWith('image/')` filter in
  `handleFiles` silently dropped it before it ever reached `compressImage`; widened the filter to also match
  `/\.hei[cf]$/i` on the filename. (2) Chromium has no built-in HEIC/HEIF decoder at all —
  `createImageBitmap(heicFile)` throws `InvalidStateError: The source image could not be decoded` directly
  (confirmed; Safari is the only engine with native HEIC decode). Added `heic-to` (WASM libheif) as a fallback
  in a new `decodeToBitmap()`: try `createImageBitmap` first, and only on failure dynamic-`import('heic-to')`
  and convert to JPEG first, keeping the ~3MB decoder out of the main bundle and fetched only when a HEIC file
  is actually picked. Also switched `handleFiles` from `Promise.all` to `Promise.allSettled` so one
  undecodable file (corrupt upload, unsupported format) no longer silently kills every other photo in the same
  batch; failures are now skipped individually and surface `s1_err_photo_decode` to the user. Verified
  in-browser: a real HEIC file now compresses correctly (800×600 / 3609-byte JPEG), and a deliberately corrupt
  file in a mixed batch gets skipped with the JPG next to it still succeeding.
- **Not yet fully root-caused (2026-08-12): a real photo on a real iPhone (Safari) still showed as a broken
  thumbnail after both fixes above** — filename `IMG_9429.jpg`, i.e. already JPEG (iOS's file-picker transcodes
  HEIC to JPEG before handing it to a web page, so this wasn't the HEIC path at all). Could not reproduce on
  desktop Chrome, including against a synthetic 4032×3024 / 6.5MB JPEG matching real camera-photo dimensions —
  that one compressed correctly. This tool only automates Chrome, not Safari, so the exact WebKit-side failure
  (leading suspicion: Safari mishandling a wide-gamut/Display P3 color profile in `createImageBitmap`/canvas,
  a known class of bug for photos originating as iPhone HEIC) hasn't been directly observed yet. Hardened
  `compressImage`/`decodeToBitmap` defensively in the meantime, independent of pinning down the exact cause:
  (1) added an `<img>`/`FileReader`-based decode fallback (`decodeViaImgElement`) for when `createImageBitmap`
  throws and the HEIC path also isn't applicable; (2) added a post-`canvas.toBlob()` sanity check that throws
  if the resulting blob is under 500 bytes, since a canvas that fails to draw correctly still resolves
  `toBlob()` with a "valid" near-empty blob instead of throwing — this is the same failure shape as the very
  first bug in this list, so on any recurrence it now gets skipped with `s1_err_photo_decode` shown to the
  user instead of silently shipping a broken thumbnail; (3) added `console.error` logging on every rejected
  file so a recurrence leaves a diagnosable trail. Still needs either the actual problematic photo file or
  Safari remote-debugging console output from the affected phone to find the true root cause.
- ESA WorldCover WCS endpoint response format unverified in browser — fallback to OSM Overpass is in place.
- `overpass-api.de` (used by the land-cover fallback and the distance-to-road/distance-to-water fetches) has
  been unreachable at the TCP level (`ERR_CONNECTION_REFUSED`) since 2026-08-11. Initially attributed this to
  our own IP getting rate-limited by rapid dev testing — that diagnosis was **wrong, or at least incomplete**:
  confirmed unreachable independently from four separate networks (dev machine, two different real user
  devices, and a WebFetch call routed through unrelated infrastructure), while `overpass.openstreetmap.fr`
  answered normally from all of them. TCP-level connection refusal from that many independent vantage points
  is far more consistent with an outage/issue on `overpass-api.de`'s side than a per-client rate limit
  (rate limiting normally still accepts the connection and returns HTTP 429, not a refused connection).
  Mitigated in `environmentApi.js`: `OVERPASS_ENDPOINTS` now lists `overpass.openstreetmap.fr` **first**
  (the one actually reachable) with `overpass-api.de` kept second in case it recovers, and
  `deadOverpassEndpoints` (module-level `Set`) marks an endpoint bad after its first failure within a page
  session so it isn't retried at every radius tier on every subsequent fetch — the original design retried
  a dead endpoint fresh at each of 3 radii, for both distance-to-road and distance-to-water concurrently,
  which was drawing enough repeat traffic at the working mirror to occasionally trip its own rate limiting
  too (its CORS headers are correctly configured — confirmed directly — so the CORS errors seen were almost
  certainly its rate limiter dropping those headers on throttled responses, not a real misconfiguration).
  Verified in-browser after the fix: full env fetch (including both distance fields) resolved noticeably
  faster and both fields returned correct values. Both distance fetches still fail gracefully (field shows
  `—`, manual edit-pencil still works, submission isn't blocked) if every endpoint fails.
  **Follow-up (same day):** the user then reported Distance to Water still coming back `—` even after the
  above. Root cause was a second, separate bug introduced by merging the two distance queries into one
  request to cut Overpass traffic: the combined query shared a single `out tags geom 60` result limit across
  both road and water elements, and in road-dense areas (confirmed directly with a real Ann Arbor test point)
  Overpass filled all 60 slots with roads, silently crowding water out of the response entirely. Fixed by
  using named sets (`->.roads`, `->.water`) with a separate `out tags geom 30` per set in the same query, so
  each category gets its own guaranteed slice regardless of how many roads exist nearby — confirmed via curl
  (60/60 all-roads before the fix, 30 roads + 30 water after) and re-verified in-browser (both fields
  correct again: 127 m road, 921 m water for the same test point).
  **Second follow-up (same day):** user reported the fields *still* not resolving even after the above two
  fixes, on a fresh deployment confirmed (via direct inspection of the live JS bundle) to actually contain
  both fixes. Found a third, real design gap: `deadOverpassEndpoints` marked an endpoint dead for the entire
  page session on its first failure, with no expiry. Since `overpass-api.de` is expected to fail every time
  right now, that's fine for it — but if `overpass.openstreetmap.fr` (the only working endpoint) had even one
  transient blip anywhere in a session, it would get marked dead for the rest of that session too, and with
  both endpoints then "dead," every subsequent fetch (including a manual refetch click) would return null
  until the page was fully reloaded. Replaced the permanent `Set` with a `Map` of endpoint → retry-after
  timestamp (`isOverpassEndpointDead()` / `markOverpassEndpointDead()`, 60s cooldown) so a transient failure
  only costs a short window, not the rest of the session, while a genuinely dead host (like `overpass-api.de`
  right now) still isn't hammered on every radius tier. Verified in-browser again after this change.
  **Third follow-up (same day):** despite all three fixes above, the user hit another failure — this time a
  single CORS error on `overpass.openstreetmap.fr` itself (not a repeat-hammering pattern; just one failed
  attempt), consistent with the free community mirror occasionally erroring out under its own load with no
  CORS headers on the error response, something outside this app's control. At the user's suggestion, dropped
  `overpass-api.de` from `OVERPASS_ENDPOINTS` entirely rather than keeping it as a fallback — it had shown no
  sign of recovery across multiple days of testing, and keeping a guaranteed-dead second attempt in the list
  only added latency on every request where the working mirror also had a blip, for zero benefit. Tried three
  other public mirrors (kumi.systems, monicz.dev, private.coffee) directly via curl as replacement candidates;
  all three were themselves slow/unreachable at the time, so none were a real improvement over just dropping
  the dead one. **Honest state as of this fix:** distance-to-road/water now depends on a single free,
  best-effort community Overpass mirror with no SLA, and will occasionally return null even when working as
  designed — this is inherent to relying on a free third-party service, not a bug to keep chasing. The app
  already degrades correctly when it happens (`—` shown, manual edit-pencil still available, submission never
  blocked), which is the actual mitigation for this class of failure, not further endpoint engineering.
  **Confirmed directly on the real production site (2026-08-12):** user asked to actually test
  `bioarc.vercel.app` rather than take verification-on-localhost as sufficient — a fair ask, since every prior
  verification in this whole thread had only ever been against the local dev server. Did so, reproduced the
  null fields, and read the real network log: both `overpass.openstreetmap.fr` and `overpass-api.de` returned
  HTTP 503 (Service Unavailable) — a clean rejection, not a connection failure — confirming this was a live,
  momentary overload of the free mirror, exactly the class of failure the whole endpoint-reliability effort
  above was built to handle gracefully, and it did (nothing else broke, land cover still resolved via its own
  fallback chain). Also tried three more public Overpass mirrors as an escalation the user asked for
  specifically (`overpass.osm.ch` connects fine and has correct CORS headers but returns **zero elements**
  even for a landmark guaranteed to have nearby roads — its dataset is empty/broken, confirmed directly, not
  a viable addition) — no better free alternative found.
- **Fourth follow-up (same day):** user re-tested and it still failed. Tested the real deployed site directly
  again rather than re-explaining — network log showed `overpass.openstreetmap.fr` back to a clean 503, and a
  fresh curl sweep a few seconds later showed it had already flipped back to 200 (confirming real, rapid
  load-driven fluctuation, not a persistent outage) — but also turned up a genuinely new, independently
  verified working mirror: `maps.mail.ru/osm/tools/overpass/api/interpreter` (correct CORS headers, real
  non-empty data, supports the named-set query syntax this app uses). Added it as `OVERPASS_ENDPOINTS[1]`, so
  a 503 on the primary now has somewhere else to go *within the same fetch* instead of only the 60s cooldown
  retry. This is a second endpoint added on real new evidence (an endpoint that wasn't reachable at test time
  earlier in the day came up later — network conditions for free mirrors are genuinely time-varying, worth
  re-checking rather than treating an earlier "unreachable" result as permanent).
  Verifying this fix surfaced a real, separate, more significant bug: a *brand-new browser tab*, on a fresh
  navigation to `bioarc.vercel.app` with no manual caching involved, was found running a JS bundle from the
  *previous* deploy — confirmed directly via `document.scripts` showing an old asset hash. Root cause: with
  `registerType: 'autoUpdate'`, vite-plugin-pwa's default auto-injected `registerSW.js` only calls
  `navigator.serviceWorker.register()` — it never listens for `controllerchange` or reloads the page once a
  new service worker actually takes over. The generated `sw.js` itself does call `skipWaiting()` +
  `clientsClaim()` correctly, so a new version *does* install and take control in the background, but nothing
  ever prompted the already-loaded page (or any origin visit that happened to load before that takeover
  finished) to pick up the fresh JS — a deploy could sit installed-but-invisible on a given tab/device
  indefinitely. **This plausibly explains a real portion of the "I fixed it but you still can't see it"
  pattern across this entire debugging thread**, independent of every other issue found and fixed above.
  Fixed the standard way: `injectRegister: false` in `vite.config.js` (stop generating the bare script),
  and `registerSW({ immediate: true })` from the `virtual:pwa-register` module in `src/main.jsx` instead —
  per vite-plugin-pwa's own docs, this reloads the page automatically once a new service worker activates
  when no `onNeedRefresh` callback is given, matching `autoUpdate`'s intent end-to-end instead of only
  half-implementing it. Verified via `vite preview`: service worker registers and activates with no console
  errors, app renders normally.
- **Land cover source mislabeling, found and fixed while investigating the above** (2026-08-12). The Land
  Cover card's sub-label was a hardcoded `"ESA WorldCover 2021"` string regardless of which tier of the
  fallback chain (WCS → Overpass → Nominatim) actually supplied the value — confirmed live on production that
  a value from Nominatim was being mislabeled as ESA WorldCover. Fixed by having `fetchLandCover()` /
  `fetchLandCoverOSM()` / `fetchLandCoverNominatim()` all return `{ value, source }` instead of a bare string,
  threading `landCoverSource` through `fetchEnvironmentData`, `App.jsx` initial state, `resolveEnvironment()`,
  and a dynamic sub-label in Step 3 (`esa_worldcover`/`overpass`/`nominatim` → distinct label per source, 4
  languages). Added `land_cover_source` to `koboApi.js` and the deployed Kobo schema (37 survey rows now, was
  36) and a Step 5 review row, matching this project's existing data-provenance conventions
  (`env_manual_fields`/`env_fetched_snapshot`). Verified via a direct OpenRosa test submission and, live on
  the real deployed site, saw the sub-label correctly read "OSM Nominatim (fallback)" for a location where
  WCS and Overpass had both failed — exactly the bug, now fixed and observed fixed in the same session.
- **Resolution of the whole Overpass-reliability thread (2026-08-12):** distance-to-road switched entirely to
  Mapbox Tilequery (see tech stack table), at the user's request after repeated real, confirmed reliability
  failures on the free Overpass mirrors. `OVERPASS_ENDPOINTS`/cooldown machinery stays in place for
  distance-to-water and the land-cover fallback, which remain on Overpass.
  **Real limitation found and worth remembering:** Mapbox Tilequery cannot query the `water` layer at all in
  this tileset — confirmed directly with a point in the middle of the Detroit River at radius 0 (should be a
  trivial point-in-polygon hit) still returning zero features, and `waterway` (the line layer) also empty up
  to 50km radius at the same spot. Mapbox's own tileset docs describe `water` as "a single merged shape per
  tile," which doesn't appear to work with Tilequery's point-radius search mechanism. Don't attempt to move
  distance-to-water onto Tilequery again without solving this first (e.g. a support ticket to Mapbox, or a
  different Mapbox product entirely) — road and water are NOT symmetric in Tilequery's capabilities despite
  looking like they should be.
- **Field report of Mapbox road / ESA / Overpass all failing at once, investigated (2026-08-12).** User pasted
  a real console log from a live test: a `CoreLocationProvider kCLErrorLocationUnknown` line (the device's own
  GPS lookup failed), an ESA WorldCover `ERR_HTTP2_PROTOCOL_ERROR`, and CORS-blocked failures on both
  `overpass.openstreetmap.fr` and `overpass-api.de`, at coordinates `38.510733, -108.537297` (rural western
  Colorado, near Whitewater/Gateway, deep in the Uncompahgre Plateau backcountry). Verified directly rather
  than guessing:
  1. Curled Mapbox Tilequery for that exact point with the production token: **zero road-layer features up to
     a 100km radius**, while the same query at nearby Grand Junction (only ~15km away) and Ann Arbor returns
     results immediately. This is a real Mapbox `mapbox-streets-v8` data-coverage gap for this specific remote
     point, not a token/deploy/code problem, confirmed independently of the app.
  2. Curled all three Overpass endpoints (`openstreetmap.fr`, `maps.mail.ru`, and even the dropped
     `overpass-api.de`) for the same coordinates minutes later: all three returned a clean HTTP 200. Combined
     with the `CoreLocationProvider` failure and the `ERR_HTTP2_PROTOCOL_ERROR` on ESA, this points to a flaky
     connection on the user's end at test time (consistent with field-testing from a remote area with weak
     signal) rather than a server-side or code-side outage.
  Net: no code changes made. This class of "everything failed at once, on a remote location, right after a
  GPS failure" fits the app's existing offline/degrade design (`—` shown, manual pencil-edit still available,
  retry via the refetch icon or the offline-queue backfill on reconnect) rather than being a new bug.
  **Follow-up: user pushed back that a code bug is more likely than flaky network** since failures looked
  consistent across their own repeated tests. Set up Vitest + React Testing Library (new devDependency, see
  Tech Stack table) and wrote `src/steps/Step3Environment.test.jsx` (7 tests) mocking `fetchEnvironmentData`
  to isolate the component's own logic from real network/API variability: fetch-once-on-mount, full success,
  partial failure (only proximity fields null → still shows success, not deferred), total failure (core
  fields null → correctly defers), offline short-circuit (no fetch call at all when `navigator.onLine` is
  false), remount-with-cached-data skip, and manual-field preservation across a refetch. All 7 passed against
  the actual component code with no fixes needed — the fetch orchestration, success/deferred/partial-failure
  branching, and manual-override merge logic are all correct. This is real evidence (not just external curl
  checks) that the failures are coming from the third-party APIs/network, not from a bug in this component.
  Run via `npm test`.
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
weather_temperature (decimal), weather_temperature_daily (decimal), weather_humidity (decimal),
weather_humidity_daily (decimal), weather_precipitation (decimal), weather_precipitation_daily (decimal),
weather_wind_speed (decimal), weather_wind_speed_daily (decimal), weather_code (integer),
weather_code_daily (integer), soil_temperature (decimal), soil_temperature_daily (decimal),
soil_moisture (decimal), soil_moisture_daily (decimal),
distance_to_road_m (decimal), distance_to_water_m (decimal),
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
| Offline queue (IndexedDB, sync) | `src/offline/db.js`, `src/offline/queue.js` |
| Online/offline detection + sync context | `src/offline/OfflineContext.jsx` |
| Connectivity badge + queue panel UI | `src/components/OfflineBadge.jsx` |
| PWA config (manifest, precache, runtime caching) | `vite.config.js` |

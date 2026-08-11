# Task Queue
_Last updated: 2026-08-11_

Format: `[priority] Task title. Spec pointer`

---

## In Progress

(none)

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
- [x] **[HIGH] Open-Meteo 天气获取重写：real-time + humidity + soil temp/moisture** — 2026-08-09
  原问题（archive API 查未来/近期日期返回空值）已通过重写 `fetchWeather()` 解决：collectionDate 为今天时走
  `/v1/forecast?current=...`（准实时，~15分钟粒度），过去日期走 archive（ERA5，全历史但2-7天延迟）→
  forecast daily（无延迟但仅约92天）fallback链。同时新增 humidity、soil_temperature、soil_moisture 三个字段，
  已贯穿 UI（Step3/Step5）、i18n（4语言）、koboApi.js、Kobo部署表单schema（已用真实提交测试验证并删除测试记录）。
  → `src/utils/environmentApi.js`, `context/state.md`

- [ ] **[MEDIUM] Vercel deployment**
  Set env vars in Vercel dashboard, verify build passes, confirm submission flow works end-to-end.
  → no spec needed

- [x] **[LOW] Multi-language UI**
  EN/ES/FR/PT implemented via LangContext + useT() hook (no external deps).
  Language switcher pill in top-right header. Form stored values remain English.

- [x] **[HIGH] Fix KoboToolbox submission (submit button did nothing)** — 2026-07-17
  Root cause: `koboApi.js` POSTed JSON to a REST endpoint that doesn't support creating submissions, and
  even fixed would've hit a hard CORS block calling Kobo directly from the browser. Fixed by rewriting to
  the OpenRosa XML protocol behind a new Vercel proxy (`api/kobo-submit.js`), adding the missing
  environment fields to the deployed Kobo form, and moving the API key to server-only env vars.
  Verified via full Playwright click-through + inspecting the landed Kobo record. Full detail in
  `context/state.md` and `memory/sessions/2026-07-17.md`.

- [x] **[HIGH] Photo upload to KoboToolbox media endpoint**
  Photos now attach to the submission as a real OpenRosa multipart file part (was: preview-only).
  Only the first photo attaches — `survey_image` is a single `image` field, not a repeat group.

---

## Done

- [x] **[MEDIUM] Daily-average companions for live weather/soil fields** (2026-08-11)
  When Step 3 shows a live (`current`) weather reading, it now also fetches and shows today's daily
  aggregate alongside each of the 7 live fields (temperature, humidity, precipitation, wind, weather, soil
  temp, soil moisture) — 7 new `EnvItem` cards, Kobo fields (`weather_temperature_daily` etc.), i18n, and
  Step 5 rows. `.env-grid` capped at 520px with internal scroll since the card count nearly doubled.
  Verified via a direct OpenRosa test submission and a full browser click-through. Known gap: soil daily
  companions always come back null (Open-Meteo forecast endpoint has no daily soil aggregate variables).
  → `context/state.md`, `memory/sessions/2026-08-11.md`

- [x] **[MEDIUM] Distance to road / distance to water proximity fields** (2026-08-11)
  Two new auto-fetched Step 3 env fields (`distanceToRoad`, `distanceToWater`), sourced from OSM via the
  Overpass API with an expanding search radius, same manual-override pattern as the existing nine env
  fields. Full stack: `environmentApi.js`, Step 3/5 UI, `koboApi.js`, `App.jsx`, 4-language i18n, deployed
  Kobo schema (`distance_to_road_m`/`distance_to_water_m`). Verified via a direct OpenRosa test submission
  (fields confirmed via REST read-back, test record deleted) and a full browser click-through of Steps 1–3.
  Known risk: the public Overpass instance rate-limits under repeated rapid requests — see Known Issues in
  `context/state.md`.
  → `context/state.md`, `memory/sessions/2026-08-11.md`

- [x] **[HIGH] Offline submission support + PWA** (2026-08-10)
  Full offline flow for field use with unreliable/no connectivity: species search already degraded
  gracefully (unchanged), Step 3 environment fetch now defers to a `resolveEnvironment()` backfill keyed
  to the original collection date/location instead of fetching at collection time, and Step 5 queues a
  submission locally (IndexedDB) instead of failing when offline or on a genuine network error, auto-
  syncing on reconnect. App is installable and its shell loads with zero network via `vite-plugin-pwa`
  (new dev dependency). New `src/offline/` module + `OfflineBadge.jsx` header UI (connectivity status,
  pending count, manual sync/discard).
  → `spec/offline.md`, `context/state.md`

- [x] **[HIGH] Species search. iNaturalist API live autocomplete** (2026-08-09)
  Replaced the hardcoded North American wildlife list in `Step1Specimen.jsx` with real-time search against
  the iNaturalist Taxa Autocomplete API (300ms debounce, photo + common name + scientific name + iconic
  taxon badge in the dropdown, no-results and fetch-failure states per spec). Form state now stores
  `taxonId`, `speciesSci`, `speciesCommon`, `speciesIconic` instead of a slug id.
  Considered building a self-hosted search index from iNaturalist's official open-data taxonomy export
  first (`taxa.csv.gz`, confirmed 37.7MB compressed / 189MB uncompressed / 1.65M rows via a live HEAD/download
  check). Ruled out: that export has no common/vernacular names at all, only scientific name plus an
  ancestry ID chain, which would have broken the core "search by common name in any language" requirement.
  Measured the live API's real latency instead (five sample queries incl. non-English terms): 190 to 300ms,
  well inside the existing 300ms debounce, so there is no responsiveness reason to self-host an index either.
  Kept the original spec's real-time-API design as a result.
  Also changed the live Kobo form's `species` field from a closed 8-choice `select_one` (Jaguar, Capybara,
  Llama, Macaw, Piranha, Anaconda, Toucan, Tapir) to three fields, `species_scientific` (text),
  `species_common` (text), `species_taxon_id` (integer), via `PATCH /api/v2/assets/{uid}/` +
  `PATCH /api/v2/assets/{uid}/deployment/`, since the old choice list could never match an arbitrary
  species coming from full-taxonomy search. `koboApi.js` updated to match. Verified with a real OpenRosa
  test submission (Mallard / Anas platyrhynchos), confirmed all three fields landed via the REST API, then
  deleted the test record.
  Built in worktree `../BioArc-species-search` on branch `feature/species-live-search`, not yet merged.
  → `spec/species-api.md`, `memory/sessions/2026-08-09.md`

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

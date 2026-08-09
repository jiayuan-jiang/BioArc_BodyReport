# Task Queue
_Last updated: 2026-07-17_

Format: `[priority] Task title — spec pointer`

---

## In Progress

- [ ] **[HIGH] Species search — iNaturalist API live autocomplete**
  Replace static species list in `Step1Specimen.jsx` with real-time search against iNaturalist Taxa API.
  Confirmed 2026-07-17: the current hardcoded list is North American wildlife with slug ids
  (e.g. `procyon_lotor`), completely disjoint from the Kobo form's `species` choices (scientific names
  like `Panthera onca`). Submissions go through fine but write a species value Kobo doesn't recognize —
  this is the main reason the value needs fixing, not just staleness.
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

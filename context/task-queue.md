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

- [ ] **[PENDING CLIENT] Open-Meteo 未来日期问题**
  Step 3 的天气拉取使用 archive API（历史存档），若用户将采集日期设为未来日期则 API 返回 400 报错，天气数据显示 `—`。
  目前 Step 3 在进入时立即拉取，而 collectionDate 在 Step 4 才可修改，故当前流程下不会触发此问题。
  若日后允许用户在 Step 3 之前修改日期，或业务上存在预填未来采集计划的场景，则需切换到 forecast API（`https://api.open-meteo.com/v1/forecast`）处理未来日期。
  → 待与客户确认是否有预填未来日期的需求后决定是否实现。
  → `src/utils/environmentApi.js`

- [ ] **[MEDIUM] Vercel deployment**
  Set env vars in Vercel dashboard, verify build passes, confirm submission flow works end-to-end.
  → no spec needed

- [x] **[LOW] Multi-language UI**
  EN/ES/FR/PT implemented via LangContext + useT() hook (no external deps).
  Language switcher pill in top-right header. Form stored values remain English.

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

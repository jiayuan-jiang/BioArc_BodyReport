# Spec: Offline Submission + PWA

_Status: implemented (2026-08-10)_
_Affects: `src/offline/*` (new), `src/steps/Step3Environment.jsx`, `src/steps/Step5Review.jsx`,
`src/App.jsx`, `src/components/OfflineBadge.jsx` (new), `src/utils/environmentApi.js`,
`src/utils/koboApi.js`, `src/i18n/index.jsx`, `src/index.css`, `vite.config.js`, `index.html`, `public/*`_

---

## Problem

Field researchers may collect specimens with no connectivity at all. Three things in the current
flow assume a live network:

1. **Species search** (`Step1Specimen.jsx`) calls the iNaturalist API on every keystroke.
2. **Environmental data** (`Step3Environment.jsx`) fetches elevation/weather/land cover immediately
   once a location is set, keyed to `collectionDate`.
3. **Submission** (`Step5Review.jsx`) POSTs straight to `/api/kobo-submit`.
4. The app itself is a normal SPA — with zero connectivity, the page may not even load.

---

## Design

### 1. Detection: automatic, not a manual toggle

`src/offline/OfflineContext.jsx` wraps `navigator.onLine` + `online`/`offline` window events into a
context (`OfflineProvider` / `useOffline()`), mounted once in `App.jsx`. No manual "offline mode"
switch — a researcher in the field won't remember to flip one, and real connectivity loss is often a
false "online" reading (captive portal, flaky signal) rather than a clean transition anyway. Every
offline-aware code path branches off this hook (or a direct `navigator.onLine` / `TypeError` check
at the point of failure, for cases before the context has updated).

### 2. Species search: already degrades on its own

`Step1Specimen.jsx`'s existing fetch-failure branch was already offline-safe going in — on any fetch
rejection it falls back to whatever the user typed as `speciesSci`/`speciesDisplay` and shows
`s1_species_fetch_err`. No changes needed here; offline is just one more case that branch already
covers.

### 3. Environmental data: fetch deferred, not lost

`environmentApi.js` gained two exports:

- `fetchEnvironmentData(lat, lng, date)` — the `Promise.allSettled` fan-out over elevation/weather/land
  cover, extracted out of `Step3Environment.jsx` so it can be reused by the sync queue.
- `resolveEnvironment(form)` — called when `form.envFetchPending` is true; re-runs
  `fetchEnvironmentData` using the form's stored `latitude`/`longitude`/`collectionDate` (never "now"),
  and only fills fields that are still `null` and not in `form.manualEnvFields` (so a manual field entry
  is never clobbered by a later backfill).

`Step3Environment.jsx`: if `navigator.onLine` is false when the effect would normally fire, it skips
the fetch entirely, sets `form.envFetchPending = true`, and shows a `deferred` status card instead of
`loading`/`done`. If online but every one of elevation/temperature/landCover comes back `null` (all
three fetches failed — usually a false-positive `navigator.onLine` reading), the same deferred state is
set. The edit-pencil UI for manual entry stays available in both cases — a researcher with field
instruments can still type in readings by hand while offline. A "Retry" button re-runs the fetch on
demand. `Next` was never blocked by fetch status and still isn't.

### 4. Submission: queue instead of fail

`Step5Review.jsx`'s `handleSubmit`:
- If `!online`: skip the network attempt, enqueue immediately.
- If online: attempt `resolveEnvironment()` (in case env data is still pending) then `submitToKobo()`.
  On failure, only fall back to queueing if the failure looks like a connectivity drop
  (`!navigator.onLine` or the thrown error is a `TypeError`, which is what `fetch()` throws specifically
  on a network failure). A real Kobo rejection (4xx/5xx, thrown as a plain `Error` by `koboApi.js`)
  surfaces to the user immediately instead of being silently queued and retried forever.

`koboApi.js`'s `submitToKobo(form, instanceId)` now accepts an optional pre-generated `instanceId` so a
queued record keeps the same ID across retries (matters for the Kobo `<meta><instanceID>` dedup
semantics and for the "ID" shown on the success screen).

### 5. Local queue: IndexedDB

`src/offline/db.js` — minimal IndexedDB wrapper, one object store (`submissions`, keyPath `id`).
IndexedDB (not `localStorage`) because queued entries carry `form.photos[].file`, real `File`/`Blob`
objects (structured-cloneable, but not string-serializable).

`src/offline/queue.js`:
- `enqueueSubmission(form)` — generates a `crypto.randomUUID()` id, stores `{ id, form, status:
  'pending', createdAt, attempts, lastError }`.
- `listQueue()` / `removeFromQueue(id)`.
- `processQueue(onProgress)` — walks the queue oldest-first. Per entry: backfill env data via
  `resolveEnvironment()` if still pending, then `submitToKobo(form, entry.id)`. On success, removes the
  entry. On failure, marks it `error` with `lastError` and stops the whole batch if the failure was a
  `TypeError` (network dead — no point hammering the rest of the queue), otherwise keeps going (a
  one-off rejection on a single record shouldn't block others). The backfilled `form` (not the original
  `entry.form`) is what gets persisted on failure too — otherwise a successful env backfill would be
  silently thrown away every time the submit right after it fails, forcing a wasted re-fetch on the next
  retry. Caught this exact bug during browser verification; see `memory/sessions/2026-08-10.md`.

`OfflineProvider` calls `processQueue()` on the `online` window event, once on mount if already online,
and on a 5-minute interval as a fallback for devices that don't fire `online` reliably. It exposes
`queue`, `syncing`, and a manual `syncNow()`.

### 6. UI

`src/components/OfflineBadge.jsx` in the header: a green/amber connectivity pill (auto, from
`useOffline().online`), with a count badge when the queue is non-empty. Clicking it opens a panel
listing queued records (species, collection date, relative time, error if any), a manual "Sync Now"
button, and a per-record discard (with a `window.confirm` guard — this is user's own local data, not a
server record, so no extra ceremony beyond a confirm).

Step 5's success screen (`App.jsx`) branches on whether `onSuccess(id, { queued })` was called with
`queued: true` — different title/body/icon ("Saved on This Device" vs "Submission Complete"), same
instance ID display either way.

### 7. PWA: app shell must load with zero network

`vite-plugin-pwa` (new dev dependency — noted in `state.md`), `generateSW` mode. Precaches all built
JS/CSS/HTML/icons so the form itself opens offline. Runtime caching (`CacheFirst`) added for OSM map
tiles, the Leaflet marker-icon CDN assets, and Google Fonts — a bonus, not a requirement: it means a
previously-viewed map area still renders offline, but the map/species search themselves are not
expected to be usable offline.

Deliberately **not** cached: iNaturalist, Open-Meteo/Open-Elevation/ESA WorldCover, and
`/api/kobo-submit`. Those go through the app-level offline logic above (defer + queue), not a stale
service-worker response standing in for live data.

Icons: `public/icon.svg` (header logo, scaled up, green background) rasterized via `rsvg-convert` to
`pwa-192.png`, `pwa-512.png`, `maskable-512.png` (from a second, more-padded `icon-maskable.svg`), and
`apple-touch-icon.png`. Manifest colors match `design/ui-card-spec.md` (`#3D7A5E` primary,
`#F4F7F5` background).

---

## What's explicitly out of scope

- **True offline map/species browsing.** GPS pin-drop and manual lat/lng entry both work offline
  already (no network involved); live species search and fresh map tiles for unvisited areas do not,
  and aren't expected to.
- **Conflict resolution / edit-after-sync.** Each queued record is a new Kobo submission; there's no
  mechanism here for editing a record that already synced (matches the existing "no update endpoint"
  limitation noted in `state.md` under the auth/dashboard follow-up).
- **Background Sync API.** Relying on the `online` event + a 5-minute fallback poll while the tab is
  open, not the browser's Background Sync API (spottier cross-browser support, and this app's usage
  pattern — open the form, fill it out, hit submit — doesn't need sync to survive the tab being closed).

---

## Files changed

| File | Change |
|------|--------|
| `src/offline/db.js` | New. IndexedDB wrapper. |
| `src/offline/queue.js` | New. Enqueue/list/remove/processQueue. |
| `src/offline/OfflineContext.jsx` | New. `online` status, queue state, `syncNow()`. |
| `src/components/OfflineBadge.jsx` | New. Header connectivity pill + queue panel. |
| `src/utils/environmentApi.js` | Added `fetchEnvironmentData()`, `resolveEnvironment()`. |
| `src/utils/koboApi.js` | `submitToKobo(form, instanceId)` — optional stable ID for retries. |
| `src/steps/Step3Environment.jsx` | Offline-deferred env fetch, retry button, `envFetchPending`. |
| `src/steps/Step5Review.jsx` | Queue-on-failure submit path, offline notice, button copy. |
| `src/App.jsx` | `OfflineProvider`, `envFetchPending` in initial form, queued vs. submitted success screen. |
| `src/i18n/index.jsx` | New offline/deferred strings, all 4 languages. |
| `src/index.css` | Badge/panel styles, `.env-status.warning`, `.btn-inline`. |
| `vite.config.js` | `vite-plugin-pwa` — manifest, precache, runtime caching. |
| `index.html` | `theme-color`, manifest-related meta, icon links. |
| `public/icon.svg`, `icon-maskable.svg`, `pwa-192.png`, `pwa-512.png`, `maskable-512.png`, `apple-touch-icon.png`, `favicon-32.png` | New. |

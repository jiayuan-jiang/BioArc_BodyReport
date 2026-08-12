const LUCC_CLASSES = {
  10: 'Tree Cover', 20: 'Shrubland', 30: 'Grassland', 40: 'Cropland',
  50: 'Built-up', 60: 'Bare / Sparse Vegetation', 70: 'Snow and Ice',
  80: 'Permanent Water', 90: 'Herbaceous Wetland', 95: 'Mangroves', 100: 'Moss and Lichen',
}

export async function fetchElevation(lat, lng) {
  const res = await fetch(
    `https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lng}`
  )
  if (!res.ok) throw new Error('Elevation fetch failed')
  const data = await res.json()
  return data.results?.[0]?.elevation ?? null
}

const DAILY_VARS = [
  'temperature_2m_mean', 'relative_humidity_2m_mean', 'precipitation_sum',
  'windspeed_10m_max', 'weathercode',
  'soil_temperature_0_to_7cm_mean', 'soil_moisture_0_to_7cm_mean',
].join(',')

const CURRENT_VARS = [
  'temperature_2m', 'relative_humidity_2m', 'precipitation',
  'wind_speed_10m', 'weather_code',
  'soil_temperature_0cm', 'soil_moisture_0_to_1cm',
].join(',')

function isToday(date) {
  return date === new Date().toISOString().split('T')[0]
}

async function fetchCurrentWeather(lat, lng) {
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', lat)
  url.searchParams.set('longitude', lng)
  url.searchParams.set('current', CURRENT_VARS)
  url.searchParams.set('timezone', 'auto')

  const res = await fetch(url)
  if (!res.ok) return null
  const data = await res.json()

  const c = data.current
  if (!c || c.temperature_2m == null) return null

  return {
    temperature:     c.temperature_2m        ?? null,
    humidity:        c.relative_humidity_2m  ?? null,
    precipitation:   c.precipitation         ?? null,
    windSpeed:       c.wind_speed_10m        ?? null,
    weatherCode:     c.weather_code          ?? null,
    soilTemperature: c.soil_temperature_0cm  ?? null,
    soilMoisture:    c.soil_moisture_0_to_1cm ?? null,
    source: 'current',
  }
}

async function fetchDailyWeatherFrom(base, lat, lng, date) {
  const url = new URL(base)
  url.searchParams.set('latitude', lat)
  url.searchParams.set('longitude', lng)
  url.searchParams.set('start_date', date)
  url.searchParams.set('end_date', date)
  url.searchParams.set('daily', DAILY_VARS)
  url.searchParams.set('timezone', 'auto')

  const res = await fetch(url)
  if (!res.ok) return null
  const data = await res.json()

  const d = data.daily
  if (!d || d.temperature_2m_mean?.[0] == null) return null

  return {
    temperature:     d.temperature_2m_mean?.[0]              ?? null,
    humidity:        d.relative_humidity_2m_mean?.[0]        ?? null,
    precipitation:   d.precipitation_sum?.[0]                 ?? null,
    windSpeed:       d.windspeed_10m_max?.[0]                 ?? null,
    weatherCode:     d.weathercode?.[0]                       ?? null,
    soilTemperature: d.soil_temperature_0_to_7cm_mean?.[0]    ?? null,
    soilMoisture:    d.soil_moisture_0_to_7cm_mean?.[0]       ?? null,
    source: 'daily',
  }
}

// Open-Meteo's forecast `daily` block has no daily soil-aggregate variables
// at all (confirmed directly: the response comes back with unit "undefined"
// and a null value) — only the archive endpoint computes those, and archive
// can't cover "today" due to its processing lag. Its *hourly* soil variables
// are available for today, though, so compute the daily mean ourselves from
// those instead of leaving the field permanently null on the live path.
async function fetchHourlySoilDailyAverage(lat, lng, date) {
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', lat)
  url.searchParams.set('longitude', lng)
  url.searchParams.set('start_date', date)
  url.searchParams.set('end_date', date)
  url.searchParams.set('hourly', 'soil_temperature_0cm,soil_moisture_0_to_1cm')
  url.searchParams.set('timezone', 'auto')

  const res = await fetch(url)
  if (!res.ok) return null
  const data = await res.json()
  const h = data.hourly
  if (!h) return null

  const mean = (arr, decimals) => {
    const vals = (arr ?? []).filter(v => v != null)
    if (!vals.length) return null
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length
    const factor = 10 ** decimals
    return Math.round(avg * factor) / factor
  }

  return {
    soilTemperature: mean(h.soil_temperature_0cm, 1),
    soilMoisture:    mean(h.soil_moisture_0_to_1cm, 3),
  }
}

export async function fetchWeather(lat, lng, date) {
  // "Today" is the common case (collectionDate defaults to today) and is most
  // likely a live field submission — use the real-time `current` endpoint
  // (~15 min resolution) instead of a same-day daily aggregate.
  if (isToday(date)) {
    const current = await fetchCurrentWeather(lat, lng)
    if (current) {
      // Alongside the live reading, also fetch today's daily aggregate as a
      // reference point for comparison. Best-effort: if this secondary fetch
      // fails, the *Daily fields just come back null — don't let it take down
      // the already-successful live reading.
      let daily = null
      try {
        daily = await fetchDailyWeatherFrom('https://api.open-meteo.com/v1/forecast', lat, lng, date)
      } catch { /* daily companion is a bonus, not required */ }

      let soilDaily = null
      try {
        soilDaily = await fetchHourlySoilDailyAverage(lat, lng, date)
      } catch { /* same — best-effort only */ }

      return {
        ...current,
        temperatureDaily:     daily?.temperature     ?? null,
        humidityDaily:        daily?.humidity         ?? null,
        precipitationDaily:   daily?.precipitation    ?? null,
        windSpeedDaily:       daily?.windSpeed         ?? null,
        weatherCodeDaily:     daily?.weatherCode       ?? null,
        soilTemperatureDaily: soilDaily?.soilTemperature ?? null,
        soilMoistureDaily:    soilDaily?.soilMoisture    ?? null,
      }
    }
  }

  // ERA5 reanalysis (archive) has a ~2-7 day processing lag and is the only
  // source with full historical depth + soil variables. Forecast(daily) is the
  // fallback for recent dates archive hasn't processed yet — note Open-Meteo
  // doesn't expose daily soil aggregates on the forecast endpoint, so soil
  // fields may still come back null in that specific fallback case.
  const archive = await fetchDailyWeatherFrom('https://archive-api.open-meteo.com/v1/archive', lat, lng, date)
  if (archive) return archive

  const forecast = await fetchDailyWeatherFrom('https://api.open-meteo.com/v1/forecast', lat, lng, date)
  if (forecast) return forecast

  throw new Error('No weather data')
}

export async function fetchLandCover(lat, lng) {
  // ESA WorldCover via Copernicus WCS — returns a pixel value we map to class name
  const delta = 0.0001
  const url = [
    'https://services.terrascope.be/wcs/v2',
    '?SERVICE=WCS&VERSION=2.0.1&REQUEST=GetCoverage',
    '&CoverageId=WORLDCOVER_2021_MAP',
    `&SUBSET=Lat(${(+lat - delta).toFixed(6)},${(+lat + delta).toFixed(6)})`,
    `&SUBSET=Long(${(+lng - delta).toFixed(6)},${(+lng + delta).toFixed(6)})`,
    '&FORMAT=application/json',
  ].join('')

  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error()
    const data = await res.json()
    const pixel = data?.coverages?.[0]?.values?.[0]
    return LUCC_CLASSES[pixel] ?? `Class ${pixel}`
  } catch {
    // Fallback: query OpenStreetMap Overpass for land use tag
    return await fetchLandCoverOSM(lat, lng)
  }
}

async function fetchLandCoverOSM(lat, lng) {
  const endpoint = 'https://overpass-api.de/api/interpreter'
  const query = `[out:json][timeout:10];(way[landuse](around:300,${lat},${lng});relation[landuse](around:300,${lat},${lng});way["natural"](around:300,${lat},${lng}););out tags 1;`
  if (!deadOverpassEndpoints.has(endpoint)) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(12000),
      })
      if (res.ok && (res.headers.get('content-type') || '').includes('json')) {
        const data = await res.json()
        const tags = data.elements?.[0]?.tags
        const tag = tags?.landuse || tags?.natural
        if (tag) return tag.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
      } else {
        deadOverpassEndpoints.add(endpoint)
      }
    } catch { deadOverpassEndpoints.add(endpoint) }
  }

  return fetchLandCoverNominatim(lat, lng)
}

// Runs all three environment lookups together and never throws — each
// source fails independently (Promise.allSettled), landing as a null field
// instead of blocking the other two. Shared by the live Step 3 fetch and the
// offline queue's deferred backfill so both follow identical fallback rules.
export async function fetchEnvironmentData(lat, lng, date) {
  const [elev, weather, lc, roadWater] = await Promise.allSettled([
    fetchElevation(lat, lng),
    fetchWeather(lat, lng, date),
    fetchLandCover(lat, lng),
    fetchRoadWaterDistances(lat, lng),
  ])

  const weatherSource = weather.status === 'fulfilled' ? weather.value.source : null

  const fetched = {
    elevation:       elev.status    === 'fulfilled' ? elev.value    : null,
    temperature:     weather.status === 'fulfilled' ? weather.value.temperature : null,
    humidity:        weather.status === 'fulfilled' ? weather.value.humidity : null,
    precipitation:   weather.status === 'fulfilled' ? weather.value.precipitation : null,
    windSpeed:       weather.status === 'fulfilled' ? weather.value.windSpeed : null,
    weatherCode:     weather.status === 'fulfilled' ? weather.value.weatherCode : null,
    soilTemperature: weather.status === 'fulfilled' ? weather.value.soilTemperature : null,
    soilMoisture:    weather.status === 'fulfilled' ? weather.value.soilMoisture : null,
    temperatureDaily:     weather.status === 'fulfilled' ? weather.value.temperatureDaily     ?? null : null,
    humidityDaily:        weather.status === 'fulfilled' ? weather.value.humidityDaily        ?? null : null,
    precipitationDaily:   weather.status === 'fulfilled' ? weather.value.precipitationDaily    ?? null : null,
    windSpeedDaily:       weather.status === 'fulfilled' ? weather.value.windSpeedDaily        ?? null : null,
    weatherCodeDaily:     weather.status === 'fulfilled' ? weather.value.weatherCodeDaily      ?? null : null,
    soilTemperatureDaily: weather.status === 'fulfilled' ? weather.value.soilTemperatureDaily  ?? null : null,
    soilMoistureDaily:    weather.status === 'fulfilled' ? weather.value.soilMoistureDaily     ?? null : null,
    landCover:       lc.status      === 'fulfilled' ? lc.value      : null,
    distanceToRoad:  roadWater.status === 'fulfilled' ? roadWater.value.distanceToRoad  : null,
    distanceToWater: roadWater.status === 'fulfilled' ? roadWater.value.distanceToWater : null,
  }

  return { fetched, weatherSource }
}

// Used by the offline queue (and Step 5 as a last-chance attempt before
// submitting) to fill in environmental data that was deferred because the
// device was offline at Step 3. Uses the original collectionDate stored on
// the form, not the current date, so weather still matches when the record
// was actually collected. Only overwrites fields the user hasn't manually
// entered and that are still null — never clobbers a manual reading.
export async function resolveEnvironment(form) {
  if (!form.envFetchPending || !form.latitude || !form.longitude) return form

  const { fetched, weatherSource } = await fetchEnvironmentData(form.latitude, form.longitude, form.collectionDate)
  const manualFields = new Set(form.manualEnvFields ?? [])

  const merged = { ...form }
  for (const [key, value] of Object.entries(fetched)) {
    if (!manualFields.has(key) && merged[key] == null) merged[key] = value
  }
  if (merged.weatherSource == null) merged.weatherSource = weatherSource
  if (merged.envFetchedSnapshot == null) merged.envFetchedSnapshot = { ...fetched, weatherSource }

  const stillMissing = merged.elevation == null && merged.temperature == null && merged.landCover == null
  merged.envFetchPending = stillMissing

  return merged
}

function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000
  const toRad = d => d * Math.PI / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

// Public Overpass instances to try, in order. openstreetmap.fr is listed
// first: overpass-api.de (the more commonly referenced instance) was
// confirmed unreachable at the TCP level from four independent networks
// during testing (2026-08-12) — not a per-client rate limit, since even a
// WebFetch call routed through unrelated infrastructure couldn't connect —
// while openstreetmap.fr answered normally throughout. Trying a dead host
// first wastes a full connection-timeout on every single fetch, so the
// working one goes first; overpass-api.de is kept as a fallback in case it
// recovers.
const OVERPASS_ENDPOINTS = [
  'https://overpass.openstreetmap.fr/api/interpreter',
  'https://overpass-api.de/api/interpreter',
]

// Module-level, not per-call: once an endpoint fails outright (network error
// or bad response, as opposed to a valid response with no matches), it's
// skipped for the rest of the page session instead of being retried at every
// radius tier. Without this a single dead endpoint could still draw several
// requests from one env-data fetch (up to 3 radii) — road and water distance
// used to be two separate concurrently-retried queries, doubling that; now
// merged into one combined query (below) specifically because that doubled,
// bursty request volume was very likely tripping the free public mirror's
// own rate limiting too (observed directly: CORS errors against an endpoint
// whose CORS config is otherwise correctly set up, consistent with its
// limiter dropping CORS headers on throttled responses).
const deadOverpassEndpoints = new Set()

// Fetches distance-to-road and distance-to-water in a single combined query
// (road and water elements tagged distinctly via `out tags geom`, split back
// out client-side) instead of two separate queries. Overpass's `around`
// search expands over a radius ladder (a fixed small radius misses features
// in sparse rural areas). Measures distance to the nearest returned vertex
// rather than the true perpendicular distance to the way/relation's line, an
// acceptable approximation given typical OSM vertex density. Was originally
// two independent functions, each retried by the caller concurrently — that
// doubled request volume and burst pattern is very likely what was tripping
// the free public mirror's own rate limiting (observed directly: CORS errors
// against an endpoint whose CORS config is otherwise correctly set up).
// Returns { distanceToRoad, distanceToWater }, either possibly null.
async function fetchRoadWaterDistances(lat, lng) {
  const radii = [2000, 10000, 50000]
  let distanceToRoad = null
  let distanceToWater = null

  for (const radius of radii) {
    if (distanceToRoad != null && distanceToWater != null) break
    // Named sets with a separate `out` per set, not one shared result limit —
    // roads vastly outnumber water features in urban areas, so a single
    // `out ... 60` on the combined set was silently starving water out of the
    // result entirely (confirmed directly: 60/60 returned elements were all
    // roads for a real Ann Arbor test point that does have nearby water).
    const query = `[out:json][timeout:15];` +
      `way(around:${radius},${lat},${lng})[highway]->.roads;` +
      `(` +
      `way(around:${radius},${lat},${lng})["natural"="water"];` +
      `way(around:${radius},${lat},${lng})[waterway];` +
      `relation(around:${radius},${lat},${lng})["natural"="water"];` +
      `)->.water;` +
      `.roads out tags geom 30;` +
      `.water out tags geom 30;`
    for (const endpoint of OVERPASS_ENDPOINTS) {
      if (deadOverpassEndpoints.has(endpoint)) continue
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `data=${encodeURIComponent(query)}`,
          signal: AbortSignal.timeout(15000),
        })
        if (!res.ok || !(res.headers.get('content-type') || '').includes('json')) {
          deadOverpassEndpoints.add(endpoint)
          continue
        }
        const data = await res.json()

        let minRoad = Infinity
        let minWater = Infinity
        for (const el of data.elements ?? []) {
          const tags = el.tags ?? {}
          const isRoad = !!tags.highway
          const isWater = tags.natural === 'water' || !!tags.waterway
          if (!isRoad && !isWater) continue
          const coords = el.geometry ?? el.members?.flatMap(m => m.geometry ?? []) ?? []
          for (const pt of coords) {
            if (pt?.lat == null || pt?.lon == null) continue
            const d = haversineMeters(lat, lng, pt.lat, pt.lon)
            if (isRoad && d < minRoad) minRoad = d
            if (isWater && d < minWater) minWater = d
          }
        }
        if (distanceToRoad == null && minRoad < Infinity) distanceToRoad = Math.round(minRoad)
        if (distanceToWater == null && minWater < Infinity) distanceToWater = Math.round(minWater)
        break // this endpoint answered — escalate radius (if still missing something), don't also ask the other endpoint
      } catch { deadOverpassEndpoints.add(endpoint) }
    }
  }
  return { distanceToRoad, distanceToWater }
}

async function fetchLandCoverNominatim(lat, lng) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
    { headers: { 'User-Agent': 'BioARC/1.0' } }
  )
  if (!res.ok) throw new Error('Land cover fetch failed')
  const data = await res.json()
  const cls = data.class
  const type = data.type
  if (!cls) return null
  const raw = (type && type !== cls) ? `${cls} / ${type}` : cls
  return raw.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

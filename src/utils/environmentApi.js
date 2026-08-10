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
  'temperature_2m_max', 'relative_humidity_2m_mean', 'precipitation_sum',
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
  if (!d || d.temperature_2m_max?.[0] == null) return null

  return {
    temperature:     d.temperature_2m_max?.[0]              ?? null,
    humidity:        d.relative_humidity_2m_mean?.[0]        ?? null,
    precipitation:   d.precipitation_sum?.[0]                 ?? null,
    windSpeed:       d.windspeed_10m_max?.[0]                 ?? null,
    weatherCode:     d.weathercode?.[0]                       ?? null,
    soilTemperature: d.soil_temperature_0_to_7cm_mean?.[0]    ?? null,
    soilMoisture:    d.soil_moisture_0_to_7cm_mean?.[0]       ?? null,
    source: 'daily',
  }
}

export async function fetchWeather(lat, lng, date) {
  // "Today" is the common case (collectionDate defaults to today) and is most
  // likely a live field submission — use the real-time `current` endpoint
  // (~15 min resolution) instead of a same-day daily aggregate.
  if (isToday(date)) {
    const current = await fetchCurrentWeather(lat, lng)
    if (current) return current
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
  const query = `[out:json][timeout:10];(way[landuse](around:300,${lat},${lng});relation[landuse](around:300,${lat},${lng});way["natural"](around:300,${lat},${lng}););out tags 1;`
  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
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
    }
  } catch { /* fall through to Nominatim */ }

  return fetchLandCoverNominatim(lat, lng)
}

// Runs all three environment lookups together and never throws — each
// source fails independently (Promise.allSettled), landing as a null field
// instead of blocking the other two. Shared by the live Step 3 fetch and the
// offline queue's deferred backfill so both follow identical fallback rules.
export async function fetchEnvironmentData(lat, lng, date) {
  const [elev, weather, lc] = await Promise.allSettled([
    fetchElevation(lat, lng),
    fetchWeather(lat, lng, date),
    fetchLandCover(lat, lng),
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
    landCover:       lc.status      === 'fulfilled' ? lc.value      : null,
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

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

export async function fetchWeather(lat, lng, date) {
  const url = new URL('https://archive-api.open-meteo.com/v1/archive')
  url.searchParams.set('latitude', lat)
  url.searchParams.set('longitude', lng)
  url.searchParams.set('start_date', date)
  url.searchParams.set('end_date', date)
  url.searchParams.set('daily', 'temperature_2m_max,precipitation_sum,windspeed_10m_max,weathercode')
  url.searchParams.set('timezone', 'auto')

  const res = await fetch(url)
  if (!res.ok) throw new Error('Weather fetch failed')
  const data = await res.json()

  const d = data.daily
  if (!d) throw new Error('No weather data')

  return {
    temperature:   d.temperature_2m_max?.[0]   ?? null,
    precipitation: d.precipitation_sum?.[0]     ?? null,
    windSpeed:     d.windspeed_10m_max?.[0]     ?? null,
    weatherCode:   d.weathercode?.[0]           ?? null,
  }
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

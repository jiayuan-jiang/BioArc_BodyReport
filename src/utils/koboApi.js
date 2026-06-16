const BASE_URL  = import.meta.env.VITE_KOBO_BASE_URL
const API_KEY   = import.meta.env.VITE_KOBO_API_KEY
const ASSET_UID = import.meta.env.VITE_KOBO_ASSET_UID

export async function submitToKobo(form) {
  const payload = {
    species:              form.species,
    preservation_method:  form.preservation,
    location_latitude:    form.latitude,
    location_longitude:   form.longitude,
    location_altitude:    form.altitude || null,
    location_accuracy:    form.accuracy || null,
    locality:             form.locality || null,
    dem_elevation_m:      form.elevation,
    land_cover_lucc:      form.landCover,
    weather_temperature:  form.temperature,
    weather_precipitation:form.precipitation,
    weather_wind_speed:   form.windSpeed,
    weather_code:         form.weatherCode,
    collection_date:      form.collectionDate,
    collector_name:       form.collectorName,
    institution:          form.institution || null,
    project_name:         form.projectName || null,
    habitat_description:  form.habitatDescription || null,
    additional_notes:     form.notes || null,
  }

  const res = await fetch(
    `${BASE_URL}/api/v2/assets/${ASSET_UID}/submissions/`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Token ${API_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify(payload),
    }
  )

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`KoboToolbox error ${res.status}: ${body}`)
  }

  const data = await res.json()
  return data?.id ?? data?.submission_id ?? 'submitted'
}

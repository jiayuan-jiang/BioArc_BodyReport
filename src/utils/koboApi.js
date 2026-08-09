const ASSET_UID = import.meta.env.VITE_KOBO_ASSET_UID

const PRESERVATION_MAP = {
  frozen:  'freeze',
  alcohol: 'alcohol',
  dried:   'dry',
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&apos;')
}

function field(name, value) {
  if (value === null || value === undefined || value === '') return ''
  return `<${name}>${escapeXml(value)}</${name}>`
}

function buildGeopoint(form) {
  if (!form.latitude || !form.longitude) return ''
  const parts = [form.latitude, form.longitude]
  if (form.altitude) {
    parts.push(form.altitude)
    if (form.accuracy) parts.push(form.accuracy)
  }
  return parts.join(' ')
}

function buildSubmissionXml(form, instanceId) {
  const photo = form.photos?.[0]
  const manualFields = (form.manualEnvFields ?? []).join(',')
  const fetchedSnapshot = form.envFetchedSnapshot ? JSON.stringify(form.envFetchedSnapshot) : null

  return `<?xml version='1.0' ?>
<data id="${ASSET_UID}">
  ${field('record_number', form.recordNumber)}
  ${field('species', form.species)}
  ${field('species_scientific', form.speciesSci)}
  ${field('species_common', form.speciesCommon)}
  ${field('species_taxon_id', form.taxonId)}
  ${field('preservation_method', PRESERVATION_MAP[form.preservation] ?? form.preservation)}
  ${photo ? `<survey_image>${escapeXml(photo.name)}</survey_image>` : ''}
  ${field('location', buildGeopoint(form))}
  ${field('dem_elevation_m', form.elevation)}
  ${field('land_cover_lucc', form.landCover)}
  ${field('weather_temperature', form.temperature)}
  ${field('weather_humidity', form.humidity)}
  ${field('weather_precipitation', form.precipitation)}
  ${field('weather_wind_speed', form.windSpeed)}
  ${field('weather_code', form.weatherCode)}
  ${field('soil_temperature', form.soilTemperature)}
  ${field('soil_moisture', form.soilMoisture)}
  ${field('env_manual_fields', manualFields)}
  ${field('env_fetched_snapshot', fetchedSnapshot)}
  ${field('collection_date', form.collectionDate)}
  ${field('collector_name', form.collectorName)}
  ${field('institution', form.institution)}
  ${field('project_name', form.projectName)}
  ${field('habitat_description', form.habitatDescription)}
  ${field('locality', form.locality)}
  ${field('notes', form.notes)}
  ${field('submitted_at', new Date().toISOString())}
  <meta>
    <instanceID>uuid:${instanceId}</instanceID>
  </meta>
</data>`
}

export async function submitToKobo(form) {
  const instanceId = crypto.randomUUID()
  const xml = buildSubmissionXml(form, instanceId)

  const body = new FormData()
  body.append(
    'xml_submission_file',
    new Blob([xml], { type: 'text/xml' }),
    'submission.xml'
  )

  const photo = form.photos?.[0]
  if (photo) {
    body.append(photo.name, photo.file, photo.name)
  }

  const res = await fetch('/api/kobo-submit', {
    method: 'POST',
    body,
  })

  if (!res.ok) {
    const responseText = await res.text()
    throw new Error(`KoboToolbox error ${res.status}: ${responseText}`)
  }

  return instanceId
}

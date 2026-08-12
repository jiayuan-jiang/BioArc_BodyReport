import { useState } from 'react'
import { submitToKobo } from '../utils/koboApi'
import { resolveEnvironment } from '../utils/environmentApi'
import { enqueueSubmission } from '../offline/queue'
import { useOffline } from '../offline/OfflineContext'
import { useT } from '../i18n'

const WMO_CODES = {
  0: 'Clear Sky', 1: 'Mainly Clear', 2: 'Partly Cloudy', 3: 'Overcast',
  45: 'Fog', 48: 'Icy Fog', 51: 'Light Drizzle', 53: 'Drizzle', 55: 'Heavy Drizzle',
  61: 'Light Rain', 63: 'Rain', 65: 'Heavy Rain',
  71: 'Light Snow', 73: 'Snow', 75: 'Heavy Snow',
  80: 'Light Showers', 81: 'Showers', 82: 'Heavy Showers',
  95: 'Thunderstorm', 99: 'Severe Thunderstorm',
}

function Row({ label, value }) {
  if (!value && value !== 0) return null
  return (
    <div className="review-row">
      <span className="review-key">{label}</span>
      <span className="review-val">{value}</span>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="review-section">
      <div className="review-section-title">{title}</div>
      {children}
    </div>
  )
}

export default function Step5Review({ form, onBack, onSuccess }) {
  const { t } = useT()
  const { online, refreshQueue } = useOffline()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState(null)

  const queueLocally = async () => {
    const id = await enqueueSubmission(form)
    await refreshQueue()
    onSuccess(id, { queued: true })
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)

    if (!online) {
      try {
        await queueLocally()
      } catch (e) {
        setError(e.message || t('s5_err_submit'))
        setSubmitting(false)
      }
      return
    }

    try {
      // A last-chance attempt to fill in environment data that was deferred
      // at Step 3 (e.g. connectivity dropped mid-session then came back) —
      // still keyed off the original collectionDate, not today.
      const submitForm = form.envFetchPending ? await resolveEnvironment(form) : form
      const id = await submitToKobo(submitForm)
      onSuccess(id, { queued: false })
    } catch (e) {
      // fetch() throws a TypeError specifically on a real connectivity
      // failure (vs. a Kobo 4xx/5xx, which koboApi.js throws as a plain
      // Error) — that's what tells us this is a "went offline mid-submit"
      // case rather than a real rejection the user needs to see and fix now.
      const wentOffline = !navigator.onLine || e instanceof TypeError
      if (wentOffline) {
        try {
          await queueLocally()
          return
        } catch { /* fall through to the error message below */ }
      }
      setError(e.message || t('s5_err_submit'))
      setSubmitting(false)
    }
  }

  const preservationLabel = {
    frozen:  t('s5_pres_frozen'),
    alcohol: t('s5_pres_alcohol'),
    dried:   t('s5_pres_dried'),
  }[form.preservation] || form.preservation

  const weatherLabel = form.weatherCode != null
    ? (WMO_CODES[form.weatherCode] ?? `Code ${form.weatherCode}`)
    : null
  const weatherDailyLabel = form.weatherCodeDaily != null
    ? (WMO_CODES[form.weatherCodeDaily] ?? `Code ${form.weatherCodeDaily}`)
    : null
  const landCoverSourceLabel = {
    esa_worldcover: t('s3_sub_lc'),
    overpass:        t('s3_sub_lc_overpass'),
    nominatim:       t('s3_sub_lc_nominatim'),
  }[form.landCoverSource]

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
          </svg>
        </div>
        <div className="card-header-text">
          <h2>{t('s5_title')}</h2>
          <p>{t('s5_subtitle')}</p>
        </div>
      </div>

      <div className="card-body">
        {form.photos.length > 0 && (
          <Section title={t('s5_sec_photos')}>
            <div className="review-photos">
              {form.photos.map((p, i) => (
                <img key={i} src={p.url} alt={p.name} className="review-photo" />
              ))}
            </div>
          </Section>
        )}

        <Section title={t('s5_sec_specimen')}>
          <Row
            label={t('s5_row_species')}
            value={
              form.speciesCommon && form.speciesSci && form.speciesCommon !== form.speciesSci
                ? `${form.speciesCommon} (${form.speciesSci})`
                : form.speciesDisplay
            }
          />
          <Row label={t('s5_row_preservation')} value={preservationLabel} />
        </Section>

        <Section title={t('s5_sec_location')}>
          <Row label={t('s5_row_lat')}      value={form.latitude} />
          <Row label={t('s5_row_lng')}      value={form.longitude} />
          <Row label={t('s5_row_alt')}      value={form.altitude ? `${form.altitude} m` : null} />
          <Row label={t('s5_row_acc')}      value={form.accuracy ? `${form.accuracy} m` : null} />
          <Row label={t('s5_row_locality')} value={form.locality} />
        </Section>

        <Section title={t('s5_sec_env')}>
          <Row label={t('s5_row_elevation')}    value={form.elevation    != null ? `${form.elevation} m`       : null} />
          <Row label={t('s5_row_landcover')}    value={form.landCover} />
          <Row label={t('s5_row_landcover_source')} value={landCoverSourceLabel} />
          <Row label={t('s5_row_temperature')}  value={form.temperature  != null ? `${form.temperature} °C`    : null} />
          <Row label={t('s5_row_temperature_daily')}  value={form.temperatureDaily  != null ? `${form.temperatureDaily} °C`    : null} />
          <Row label={t('s5_row_humidity')}     value={form.humidity     != null ? `${form.humidity}%`         : null} />
          <Row label={t('s5_row_humidity_daily')}     value={form.humidityDaily     != null ? `${form.humidityDaily}%`         : null} />
          <Row label={t('s5_row_precipitation')}value={form.precipitation!= null ? `${form.precipitation} mm`  : null} />
          <Row label={t('s5_row_precipitation_daily')}value={form.precipitationDaily!= null ? `${form.precipitationDaily} mm`  : null} />
          <Row label={t('s5_row_wind')}         value={form.windSpeed    != null ? `${form.windSpeed} km/h`    : null} />
          <Row label={t('s5_row_wind_daily')}         value={form.windSpeedDaily    != null ? `${form.windSpeedDaily} km/h`    : null} />
          <Row label={t('s5_row_weather')}      value={weatherLabel} />
          <Row label={t('s5_row_weather_daily')}      value={weatherDailyLabel} />
          <Row label={t('s5_row_soil_temp')}     value={form.soilTemperature != null ? `${form.soilTemperature} °C`     : null} />
          <Row label={t('s5_row_soil_temp_daily')}     value={form.soilTemperatureDaily != null ? `${form.soilTemperatureDaily} °C`     : null} />
          <Row label={t('s5_row_soil_moisture')} value={form.soilMoisture    != null ? `${form.soilMoisture} m³/m³`     : null} />
          <Row label={t('s5_row_soil_moisture_daily')} value={form.soilMoistureDaily    != null ? `${form.soilMoistureDaily} m³/m³`     : null} />
          <Row label={t('s5_row_distance_road')}  value={form.distanceToRoad  != null ? `${form.distanceToRoad} m`  : null} />
          <Row label={t('s5_row_distance_water')} value={form.distanceToWater != null ? `${form.distanceToWater} m` : null} />
        </Section>

        <Section title={t('s5_sec_coll')}>
          <Row label={t('s5_row_date')}        value={form.collectionDate} />
          <Row label={t('s5_row_record_number')} value={form.recordNumber} />
          <Row label={t('s5_row_collector')}   value={form.collectorName} />
          <Row label={t('s5_row_institution')} value={form.institution} />
          <Row label={t('s5_row_project')}     value={form.projectName} />
          <Row label={t('s5_row_habitat')}     value={form.habitatDescription} />
          <Row label={t('s5_row_notes')}       value={form.notes} />
        </Section>

        {!online && !error && (
          <div className="env-status warning">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
            </svg>
            {t('s5_offline_notice')}
          </div>
        )}

        {error && (
          <div className="env-status error">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
            </svg>
            {error}
          </div>
        )}
      </div>

      <div className="card-footer">
        <button className="btn btn-secondary" onClick={onBack} disabled={submitting}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
          {t('btn_back')}
        </button>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
          {submitting
            ? <><div className="spinner" /> {online ? t('s5_submitting') : t('s5_saving')}</>
            : <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 2L11 13"/><path d="M22 2L15 22l-4-9-9-4 20-7z"/>
                </svg>
                {online ? t('s5_submit') : t('s5_save_offline')}
              </>
          }
        </button>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { fetchElevation, fetchWeather, fetchLandCover } from '../utils/environmentApi'
import { useT } from '../i18n'

const WMO_CODES = {
  0: 'Clear Sky', 1: 'Mainly Clear', 2: 'Partly Cloudy', 3: 'Overcast',
  45: 'Fog', 48: 'Icy Fog', 51: 'Light Drizzle', 53: 'Drizzle', 55: 'Heavy Drizzle',
  61: 'Light Rain', 63: 'Rain', 65: 'Heavy Rain',
  71: 'Light Snow', 73: 'Snow', 75: 'Heavy Snow',
  80: 'Light Showers', 81: 'Showers', 82: 'Heavy Showers',
  95: 'Thunderstorm', 99: 'Severe Thunderstorm',
}

function EnvItem({ label, value, displayValue, unit, sub, loading, manual, manualLabel, type = 'number', options, onEdit }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const startEdit = () => {
    setDraft(value != null ? String(value) : '')
    setEditing(true)
  }

  const commit = (raw) => {
    if (type === 'number') {
      onEdit(raw === '' ? null : (Number.isNaN(parseFloat(raw)) ? null : parseFloat(raw)))
    } else if (type === 'select') {
      onEdit(raw === '' ? null : parseInt(raw, 10))
    } else {
      onEdit(raw === '' ? null : raw)
    }
    setEditing(false)
  }

  return (
    <div className="env-item">
      <div className="env-item-top">
        <span className="env-item-label">{label}</span>
        {!loading && !editing && (
          <button type="button" className="env-item-edit-btn" onClick={startEdit} aria-label="Edit">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
            </svg>
          </button>
        )}
      </div>
      {loading ? (
        <div className="skeleton" style={{ width: '70%', marginTop: 4 }} />
      ) : editing ? (
        <div className="env-item-value-row">
          {type === 'select' ? (
            <select
              className="env-item-input" autoFocus value={draft}
              onChange={e => commit(e.target.value)}
              onBlur={e => commit(e.target.value)}
            >
              <option value="">—</option>
              {options.map(([code, optLabel]) => (
                <option key={code} value={code}>{optLabel}</option>
              ))}
            </select>
          ) : (
            <input
              className="env-item-input" autoFocus
              type={type === 'number' ? 'number' : 'text'}
              step={type === 'number' ? 'any' : undefined}
              placeholder="—"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onBlur={e => commit(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') commit(e.target.value)
                if (e.key === 'Escape') setEditing(false)
              }}
            />
          )}
          {unit && <span className="env-item-unit">{unit}</span>}
        </div>
      ) : (
        <span className="env-item-value">{displayValue ?? '—'}</span>
      )}
      {sub && !loading && <span className={`env-item-sub ${manual ? 'manual' : ''}`}>{manual ? manualLabel : sub}</span>}
    </div>
  )
}

export default function Step3Environment({ form, update, onNext, onBack }) {
  const { t } = useT()
  const [status, setStatus] = useState('idle')
  const [errMsg, setErrMsg] = useState('')
  const manualFields = new Set(form.manualEnvFields)

  const hasLocation = form.latitude && form.longitude

  useEffect(() => {
    if (!hasLocation) return
    if (form.elevation !== null) return

    const fetch = async () => {
      setStatus('loading')
      try {
        const [elev, weather, lc] = await Promise.allSettled([
          fetchElevation(form.latitude, form.longitude),
          fetchWeather(form.latitude, form.longitude, form.collectionDate),
          fetchLandCover(form.latitude, form.longitude),
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

        // Snapshot the as-fetched values before any manual edits can happen —
        // kept in the submission even if the fields below get overridden, so
        // the model's original output is never silently lost.
        update({ ...fetched, weatherSource, envFetchedSnapshot: { ...fetched, weatherSource } })
        setStatus('done')
      } catch {
        setStatus('error')
        setErrMsg(t('s3_error'))
      }
    }

    fetch()
  }, [])

  const editField = (field) => (newValue) => {
    const next = new Set(form.manualEnvFields)
    next.add(field)
    update({ [field]: newValue, manualEnvFields: [...next] })
  }

  const loading = status === 'loading'
  const wmoOptions = Object.entries(WMO_CODES)
  const weatherLabel = form.weatherCode != null
    ? (WMO_CODES[form.weatherCode] ?? `Code ${form.weatherCode}`)
    : null

  // Sub-labels depend on which endpoint actually served the weather values —
  // "current" is a ~15min live reading, "daily" is a day aggregate. Wrong
  // labels here would misrepresent the data's actual resolution to the user.
  const isLive = form.weatherSource === 'current'
  const subTemp     = `${isLive ? t('s3_sub_live') : t('s3_sub_temp_daily')} · ${form.collectionDate}`
  const subHumidity = isLive ? t('s3_sub_live') : t('s3_sub_humidity')
  const subPrecip   = isLive ? t('s3_sub_live') : t('s3_sub_precip')
  const subWind     = isLive ? t('s3_sub_live') : t('s3_sub_wind')
  const subSoil     = isLive ? t('s3_sub_soil_live') : t('s3_sub_soil_temp')
  const subSoilMoist= isLive ? t('s3_sub_soil_live') : t('s3_sub_soil_moisture')

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z"/>
          </svg>
        </div>
        <div className="card-header-text">
          <h2>{t('s3_title')}</h2>
          <p>{t('s3_subtitle')}</p>
        </div>
      </div>

      <div className="card-body">
        {!hasLocation && (
          <div className="env-status error">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
            </svg>
            {t('s3_no_location')}
          </div>
        )}

        {hasLocation && loading && (
          <div className="env-status loading">
            <div className="spinner dark" />
            {t('s3_loading')}
          </div>
        )}

        {hasLocation && status === 'error' && (
          <div className="env-status error">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
            </svg>
            {t('s3_error')} {t('s3_error_cont')}
          </div>
        )}

        {hasLocation && status === 'done' && (
          <div className="env-status success">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
            {t('s3_success')}
          </div>
        )}

        {hasLocation && status !== 'idle' && (
          <div className="env-editable-hint">{t('s3_editable_hint')}</div>
        )}

        <div className="env-grid">
          <EnvItem
            label={t('s3_elevation')} unit="m" sub={t('s3_sub_elev')} loading={loading}
            value={form.elevation} displayValue={form.elevation != null ? `${form.elevation} m` : null}
            manual={manualFields.has('elevation')} manualLabel={t('s3_manual_entry')}
            onEdit={editField('elevation')}
          />
          <EnvItem
            label={t('s3_landcover')} sub={t('s3_sub_lc')} loading={loading} type="text"
            value={form.landCover} displayValue={form.landCover}
            manual={manualFields.has('landCover')} manualLabel={t('s3_manual_entry')}
            onEdit={editField('landCover')}
          />
          <EnvItem
            label={t('s3_temperature')} unit="°C" sub={subTemp} loading={loading}
            value={form.temperature} displayValue={form.temperature != null ? `${form.temperature} °C` : null}
            manual={manualFields.has('temperature')} manualLabel={t('s3_manual_entry')}
            onEdit={editField('temperature')}
          />
          <EnvItem
            label={t('s3_humidity')} unit="%" sub={subHumidity} loading={loading}
            value={form.humidity} displayValue={form.humidity != null ? `${form.humidity}%` : null}
            manual={manualFields.has('humidity')} manualLabel={t('s3_manual_entry')}
            onEdit={editField('humidity')}
          />
          <EnvItem
            label={t('s3_precipitation')} unit="mm" sub={subPrecip} loading={loading}
            value={form.precipitation} displayValue={form.precipitation != null ? `${form.precipitation} mm` : null}
            manual={manualFields.has('precipitation')} manualLabel={t('s3_manual_entry')}
            onEdit={editField('precipitation')}
          />
          <EnvItem
            label={t('s3_wind')} unit="km/h" sub={subWind} loading={loading}
            value={form.windSpeed} displayValue={form.windSpeed != null ? `${form.windSpeed} km/h` : null}
            manual={manualFields.has('windSpeed')} manualLabel={t('s3_manual_entry')}
            onEdit={editField('windSpeed')}
          />
          <EnvItem
            label={t('s3_weather')} sub={t('s3_sub_wmo')} loading={loading} type="select" options={wmoOptions}
            value={form.weatherCode} displayValue={weatherLabel}
            manual={manualFields.has('weatherCode')} manualLabel={t('s3_manual_entry')}
            onEdit={editField('weatherCode')}
          />
          <EnvItem
            label={t('s3_soil_temp')} unit="°C" sub={subSoil} loading={loading}
            value={form.soilTemperature} displayValue={form.soilTemperature != null ? `${form.soilTemperature} °C` : null}
            manual={manualFields.has('soilTemperature')} manualLabel={t('s3_manual_entry')}
            onEdit={editField('soilTemperature')}
          />
          <EnvItem
            label={t('s3_soil_moisture')} unit="m³/m³" sub={subSoilMoist} loading={loading}
            value={form.soilMoisture} displayValue={form.soilMoisture != null ? `${form.soilMoisture} m³/m³` : null}
            manual={manualFields.has('soilMoisture')} manualLabel={t('s3_manual_entry')}
            onEdit={editField('soilMoisture')}
          />
        </div>

        <div className="env-sources">
          <div className="env-sources-label">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><path d="M12 16v-4m0-4h.01"/>
            </svg>
            {t('s3_sources_label')}
          </div>
          <ol className="env-sources-list">
            <li>
              Open-Elevation. <em>SRTM digital elevation data.</em>{' '}
              <a href="https://www.open-elevation.com/" target="_blank" rel="noopener noreferrer">open-elevation.com</a>
            </li>
            <li>
              Open-Meteo. <em>ERA5 / ERA5-Land reanalysis and ICON/GFS forecast models.</em>{' '}
              <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">open-meteo.com</a>
            </li>
            <li>
              ESA WorldCover v200 (2021). <em>10m global land cover classification.</em>{' '}
              <a href="https://esa-worldcover.org/" target="_blank" rel="noopener noreferrer">esa-worldcover.org</a>
            </li>
          </ol>
        </div>
      </div>

      <div className="card-footer">
        <button className="btn btn-secondary" onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
          {t('btn_back')}
        </button>
        <button className="btn btn-primary" onClick={onNext} disabled={loading}>
          {loading ? <><div className="spinner" /> {t('s3_fetching')}</> : (
            <>{t('btn_next')} <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg></>
          )}
        </button>
      </div>
    </div>
  )
}

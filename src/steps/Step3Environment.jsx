import { useEffect, useState } from 'react'
import { fetchEnvironmentData } from '../utils/environmentApi'
import { useT } from '../i18n'
import { useOffline } from '../offline/OfflineContext'

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
  const { online } = useOffline()
  const [status, setStatus] = useState('idle')
  const manualFields = new Set(form.manualEnvFields)

  const hasLocation = form.latitude && form.longitude

  const runFetch = async () => {
    if (!navigator.onLine) {
      setStatus('deferred')
      update({ envFetchPending: true })
      return
    }

    setStatus('loading')
    const { fetched, weatherSource } = await fetchEnvironmentData(form.latitude, form.longitude, form.collectionDate)

    // Only elevation/temperature/landCover decide "total failure" — humidity,
    // wind etc. all come from the same weather call, so they'd fail together
    // anyway. A total failure (most likely: no connectivity at all, even
    // though navigator.onLine said otherwise) gets deferred to the offline
    // queue instead of silently submitting with every env field blank.
    const totalFailure = fetched.elevation == null && fetched.temperature == null && fetched.landCover == null

    // A refetch (e.g. after correcting GPS back in Step 2) should update the
    // auto-fetched fields without clobbering a researcher's own manually
    // entered reading — the snapshot below still keeps the raw fetched value
    // either way, so nothing is lost, but the displayed/stored field respects
    // the manual override.
    const manualSet = new Set(form.manualEnvFields)
    const merged = { ...fetched }
    for (const key of Object.keys(merged)) {
      if (manualSet.has(key)) merged[key] = form[key]
    }

    // Snapshot the as-fetched values before any manual edits can happen —
    // kept in the submission even if the fields below get overridden, so
    // the model's original output is never silently lost.
    update({ ...merged, weatherSource, envFetchedSnapshot: { ...fetched, weatherSource }, envFetchPending: totalFailure })
    setStatus(totalFailure ? 'deferred' : 'done')
  }

  useEffect(() => {
    if (!hasLocation) return
    if (form.elevation !== null) return
    if (form.envFetchPending) { setStatus('deferred'); return }
    runFetch()
  }, [])

  const editField = (field) => (newValue) => {
    const next = new Set(form.manualEnvFields)
    next.add(field)
    const patch = { [field]: newValue, manualEnvFields: [...next] }

    // If the researcher manually fills in the core fields by hand while
    // offline, there's nothing left to backfill later — clear the pending
    // flag so the sync queue doesn't waste a retry re-fetching them.
    if (form.envFetchPending) {
      const coreFields = { elevation: form.elevation, temperature: form.temperature, landCover: form.landCover, ...patch }
      const stillMissing = coreFields.elevation == null && coreFields.temperature == null && coreFields.landCover == null
      patch.envFetchPending = stillMissing
    }

    update(patch)
  }

  const loading = status === 'loading'
  const wmoOptions = Object.entries(WMO_CODES)
  const weatherLabel = form.weatherCode != null
    ? (WMO_CODES[form.weatherCode] ?? `Code ${form.weatherCode}`)
    : null
  const weatherDailyLabel = form.weatherCodeDaily != null
    ? (WMO_CODES[form.weatherCodeDaily] ?? `Code ${form.weatherCodeDaily}`)
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
        {hasLocation && status !== 'idle' && (
          <button
            type="button"
            className="card-header-refetch-btn"
            onClick={runFetch}
            disabled={loading}
            title={t('s3_refetch')}
            aria-label={t('s3_refetch')}
          >
            <svg className={loading ? 'spinning' : ''} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/>
            </svg>
          </button>
        )}
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

        {hasLocation && status === 'deferred' && (
          <div className="env-status warning">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
            </svg>
            <span>{online ? t('s3_deferred_online') : t('s3_deferred_offline')}</span>
            <button type="button" className="btn-inline" onClick={runFetch}>{t('s3_retry')}</button>
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
          {isLive && (
            <EnvItem
              label={t('s3_temperature_daily')} unit="°C" sub={t('s3_sub_temp_daily')} loading={loading}
              value={form.temperatureDaily} displayValue={form.temperatureDaily != null ? `${form.temperatureDaily} °C` : null}
              manual={manualFields.has('temperatureDaily')} manualLabel={t('s3_manual_entry')}
              onEdit={editField('temperatureDaily')}
            />
          )}
          <EnvItem
            label={t('s3_humidity')} unit="%" sub={subHumidity} loading={loading}
            value={form.humidity} displayValue={form.humidity != null ? `${form.humidity}%` : null}
            manual={manualFields.has('humidity')} manualLabel={t('s3_manual_entry')}
            onEdit={editField('humidity')}
          />
          {isLive && (
            <EnvItem
              label={t('s3_humidity_daily')} unit="%" sub={t('s3_sub_humidity')} loading={loading}
              value={form.humidityDaily} displayValue={form.humidityDaily != null ? `${form.humidityDaily}%` : null}
              manual={manualFields.has('humidityDaily')} manualLabel={t('s3_manual_entry')}
              onEdit={editField('humidityDaily')}
            />
          )}
          <EnvItem
            label={t('s3_precipitation')} unit="mm" sub={subPrecip} loading={loading}
            value={form.precipitation} displayValue={form.precipitation != null ? `${form.precipitation} mm` : null}
            manual={manualFields.has('precipitation')} manualLabel={t('s3_manual_entry')}
            onEdit={editField('precipitation')}
          />
          {isLive && (
            <EnvItem
              label={t('s3_precipitation_daily')} unit="mm" sub={t('s3_sub_precip')} loading={loading}
              value={form.precipitationDaily} displayValue={form.precipitationDaily != null ? `${form.precipitationDaily} mm` : null}
              manual={manualFields.has('precipitationDaily')} manualLabel={t('s3_manual_entry')}
              onEdit={editField('precipitationDaily')}
            />
          )}
          <EnvItem
            label={t('s3_wind')} unit="km/h" sub={subWind} loading={loading}
            value={form.windSpeed} displayValue={form.windSpeed != null ? `${form.windSpeed} km/h` : null}
            manual={manualFields.has('windSpeed')} manualLabel={t('s3_manual_entry')}
            onEdit={editField('windSpeed')}
          />
          {isLive && (
            <EnvItem
              label={t('s3_wind_daily')} unit="km/h" sub={t('s3_sub_wind')} loading={loading}
              value={form.windSpeedDaily} displayValue={form.windSpeedDaily != null ? `${form.windSpeedDaily} km/h` : null}
              manual={manualFields.has('windSpeedDaily')} manualLabel={t('s3_manual_entry')}
              onEdit={editField('windSpeedDaily')}
            />
          )}
          <EnvItem
            label={t('s3_weather')} sub={t('s3_sub_wmo')} loading={loading} type="select" options={wmoOptions}
            value={form.weatherCode} displayValue={weatherLabel}
            manual={manualFields.has('weatherCode')} manualLabel={t('s3_manual_entry')}
            onEdit={editField('weatherCode')}
          />
          {isLive && (
            <EnvItem
              label={t('s3_weather_daily')} sub={t('s3_sub_wmo')} loading={loading} type="select" options={wmoOptions}
              value={form.weatherCodeDaily} displayValue={weatherDailyLabel}
              manual={manualFields.has('weatherCodeDaily')} manualLabel={t('s3_manual_entry')}
              onEdit={editField('weatherCodeDaily')}
            />
          )}
          <EnvItem
            label={t('s3_soil_temp')} unit="°C" sub={subSoil} loading={loading}
            value={form.soilTemperature} displayValue={form.soilTemperature != null ? `${form.soilTemperature} °C` : null}
            manual={manualFields.has('soilTemperature')} manualLabel={t('s3_manual_entry')}
            onEdit={editField('soilTemperature')}
          />
          {isLive && (
            <EnvItem
              label={t('s3_soil_temp_daily')} unit="°C" sub={t('s3_sub_soil_temp')} loading={loading}
              value={form.soilTemperatureDaily} displayValue={form.soilTemperatureDaily != null ? `${form.soilTemperatureDaily} °C` : null}
              manual={manualFields.has('soilTemperatureDaily')} manualLabel={t('s3_manual_entry')}
              onEdit={editField('soilTemperatureDaily')}
            />
          )}
          <EnvItem
            label={t('s3_soil_moisture')} unit="m³/m³" sub={subSoilMoist} loading={loading}
            value={form.soilMoisture} displayValue={form.soilMoisture != null ? `${form.soilMoisture} m³/m³` : null}
            manual={manualFields.has('soilMoisture')} manualLabel={t('s3_manual_entry')}
            onEdit={editField('soilMoisture')}
          />
          {isLive && (
            <EnvItem
              label={t('s3_soil_moisture_daily')} unit="m³/m³" sub={t('s3_sub_soil_moisture')} loading={loading}
              value={form.soilMoistureDaily} displayValue={form.soilMoistureDaily != null ? `${form.soilMoistureDaily} m³/m³` : null}
              manual={manualFields.has('soilMoistureDaily')} manualLabel={t('s3_manual_entry')}
              onEdit={editField('soilMoistureDaily')}
            />
          )}
          <EnvItem
            label={t('s3_distance_road')} unit="m" sub={t('s3_sub_distance_road')} loading={loading}
            value={form.distanceToRoad} displayValue={form.distanceToRoad != null ? `${form.distanceToRoad} m` : null}
            manual={manualFields.has('distanceToRoad')} manualLabel={t('s3_manual_entry')}
            onEdit={editField('distanceToRoad')}
          />
          <EnvItem
            label={t('s3_distance_water')} unit="m" sub={t('s3_sub_distance_water')} loading={loading}
            value={form.distanceToWater} displayValue={form.distanceToWater != null ? `${form.distanceToWater} m` : null}
            manual={manualFields.has('distanceToWater')} manualLabel={t('s3_manual_entry')}
            onEdit={editField('distanceToWater')}
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
            <li>
              OpenStreetMap via Overpass API. <em>Nearest road and water body distance, and land cover fallback if ESA WorldCover is unavailable.</em>{' '}
              <a href="https://overpass-api.de/" target="_blank" rel="noopener noreferrer">overpass-api.de</a>
            </li>
            <li>
              OpenStreetMap via Nominatim. <em>Land cover fallback if both ESA WorldCover and Overpass are unavailable.</em>{' '}
              <a href="https://nominatim.org/" target="_blank" rel="noopener noreferrer">nominatim.org</a>
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

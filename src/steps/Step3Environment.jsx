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

function EnvItem({ label, value, sub, loading }) {
  return (
    <div className="env-item">
      <span className="env-item-label">{label}</span>
      {loading
        ? <div className="skeleton" style={{ width: '70%', marginTop: 4 }} />
        : <span className="env-item-value">{value ?? '—'}</span>
      }
      {sub && !loading && <span className="env-item-sub">{sub}</span>}
    </div>
  )
}

export default function Step3Environment({ form, update, onNext, onBack }) {
  const { t } = useT()
  const [status, setStatus] = useState('idle')
  const [errMsg, setErrMsg] = useState('')

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

        update({
          elevation:     elev.status    === 'fulfilled' ? elev.value    : null,
          temperature:   weather.status === 'fulfilled' ? weather.value.temperature : null,
          precipitation: weather.status === 'fulfilled' ? weather.value.precipitation : null,
          windSpeed:     weather.status === 'fulfilled' ? weather.value.windSpeed : null,
          weatherCode:   weather.status === 'fulfilled' ? weather.value.weatherCode : null,
          landCover:     lc.status      === 'fulfilled' ? lc.value      : null,
        })
        setStatus('done')
      } catch {
        setStatus('error')
        setErrMsg(t('s3_error'))
      }
    }

    fetch()
  }, [])

  const weatherLabel = form.weatherCode != null
    ? (WMO_CODES[form.weatherCode] ?? `Code ${form.weatherCode}`)
    : null

  const loading = status === 'loading'

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

        <div className="env-grid">
          <EnvItem
            label={t('s3_elevation')}
            value={form.elevation != null ? `${form.elevation} m` : null}
            sub={t('s3_sub_elev')}
            loading={loading}
          />
          <EnvItem
            label={t('s3_landcover')}
            value={form.landCover}
            sub={t('s3_sub_lc')}
            loading={loading}
          />
          <EnvItem
            label={t('s3_temperature')}
            value={form.temperature != null ? `${form.temperature} °C` : null}
            sub={form.collectionDate}
            loading={loading}
          />
          <EnvItem
            label={t('s3_precipitation')}
            value={form.precipitation != null ? `${form.precipitation} mm` : null}
            sub={t('s3_sub_precip')}
            loading={loading}
          />
          <EnvItem
            label={t('s3_wind')}
            value={form.windSpeed != null ? `${form.windSpeed} km/h` : null}
            sub={t('s3_sub_wind')}
            loading={loading}
          />
          <EnvItem
            label={t('s3_weather')}
            value={weatherLabel}
            sub={t('s3_sub_wmo')}
            loading={loading}
          />
        </div>

        <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><path d="M12 16v-4m0-4h.01"/>
          </svg>
          {t('s3_sources')}
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

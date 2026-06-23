import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useT } from '../i18n'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

function MapClickHandler({ onMapClick }) {
  useMapEvents({ click: e => onMapClick(e.latlng) })
  return null
}

export default function Step2Location({ form, update, onNext, onBack }) {
  const { t } = useT()
  const [locating, setLocating] = useState(false)
  const [errors, setErrors]     = useState({})

  const position = form.latitude && form.longitude
    ? [parseFloat(form.latitude), parseFloat(form.longitude)]
    : null

  const handleMapClick = ({ lat, lng }) => {
    update({
      latitude:  lat.toFixed(6),
      longitude: lng.toFixed(6),
      altitude:  '',
      accuracy:  '',
    })
  }

  const handleGPS = () => {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        update({
          latitude:  pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
          altitude:  pos.coords.altitude ? pos.coords.altitude.toFixed(1) : '',
          accuracy:  pos.coords.accuracy ? pos.coords.accuracy.toFixed(1) : '',
        })
        setLocating(false)
      },
      () => setLocating(false),
      { enableHighAccuracy: true }
    )
  }

  const validate = () => {
    const e = {}
    if (!form.latitude || !form.longitude) e.location = t('s2_err_location')
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleNext = () => { if (validate()) onNext() }

  const defaultCenter = position || [39.8283, -98.5795]

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
        <div className="card-header-text">
          <h2>{t('s2_title')}</h2>
          <p>{t('s2_subtitle')}</p>
        </div>
      </div>

      <div className="card-body">
        {/* Toolbar */}
        <div className="map-toolbar">
          <button className="btn btn-secondary" onClick={handleGPS} disabled={locating} style={{ height: 38, fontSize: 13 }}>
            {locating ? <><div className="spinner dark" /> {t('s2_gps_loading')}</> : (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>
                </svg>
                {t('s2_gps')}
              </>
            )}
          </button>
          <span className="map-hint">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><path d="M12 16v-4m0-4h.01"/>
            </svg>
            {t('s2_map_hint')}
          </span>
        </div>

        {/* Map */}
        <div className="map-container">
          <MapContainer
            center={defaultCenter}
            zoom={position ? 13 : 4}
            style={{ height: '100%', width: '100%' }}
            key={position ? 'has-pos' : 'no-pos'}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapClickHandler onMapClick={handleMapClick} />
            {position && <Marker position={position} />}
          </MapContainer>
        </div>
        {errors.location && <span className="field-error">{errors.location}</span>}

        {/* Coordinates */}
        <div className="map-coords">
          <div className="field">
            <label className="field-label">{t('s2_lat')}</label>
            <input type="number" step="0.000001" placeholder="e.g. 42.360082" value={form.latitude}
              onChange={e => update({ latitude: e.target.value })} />
          </div>
          <div className="field">
            <label className="field-label">{t('s2_lng')}</label>
            <input type="number" step="0.000001" placeholder="e.g. -71.058880" value={form.longitude}
              onChange={e => update({ longitude: e.target.value })} />
          </div>
          <div className="field">
            <label className="field-label">{t('s2_alt')}</label>
            <input type="number" step="0.1" placeholder="Auto-filled by GPS" value={form.altitude}
              onChange={e => update({ altitude: e.target.value })} />
          </div>
          <div className="field">
            <label className="field-label">{t('s2_acc')}</label>
            <input type="number" step="0.1" placeholder="Auto-filled by GPS" value={form.accuracy}
              onChange={e => update({ accuracy: e.target.value })} />
          </div>
        </div>

        {/* Locality */}
        <div className="field">
          <label className="field-label">{t('s2_locality')}</label>
          <input type="text" placeholder={t('s2_locality_ph')}
            value={form.locality} onChange={e => update({ locality: e.target.value })} />
          <span className="field-hint">{t('s2_locality_hint')}</span>
        </div>
      </div>

      <div className="card-footer">
        <button className="btn btn-secondary" onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
          {t('btn_back')}
        </button>
        <button className="btn btn-primary" onClick={handleNext}>
          {t('btn_next')}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

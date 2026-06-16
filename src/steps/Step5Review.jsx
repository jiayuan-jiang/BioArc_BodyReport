import { useState } from 'react'
import { submitToKobo } from '../utils/koboApi'

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

const WMO_CODES = {
  0: 'Clear Sky', 1: 'Mainly Clear', 2: 'Partly Cloudy', 3: 'Overcast',
  45: 'Fog', 48: 'Icy Fog', 51: 'Light Drizzle', 53: 'Drizzle', 55: 'Heavy Drizzle',
  61: 'Light Rain', 63: 'Rain', 65: 'Heavy Rain',
  71: 'Light Snow', 73: 'Snow', 75: 'Heavy Snow',
  80: 'Light Showers', 81: 'Showers', 82: 'Heavy Showers',
  95: 'Thunderstorm', 99: 'Severe Thunderstorm',
}

export default function Step5Review({ form, onBack, onSuccess }) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState(null)

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const id = await submitToKobo(form)
      onSuccess(id)
    } catch (e) {
      setError(e.message || 'Submission failed. Please try again.')
      setSubmitting(false)
    }
  }

  const preservationLabel = {
    frozen:  'Frozen',
    alcohol: 'Preserved in Alcohol',
    dried:   'Dried',
  }[form.preservation] || form.preservation

  const weatherLabel = form.weatherCode != null
    ? (WMO_CODES[form.weatherCode] ?? `Code ${form.weatherCode}`)
    : null

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
          </svg>
        </div>
        <div className="card-header-text">
          <h2>Review & Submit</h2>
          <p>Confirm all details before archiving</p>
        </div>
      </div>

      <div className="card-body">
        {/* Photos */}
        {form.photos.length > 0 && (
          <Section title="Photos">
            <div className="review-photos">
              {form.photos.map((p, i) => (
                <img key={i} src={p.url} alt={p.name} className="review-photo" />
              ))}
            </div>
          </Section>
        )}

        <Section title="Specimen">
          <Row label="Species"             value={form.speciesDisplay} />
          <Row label="Preservation"        value={preservationLabel} />
        </Section>

        <Section title="Location">
          <Row label="Latitude"   value={form.latitude} />
          <Row label="Longitude"  value={form.longitude} />
          <Row label="Altitude"   value={form.altitude ? `${form.altitude} m` : null} />
          <Row label="Accuracy"   value={form.accuracy ? `${form.accuracy} m` : null} />
          <Row label="Locality"   value={form.locality} />
        </Section>

        <Section title="Environmental Data">
          <Row label="Elevation (DEM)"  value={form.elevation    != null ? `${form.elevation} m`       : null} />
          <Row label="Land Cover"       value={form.landCover} />
          <Row label="Temperature"      value={form.temperature  != null ? `${form.temperature} °C`    : null} />
          <Row label="Precipitation"    value={form.precipitation!= null ? `${form.precipitation} mm`  : null} />
          <Row label="Wind Speed"       value={form.windSpeed    != null ? `${form.windSpeed} km/h`    : null} />
          <Row label="Weather"          value={weatherLabel} />
        </Section>

        <Section title="Collection">
          <Row label="Date"        value={form.collectionDate} />
          <Row label="Collector"   value={form.collectorName} />
          <Row label="Institution" value={form.institution} />
          <Row label="Project"     value={form.projectName} />
          <Row label="Habitat"     value={form.habitatDescription} />
          <Row label="Notes"       value={form.notes} />
        </Section>

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
          Back
        </button>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
          {submitting
            ? <><div className="spinner" /> Submitting…</>
            : <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 2L11 13"/><path d="M22 2L15 22l-4-9-9-4 20-7z"/>
                </svg>
                Submit Record
              </>
          }
        </button>
      </div>
    </div>
  )
}

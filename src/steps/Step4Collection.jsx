import { useState } from 'react'

export default function Step4Collection({ form, update, onNext, onBack }) {
  const [errors, setErrors] = useState({})

  const validate = () => {
    const e = {}
    if (!form.collectionDate)  e.collectionDate  = 'Collection date is required'
    if (!form.collectorName.trim()) e.collectorName = 'Collector name is required'
    const today = new Date().toISOString().split('T')[0]
    if (form.collectionDate > today) e.collectionDate = 'Date cannot be in the future'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleNext = () => { if (validate()) onNext() }

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        </div>
        <div className="card-header-text">
          <h2>Collection Information</h2>
          <p>Record who collected the specimen and when</p>
        </div>
      </div>

      <div className="card-body">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label className="field-label field-required">Collection Date</label>
            <input
              type="date"
              value={form.collectionDate}
              max={new Date().toISOString().split('T')[0]}
              className={errors.collectionDate ? 'error' : ''}
              onChange={e => update({ collectionDate: e.target.value })}
            />
            {errors.collectionDate && <span className="field-error">{errors.collectionDate}</span>}
          </div>

          <div className="field">
            <label className="field-label field-required">Collector Name</label>
            <input
              type="text"
              placeholder="Full name"
              value={form.collectorName}
              className={errors.collectorName ? 'error' : ''}
              onChange={e => update({ collectorName: e.target.value })}
            />
            {errors.collectorName && <span className="field-error">{errors.collectorName}</span>}
          </div>

          <div className="field">
            <label className="field-label">Institution</label>
            <input
              type="text"
              placeholder="e.g. University of Michigan"
              value={form.institution}
              onChange={e => update({ institution: e.target.value })}
            />
          </div>

          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label className="field-label">Project Name</label>
            <input
              type="text"
              value={form.projectName}
              onChange={e => update({ projectName: e.target.value })}
            />
          </div>
        </div>

        <div className="divider" />

        <div className="field">
          <label className="field-label">Habitat Description</label>
          <textarea
            placeholder="Describe the habitat at the collection site (e.g. mixed deciduous forest, wetland edge, roadside…)"
            value={form.habitatDescription}
            onChange={e => update({ habitatDescription: e.target.value })}
            style={{ minHeight: 80 }}
          />
        </div>

        <div className="field">
          <label className="field-label">Additional Notes</label>
          <textarea
            placeholder="Any other observations — behaviour, condition, associated species, etc."
            value={form.notes}
            onChange={e => update({ notes: e.target.value })}
            style={{ minHeight: 80 }}
          />
        </div>
      </div>

      <div className="card-footer">
        <button className="btn btn-secondary" onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
          Back
        </button>
        <button className="btn btn-primary" onClick={handleNext}>
          Review
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

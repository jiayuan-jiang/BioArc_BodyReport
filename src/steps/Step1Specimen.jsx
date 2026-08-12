import { useState, useRef } from 'react'
import { useT } from '../i18n'

const SPECIES_DEBOUNCE_MS = 300

async function fetchSpeciesSuggestions(query, signal) {
  const url = `https://api.inaturalist.org/v1/taxa/autocomplete?q=${encodeURIComponent(query)}&rank=species&per_page=10`
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`iNaturalist API error ${res.status}`)
  const data = await res.json()
  return (data.results || []).map(r => ({
    taxonId: r.id,
    sci: r.name,
    common: r.preferred_common_name || r.name,
    iconic: r.iconic_taxon_name || '',
    photoUrl: r.default_photo?.square_url || null,
  }))
}

// Resizes to a max 1280px edge and re-encodes as JPEG @ 75% quality — visibly
// sharp on screen but a fraction of a raw phone photo's size, since Kobo's free
// storage tier is the actual bottleneck (1GB, not the 5000/month submission cap).
async function compressImage(file, maxDim = 1280, quality = 0.75) {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h)

  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality))
  const name = file.name.replace(/\.[^.]+$/, '') + '.jpg'
  return new File([blob], name, { type: 'image/jpeg' })
}

export default function Step1Specimen({ form, update, onNext }) {
  const { t } = useT()
  const [query, setQuery]           = useState(form.speciesDisplay || '')
  const [results, setResults]       = useState([])
  const [open, setOpen]             = useState(false)
  const [loading, setLoading]       = useState(false)
  const [fetchError, setFetchError] = useState(false)
  const [dragging, setDragging]     = useState(false)
  const [errors, setErrors]         = useState({})
  const fileRef      = useRef()
  const debounceRef  = useRef()
  const abortRef     = useRef()

  const PRESERVATION = [
    { value: 'frozen',   label: t('s1_pres_frozen') },
    { value: 'alcohol',  label: t('s1_pres_alcohol') },
    { value: 'dried',    label: t('s1_pres_dried') },
  ]

  const clearSelection = () => {
    update({ taxonId: null, speciesSci: '', speciesCommon: '', speciesIconic: '', speciesDisplay: '' })
  }

  const handleQueryChange = (value) => {
    setQuery(value)
    setOpen(true)
    setFetchError(false)
    clearSelection()

    clearTimeout(debounceRef.current)
    abortRef.current?.abort()

    if (value.trim().length < 2) {
      setResults([])
      setLoading(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController()
      abortRef.current = controller
      setLoading(true)
      try {
        const suggestions = await fetchSpeciesSuggestions(value.trim(), controller.signal)
        setResults(suggestions)
        setFetchError(false)
      } catch (e) {
        if (e.name !== 'AbortError') {
          setResults([])
          setFetchError(true)
          // Never block submission on API failure. Fall back to whatever the user typed.
          update({ speciesSci: value.trim(), speciesDisplay: value.trim() })
        }
      } finally {
        setLoading(false)
      }
    }, SPECIES_DEBOUNCE_MS)
  }

  const selectSpecies = (s) => {
    update({
      taxonId:        s.taxonId,
      speciesSci:     s.sci,
      speciesCommon:  s.common,
      speciesIconic:  s.iconic,
      speciesDisplay: s.common,
    })
    setQuery(s.common)
    setOpen(false)
  }

  const handleFiles = async (files) => {
    const valid = Array.from(files).filter(f => f.type.startsWith('image/'))
    const compressed = await Promise.all(valid.map(f => compressImage(f)))
    const previews = compressed.map(f => ({ file: f, url: URL.createObjectURL(f), name: f.name }))
    update({ photos: [...form.photos, ...previews] })
  }

  const removePhoto = (i) => {
    const updated = form.photos.filter((_, idx) => idx !== i)
    update({ photos: updated })
  }

  const validate = () => {
    const e = {}
    if (!form.speciesSci)   e.species = t('s1_err_species')
    if (!form.preservation) e.preservation = t('s1_err_preservation')
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleNext = () => { if (validate()) onNext() }

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2C8 2 4 5 4 9c0 5 8 13 8 13s8-8 8-13c0-4-4-7-8-7z"/>
            <circle cx="12" cy="9" r="2.5"/>
          </svg>
        </div>
        <div className="card-header-text">
          <h2>{t('s1_title')}</h2>
          <p>{t('s1_subtitle')}</p>
        </div>
      </div>

      <div className="card-body">
        {/* Species */}
        <div className="field">
          <label className="field-label field-required">{t('s1_species')}</label>
          <div className="species-search-wrapper">
            <input
              type="text"
              placeholder={t('s1_species_ph')}
              value={query}
              className={errors.species ? 'error' : ''}
              onChange={e => handleQueryChange(e.target.value)}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
            />
            {loading && <div className="spinner dark species-search-spinner" />}
            {open && query.trim().length >= 2 && !loading && (
              <div className="species-dropdown">
                {results.length > 0 ? (
                  results.map(s => (
                    <div key={s.taxonId} className="species-option" onMouseDown={() => selectSpecies(s)}>
                      {s.photoUrl && <img src={s.photoUrl} alt="" className="species-option-photo" />}
                      <span className="species-option-text">
                        {s.common}
                        <span className="species-option-sci">{s.sci}</span>
                      </span>
                      {s.iconic && <span className="species-option-badge">{s.iconic}</span>}
                    </div>
                  ))
                ) : fetchError ? null : (
                  <div className="species-option species-option-empty">{t('s1_species_no_results')}</div>
                )}
              </div>
            )}
          </div>
          {errors.species && <span className="field-error">{errors.species}</span>}
          {fetchError && <span className="field-warning">{t('s1_species_fetch_err')}</span>}
        </div>

        {/* Preservation */}
        <div className="field">
          <label className="field-label field-required">{t('s1_preservation')}</label>
          <div className="radio-group">
            {PRESERVATION.map(p => (
              <label
                key={p.value}
                className={`radio-option ${form.preservation === p.value ? 'selected' : ''}`}
              >
                <input
                  type="radio"
                  name="preservation"
                  value={p.value}
                  checked={form.preservation === p.value}
                  onChange={() => update({ preservation: p.value })}
                />
                <div className="radio-dot" />
                <span className="radio-label">{p.label}</span>
              </label>
            ))}
          </div>
          {errors.preservation && <span className="field-error">{errors.preservation}</span>}
        </div>

        {/* Photos */}
        <div className="field">
          <label className="field-label">{t('s1_photos')}</label>
          <div
            className={`photo-dropzone ${dragging ? 'dragging' : ''}`}
            onClick={() => fileRef.current.click()}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
          >
            <div className="photo-dropzone-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="3"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <path d="M21 15l-5-5L5 21"/>
              </svg>
            </div>
            <h3>{t('s1_drop')}</h3>
            <p>{t('s1_drop_hint')}</p>
            <input ref={fileRef} type="file" accept="image/*" multiple onChange={e => handleFiles(e.target.files)} />
          </div>
          {form.photos.length > 0 && (
            <div className="photo-thumbnails" style={{ marginTop: 8 }}>
              {form.photos.map((p, i) => (
                <div key={i} className="photo-thumb">
                  <img src={p.url} alt={p.name} />
                  <button className="photo-thumb-remove" onClick={e => { e.stopPropagation(); removePhoto(i) }}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card-footer">
        <div />
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

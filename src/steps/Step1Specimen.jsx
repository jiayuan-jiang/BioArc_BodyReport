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

// createImageBitmap(file) is the fast path, but it's known to throw — or on some iOS
// Safari versions, silently hand back a bitmap WebKit then fails to draw from — for
// photos straight off a phone's camera roll (wide-gamut/Display P3 JPEGs are the usual
// trigger). <img>/FileReader decoding is the slower but far more broadly-compatible
// fallback: an HTMLImageElement works as a drawImage() source exactly like a bitmap.
function decodeViaImgElement(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Could not decode ${file.name} via <img> fallback`))
    img.src = url
  })
}

// No browser other than Safari can decode HEIC/HEIF natively, so createImageBitmap()
// throws on it directly. heic-to wraps a WASM build of libheif for that case — loaded
// via dynamic import so it's only fetched when a HEIC file actually shows up, not as
// part of the main bundle.
async function decodeToBitmap(file) {
  try {
    return await createImageBitmap(file)
  } catch {
    try {
      const { heicTo } = await import('heic-to')
      const jpeg = await heicTo({ blob: file, type: 'image/jpeg', quality: 0.92 })
      return await createImageBitmap(jpeg)
    } catch {
      return await decodeViaImgElement(file)
    }
  }
}

// Resizes to a max 1280px edge and re-encodes as JPEG @ 75% quality — visibly
// sharp on screen but a fraction of a raw phone photo's size, since Kobo's free
// storage tier is the actual bottleneck (1GB, not the 5000/month submission cap).
async function compressImage(file, maxDim = 1280, quality = 0.75) {
  const bitmap = await decodeToBitmap(file)
  const srcW = bitmap.width, srcH = bitmap.height
  const scale = Math.min(1, maxDim / Math.max(srcW, srcH))
  const w = Math.round(srcW * scale)
  const h = Math.round(srcH * scale)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h)

  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality))
  // A canvas that failed to decode/draw (bad color profile, WebKit quirk, etc.) still
  // resolves toBlob() with a "valid" near-empty blob instead of throwing — this is
  // exactly how the very first version of this bug went unnoticed. Treat a suspiciously
  // tiny result as a decode failure rather than shipping a broken thumbnail silently.
  if (!blob || blob.size < 500) {
    throw new Error(`Compressed output for ${file.name} is suspiciously small (${blob?.size ?? 0} bytes)`)
  }
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
  const [photoError, setPhotoError] = useState(false)
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
        if (suggestions.length === 0) {
          // A clean response with zero matches (e.g. a species not in iNaturalist's
          // taxonomy, or a typo) must not block submission either. Fall back to the
          // typed text, same as the fetch-failure branch below.
          update({ speciesSci: value.trim(), speciesDisplay: value.trim() })
        }
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
    // file.type is unreliable for HEIC — Chrome reports it as application/octet-stream
    // rather than image/heic, so a photo picked straight from an iPhone's camera roll
    // would otherwise get silently dropped here before it ever reaches compressImage.
    const valid = Array.from(files).filter(f => f.type.startsWith('image/') || /\.hei[cf]$/i.test(f.name))
    const results = await Promise.allSettled(valid.map(f => compressImage(f)))
    results.forEach(r => { if (r.status === 'rejected') console.error('Photo processing failed:', r.reason) })
    const previews = results
      .filter(r => r.status === 'fulfilled')
      .map(r => ({ file: r.value, url: URL.createObjectURL(r.value), name: r.value.name }))
    setPhotoError(results.some(r => r.status === 'rejected'))
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
          {photoError && <span className="field-error">{t('s1_err_photo_decode')}</span>}
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

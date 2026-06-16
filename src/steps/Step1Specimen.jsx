import { useState, useRef } from 'react'

const SPECIES = [
  { id: 'anas_platyrhynchos',    common: 'Mallard',              sci: 'Anas platyrhynchos' },
  { id: 'branta_canadensis',     common: 'Canada Goose',         sci: 'Branta canadensis' },
  { id: 'ardea_herodias',        common: 'Great Blue Heron',     sci: 'Ardea herodias' },
  { id: 'buteo_jamaicensis',     common: 'Red-tailed Hawk',      sci: 'Buteo jamaicensis' },
  { id: 'corvus_brachyrhynchos', common: 'American Crow',        sci: 'Corvus brachyrhynchos' },
  { id: 'columba_livia',         common: 'Rock Pigeon',          sci: 'Columba livia' },
  { id: 'turdus_migratorius',    common: 'American Robin',       sci: 'Turdus migratorius' },
  { id: 'passer_domesticus',     common: 'House Sparrow',        sci: 'Passer domesticus' },
  { id: 'sturnus_vulgaris',      common: 'European Starling',    sci: 'Sturnus vulgaris' },
  { id: 'procyon_lotor',         common: 'Raccoon',              sci: 'Procyon lotor' },
  { id: 'didelphis_virginiana',  common: 'Virginia Opossum',     sci: 'Didelphis virginiana' },
  { id: 'sylvilagus_floridanus', common: 'Eastern Cottontail',   sci: 'Sylvilagus floridanus' },
  { id: 'sciurus_carolinensis',  common: 'Eastern Gray Squirrel',sci: 'Sciurus carolinensis' },
  { id: 'mephitis_mephitis',     common: 'Striped Skunk',        sci: 'Mephitis mephitis' },
  { id: 'vulpes_vulpes',         common: 'Red Fox',              sci: 'Vulpes vulpes' },
  { id: 'canis_latrans',         common: 'Coyote',               sci: 'Canis latrans' },
  { id: 'odocoileus_virginianus',common: 'White-tailed Deer',    sci: 'Odocoileus virginianus' },
  { id: 'terrapene_carolina',    common: 'Eastern Box Turtle',   sci: 'Terrapene carolina' },
  { id: 'thamnophis_sirtalis',   common: 'Common Garter Snake',  sci: 'Thamnophis sirtalis' },
  { id: 'rana_catesbeiana',      common: 'American Bullfrog',    sci: 'Rana catesbeiana' },
  { id: 'ambystoma_maculatum',   common: 'Spotted Salamander',   sci: 'Ambystoma maculatum' },
  { id: 'unknown',               common: 'Unknown / Other',      sci: '' },
]

const PRESERVATION = [
  { value: 'frozen',   label: 'Frozen' },
  { value: 'alcohol',  label: 'Preserved in Alcohol' },
  { value: 'dried',    label: 'Dried' },
]

export default function Step1Specimen({ form, update, onNext }) {
  const [query, setQuery]       = useState(form.speciesDisplay || '')
  const [open, setOpen]         = useState(false)
  const [dragging, setDragging] = useState(false)
  const [errors, setErrors]     = useState({})
  const fileRef = useRef()

  const filtered = query.length > 0
    ? SPECIES.filter(s =>
        s.common.toLowerCase().includes(query.toLowerCase()) ||
        s.sci.toLowerCase().includes(query.toLowerCase())
      )
    : SPECIES

  const selectSpecies = (s) => {
    update({ species: s.id, speciesDisplay: s.common })
    setQuery(s.common)
    setOpen(false)
  }

  const handleFiles = (files) => {
    const valid = Array.from(files).filter(f => f.type.startsWith('image/'))
    const previews = valid.map(f => ({ file: f, url: URL.createObjectURL(f), name: f.name }))
    update({ photos: [...form.photos, ...previews] })
  }

  const removePhoto = (i) => {
    const updated = form.photos.filter((_, idx) => idx !== i)
    update({ photos: updated })
  }

  const validate = () => {
    const e = {}
    if (!form.species)      e.species = 'Please select a species'
    if (!form.preservation) e.preservation = 'Please select a preservation method'
    if (form.photos.length === 0) e.photos = 'Please upload at least one photo'
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
          <h2>Specimen Details</h2>
          <p>Identify the specimen and its preservation method</p>
        </div>
      </div>

      <div className="card-body">
        {/* Species */}
        <div className="field">
          <label className="field-label field-required">Species</label>
          <div className="species-search-wrapper">
            <input
              type="text"
              placeholder="Search by common or scientific name…"
              value={query}
              className={errors.species ? 'error' : ''}
              onChange={e => { setQuery(e.target.value); setOpen(true); update({ species: '', speciesDisplay: '' }) }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
            />
            {open && filtered.length > 0 && (
              <div className="species-dropdown">
                {filtered.map(s => (
                  <div key={s.id} className="species-option" onMouseDown={() => selectSpecies(s)}>
                    {s.common}
                    {s.sci && <span className="species-option-sci">{s.sci}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
          {errors.species && <span className="field-error">{errors.species}</span>}
        </div>

        {/* Preservation */}
        <div className="field">
          <label className="field-label field-required">Preservation Method</label>
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
          <label className="field-label field-required">Photograph(s)</label>
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
            <h3>Drop photos here or click to upload</h3>
            <p>JPG, PNG, HEIC · max 10 MB each</p>
            <input ref={fileRef} type="file" accept="image/*" multiple onChange={e => handleFiles(e.target.files)} />
          </div>
          {errors.photos && <span className="field-error">{errors.photos}</span>}
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
          Next
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

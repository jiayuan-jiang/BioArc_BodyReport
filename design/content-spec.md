# BioArc — Content Spec

## Form Title
BioARC Specimen Collection Survey

## Language Support
English / Español / French / Portuguese

---

## Fields (from existing KoboToolbox form)

### Step 1 — Specimen
| Field | Type | Options / Notes |
|-------|------|-----------------|
| Species | Searchable dropdown | (populated from species list) |
| Preservation Method | Radio | Frozen / Preserved in Alcohol / Dried |
| Photograph | File upload | JPG, PNG, HEIC · max 10MB · multiple allowed |

### Step 2 — Location
| Field | Type | Options / Notes |
|-------|------|-----------------|
| Location | Map pin (Leaflet) | Click to place or use GPS auto-detect |
| Latitude | Number (auto-filled) | x.y ° |
| Longitude | Number (auto-filled) | x.y ° |
| Altitude | Number (auto-filled) | metres |
| Accuracy | Number (auto-filled) | metres |
| Locality | Text | Free-text description of site name |

### Step 3 — Collection Info
| Field | Type | Options / Notes |
|-------|------|-----------------|
| Collection Date | Date picker | yyyy-mm-dd, defaults to today |
| Collector Name | Text | |
| Institution | Text | |
| Project Name | Text | Default: "BioARC" |
| Habitat Description | Text | |

### Step 4 — Additional Notes
| Field | Type | Options / Notes |
|-------|------|-----------------|
| Additional Notes | Textarea | Free text |

---

## Fields (new — supervisor requirements)

### Auto-fetched Environmental Covariates
Triggered automatically after location is confirmed. Read-only, shown in a dedicated card.

| Field | Source API | Notes |
|-------|-----------|-------|
| Elevation / DEM | Open-Elevation (SRTM) | metres above sea level |
| Land Cover Class (LUCC) | ESA WorldCover 10m | e.g. Tree cover / Cropland / Built-up / Wetland |
| Temperature | Open-Meteo | °C, at collection date + coordinates |
| Precipitation | Open-Meteo | mm |
| Wind Speed | Open-Meteo | km/h |
| Weather Condition | Open-Meteo | Clear / Cloudy / Rain / Snow etc. |

---

## API Endpoints Reference

### Elevation (DEM)
```
GET https://api.open-elevation.com/api/v1/lookup?locations={lat},{lng}
→ results[0].elevation (metres)
```

### Land Cover (LUCC) — ESA WorldCover
```
GET https://services.terrascope.be/wcs/v2?SERVICE=WCS&REQUEST=GetCoverage
    &CoverageId=WORLDCOVER_2021_MAP&SUBSET=Lat({lat})&SUBSET=Long({lng})
    &FORMAT=application/json
→ pixel value → mapped to class label
```

### Weather — Open-Meteo (free, no key required)
```
GET https://archive-api.open-meteo.com/v1/archive
    ?latitude={lat}&longitude={lng}
    &start_date={date}&end_date={date}
    &daily=temperature_2m_max,precipitation_sum,windspeed_10m_max,weathercode
    &timezone=auto
→ daily object
```

---

## Step Flow (Card Sequence)

```
[1] Specimen       →  species, preservation, photo upload
[2] Location       →  map pin, GPS coords, locality
[3] Environment    →  auto-fetched DEM + LUCC + weather (read-only)
[4] Collection     →  date, collector, institution, project, habitat
[5] Review & Submit→  summary of all fields + submit button
```

---

## Validation Rules

| Field | Rule |
|-------|------|
| Species | Required |
| Preservation Method | Required |
| Photograph | At least 1 image required |
| Location | Required (must place pin) |
| Collection Date | Required, not future date |
| Collector Name | Required |
| Environmental data | Optional (show warning if fetch fails, allow skip) |

---

## Submit Behaviour
- POST to KoboToolbox API v2
- Endpoint: `https://kf.kobotoolbox.org/api/v2/assets/azjgv2kJ6sHnYgYdoVRmM4/submissions/`
- Auth: Token from `.env`
- On success: confirmation card with submission ID
- On failure: inline error with retry button
- Offline: queue locally, auto-retry when connection restored

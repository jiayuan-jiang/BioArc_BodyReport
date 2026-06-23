# Spec: Species Search — iNaturalist API Autocomplete
_Status: ready to implement_
_Affects: `src/steps/Step1Specimen.jsx`_

---

## Problem

Current implementation uses a hardcoded list of ~22 species in `Step1Specimen.jsx`.
This breaks for any species not in the list, and requires manual maintenance.

Core UX problem: users may search by common name, scientific name, or in different languages —
a static list cannot handle this. See context: vernacular name reconciliation.

---

## Solution

Replace static list with real-time call to **iNaturalist Taxa Autocomplete API**.
iNaturalist searches across scientific name + all multilingual common names simultaneously.

---

## API

```
GET https://api.inaturalist.org/v1/taxa/autocomplete
  ?q={query}
  &rank=species
  &per_page=10
```

No API key required for autocomplete (read-only, public endpoint).

### Response shape (relevant fields)
```json
{
  "results": [
    {
      "id": 6930,
      "name": "Anas platyrhynchos",
      "preferred_common_name": "Mallard",
      "iconic_taxon_name": "Aves",
      "default_photo": {
        "square_url": "https://..."
      }
    }
  ]
}
```

---

## What to store in form state

```js
{
  taxonId:         6930,
  speciesSci:      "Anas platyrhynchos",    // submitted to KoboToolbox
  speciesCommon:   "Mallard",               // display only
  speciesIconic:   "Aves",                  // display as badge (Birds / Mammals / etc.)
}
```

KoboToolbox payload fields:
- `species_scientific: form.speciesSci`
- `species_common: form.speciesCommon`
- `species_taxon_id: form.taxonId`

---

## UX Behaviour

1. User types ≥ 2 characters → debounce 300ms → fire API call
2. Show loading spinner in input while fetching
3. Dropdown shows: [tiny photo] Common name / *Scientific name* [badge: Birds]
4. If no results: "No species found — try a different name or language"
5. On select: populate all three fields, close dropdown
6. Stored value shows as "Mallard (*Anas platyrhynchos*)" in review card

---

## Debounce

Add a 300ms debounce on the input handler to avoid firing on every keystroke.
Implement inline with `useRef` + `setTimeout` — no library needed.

---

## Error handling

- If fetch fails: fall back to showing whatever the user typed as free text,
  with a warning "Could not load suggestions — scientific name entered manually"
- Never block form submission due to species API failure

---

## Files to change

| File | Change |
|------|--------|
| `src/steps/Step1Specimen.jsx` | Replace `SPECIES` constant + dropdown logic with API fetch |
| `src/utils/koboApi.js` | Update payload: `species` → `species_scientific` + `species_common` + `species_taxon_id` |
| `context/state.md` | Mark task complete after implementation |
| `context/task-queue.md` | Move to Done |

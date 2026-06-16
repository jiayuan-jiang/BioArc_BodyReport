# Card-Based UI Design Spec — BioArc

## Design Philosophy
Clean, field-research aesthetic. Nature-adjacent color palette.
Each reporting step = one card. Progressive disclosure.

---

## Color System

```
Primary Green    #3D7A5E   (buttons, active states, accents)
Light Green      #E8F5EE   (card backgrounds, highlights)
Dark Text        #1A2E25   (headings)
Body Text        #4A5568   (labels, descriptions)
Muted Text       #9CA3AF   (placeholders, hints)
Border           #E2E8F0   (card borders, dividers)
White            #FFFFFF   (card surface)
Background       #F7F9F8   (page background)
Error Red        #E53E3E   (validation errors)
Warning Amber    #D69E2E   (warnings)
```

---

## Typography

```
Font Stack: 'Inter', 'system-ui', sans-serif

Heading 1:  28px / 700 weight  (page title)
Heading 2:  20px / 600 weight  (card title)
Heading 3:  16px / 600 weight  (section label)
Body:       15px / 400 weight  (field content)
Caption:    13px / 400 weight  (hints, metadata)
```

---

## Card Anatomy

```
┌─────────────────────────────────────┐
│  ● Card Header                      │  ← step indicator + title
│    icon  Title         [step 2/5]   │
├─────────────────────────────────────┤
│                                     │
│  Card Body                          │  ← form fields / content
│  [field]  [field]                   │
│  [field]                            │
│                                     │
├─────────────────────────────────────┤
│  [Back]              [Next →]       │  ← action bar
└─────────────────────────────────────┘
```

### Card CSS Rules
```css
border-radius: 16px
padding: 24px
background: #FFFFFF
box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04)
border: 1px solid #E2E8F0
max-width: 680px
margin: 0 auto
```

---

## Card Types

### 1. Photo Upload Card
- Large dashed drop zone (80% card width)
- Thumbnail grid after upload (3 columns)
- Each thumbnail: deletable, reorderable
- Support: JPG, PNG, HEIC, max 10MB each

### 2. Map Selection Card
- Full-width embedded map (Leaflet)
- Click to drop pin
- Coordinate display below map (lat/lng, auto-filled)
- "Use my location" button (GPS auto-detect)
- Height: 320px

### 3. Auto-fetch Data Card (read-only)
- Shows DEM elevation, LUCC class, weather
- Skeleton loading state while fetching
- Each data point: icon + label + value
- Greyed out until location is set

### 4. Text Input Card
- Full-width labels above inputs
- 48px input height
- 8px border-radius on inputs
- Focus: 2px solid #3D7A5E outline

### 5. Dropdown / Select Card
- Custom styled select or searchable dropdown
- For species selection: typeahead search

---

## Form Field Spec

```
Label:     13px, #4A5568, font-weight 500, margin-bottom 6px
Input:     15px, #1A2E25, height 48px, padding 12px 16px
Border:    1px solid #CBD5E0, radius 8px
Focus:     border-color #3D7A5E, box-shadow 0 0 0 3px rgba(61,122,94,0.15)
Error:     border-color #E53E3E, error message 12px #E53E3E below input
Hint:      12px #9CA3AF, margin-top 4px
```

---

## Button Spec

```
Primary:   bg #3D7A5E, text white, height 44px, padding 0 24px, radius 10px
Secondary: bg white, text #3D7A5E, border 1.5px solid #3D7A5E
Disabled:  opacity 0.4, cursor not-allowed
Hover:     Primary bg #2D6A4E (darken 10%)
Icon btn:  40×40px, radius 10px, bg #F0F4F1
```

---

## Step Progress Indicator

```
● ── ○ ── ○ ── ○ ── ○
1    2    3    4    5

Completed:  filled circle #3D7A5E
Current:    filled circle with ring
Upcoming:   hollow circle #CBD5E0
Line:       2px, completed = #3D7A5E, upcoming = #CBD5E0
```

---

## iNaturalist-Inspired Features (functional reference)

1. **Photo-first flow** — upload photo as first step
2. **Species suggestion** — typeahead/search field for animal species
3. **Date + time** — datetime picker, defaults to now
4. **Location** — map pin + optional text description
5. **Notes** — free text field for observations
6. **Observer info** — name, affiliation (optional)

BioArc additions (not in iNaturalist):
- Auto-fetch DEM from coordinates
- Auto-fetch LUCC land cover class
- Auto-fetch weather (temp, humidity, conditions) via Open-Meteo
- Carcass condition field (Fresh / Decomposed / Skeletal / Unknown)
- Quantity field

---

## Responsive Breakpoints

```
Mobile:   < 640px   single column, cards full-width
Tablet:   640–1024px  card max-width 600px, centered
Desktop:  > 1024px  card max-width 680px, centered, sidebar optional
```

---

## Animation / Transition

```
Card transition:   translateY(20px) → 0, opacity 0→1, duration 280ms ease-out
Button hover:      background transition 150ms ease
Input focus:       box-shadow transition 150ms ease
Skeleton loader:   gradient shimmer animation, 1.5s loop
```

# Spec: Dashboard
_Status: blocked — pending supervisor decision_

---

## Decision Required

How should submitted data be viewed and managed?

---

## Options

### Option A — KoboToolbox built-in dashboard (current)
Data submitted → view in KoboToolbox interface directly.
- Map view, table view, basic charts available
- Data export: CSV, XLS, GeoJSON, KML
- No development needed
- UI is functional but not polished

### Option B — Custom dashboard in this app
Build a `/dashboard` route that fetches submissions via KoboToolbox GET API
and displays them in a custom UI.
- Full control over map visualization, filtering, export
- Significant development effort
- Tech: React + Leaflet map of all collection points + data table

### Option C — External BI tool
Connect KoboToolbox data to Metabase / Tableau / Google Data Studio.
- Good for: rich analytics, non-technical supervisors
- KoboToolbox → CSV export → import to BI tool (manual or scheduled)

---

## KoboToolbox Read API (for Option B)

```
GET /api/v2/assets/{uid}/submissions/
Authorization: Token {key}
→ returns paginated JSON of all submissions
```

Supports filtering, field selection, geospatial queries.

---

## Recommendation

For **demo**: Option A — zero effort, supervisor can immediately see data in KoboToolbox.
For **v1 production**: Option B — custom map dashboard showing all collection points,
filterable by species / date / collector.

---

## Questions for supervisor

1. Who needs to see the dashboard? (PI only? whole lab?)
2. What visualizations matter most? (map of locations? species breakdown? time series?)
3. Is raw data export (CSV) sufficient, or is a live UI needed?

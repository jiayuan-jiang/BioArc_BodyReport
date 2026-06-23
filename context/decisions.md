# Key Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-06-16 | KoboToolbox as backend storage | Free, no custom server needed for demo |
| 2026-06-16 | Vite + React, no UI library | Keep bundle lean, custom CSS per spec |
| 2026-06-16 | react-leaflet for map | Lightweight, OpenStreetMap tiles (free) |
| 2026-06-16 | Open-Meteo for weather | Free, no API key, historical data supported |
| 2026-06-16 | Species list = local static (temporary) | Faster to ship; migrating to iNaturalist API |
| 2026-06-16 | VITE_ prefix on env vars | Required by Vite for client-side exposure |
| 2026-06-16 | Card-based UI, 5 steps | One concern per card; matches iNaturalist UX pattern |
| 2026-06-16 | iNaturalist API for species search | Searches scientific + multilingual common names simultaneously |
| TBD | Authentication | Pending supervisor decision → `spec/auth.md` |
| TBD | Dashboard | Pending supervisor decision → `spec/dashboard.md` |
| TBD | Photo storage | KoboToolbox attachment API vs. external S3/R2 |

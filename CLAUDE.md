# BioArc — Animal Carcass Reporting App

## Project Overview
A web application for reporting and archiving animal carcass findings.
Frontend submits data directly to KoboToolbox via REST API.

## KoboToolbox API Routing

### Base URL
```
https://kf.kobotoolbox.org
```

### Submit a form entry
```
POST /api/v2/assets/{KOBO_ASSET_UID}/submissions/
Authorization: Token {KOBO_API_KEY}
Content-Type: application/json
```

### List all submissions
```
GET /api/v2/assets/{KOBO_ASSET_UID}/submissions/
Authorization: Token {KOBO_API_KEY}
```

### Get form fields/schema
```
GET /api/v2/assets/{KOBO_ASSET_UID}/
Authorization: Token {KOBO_API_KEY}
```

## Environment Variables
Stored in `.env` (never commit to git):
- `KOBO_API_KEY` — account-level API token
- `KOBO_ASSET_UID` — identifies the target project (`azjgv2kJ6sHnYgYdoVRmM4`)
- `KOBO_BASE_URL` — `https://kf.kobotoolbox.org`

## Project Link
https://kf.kobotoolbox.org/#/forms/azjgv2kJ6sHnYgYdoVRmM4/summary

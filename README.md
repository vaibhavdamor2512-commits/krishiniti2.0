# Krishiniti — Smart Crop Advisory & Profit Optimization

Krishiniti is a mobile-first decision-support MVP for small and marginal farmers. It answers five practical questions in one workflow:

1. What should I grow?
2. How profitable could it be?
3. How is my crop doing?
4. What problem might it have?
5. What should I check or do next?

The frontend uses real REST calls to a FastAPI backend. Business rules, ownership checks, calculations and structured demo data live on the server. When external credentials are missing, provider interfaces automatically return realistic demo weather, market and Sentinel-2-style NDVI data.

## Features

- JWT registration, login, current-user lookup and protected ownership boundaries
- Farm CRUD and interactive OpenStreetMap field drawing
- Real polygon-area calculation in acres
- Soil N/P/K, pH, type and moisture input with demo defaults
- Deterministic crop suitability scoring across eight demo crops
- Baseline yield estimation that clearly identifies itself as a non-trained model
- Production cost, revenue, expected profit, risk penalty and risk-adjusted ranking
- Weather and irrigation guidance with automatic demo fallback
- NDVI current value, history, trend, configurable interpretation and responsible labels
- Crop image upload/camera analysis plus crop-specific symptom matching, with prevention and management guidance
- English, Hindi, Gujarati and Punjabi UI dictionaries
- Advisories and read/unread notifications
- Responsive farmer dashboard and accessible mobile navigation
- SQLite by default, MySQL by configuration, and hosted D1/R2 persistence for the Sites deployment

## Architecture

```text
React / Vite
     │ REST + JWT
     ▼
FastAPI routers ── ownership checks ── SQLAlchemy
     │                                  │
     ├── crop + yield + profit logic    ├── SQLite (local default)
     ├── irrigation + disease logic     └── MySQL (Docker/production target)
     │
     ├── WeatherProvider ── real / mock
     ├── MarketProvider  ── real / mock
     └── SatelliteProvider ─ Earth Engine / mock Sentinel-2 series
```

Map rendering and field selection are separate from satellite analysis. A production satellite provider should send the stored field polygon to Google Earth Engine, select Sentinel-2 B04 (red) and B08 (NIR), and calculate:

```text
NDVI = (B08 - B04) / (B08 + B04)
```

## Technology stack

- Frontend: React 19, Vite, React Router, Axios, Tailwind CSS, Leaflet/OpenStreetMap, Recharts, Lucide icons
- Backend: Python 3.12, FastAPI, SQLAlchemy, Pydantic, JWT, Passlib/bcrypt
- ML-ready environment: NumPy, Pandas and scikit-learn
- Database: SQLite fallback and MySQL via PyMySQL
- Tests: pytest and FastAPI TestClient

## Folder structure

```text
Krishiniti/
├── backend/
│   ├── app/
│   │   ├── api/          # REST routes and auth dependencies
│   │   ├── core/         # settings, database and security
│   │   ├── ml/           # future model adapters and baseline bridge
│   │   ├── models/       # SQLAlchemy entities
│   │   ├── providers/    # weather, market and satellite interfaces
│   │   ├── schemas/      # validated API payloads
│   │   ├── services/     # scoring, profit, NDVI, area and matching logic
│   │   └── main.py
│   ├── tests/
│   ├── seed.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── i18n/
│   │   ├── pages/
│   │   └── services/
│   └── package.json
└── docker-compose.yml
```

## Quick start (SQLite demo mode)

### 1. Backend

PowerShell:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
python seed.py
uvicorn app.main:app --reload --port 8000
```

macOS/Linux:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python seed.py
uvicorn app.main:app --reload --port 8000
```

The API runs at `http://localhost:8000`. Swagger documentation is available at `http://localhost:8000/docs`.

### 2. Frontend

In another terminal:

```bash
cd frontend
pnpm install
cp .env.example .env
pnpm dev
```

Use `npm install` and `npm run dev` if pnpm is not available. Open `http://localhost:5173`.

### Demo login

```text
Mobile:   9999999999
Password: demo123
```

Read-only demo fallback is enabled only when `VITE_DEMO_MODE=true`. Authentication and data mutations never fabricate successful responses. For the real local end-to-end workflow, run both services.

## Environment variables

Backend:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | SQLAlchemy URL; defaults to local SQLite |
| `JWT_SECRET` | Required secret for signed access tokens |
| `DEMO_MODE` | Select mock providers when `true` |
| `WEATHER_API_KEY` | Future real weather provider credential |
| `MARKET_API_KEY` | Future real market provider credential |
| `GOOGLE_MAPS_API_KEY` | Optional future map provider credential |
| `GOOGLE_EARTH_ENGINE_PROJECT` | Future Earth Engine project |
| `CORS_ORIGINS` | Comma-separated allowed frontend origins |
| `DISEASE_MODEL_PATH` | Optional path to a compatible scikit-learn image-feature classifier |
| `DISEASE_MODEL_TYPE` | Image model adapter type; currently `sklearn` |
| `DISEASE_IMAGE_MAX_MB` | Maximum accepted crop image size; defaults to 10 MB |

Frontend:

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | API base URL; defaults to `http://localhost:8000/api` |
| `VITE_DEMO_MODE` | Documents intended demo behavior |

Hosted Site runtime (optional configured image model):

| Variable | Purpose |
|---|---|
| `DISEASE_MODEL_URL` | HTTPS endpoint for a configured crop-image classifier |
| `DISEASE_MODEL_API_KEY` | Optional bearer credential for that classifier; store as a Site secret |

Do not use the development JWT default in a shared environment. Never commit `.env` files.

## MySQL setup

Set the backend URL and create the named database/user first:

```text
DATABASE_URL=mysql+pymysql://user:password@localhost:3306/krishiniti
```

SQLAlchemy creates the MVP schema on startup, and `python seed.py` adds idempotent demo records.

## Docker Compose

Docker starts MySQL, seeds and serves FastAPI, builds the React frontend, and proxies `/api` to the backend:

```bash
docker compose up --build
```

Open `http://localhost:3000`. Swagger remains available at `http://localhost:8000/docs`.

For anything beyond a local demo, set a strong `JWT_SECRET`, rotate database credentials and move secrets outside the compose file.

## Key API endpoints

```text
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me
PUT    /api/auth/language

GET    /api/farms
POST   /api/farms
GET    /api/farms/{id}
PUT    /api/farms/{id}
DELETE /api/farms/{id}

GET    /api/fields/farm/{farm_id}
GET    /api/fields/{id}
POST   /api/fields
PUT    /api/fields/{id}
DELETE /api/fields/{id}

POST   /api/crops/recommend
POST   /api/profit/optimize
GET    /api/weather/{field_id}
GET    /api/ndvi/{field_id}
GET    /api/ndvi/{field_id}/history
GET    /api/diseases/crops
GET    /api/diseases/symptoms/{crop_id}
POST   /api/diseases/analyze
POST   /api/diseases/analyze-image
GET    /api/advisories/{field_id}
GET    /api/notifications
PUT    /api/notifications/{id}/read
GET    /api/dashboard
```

Except registration, login and health, farmer data endpoints require a bearer token. Farm and field lookups join through the authenticated user, preventing cross-farmer access.

## Recommendation and profit logic

The deterministic fallback combines:

| Signal | Weight |
|---|---:|
| Soil suitability | 25% |
| Weather suitability | 20% |
| Season suitability | 15% |
| Water suitability | 10% |
| Yield potential | 10% |
| Market opportunity | 10% |
| Inverse risk | 10% |

Then, for each crop:

```text
Expected revenue = expected yield × sample market price × field area
Total cost       = per-acre input costs × field area
Expected profit  = expected revenue − total cost
Risk-adjusted    = expected profit − risk penalty
```

The baseline yield service reports `transparent-baseline-v1`; it never pretends a trained model is running. `app/ml/crop_model.py` is the explicit plug-in boundary for a future fitted Random Forest or Gradient Boosting model.

## NDVI and crop concern guidance

- NDVI labels are configurable interpretation bands, not universal diagnostic thresholds.
- A decline triggers a prompt to inspect irrigation, weather, nutrients and visible symptoms.
- The symptom engine ranks possible crop-specific issues by weighted overlap.
- Image analysis validates JPG/PNG/WebP uploads up to 10 MB and preprocesses them into reusable color/texture features.
- A configured compatible model is used when available; otherwise the result is explicitly labelled as a demo image heuristic, not a trained diagnostic model.
- Results use “possible issue” and always include the advisory-only disclaimer.

## Tests

```bash
cd backend
pytest -q

cd ../frontend
pnpm test
pnpm run lint
pnpm run build
```

The suites cover registration/login, ownership, persistent farm and field workflows, polygon validation, calculations, crop and image advisory safeguards, immediate language switching, and all four language dictionaries.

## Demo mode and graceful degradation

With `DEMO_MODE=true`, Krishiniti provides:

- Demo Farmer in Ahmedabad
- A realistic agricultural field polygon
- Loamy soil (N 75, P 42, K 55, pH 6.8, moisture 38%)
- Eight crops with requirements, costs and sample prices
- Weather, irrigation advice and an eight-point NDVI series
- Crop-specific disease and symptom records
- Advisories and notifications

Provider selection follows this pattern:

```text
credentials available → real provider
credentials missing   → mock provider → application continues
```

## Limitations and responsible-use notice

- **Financial figures are estimates, not guaranteed returns.** Demo prices are not live mandi prices.
- **Crop concern matching is advisory only, not a confirmed diagnosis.** Consult a qualified local agricultural expert when symptoms are severe, unusual or spreading.
- **NDVI is a vegetation-condition/stress indicator.** It does not confirm a disease, pest or nutrient deficiency.
- Demo weather, market, satellite and agronomic values are representative sample data, not field-verified observations.
- The current area method is appropriate for farm-scale polygons; a geodesic library should be used for very large or cross-zone polygons.
- Real Earth Engine, weather and market adapters are intentionally left behind interfaces until credentials and provider contracts are chosen.

## Future improvements

- Earth Engine Sentinel-2 cloud masking and field raster tiles
- Reviewed translations for a broader advisory catalogue
- Mandi price history and volatility modeling
- Crop-stage-specific evapotranspiration and irrigation schedules
- Offline-first sync, SMS/push notifications and agronomist escalation
- Fitted crop/yield models with dataset cards, evaluation and drift monitoring

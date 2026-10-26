# Gram Yojana · ग्राम योजना

A 3D village-planning game for Gram Panchayat Development Plans (GPDP). Players draw roads on a 3D model of a village, spend from a limited resource envelope, and get a tentative estimate.

**What works in this first slice:** 3D village (extruded footprints, roads), road tool with live cost and live 3D rebuild, resource-envelope budget row, duplicate-road rejection, measure tool, undo/redo, plan saved on the device ("Continue my plan"), Hindi/English toggle, optional drone-photo overlay, GeoJSON upload.
**Still to come (toolbar shows them as "coming soon"):** streetlights with day/night slider, drainage, water pipeline, toilets, building measurement labels, walkthrough/fly-through camera, gamification and Gram Sabha mode, plan PDF and share link, 2D overview map, Supabase login and sync.

## 1. Run the app (no backend needed)

```bash
npm install
npm run dev        # open the printed URL on your phone (same Wi-Fi)
```

Without any env variables the app uses the built-in sample village and does all cost and duplicate maths in the browser.

## 2. Run the Python service (optional)

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Copy `.env.example` to `.env` and keep `VITE_API_URL=http://localhost:8000`. Every call has a 2.5 s timeout and falls back to the browser version, so if the service is down the game carries on.

| Endpoint | Purpose |
|---|---|
| `POST /estimate/road` | cost from type, width, thickness, shoulder, length |
| `POST /roads/duplicate-check` | buffer overlap against existing and planned roads (Shapely) |
| `POST /streetlights/illumination` | lux along a road, best spacing, install and running cost (for the streetlight tool) |

## 3. Set up Supabase

1. Create a project, then in the SQL editor run, in order:
   `supabase/migrations/001_schema.sql` (tables, PostGIS, RLS), `002_seed.sql` (rate card and envelopes), `supabase/seed_village.sql` (sample village footprints and roads).
2. Put the project URL and anon key into `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
3. The app does not read from Supabase yet; wiring the village list, plans and leaderboard to it is part of the next steps.

Rebuild the sample data any time with `python3 scripts/make_sample.py`.

## 4. Import SVAMITVA (or any) GeoJSON

On the home screen tap **Bring your own village** and choose a `.geojson` / `.json` file.

- **Polygons** become buildings. Recognised properties: `height_m` / `height`, `floors`, `roof_type` / `roof` (RCC, Tiled, Tin, Thatch; anything else becomes RCC), `hamlet`.
- **Lines** become existing roads. Recognised: `road_type` / `surface` (CC, BT, WBM, otherwise Gravel), `width_m` / `width`.
- Coordinates can be longitude/latitude (WGS84) or an already projected system in metres (e.g. UTM); the importer picks the right one and centres the village at (0, 0).
- Optional top-level `properties`: `name`, `gram_panchayat`, `district`, `state`.

Uploaded villages live in memory for the session. For Supabase, convert with `ogr2ogr` or load through the same column names as `buildings` and `roads`.

## 5. Wrap for Android with Capacitor

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init "Gram Yojana" in.gramyojana.app --web-dir=dist
npm run build
npx cap add android
npx cap sync
npx cap open android      # build and run from Android Studio
```

After every web change: `npm run build && npx cap sync`. If you use the Python service from the phone, set `VITE_API_URL` to a reachable `https://` address before building (Android blocks plain http by default).

## Notes

- Rates in `src/lib/cost.ts` and `backend/main.py` are **illustrative**. A real GPDP estimate must use the district's Schedule of Rates.
- The app is not yet tested on a physical phone. The bundle is about 290 KB gzipped, mostly three.js.

# Deploy StayCore on Render

The Render Blueprint in `render.yaml` creates a Django API, a PostgreSQL
database, and a React static site. It uses Render's free web-service and
PostgreSQL tiers for a demo. Free PostgreSQL is temporary and expires; do not
use it for important or production data. Select a persistent paid PostgreSQL
plan before deploying if the data needs to be retained.

## Deploy

1. Push this repository to GitHub and choose **New + → Blueprint** in Render.
   Connect the repository and let Render read `render.yaml`.
2. After the first deploy, set both of these environment variables on
   `staycore-api` to the exact HTTPS URL of `staycore-frontend` (for example,
   `https://staycore-frontend.onrender.com`):
   - `CORS_ALLOWED_ORIGINS`
   - `CSRF_TRUSTED_ORIGINS`
3. Set `VITE_API_URL` on `staycore-frontend` to the API's HTTPS URL followed
   by `/api` (for example, `https://staycore-api.onrender.com/api`). Because
   Vite embeds this value at build time, save it and trigger a frontend
   deploy.
4. Confirm the API's `ALLOWED_HOSTS` includes its Render hostname. The backend
   adds Render's `RENDER_EXTERNAL_HOSTNAME` automatically; add any custom API
   domain to `ALLOWED_HOSTS` as well.
5. In the Render API service shell, run
   `python manage.py createsuperuser` to create the first administrator.

The API service runs database migrations when it starts. Render builds and
deploys the frontend separately, and the static-site rewrite supports
client-side routes such as the login and dashboard pages.

## Local development

The frontend continues to default to `http://127.0.0.1:8000/api` when
`VITE_API_URL` is unset. Set `VITE_API_URL` to override that default during
local development.

## Existing local data

Render's PostgreSQL database starts empty; the local `backend/db.sqlite3` is
not deployed or imported. Export and migrate any data that must be retained
before switching users to the hosted service. The free PostgreSQL service can
expire, so back up demo data and upgrade to a persistent plan before relying on
the application.

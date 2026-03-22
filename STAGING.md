# Staging Deployment

## Target layout

- Web frontend: Vercel
- Backend API: Render
- Database: MongoDB Atlas
- Android APK: EAS Build

## Backend on Render

Create a Render web service from the `backend` directory.

- Runtime: Node
- Build command: `npm install`
- Start command: `npm start`
- Health check path: `/api/health`

Set these environment variables on Render:

- `NODE_ENV=staging`
- `MONGO_URI`: your MongoDB Atlas SRV connection string
- `JWT_SECRET`: a long random secret
- `CLIENT_URL`: your primary Vercel staging URL, with no trailing slash
- Optional `CLIENT_URLS`: comma-separated allowed origins if you use multiple exact frontend domains
- Optional `CLIENT_URL_PATTERNS`: comma-separated regex patterns for preview URLs when the exact hostname changes
- Optional `MPESA_CALLBACK_URL`: `https://<your-render-service>.onrender.com/api/payments/mpesa/callback`

Example preview pattern for `https://errands-beta.vercel.app` style URLs:

`CLIENT_URL_PATTERNS=^https://errands(-[a-z0-9-]+)?\\.vercel\\.app$`

A template is in `backend/.env.render.example`.

## MongoDB Atlas

Create an Atlas cluster and a database user, then copy the SRV connection string into Render as `MONGO_URI`.
Allow network access from your Render backend. During initial setup, `0.0.0.0/0` is the simplest option; narrow it later if you want stricter access.

## Web frontend on Vercel

Deploy the `web-frontend` directory as a Vite project on Vercel.

Set this environment variable on Vercel:

- `VITE_API_URL=https://<your-render-service>.onrender.com/api`

The SPA rewrite config is in `web-frontend/vercel.json`, and the env template is in `web-frontend/.env.vercel.example`.

## Mobile APK with EAS

The mobile build profiles now use EAS environments instead of hard-coded URLs.

Create these variables in Expo/EAS project settings:

- Development environment: `API_URL` for your local or dev API
- Preview environment: `API_URL=https://<your-render-service>.onrender.com/api`
- Production environment: `API_URL=https://<your-production-api>/api`
- Any environment that needs maps: `GOOGLE_MAPS_API_KEY`

Build commands:

- `eas build --platform android --profile staging-apk`
- `eas build --platform android --profile production`

## Local mobile development

The Expo fallback is now `http://localhost:5000/api`. For testing on a physical phone, start Expo with a reachable LAN or tunnel URL instead of relying on the fallback, for example:

`API_URL=http://192.168.100.94:5000/api npm start`

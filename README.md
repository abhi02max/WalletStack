# WalletStack

WalletStack is a personal finance and market-intelligence platform with live
equity research, virtual trading, portfolio tracking, budgeting, goals, and
AI-assisted financial insights.

## Stack

- React, Vite, TanStack Query, Clerk, and Lightweight Charts
- Node.js, Express, MongoDB, Redis, and OpenRouter
- DigitalOcean App Platform deployment in Bangalore

## Local Development

1. Copy `.env.example` to `.env` and add the backend credentials.
2. Copy `frontend/.env.example` to `frontend/.env`.
3. Install dependencies with `npm ci` and `npm --prefix frontend ci`.
4. Start the API with `npm run dev`.
5. Start the frontend with `npm --prefix frontend run dev`.

## Production Deployment

The `.do/app.yaml` specification deploys the frontend and API as one
DigitalOcean App Platform application:

- `/api/*` routes to the Express service.
- All other paths route to the static React application.
- Both components deploy from `abhi02max/WalletStack` on pushes to `main`.
- The app runs in Bangalore (`blr`) to minimize latency for Indian users.

Before the first deployment, add these API runtime variables in DigitalOcean:

`MONGODB_URI`, `UPSTASH_REDIS_URL`, `CLERK_SECRET_KEY`,
`CLERK_PUBLISHABLE_KEY`, `OPENROUTER_API_KEY`, `OPENROUTER_MODELS`,
`RESEND_API_KEY`, and the configured market-data API keys.

Add `VITE_CLERK_PUBLISHABLE_KEY` to the `web` component as a build-time
variable. Optional observability variables are documented in the example
environment files. Never commit `.env` files or production secrets.

After the first successful deployment, attach the chosen custom domain in
DigitalOcean App Platform and configure it as an allowed production origin in
Clerk. The frontend uses `/api` by default, so requests remain on the same
origin and do not require a separate API hostname.

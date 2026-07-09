# Fitness Nation EOS

Rebuilt EOS tracker for Fitness Nation. Replaces the Replit app with an API-fed dashboard.

Stack: Next.js 14 (App Router) + Supabase (Postgres, Auth) + Railway (hosting + cron).

## Pages

Dashboard, Scorecard (with 13-week trend sparklines + CSV export), Rocks, Issues, To-Dos, L10 Meeting (timer, agenda, ratings), Weekly Update (manual actuals), Quarter Setup (auto-generates linear weekly targets), History (meetings + sync log).

## Data flow

1. Zapier (works today): existing GymSales Zap posts to `POST /api/ingest/zapier`
   with header `x-webhook-secret: $WEBHOOK_SECRET`. Bodies:
   - `{ "event_type": "lead_created", "external_id": "<id>", "occurred_at": "<iso>" }`
   - `{ "event_type": "sale_made", ... }` / `pif_sale_made` / `cancellation`
   - `{ "event_type": "metric_value", "metric_key": "dd_members", "value": 2556 }`
2. Direct APIs (when credentials arrive): hourly Railway cron calls `GET /api/sync`
   with `Authorization: Bearer $CRON_SECRET`. Adapters: GymSales, ClubFit (template until docs), Google Places.
3. Aggregation maps events to weekly actuals and computes derived metrics
   (net growth, close ratio, total revenue, avg fee, churn, ARPM, LTV).
4. Anything not API-fed is entered in Weekly Update. Sync never overwrites a manual value with zero.

## Deploy (Railway)

1. Push this folder to a GitHub repo, create a Railway service from it.
2. Set env vars from `.env.example` (Supabase URL/keys, WEBHOOK_SECRET, CRON_SECRET).
3. Add a Railway cron job (hourly): `curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://<app-url>/api/sync`
4. Supabase schema is already applied to project `nexyzlfaizcdnmstgiqv` (Fitness Nation EOS, Sydney).
   Migrations also live in `supabase/migrations/` for reference.

## Team logins

Create users in Supabase Dashboard → Authentication → Add user (email + password), then link them:
`update team_members set auth_user_id = '<auth uid>', email = '<email>' where name = 'Krystle';`

## API access still to request

- GymSales: email help@gymsales.net for API credentials (see `docs/api-request-emails.md`)
- ClubFit: email support@clubfitsoftware.com.au (see same file)
- Google: create a Places API key + find the gym's Place ID

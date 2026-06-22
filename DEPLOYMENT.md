# WeStack API Deployment Guide

How to deploy the WeStack backend with two environments — **staging** (what the
TestFlight beta uses) and **production** (the App Store release) — so beta data
never touches real data. The Express app runs on
[Render](https://render.com); Postgres is hosted on
[Supabase](https://supabase.com).

---

## Architecture

One Render **project** (`westack`) contains two **environments**, each a web
service that connects to its **own Supabase project**:

| App build | EAS profile | API URL (example) | Render environment | Deploys from | Database (Supabase project) |
|-----------|-------------|-------------------|--------------------|--------------|------------------------------|
| TestFlight beta | `preview` | `https://westack-api-staging.onrender.com` | `staging` | `staging` branch | staging Supabase project |
| App Store release | `production` | `https://westack-api.onrender.com` | `production` | `main` branch | production Supabase project |

- Postgres is **not** provisioned by Render. Each Render service points at a
  separate Supabase project via a `DATABASE_URL` secret, so beta data lives in a
  different database from production data.
- `permissions.protection: enabled` on production requires a workspace admin to
  make destructive changes to the service.

All of this is declared in [`render.yaml`](./render.yaml).

---

## Why this works (and what local-only setups miss)

A TestFlight build runs on real devices, so:

1. **The API must be public over HTTPS.** `localhost` is unreachable from a
   phone, and iOS App Transport Security blocks plain `http://` in a TestFlight
   build (often with no visible error). Render gives every service a free
   `*.onrender.com` HTTPS subdomain.
2. **CORS is irrelevant for the native app.** Browsers enforce CORS; native
   `fetch` does not. Only configure `CORS_ALLOWED_ORIGINS` if you also ship an
   Expo *web* build.

The backend was made deployment-ready for this:

- Binds to the platform-injected `PORT` (falls back to `SERVER_PORT`, then `3000`).
- Honors `TRUST_PROXY` so rate limiting keys on the real client IP behind
  Render's load balancer.
- Accepts a `DATABASE_URL` connection string (Supabase provides one per
  project), falling back to discrete `POSTGRES_*` vars locally.
- Supports `POSTGRES_SSL` for TLS connections to managed Postgres (Supabase
  requires TLS).

---

## Database bootstrap (important)

`init.sql` is the **canonical, destructive bootstrap** — it `DROP`s and
recreates tables. It is **not** run on boot. On startup the app only runs
`ensureDatabaseSchema()`, which performs *incremental* migrations and does
**not** create the core tables (`users`, `stacks`, `substacks`,
`transactions`, `notifications`, `sessions`, `affiliations`, ...).

Therefore each fresh Supabase project (staging and production) must be
initialized **once** with `init.sql`.

`init.sql` uses `gen_random_uuid()`, which is available on **PostgreSQL 13+** —
Supabase ships this, so no specific major version is pinned.

> Running `init.sql` against a database that already has data will erase it. Run
> it only on a brand-new Supabase project.

---

## First-time deploy

### 1. Create the Supabase projects

Create **two** Supabase projects — one for staging, one for production. For each,
copy the **Session pooler** connection string (Project → Connect → "Session
pooler"). It looks like:

```
postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
```

Prefer the Session pooler (port `5432`) over the direct connection: it is
IPv4-reachable from Render and suits a long-lived `pg` Pool. Keep these strings
for steps 2 and 3.

### 2. Push the Blueprint

Commit and push `render.yaml`, then in the Render dashboard:
**New → Blueprint** → select this repository. Render provisions both
environments and both web services (no databases — those live on Supabase).

### 3. Provide secrets

Render prompts for every `sync: false` variable. Set at minimum:

| Variable | Notes |
|----------|-------|
| `DATABASE_URL` | The Supabase Session pooler string for **that environment** (staging string on staging, production string on production). |
| `CYBRID_CLIENT_ID`, `CYBRID_CLIENT_SECRET` | Cybrid credentials (sandbox for staging, live for production). |
| `CYBRID_API_BASE`, `CYBRID_AUTH_URL` | Production only; defaults to sandbox in code if unset. |
| `OTP_SMS_WEBHOOK_URL`, `OTP_EMAIL_WEBHOOK_URL`, `OTP_PROVIDER_AUTH_TOKEN` | Point at your deployed `otp-relay`. Optional for early beta (see OTP section). |

`OTP_HASH_SECRET` is auto-generated per environment; `NODE_ENV`, `POSTGRES_SSL`,
and `TRUST_PROXY` are set automatically by the Blueprint.

### 4. Initialize each database (once)

Using the Supabase connection strings from step 1, run `init.sql` against each
project once:

```bash
# Staging
psql "<staging supabase connection string>" -f init.sql

# Production
psql "<production supabase connection string>" -f init.sql
```

### 5. Verify

```bash
curl https://westack-api-staging.onrender.com/health
curl https://westack-api.onrender.com/health
# Expected: {"code":200,"data":null,"message":"OK"}
```

---

## OTP delivery for beta testers

In production (`NODE_ENV=production`) the dev OTP helpers are disabled — testers
must receive real codes. Options:

- **Recommended:** deploy `otp-relay` (see [`otp-relay/README.md`](./otp-relay/README.md))
  with real Twilio/SendGrid keys, then set `OTP_SMS_WEBHOOK_URL`,
  `OTP_EMAIL_WEBHOOK_URL`, and `OTP_PROVIDER_AUTH_TOKEN` on the backend.
- **Interim (less secure):** for a closed beta you may run staging with a fixed
  code so testers don't need real SMS. This requires `NODE_ENV` ≠ `production`
  plus `OTP_DEV_EXPOSE=true` (or `OTP_DEV_LOG=true`) and `OTP_DEV_FIXED_CODE`.
  Never use this in production.

---

## Frontend wiring (separate Expo repo)

The TestFlight binary bakes in a single API URL, so select it per EAS build
profile rather than hardcoding.

`eas.json`:

```json
{
  "build": {
    "preview": {
      "distribution": "internal",
      "ios": { "simulator": false },
      "env": { "EXPO_PUBLIC_API_BASE_URL": "https://westack-api-staging.onrender.com" }
    },
    "production": {
      "env": { "EXPO_PUBLIC_API_BASE_URL": "https://westack-api.onrender.com" }
    }
  }
}
```

API client:

```ts
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3000";
```

Build the TestFlight beta against **staging**:

```bash
eas build --profile preview --platform ios
```

The eventual App Store build uses `--profile production`.

> The URL must be **HTTPS**, or iOS will block API calls in the TestFlight build.

---

## Day-to-day

- **Deploys:** production auto-deploys from `main`; staging auto-deploys from the
  dedicated `staging` branch (see `render.yaml`). Promote a release by merging
  `staging` into `main`. Push beta changes to `staging` to ship them to the
  TestFlight build's API without touching production.
- **Schema changes:** add incremental, idempotent migrations to
  `ensureDatabaseSchema()` in `src/main/ts/libs/postgresDB.ts` (runs on every
  boot). Do **not** re-run `init.sql` against a database with real data.
- **Secrets rotation:** update values in the Render dashboard; redeploy to apply.

---

## Environment variable reference

See [`.env.example`](./.env.example) for the full list. Production-relevant ones:

| Variable | Purpose |
|----------|---------|
| `PORT` | Injected by Render; takes precedence over `SERVER_PORT`. |
| `DATABASE_URL` | Supabase Session pooler connection string; overrides discrete `POSTGRES_*`. |
| `POSTGRES_SSL` | `true` to use TLS to managed Postgres. |
| `POSTGRES_SSL_REJECT_UNAUTHORIZED` | `true` only with a trusted CA bundle. |
| `TRUST_PROXY` | `1` behind Render's load balancer (correct client IPs for rate limiting). |
| `NODE_ENV` | `production` disables dev OTP exposure. |
| `OTP_HASH_SECRET` | Long random secret (auto-generated by the Blueprint). |
| `OTP_*_WEBHOOK_URL`, `OTP_PROVIDER_AUTH_TOKEN` | Real OTP delivery via `otp-relay`. |
| `CYBRID_*` | Cybrid API credentials and endpoints. |

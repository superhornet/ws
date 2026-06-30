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

## Database schema (migrations)

Schema is managed by [`node-pg-migrate`](https://github.com/salsita/node-pg-migrate).
Migration files live in [`migrations/`](./migrations) and are the **single source
of truth** for the schema. They are applied with `npm run migrate`, which runs
each pending migration exactly once (tracked in a `pgmigrations` table) and is a
no-op when the database is already up to date. The app **never** mutates schema
on boot, and Render deploys do **not** apply schema changes automatically.

For staging and production, database creation and modification are explicit
maintenance operations: take a database backup, put the environment in the
intended maintenance posture, run the migration command, verify the app, then
resume traffic. A fresh Supabase project is initialized by running the baseline
migration once before the first deploy. The migrations use `gen_random_uuid()`,
available on **PostgreSQL 13+** (Supabase ships this), so no specific major
version is pinned.

If a database was already created with the old `init.sql` / startup schema path,
do not run the baseline migration directly against it. During the maintenance
window, compare the live schema against `migrations/1700000000000_baseline-schema.sql`
and either apply a corrective migration or manually record the baseline in
`pgmigrations` only after the schema shape is verified.

> To add a schema change, add a new migration file under `migrations/` (a new
> timestamped `*.sql` with `-- Up Migration` / `-- Down Migration` sections).
> Never edit an already-applied migration, and never rely on app startup or
> deploy hooks to alter staging/production tables.

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

### 4. Initialize each database

Before the first deploy, initialize each brand-new Supabase project by pointing
the connection at it and running the migrator:

```bash
# Staging
DATABASE_URL="<staging supabase connection string>" POSTGRES_SSL=true npm run migrate

# Production
DATABASE_URL="<production supabase connection string>" POSTGRES_SSL=true npm run migrate
```

For an existing database that already has the old schema, do not recreate tables.
Verify the live schema against the baseline during the maintenance window, then
record the baseline only after that verification is complete.

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
- **Schema changes:** add a new migration file under `migrations/` (a new
  timestamped `*.sql` with `-- Up Migration` / `-- Down Migration` sections).
  Apply it during an explicit maintenance window after taking a database backup;
  deploys do not run migrations automatically. Never edit a migration that has
  already been applied to staging or production.
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

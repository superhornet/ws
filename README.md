# ws

## The backend application for WeStack

Intended implementation will handle the following components & services

* TypeScript
* Express.js
* NodeJS
* Unit Tests via node:test
* BDD via cucumber-ts
* TypeDoc
* Code Coverage via node:test
* Mermaid for diagrams

Possible implementation of ProtoBuf.

Possible implementation of Web interface running on NGINX.

Possible implementation of Flutter UI.

## Environment

The app reads configuration from the **process environment** — `index.ts` does not
load dotenv. In production the deploy platform injects the vars. For local runs the
`start`, `dev`, `migrate*`, and `test`/`testWithCoverage` npm scripts load a `.env`
file for you via Node's `--env-file-if-exists=.env`, so they "just work" when a `.env`
is present and fall back to the process env when it isn't. Provide either a single
`DATABASE_URL` (managed hosts like Render/Supabase — takes precedence) **or** the
discrete `POSTGRES_*` vars.

Example local env file (e.g. `.env`) matching the bundled `docker-compose` Postgres:

```env
NODE_ENV=development
# Server port: PORT (platform-injected) or SERVER_PORT (local)
SERVER_PORT=3000
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=westack
POSTGRES_PASSWORD=westack_local_dev
POSTGRES_DATABASE=westack
# Required by the OTP flow
OTP_HASH_SECRET=local-dev-only
# Dev-only OTP shortcuts so you can log in without a real SMS/email provider:
# expose the code in the API response and/or force a fixed code (see "Local auth").
OTP_DEV_EXPOSE=true
OTP_DEV_FIXED_CODE=000000
# Optional pool tuning
POSTGRES_MAX=10
POSTGRES_IDLETIMEOUT=30000
POSTGRES_CONNECTIONTIMEOUT=2000
# Optional: enable TLS for a managed database
# POSTGRES_SSL=true
# POSTGRES_SSL_REJECT_UNAUTHORIZED=true
```

Cybrid (`CYBRID_CLIENT_ID`, `CYBRID_CLIENT_SECRET`) and Privy (`PRIVY_APP_ID`,
`PRIVY_APP_SECRET`) credentials are additionally required for those integrations.

The tracked **[`.env.example`](./.env.example)** documents every supported variable
(including `CORS_ALLOWED_ORIGINS`, `TRUST_PROXY`, and the full `OTP_*` family below).
Copy it to start: `cp .env.example .env`, then fill in the values.

## Payment Dependencies

* Moonpay
* Stripe

## Database Dependencies

* PostgreSQL

## Node.js Dependency

Production and local dev target **Node 24 LTS** (the `Dockerfile` uses
`node:24-alpine`; `package.json` pins `"engines": { "node": ">=24 <25" }`).

```bash
nvm install 24
nvm use 24
```

## Running the app

### Option A — Everything in Docker (app + Postgres)

`docker compose up` builds and starts both the app and a local Postgres, applies
pending migrations, and serves the API on `http://localhost:3000`. This stack is
self-contained: the app always talks to the local `postgres` service, never
whatever your host env points at. Docker Desktop must be installed and running.

```bash
docker compose up --build
```

Verify: `curl http://localhost:3000/health` → `{"code":200,...,"message":"OK"}`.
Stop with `docker compose down` (add `-v` to also delete the database volume).

### Option B — Postgres in Docker, app on the host

Start only the database, then run the app on the host pointing at it. The `dev`,
`start`, `migrate`, and `test` scripts all auto-load `.env` (via
`--env-file-if-exists`), so no explicit env flags are needed:

```bash
docker compose up -d postgres                          # Postgres on localhost:5432
npm run migrate                                        # compile + apply schema (auto-loads .env)
npm run dev                                             # build + start with watch (auto-loads .env)
```

`npm run dev` (nodemon) rebuilds and restarts on any change under `src/`. Use
`npm start` to run the already-built `dist/` once, without watching.

> **Gotcha — `auth_failed` / "role does not exist":** Postgres only applies
> `POSTGRES_USER`/`POSTGRES_PASSWORD` when it first initializes its data volume. If
> an older volume was created with different credentials, logins fail. Reset the
> local volume with `docker compose down -v && docker compose up -d postgres`, then
> re-run the migration.

## Local database access via CLI

```bash
docker exec -it westack_postgres psql -U westack -d westack
```

## Smoke-test requests

```http
GET http://localhost:3000/health HTTP/1.1

GET http://localhost:3000/api/session HTTP/1.1
```

## Using the app — local auth (OTP)

Data routes require a session UUID (passed in the `X-Session` header on newer
endpoints), and most now require that session to be **bound to a user**. Auth is
passwordless one-time codes. The dev shortcut (`OTP_DEV_EXPOSE=true`, non-production)
returns the code in the response as `data.dev_otp` so you can log in without a real
SMS/email provider; `OTP_DEV_FIXED_CODE=000000` makes it a known constant.

1. **Create a session** — `GET /api/session` returns a session UUID in `data`.
2. **Start OTP** — `POST /api/otp/phone/start` with the `X-Session` header and body
   `{ "phone": "+15555550123", "purpose": "signup" }`. The response carries an
   `otp_request_id` (and `dev_otp` in dev-expose mode). `purpose` is one of
   `signup`, `login`, `recovery_email`. Email uses `/api/otp/email/start` with
   `{ "email": "...", "purpose": "..." }`.
3. **Verify** — `POST /api/otp/phone/verify` with
   `{ "otp_request_id": "...", "phone": "+15555550123", "code": "000000", "purpose": "signup" }`.
   On success the session is bound to the user.
4. **Call protected routes** — send the same session UUID in `X-Session`; it now
   resolves to that user and passes object-level authorization.

## Running the tests

The suite in `src/test/ts/*.Test.ts` runs end-to-end against a **live** Postgres.
`npm test` auto-loads `.env` (via `--env-file-if-exists`), so it targets whatever that
file points at — keep it a **disposable** database, because the suite
creates/updates/deletes real rows. Never point it at a production DB.

```bash
docker compose up -d postgres
npm run migrate                                        # apply schema (auto-loads .env)
npm test
```

## Database schema

Schema is managed with `node-pg-migrate`; migration files live in `migrations/`.
Apply them with:

```bash
npm run migrate
```

`docker compose up` runs this automatically against the local Postgres before
starting the app.

If you are pointing at a database that already has the legacy schema but no
`pgmigrations` table, follow the maintenance/adoption guidance in
[`DEPLOYMENT.md`](./DEPLOYMENT.md) before migrating.

# WeStack API Frontend Integration Guide

This document is intended for an agent working on a separate frontend project (including React Native). It describes how to call the API exposed by this backend repository.

## Project Context

- Product/API name: WeStack API, backend for StackIt.cash.
- Runtime: Node.js, Express 5, TypeScript, ESM.
- Database: PostgreSQL.
- Default local base URL: `http://localhost:3000` when `SERVER_PORT=3000`.
- API entry point: `src/main/ts/index.ts`.
- Express wiring: `src/main/ts/App.ts`.
- Route controllers: `src/main/ts/controllers/*.ts`.

## Global Request Rules

Most application endpoints are mounted under `/api`.

Public routes (no session required):

- `GET /health`
- `GET /api/session`
- `DELETE /api/session`
- `POST /api/otp/phone/start`
- `POST /api/otp/phone/verify`

Email OTP routes and most other `/api/*` routes require a valid session. Send the session UUID in:

```http
X-Session: <session-uuid>
```

For `POST`, `PUT`, and `DELETE` on first-party endpoints, also include `session` in the JSON body (legacy controllers validate both).

Use JSON for mutation request bodies:

```http
Content-Type: application/json
```

Body size limit is `100kb`.

### Read endpoints (GET) — React Native compatible

These read endpoints accept parameters via **query string** and the session via **`X-Session` header**. Do **not** send a JSON body on these GET requests. This is required for React Native, whose `fetch` cannot send a body on GET.

| Endpoint | Query params |
|----------|-------------|
| `GET /api/me` | none (returns the session's bound user) |
| `GET /api/user` | `user_identifier` (must be the session's own user), optional `message` |
| `GET /api/stacks` | `owner_identifier` (must be the session's own user), optional `message` |
| `GET /api/stack/members` | `stack_identifier`, optional `message` |
| `GET /api/substacks` | `type` + identifier param, optional `message` |
| `GET /api/notifications` | `notification_for` (must be the session's own user), optional `message` |
| `GET /api/transactions` | `key`, `value`, optional `message` |
| `GET /api/recurring-deposits` | `key`, `value`, optional `message` |

Legacy callers may still send the same fields in a JSON body, but new frontend code should use query params.

These endpoints additionally enforce **ownership**: the session must be bound to
a user (see Session Flow), and the requested resource must belong to — or be
shared with — that user, otherwise the call returns `403`.

## Standard Response Envelope

Most handlers respond with:

```json
{
  "code": 200,
  "data": {},
  "message": "OK"
}
```

Common statuses:

| Code | Meaning |
|------|---------|
| `200` | Success |
| `201` | Created |
| `202` | Accepted / update success |
| `204` | No content (this API still sends a JSON body) |
| `400` | Bad request |
| `403` | Missing/invalid session, anonymous (unbound) session on an endpoint that needs a user, or accessing a resource the session's user does not own |
| `404` | Not found |
| `409` | Conflict (idempotency in-flight, or `POST /api/user` on an already-bound session) |
| `428` | Missing required idempotency key |
| `429` | Rate limited |
| `502` | OTP delivery provider failure |
| `500` | Server / upstream error |

### Validation & error behavior

All first-party `POST`/`PUT`/`DELETE` endpoints share one request flow
(`validate body/params → resolve session → authorize → audit → run → respond`),
so error handling is deterministic and consistent across every verb:

- **`400`** is returned when the body is missing/empty, a required query param or
  identifier is absent, or a resource's fields fail validation (e.g. an invalid
  name, email, or amount on create/update). Creates never return a success
  envelope with a `null` body — invalid input is rejected with `400`.
- **`400` takes precedence over `403`**: a malformed request is rejected before
  the session/authorization checks run.
- **`403`** is returned for a missing session, an anonymous (unbound) session on
  an endpoint that needs a user, or an attempt to touch a resource the session's
  user does not own or belong to.
- **`404`** is returned when the target resource does not exist (e.g. updating a
  stack/substack/notification/recurring-deposit that isn't found).
- A denied request (`403`) is **not** written to the audit log; the audit entry
  is recorded only after authorization passes.

## Session Flow

### Create Session

```http
GET /api/session
```

Auth: none.

Response:

```json
{
  "code": 200,
  "data": {
    "uuid": "session-uuid",
    "expires": "timestamp",
    "otp": "ABC123"
  },
  "message": "OK"
}
```

Store `data.uuid` and send it as `X-Session` on all authenticated requests.

Important: a session starts out **anonymous** (valid and unexpired, but not yet
tied to a user). It becomes **bound** to a user at one of two points:

- **Signup**: `POST /api/user` creates the user and binds the session to it.
- **Login**: a phone OTP `verify` whose phone maps to an existing user binds the
  session to that user.

Once bound, the session is the source of truth for "who am I", and authenticated
endpoints enforce that the session's user **owns or is a member of** the resource
being read or modified (their own user record, their stacks/substacks,
transactions on substacks they belong to, their notifications, etc.). Requests
that target another user's resources are rejected with `403`. A session can be
bound to only one user; calling `POST /api/user` again on a bound session
returns `409`.

Use `GET /api/me` (below) on app launch to recover the bound user from a stored
session.

### Delete Expired Sessions

```http
DELETE /api/session
```

Auth: none. Prunes expired sessions.

## OTP Login and Signup Flow

The mobile frontend should replace mock OTP checks with these endpoints.

Phone OTP is used for login/signup entry. It does not create a full user record. Email OTP is used for recovery email verification during signup and requires a valid session.

Production responses and logs do not include OTP codes. For local development only, `OTP_DEV_EXPOSE=true` and `NODE_ENV` not equal to `production` returns `data.dev_otp`; `OTP_DEV_LOG=true` logs local OTPs instead.

### OTP Rules

- Phone numbers must be E.164, e.g. `+15551234567`. Formatting characters are tolerated and normalized.
- Emails are trimmed and lowercased.
- OTP codes are cryptographically secure 6-digit numeric codes.
- OTPs expire after `OTP_TTL_MINUTES` minutes, default `10`.
- OTPs are single-use and allow up to `OTP_MAX_ATTEMPTS`, default `5`.
- Resend cooldown is `OTP_RESEND_AFTER_SECONDS`, default `30`.
- Start/verify routes are rate limited by IP + phone/email destination.

### Start Phone OTP

```http
POST /api/otp/phone/start
Content-Type: application/json
X-Session: <optional-existing-session>
```

Auth: none. If `X-Session` is valid it is reused; otherwise the backend creates a session and returns it.

Request:

```json
{
  "phone": "+15551234567",
  "purpose": "login"
}
```

`purpose` must be `login` or `signup`.

Response:

```json
{
  "code": 200,
  "data": {
    "otp_request_id": "<uuid>",
    "session": "<session-uuid>",
    "expires_at": "<iso timestamp>",
    "resend_after_seconds": 30
  },
  "message": "OK"
}
```

### Verify Phone OTP

```http
POST /api/otp/phone/verify
Content-Type: application/json
```

Auth: none.

Request:

```json
{
  "otp_request_id": "<uuid>",
  "phone": "+15551234567",
  "code": "123456",
  "purpose": "login"
}
```

Response:

```json
{
  "code": 200,
  "data": {
    "verified": true,
    "session": "<session-uuid>",
    "phone": "+15551234567",
    "existing_user_identifier": null
  },
  "message": "OK"
}
```

For `purpose=login`, `existing_user_identifier` is a user UUID when the verified phone maps to `users.phone_e164`; otherwise it is `null` so the frontend can continue signup. Verification does not create a user.

When `existing_user_identifier` is non-null (login), the returned `session` is
now **bound to that user** server-side, so subsequent authenticated calls act as
that user. When it is `null` (new phone), the session stays anonymous until
`POST /api/user` completes signup and binds it.

### Start Email OTP

```http
POST /api/otp/email/start
Content-Type: application/json
X-Session: <session-uuid>
```

Auth: valid session required.

Request:

```json
{
  "session": "<session-uuid>",
  "email": "user@example.com",
  "purpose": "recovery_email"
}
```

Response:

```json
{
  "code": 200,
  "data": {
    "otp_request_id": "<uuid>",
    "expires_at": "<iso timestamp>",
    "resend_after_seconds": 30
  },
  "message": "OK"
}
```

### Verify Email OTP

```http
POST /api/otp/email/verify
Content-Type: application/json
X-Session: <session-uuid>
```

Auth: valid session required. The OTP request must belong to this session.

Request:

```json
{
  "session": "<session-uuid>",
  "otp_request_id": "<uuid>",
  "email": "user@example.com",
  "code": "123456",
  "purpose": "recovery_email"
}
```

Response:

```json
{
  "code": 200,
  "data": {
    "verified": true,
    "email": "user@example.com"
  },
  "message": "OK"
}
```

### Frontend OTP Helpers

Phone start/verify do not need a session. Email start/verify should use `apiMutate` with the session.

```ts
async function apiPostPublic<T>(
  path: string,
  payload: Record<string, unknown>,
  extraHeaders?: Record<string, string>
): Promise<ApiResponse<T>> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...extraHeaders,
    },
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body?.message ?? `Request failed: ${res.status}`);
  return body;
}
```

Example phone login flow:

```ts
const start = await apiPostPublic<{
  otp_request_id: string;
  session: string;
  expires_at: string;
  resend_after_seconds: number;
}>("/api/otp/phone/start", {
  phone: "+15551234567",
  purpose: "login",
});

const verify = await apiPostPublic<{
  verified: true;
  session: string;
  phone: string;
  existing_user_identifier: string | null;
}>("/api/otp/phone/verify", {
  otp_request_id: start.data.otp_request_id,
  phone: "+15551234567",
  code: userEnteredCode,
  purpose: "login",
});
```

### Local Curl Smoke Tests

Run the backend with local OTP exposure enabled:

```bash
NODE_ENV=development OTP_DEV_EXPOSE=true OTP_DEV_LOG=false docker compose up -d --build
```

Phone OTP:

```bash
PHONE_START=$(curl -sS -X POST http://localhost:3000/api/otp/phone/start \
  -H "Content-Type: application/json" \
  -d '{"phone":"+15551234567","purpose":"login"}')

PHONE_OTP_REQUEST_ID=$(node -e "const r=JSON.parse(process.argv[1]); console.log(r.data.otp_request_id)" "$PHONE_START")
PHONE_CODE=$(node -e "const r=JSON.parse(process.argv[1]); console.log(r.data.dev_otp)" "$PHONE_START")

curl -sS -X POST http://localhost:3000/api/otp/phone/verify \
  -H "Content-Type: application/json" \
  -d "{\"otp_request_id\":\"$PHONE_OTP_REQUEST_ID\",\"phone\":\"+15551234567\",\"code\":\"$PHONE_CODE\",\"purpose\":\"login\"}"
```

Email OTP:

```bash
SESSION_RESPONSE=$(curl -sS http://localhost:3000/api/session)
SESSION_ID=$(node -e "const r=JSON.parse(process.argv[1]); console.log(r.data.uuid)" "$SESSION_RESPONSE")

EMAIL_START=$(curl -sS -X POST http://localhost:3000/api/otp/email/start \
  -H "Content-Type: application/json" \
  -H "X-Session: $SESSION_ID" \
  -d "{\"session\":\"$SESSION_ID\",\"email\":\"User@Example.COM\",\"purpose\":\"recovery_email\"}")

EMAIL_OTP_REQUEST_ID=$(node -e "const r=JSON.parse(process.argv[1]); console.log(r.data.otp_request_id)" "$EMAIL_START")
EMAIL_CODE=$(node -e "const r=JSON.parse(process.argv[1]); console.log(r.data.dev_otp)" "$EMAIL_START")

curl -sS -X POST http://localhost:3000/api/otp/email/verify \
  -H "Content-Type: application/json" \
  -H "X-Session: $SESSION_ID" \
  -d "{\"session\":\"$SESSION_ID\",\"otp_request_id\":\"$EMAIL_OTP_REQUEST_ID\",\"email\":\"user@example.com\",\"code\":\"$EMAIL_CODE\",\"purpose\":\"recovery_email\"}"
```

### Stacks / Substacks / Transactions Curl Smoke Tests

End-to-end flow (session → user → stack → substack → transaction) that exercises
the new `goal_amount`, `created_at`/`updated_at`, `users_list` (array), and
transaction `created_at`/`status` fields. Run against a fresh dev database
(provisioned with `npm run migrate`).

```bash
# 1. Session
SESSION_ID=$(curl -sS http://localhost:3000/api/session \
  | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).data.uuid))")

# 2. User
USER_ID=$(curl -sS -X POST http://localhost:3000/api/user \
  -H "Content-Type: application/json" -H "X-Session: $SESSION_ID" \
  -d "{\"session\":\"$SESSION_ID\",\"message\":\"smoke user\",\"data\":{\"firstname\":\"Ada\",\"lastname\":\"Lovelace\",\"email\":\"ada@example.com\",\"address1\":\"123 Main St\",\"address2\":\"\",\"city\":\"London\",\"state\":\"NA\",\"zipcode\":\"12345\",\"subscription_level\":\"Pro\"}}" \
  | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).data.user_identifier))")

# 3. Stack with a goal (cents) — response includes goal_amount, created_at, updated_at
STACK_ID=$(curl -sS -X POST http://localhost:3000/api/stack \
  -H "Content-Type: application/json" -H "X-Session: $SESSION_ID" \
  -d "{\"session\":\"$SESSION_ID\",\"message\":\"smoke stack\",\"data\":{\"stack_name\":\"Vacation\",\"owner_identifier\":\"$USER_ID\",\"goal_amount\":500000,\"emoji\":\"✈️\",\"category\":\"travel\"}}" \
  | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).data.stack_identifier))")

# 4a. Source substack (funded) — note users_list is returned as an array
SRC_ID=$(curl -sS -X POST http://localhost:3000/api/substack \
  -H "Content-Type: application/json" -H "X-Session: $SESSION_ID" \
  -d "{\"session\":\"$SESSION_ID\",\"message\":\"smoke source\",\"data\":{\"substack_name\":\"Unstacked\",\"stack_identifier\":\"$STACK_ID\",\"balance\":100000,\"users_list\":[\"$USER_ID\"]}}" \
  | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).data.substack_identifier))")

# 4b. Destination substack with its own goal
DST_ID=$(curl -sS -X POST http://localhost:3000/api/substack \
  -H "Content-Type: application/json" -H "X-Session: $SESSION_ID" \
  -d "{\"session\":\"$SESSION_ID\",\"message\":\"smoke dest\",\"data\":{\"substack_name\":\"Flights\",\"stack_identifier\":\"$STACK_ID\",\"balance\":0,\"users_list\":[\"$USER_ID\"],\"goal_amount\":200000}}" \
  | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).data.substack_identifier))")

# 5. List substacks — confirm users_list is string[] and goal/timestamp fields are present
curl -sS "http://localhost:3000/api/substacks?type=stack-id&stack_identifier=$STACK_ID" \
  -H "X-Session: $SESSION_ID"

# 6. Transaction ($25.50 decimal dollars) — response includes created_at and status
curl -sS -X POST http://localhost:3000/api/transaction \
  -H "Content-Type: application/json" -H "X-Session: $SESSION_ID" \
  -d "{\"session\":\"$SESSION_ID\",\"message\":\"smoke transfer\",\"data\":{\"initiated_by\":\"$USER_ID\",\"processor\":\"Internal\",\"transaction_type\":\"Credit\",\"amount\":25.50,\"from_identifier\":\"$SRC_ID\",\"to_identifier\":\"$DST_ID\",\"notation\":\"Move to flights\"}}"

# 7. List transactions — newest-first, each with created_at + status
curl -sS "http://localhost:3000/api/transactions?key=stack_identifier&value=$STACK_ID" \
  -H "X-Session: $SESSION_ID"

# 8. Members roster for the shared stack
curl -sS "http://localhost:3000/api/stack/members?stack_identifier=$STACK_ID" \
  -H "X-Session: $SESSION_ID"

# 9. Schedule + list a recurring deposit
curl -sS -X POST http://localhost:3000/api/recurring-deposit \
  -H "Content-Type: application/json" -H "X-Session: $SESSION_ID" \
  -d "{\"session\":\"$SESSION_ID\",\"message\":\"smoke recurring\",\"data\":{\"from_identifier\":\"$SRC_ID\",\"to_identifier\":\"$DST_ID\",\"amount_cents\":5000,\"frequency\":\"monthly\",\"next_run_at\":\"2026-07-01T00:00:00.000Z\"}}"

curl -sS "http://localhost:3000/api/recurring-deposits?key=substack_identifier&value=$DST_ID" \
  -H "X-Session: $SESSION_ID"
```

## Recommended API Client

```ts
const API_BASE_URL = "http://localhost:3000";

type ApiResponse<T> = {
  code: number;
  data: T;
  message: string;
};

async function apiGet<T>(
  path: string,
  session: string,
  params?: Record<string, string>
): Promise<ApiResponse<T>> {
  const url = new URL(`${API_BASE_URL}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }
  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { "X-Session": session },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body?.message ?? `Request failed: ${res.status}`);
  return body;
}

async function apiMutate<T>(
  method: "POST" | "PUT" | "DELETE",
  path: string,
  session: string,
  payload: Record<string, unknown>,
  extraHeaders?: Record<string, string>
): Promise<ApiResponse<T>> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Session": session,
      ...extraHeaders,
    },
    body: JSON.stringify({ session, ...payload }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body?.message ?? `Request failed: ${res.status}`);
  return body;
}
```

## First-Party Mutation Wrapper

`POST`, `PUT`, and `DELETE` endpoints expect:

```json
{
  "session": "<session-uuid>",
  "message": "audit log message",
  "data": {}
}
```

Some endpoints use additional top-level fields (e.g. `user_identifier` on `PUT /api/user`).

---

## Infrastructure Endpoints

### `GET /health`

Auth: none.

```json
{ "code": 200, "data": null, "message": "OK" }
```

---

## Audit

### `POST /api/audit`

Auth: required.

Body:

```json
{
  "session": "<session-uuid>",
  "message": "User viewed dashboard"
}
```

Response `201`.

---

## User Endpoints

```ts
type UserAPIType = {
  firstname: string;
  lastname: string;
  email: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zipcode: string | number;
  subscription_level: "Free" | "Basic" | "Pro";
  user_identifier?: string;
  affiliate?: string;
};
```

### `POST /api/user`

Creates a user.

```json
{
  "session": "<session-uuid>",
  "message": "Create user",
  "data": {
    "firstname": "Ada",
    "lastname": "Lovelace",
    "email": "ada@example.com",
    "address1": "123 Main St",
    "address2": "",
    "city": "London",
    "state": "NA",
    "zipcode": "12345",
    "subscription_level": "Free"
  }
}
```

Response `201`: created user with generated `user_identifier` and `affiliate`.
This also **binds the current session** to the new user. Calling it again on an
already-bound session returns `409`. Invalid name/email/address fields are
rejected with `400`.

### `GET /api/me`

Returns the user the current session is bound to. Use this on app launch to
restore the logged-in user from a stored session. Auth: bound session (sent as
`X-Session`); an anonymous (unbound) session returns `403`.

```http
GET /api/me
X-Session: <session-uuid>
```

Response `200`: the bound user record (same shape as `GET /api/user`).

### `GET /api/user`

Gets one user by UUID. **Query params only — no body.** A bound session may only
fetch **its own** user record; requesting another user's UUID returns `403`.

| Param | Required | Description |
|-------|----------|-------------|
| `user_identifier` | yes | User UUID |
| `message` | no | Audit log text |

```http
GET /api/user?user_identifier=<user-uuid>
X-Session: <session-uuid>
```

React Native:

```ts
await apiGet<UserAPIType>("/api/user", session, {
  user_identifier: userId,
});
```

Response `200`: user object.

### `PUT /api/user`

```json
{
  "session": "<session-uuid>",
  "message": "Update user",
  "user_identifier": "<user-uuid>",
  "data": { /* UserAPIType fields */ }
}
```

Ownership: `user_identifier` must be the session's own user, otherwise `403`.

Response `202`.

### `DELETE /api/user`

```json
{
  "session": "<session-uuid>",
  "message": "Delete user",
  "user_identifier": "<user-uuid>",
  "user": {}
}
```

Ownership: `user_identifier` must be the session's own user, otherwise `403`.

Response `204`. Soft-delete.

---

## Stack Endpoints

```ts
type StackAPIType = {
  stack_name: string;
  stack_identifier: string;
  owner_identifier: string;
  // Optional. Cents; null when unset.
  goal_amount?: number | null;
  // Optional. ISO timestamp; null when unset.
  goal_deadline?: string | null;
  // Read-only. ISO timestamps.
  created_at?: string | null;
  updated_at?: string | null;
  // Optional server-driven presentation metadata; null when unset.
  category?: string | null;
  emoji?: string | null;
};
```

`goal_amount` is in **cents** to match balances. `goal_amount`, `goal_deadline`,
`category`, and `emoji` are returned as `null` when unset. `created_at` /
`updated_at` are server-managed ISO timestamps. On `PUT`, omitted optional fields
are preserved (not cleared).

### `POST /api/stack`

```json
{
  "session": "<session-uuid>",
  "message": "Create stack",
  "data": {
    "stack_name": "Savings",
    "owner_identifier": "<user-uuid>",
    "goal_amount": 500000,
    "goal_deadline": "2026-12-31T00:00:00.000Z",
    "category": "travel",
    "emoji": "✈️"
  }
}
```

`goal_amount`, `goal_deadline`, `category`, and `emoji` are optional.

Ownership: the stack is always created for the **session's bound user**. Any
`owner_identifier` in the body is ignored and overwritten with that user, so the
session must be bound (signup/login) first or the call returns `403`.

Response `201`: stack with generated `stack_identifier`, plus `goal_amount`,
`goal_deadline`, `category`, `emoji` (`null` where unset), and `created_at` /
`updated_at`.

### `GET /api/stacks`

Lists stacks for a user. **Query params only — no body.**

| Param | Required | Description |
|-------|----------|-------------|
| `owner_identifier` | yes | User UUID |
| `message` | no | Audit log text |

```http
GET /api/stacks?owner_identifier=<user-uuid>
X-Session: <session-uuid>
```

React Native:

```ts
await apiGet<StackAPIType[]>("/api/stacks", session, {
  owner_identifier: userId,
});
```

Ownership: `owner_identifier` must equal the session's bound user; requesting
another user's stacks returns `403`.

Response `200`: array of stacks, newest-first by `created_at`, each including the
`goal_amount`, `goal_deadline`, `category`, `emoji`, `created_at`, and
`updated_at` fields (`null` where unset).

### `GET /api/stack/members`

Lists the members of a shared stack: the owner plus everyone listed in any of the
stack's substacks' `users_list`. **Query params only — no body.**

| Param | Required | Description |
|-------|----------|-------------|
| `stack_identifier` | yes | Stack UUID |
| `message` | no | Audit log text |

```http
GET /api/stack/members?stack_identifier=<stack-uuid>
X-Session: <session-uuid>
```

```ts
type StackMemberAPIType = {
  user_identifier: string;
  firstname: string;
  lastname: string;
  handle?: string | null;
  avatar_url?: string | null;
  // Total cents this member contributed into the stack's substacks.
  raised_cents: number;
  role?: "owner" | "member";
};

await apiGet<StackMemberAPIType[]>("/api/stack/members", session, {
  stack_identifier: stackId,
});
```

Ownership: the session's user must have access to the stack (be its owner or a
member of one of its substacks), otherwise `403`.

Response `200`: array of members. `handle` and `avatar_url` are currently always
`null` (no backing columns yet); `raised_cents` is the sum of transaction amounts
(cents) the member initiated into the stack's substacks.

### `PUT /api/stack`

```json
{
  "session": "<session-uuid>",
  "message": "Update stack",
  "data": {
    "stack_identifier": "<stack-uuid>",
    "stack_name": "Emergency Fund",
    "owner_identifier": "<user-uuid>",
    "goal_amount": 750000,
    "goal_deadline": "2027-01-01T00:00:00.000Z"
  }
}
```

`goal_amount`, `goal_deadline`, `category`, and `emoji` are optional; omitted
fields keep their existing values.

Ownership: only the stack's owner (the session's user) may update it; otherwise
`403`.

Response `202`.

### `DELETE /api/stack`

```json
{
  "session": "<session-uuid>",
  "message": "Delete stack",
  "data": { "stack_identifier": "<stack-uuid>" }
}
```

Ownership: only the stack's owner (the session's user) may delete it; otherwise
`403`.

Response `204`. Soft-delete.

---

## Substack Endpoints

Balances are stored in **cents**.

```ts
type SubStackAPIType = {
  balance: number;
  stack_identifier: string;
  substack_identifier: string;
  substack_name: string;
  // Always an array, even for a single user.
  users_list: string[];
  owner_identifier?: string;
  // Optional. Cents; null when unset.
  goal_amount?: number | null;
  // Optional. ISO timestamp; null when unset.
  goal_deadline?: string | null;
  // Read-only. ISO timestamps.
  created_at?: string | null;
  updated_at?: string | null;
};
```

`users_list` is **always returned as a `string[]`**, including the single-member
case (no more bare-string responses). `goal_amount` is in **cents**;
`goal_amount` and `goal_deadline` are `null` when unset. `created_at` /
`updated_at` are server-managed ISO timestamps. On `PUT`, omitted goal fields are
preserved.

Query types for `GET /api/substacks`:

- `stack-id` — requires `stack_identifier`
- `owner-id` — requires `owner_identifier`
- `substack-name` — requires `substack_name`

### `POST /api/substack`

```json
{
  "session": "<session-uuid>",
  "message": "Create substack",
  "data": {
    "substack_name": "Vacation",
    "stack_identifier": "<stack-uuid>",
    "balance": 0,
    "users_list": ["<user-uuid>"],
    "goal_amount": 200000,
    "goal_deadline": "2026-09-01T00:00:00.000Z"
  }
}
```

`goal_amount` and `goal_deadline` are optional.

Ownership: the session's user must own the parent `stack_identifier`, otherwise
`403`.

Response `201`: substack with generated `substack_identifier`, `users_list` as a
`string[]`, `goal_amount` / `goal_deadline` (`null` where unset), and
`created_at` / `updated_at`.

### `GET /api/substacks`

Lists substacks. **Query params only — no body.**

| Param | Required when | Description |
|-------|---------------|-------------|
| `type` | always | `stack-id`, `owner-id`, or `substack-name` |
| `stack_identifier` | `type=stack-id` | Stack UUID |
| `owner_identifier` | `type=owner-id` | User UUID |
| `substack_name` | `type=substack-name` | Substack name |
| `message` | never | Audit log text |

By stack:

```http
GET /api/substacks?type=stack-id&stack_identifier=<stack-uuid>
X-Session: <session-uuid>
```

By owner:

```http
GET /api/substacks?type=owner-id&owner_identifier=<user-uuid>
X-Session: <session-uuid>
```

React Native:

```ts
await apiGet<SubStackAPIType[]>("/api/substacks", session, {
  type: "stack-id",
  stack_identifier: stackId,
});
```

Ownership by query type:

- `type=stack-id` — the session's user must have access to the stack (owner or
  member of one of its substacks).
- `type=owner-id` — `owner_identifier` must be the session's own user.
- `type=substack-name` — lookup by name; results are still scoped so callers
  cannot read substacks they don't belong to.

Unauthorized requests return `403`.

Response `200`: array of substacks, newest-first by `created_at`. `users_list` is
always a `string[]`, and each substack includes `goal_amount`, `goal_deadline`,
`created_at`, and `updated_at` (`null` where unset).

### `PUT /api/substack`

```json
{
  "session": "<session-uuid>",
  "message": "Update substack",
  "data": {
    "substack_identifier": "<substack-uuid>",
    "substack_name": "New Name",
    "users_list": ["<user-uuid>"],
    "goal_amount": 250000,
    "goal_deadline": "2026-10-01T00:00:00.000Z"
  }
}
```

`users_list` round-trips as a `string[]`. `goal_amount` / `goal_deadline` are
optional; omitted fields keep their existing values.

Ownership: the session's user must have access to the substack (own its parent
stack or be in its `users_list`), otherwise `403`.

Response `202`.

### `DELETE /api/substack`

```json
{
  "session": "<session-uuid>",
  "message": "Delete substack",
  "data": {
    "substack_identifier": "<substack-uuid>",
    "users_list": ["<user-uuid>"]
  }
}
```

Ownership: the session's user must have access to the substack (own its parent
stack or be in its `users_list`), otherwise `403`.

Response `204`. Soft-delete.

---

## Transaction Endpoints

```ts
type TransactionAPIType = {
  initiated_by: string;
  processor: "Internal" | "ACH" | "Moonpay" | "Stripe" | "Apple" | "Google" | "CashApp" | "Bitcoin";
  transaction_type: "Initial" | "Credit" | "Debit" | "Fee" | "Penalty" | "Adjustment" | "Settled" | "Roundup";
  amount: number;
  to_identifier: string;
  from_identifier: string;
  notation: string;
  balance?: number;
  // Read-only. ISO timestamp the transaction was created.
  created_at?: string | null;
  // Settlement lifecycle state.
  status?: "pending" | "settled" | "failed" | null;
};
```

Money caveat: `POST /api/transaction` accepts a **decimal dollar amount**, but balances and returned amounts are in **cents**.

Every transaction in `GET /api/transactions` includes `created_at` (ISO) and
`status` (defaults to `"settled"`). Use `created_at` for grouping by
day/month/year.

### `POST /api/transaction`

```json
{
  "session": "<session-uuid>",
  "message": "Create transaction",
  "data": {
    "initiated_by": "<user-uuid>",
    "processor": "Internal",
    "transaction_type": "Credit",
    "amount": 25.5,
    "from_identifier": "<source-substack-uuid>",
    "to_identifier": "<destination-substack-uuid>",
    "notation": "Move money to vacation fund"
  }
}
```

Ownership: `initiated_by` is always forced to the **session's bound user** (any
value in the body is overwritten), and that user must have access to the
`from_identifier` source substack, otherwise `403`.

Errors:

- `403` — the session's user is not authorized to transact on the source substack.
- `400` — invalid `amount`/`notation`, or the `amount` exceeds the source
  substack's available balance (insufficient funds).

Response `201`. **Not idempotent** — do not blindly retry after network failures.

### `GET /api/transactions`

Lists transactions. **Query params only — no body.**

| Param | Required | Description |
|-------|----------|-------------|
| `key` | yes | `substack_identifier`, `stack_identifier`, or `owner_identifier` |
| `value` | yes | UUID to filter by |
| `message` | no | Audit log text |

```http
GET /api/transactions?key=substack_identifier&value=<substack-uuid>
X-Session: <session-uuid>
```

React Native:

```ts
await apiGet<TransactionAPIType[]>("/api/transactions", session, {
  key: "substack_identifier",
  value: substackId,
});
```

Ownership by `key`:

- `substack_identifier` — the session's user must have access to that substack.
- `stack_identifier` — the session's user must have access to that stack.
- `owner_identifier` — must be the session's own user.

Unauthorized requests return `403`.

Response `200`: array of transactions, **sorted newest-first** by `created_at`.
Each transaction includes `created_at` and `status`.

---

## Recurring Deposit Endpoints

Scheduled, recurring transfers into a substack. Amounts are in **cents**.

```ts
type RecurringDepositAPIType = {
  recurring_deposit_identifier?: string;
  from_identifier: string;       // funding source (substack or external account id)
  to_identifier: string;         // destination substack id
  amount_cents: number;          // positive integer, cents
  frequency: "weekly" | "biweekly" | "monthly";
  next_run_at: string;           // ISO timestamp
  created_at?: string | null;
  updated_at?: string | null;
};
```

### `POST /api/recurring-deposit`

```json
{
  "session": "<session-uuid>",
  "message": "Schedule recurring deposit",
  "data": {
    "from_identifier": "<source-substack-uuid>",
    "to_identifier": "<destination-substack-uuid>",
    "amount_cents": 5000,
    "frequency": "monthly",
    "next_run_at": "2026-07-01T00:00:00.000Z"
  }
}
```

Ownership: the session's user must have access to the `to_identifier` destination
substack, otherwise `403`.

Response `201`: created recurring deposit with generated
`recurring_deposit_identifier`.

### `GET /api/recurring-deposits`

Lists recurring deposits. **Query params only — no body.**

| Param | Required | Description |
|-------|----------|-------------|
| `key` | yes | `stack_identifier` or `substack_identifier` |
| `value` | yes | UUID to filter by |
| `message` | no | Audit log text |

```http
GET /api/recurring-deposits?key=substack_identifier&value=<substack-uuid>
X-Session: <session-uuid>
```

```ts
await apiGet<RecurringDepositAPIType[]>("/api/recurring-deposits", session, {
  key: "substack_identifier",
  value: substackId,
});
```

Ownership: `key=substack_identifier` requires access to that substack;
`key=stack_identifier` requires access to that stack. Otherwise `403`.

Response `200`: array of recurring deposits, soonest `next_run_at` first.

### `PUT /api/recurring-deposit`

```json
{
  "session": "<session-uuid>",
  "message": "Edit recurring deposit",
  "data": {
    "recurring_deposit_identifier": "<recurring-deposit-uuid>",
    "amount_cents": 7500,
    "frequency": "biweekly",
    "next_run_at": "2026-07-15T00:00:00.000Z"
  }
}
```

Omitted fields keep their existing values.

Ownership: the session's user must have access to **both** the recurring
deposit (via `recurring_deposit_identifier`) and the `to_identifier` destination
substack, otherwise `403`. `to_identifier` is required on update (a missing one
returns `400`); a deposit that isn't found returns `404`. Response `202`.

### `DELETE /api/recurring-deposit`

```json
{
  "session": "<session-uuid>",
  "message": "Cancel recurring deposit",
  "data": { "recurring_deposit_identifier": "<recurring-deposit-uuid>" }
}
```

Ownership: the session's user must have access to the recurring deposit's
destination substack, otherwise `403`.

Response `204`. Soft-cancel.

---

## Notification Endpoints

```ts
type NotificationAPIType = {
  message: string;
  notification_for?: string;
  note_identifier?: string;
};
```

### `POST /api/notification`

```json
{
  "session": "<session-uuid>",
  "message": "Create notification",
  "data": {
    "message": "Your transfer completed",
    "notification_for": "<user-uuid>"
  }
}
```

Ownership: `notification_for` must be the session's own user, otherwise `403`.

Response `201`.

### `GET /api/notifications`

Lists notifications for a user. **Query params only — no body.**

| Param | Required | Description |
|-------|----------|-------------|
| `notification_for` | yes | User UUID |
| `message` | no | Audit log text |

```http
GET /api/notifications?notification_for=<user-uuid>
X-Session: <session-uuid>
```

React Native:

```ts
await apiGet<NotificationAPIType[]>("/api/notifications", session, {
  notification_for: userId,
});
```

Ownership: `notification_for` must be the session's own user, otherwise `403`.

Response `200`: array of notifications.

### `PUT /api/notification`

Updates the message for the recipient's notifications. The target is the
recipient user (`notification_for`), not a single notification id.

```json
{
  "session": "<session-uuid>",
  "message": "Update notification",
  "data": {
    "notification_for": "<user-uuid>",
    "message": "Updated message"
  }
}
```

Ownership: `notification_for` must be the session's own user, otherwise `403`. An
invalid `message` is rejected with `400`; if the recipient has no notifications,
`404`.

Response `202`.

### `PUT /api/notification/:id`

Marks seen or unseen.

Path values:

- `t` or `1` → seen
- `f`, `0`, or anything else → unseen

```json
{
  "session": "<session-uuid>",
  "message": "Mark notification seen",
  "data": { "note_identifier": "<notification-uuid>" }
}
```

Ownership: the notification must belong to the session's user, otherwise `403`.

Response `202`.

### `DELETE /api/notification`

```json
{
  "session": "<session-uuid>",
  "message": "Delete notification",
  "data": { "note_identifier": "<notification-uuid>" }
}
```

Ownership: the notification must belong to the session's user, otherwise `403`.

Response `204`. Soft-delete.

---

## Affiliate Endpoint

```ts
type AffiliateAPIType = {
  affiliation_code: string;
  affiliation_type: "Ancestor" | "Descendant";
  referrer: string;
};
```

### `POST /api/affiliate`

```json
{
  "session": "<session-uuid>",
  "message": "Connect affiliate",
  "data": {
    "affiliation_code": "ABC1234",
    "affiliation_type": "Descendant",
    "referrer": "<user-uuid>"
  }
}
```

Ownership: `referrer` must be the session's own user, otherwise `403`. Only
`affiliation_code` and `referrer` are used; the ancestor/descendant pair is
generated server-side, so any `affiliation_type` in the body is ignored.

Errors: an unknown `affiliation_code` returns `404`; a code that fails the 7–8
character format check returns `400`.

Response `201`: array of two affiliate records (ancestor + descendant pair).

---

## Cybrid Proxy Endpoints

All Cybrid endpoints are under `/api/cybrid/*`.

Rules:

- Always send `X-Session`.
- For `POST` and `PATCH`, also include `session` in the JSON body.
- `GET` Cybrid handlers read session from `X-Session` only.
- Path GUID params are required.
- Responses wrap Cybrid Bank API models in the standard envelope.
- Exact field schemas: `@cybrid/cybrid-api-bank-typescript`.

### Idempotency

These endpoints require an `Idempotency-Key` header (1–255 chars):

- `POST /api/cybrid/fiat-transfer`
- `POST /api/cybrid/quote`
- `POST /api/cybrid/trade`
- `POST /api/cybrid/transfer`

Missing key → `428`. Replay after completion returns cached response with header `Idempotent-Replayed: true`. In-flight duplicate → `409` with `Retry-After: 1`.

### `POST /api/cybrid/fiat-transfer`

Custom body (not a raw Cybrid model):

```json
{
  "session": "<session-uuid>",
  "source_account_guid": "<account-guid>",
  "destination_account_guid": "<account-guid>",
  "amount": 1000,
  "asset": "USD"
}
```

`amount` is in **cents** (positive integer, max 500000 = $5,000).

### Cybrid Resource Catalog

Unless noted, POST → `201`, GET one → `200`, GET list → `200`, PATCH → `200`, DELETE → `200`.

#### Accounts
- `POST /api/cybrid/account` — `PostAccountBankModel` + `session`
- `GET /api/cybrid/account/:account_guid`
- `GET /api/cybrid/accounts?customer_guid=&page=&per_page=`

#### Assets
- `GET /api/cybrid/assets?page=&per_page=&code=`

#### Banks
- `POST /api/cybrid/bank` — `PostBankBankModel` + `session`
- `GET /api/cybrid/bank/:bank_guid`
- `GET /api/cybrid/banks?page=&per_page=&type=`
- `PATCH /api/cybrid/bank/:bank_guid` — `PatchBankBankModel` + `session`

#### Counterparties
- `POST /api/cybrid/counterparty` — `PostCounterpartyBankModel` + `session`
- `GET /api/cybrid/counterparty/:counterparty_guid?include_pii=true`
- `GET /api/cybrid/counterparties?customer_guid=&page=&per_page=`

#### Customers
- `POST /api/cybrid/customer` — `PostCustomerBankModel` + `session`
- `GET /api/cybrid/customer/:customer_guid?include_pii=true`
- `GET /api/cybrid/customers`
- `PATCH /api/cybrid/customer/:customer_guid` — `PatchCustomerBankModel` + `session`

#### Deposit Addresses
- `POST /api/cybrid/deposit-address` — `PostDepositAddressBankModel` + `session`
- `GET /api/cybrid/deposit-address/:deposit_address_guid`
- `GET /api/cybrid/deposit-addresses?customer_guid=&page=&per_page=`

#### Deposit Bank Accounts
- `POST /api/cybrid/deposit-bank-account` — `PostDepositBankAccountBankModel` + `session`
- `GET /api/cybrid/deposit-bank-account/:deposit_bank_account_guid`
- `GET /api/cybrid/deposit-bank-accounts?customer_guid=&page=&per_page=`

#### Executions
- `POST /api/cybrid/execution` — `PostExecutionBankModel` + `session`
- `GET /api/cybrid/execution/:execution_guid`
- `GET /api/cybrid/executions?customer_guid=&page=&per_page=`

#### External Bank Accounts
- `POST /api/cybrid/external-bank-account` — `PostExternalBankAccountBankModel` + `session`
- `GET /api/cybrid/external-bank-account/:external_bank_account_guid?include_balances=true&force_balance_refresh=true&include_pii=true`
- `GET /api/cybrid/external-bank-accounts?customer_guid=&page=&per_page=`
- `PATCH /api/cybrid/external-bank-account/:external_bank_account_guid` — `PatchExternalBankAccountBankModel` + `session`
- `DELETE /api/cybrid/external-bank-account/:external_bank_account_guid`

#### External Wallets
- `POST /api/cybrid/external-wallet` — `PostExternalWalletBankModel` + `session`
- `GET /api/cybrid/external-wallet/:external_wallet_guid`
- `GET /api/cybrid/external-wallets?customer_guid=&page=&per_page=`
- `DELETE /api/cybrid/external-wallet/:external_wallet_guid`

#### Files
- `POST /api/cybrid/file` — `PostFileBankModel` + `session`
- `GET /api/cybrid/file/:file_guid?include_download_url=true`
- `GET /api/cybrid/files?customer_guid=&page=&per_page=`

#### Identity Verification
- `POST /api/cybrid/identity-verification` — `PostIdentityVerificationBankModel` + `session`
- `GET /api/cybrid/identity-verification/:verification_guid`
- `GET /api/cybrid/identity-verifications?customer_guid=&page=&per_page=`

#### Invoices
- `POST /api/cybrid/invoice` — `PostInvoiceBankModel` + `session`
- `GET /api/cybrid/invoice/:invoice_guid`
- `GET /api/cybrid/invoices?customer_guid=&page=&per_page=`
- `DELETE /api/cybrid/invoice/:invoice_guid`

#### Payment Instructions
- `POST /api/cybrid/payment-instruction` — `PostPaymentInstructionBankModel` + `session`
- `GET /api/cybrid/payment-instruction/:payment_instruction_guid`
- `GET /api/cybrid/payment-instructions?customer_guid=&invoice_guid=&page=&per_page=`

#### Persona Sessions
- `POST /api/cybrid/persona-session` — `PostPersonaSessionBankModel` + `session`

#### Plans
- `POST /api/cybrid/plan` — `PostPlanBankModel` + `session`
- `GET /api/cybrid/plan/:plan_guid`
- `GET /api/cybrid/plans?customer_guid=&page=&per_page=`

#### Prices & Symbols
- `GET /api/cybrid/prices?symbol=`
- `GET /api/cybrid/symbols`

#### Quotes (idempotent POST)
- `POST /api/cybrid/quote` — `PostQuoteBankModel` + `session` + `Idempotency-Key`
- `GET /api/cybrid/quote/:quote_guid`
- `GET /api/cybrid/quotes?customer_guid=&page=&per_page=`

#### Trades (idempotent POST)
- `POST /api/cybrid/trade` — `PostTradeBankModel` + `session` + `Idempotency-Key`
- `GET /api/cybrid/trade/:trade_guid`
- `GET /api/cybrid/trades?customer_guid=`

#### Transfers (idempotent POST)
- `POST /api/cybrid/transfer` — `PostTransferBankModel` + `session` + `Idempotency-Key`
- `GET /api/cybrid/transfer/:transfer_guid`
- `GET /api/cybrid/transfers?customer_guid=`
- `PATCH /api/cybrid/transfer/:transfer_guid` — `PatchTransferBankModel` + `session`

#### Workflows
- `POST /api/cybrid/workflow` — `PostWorkflowBankModel` + `session`
- `GET /api/cybrid/workflow/:workflow_guid`
- `GET /api/cybrid/workflows?customer_guid=&page=&per_page=`

---

## Rate Limits

| Scope | Limit |
|-------|-------|
| All routes | 100 req / 15 min / IP |
| `/api/session` | 10 req / 15 min / IP |
| `/api/otp/*/start` | 5 req / 15 min / IP + destination |
| `/api/otp/*/verify` | 20 req / 15 min / IP + destination |
| `/api/cybrid/*`, `/api/transaction` | 30 req / 15 min / IP |

Rate-limited responses: HTTP `429` with standard envelope.

---

## Frontend Caveats

- **CORS** allows `http://localhost:8081` and `http://127.0.0.1:8081` with `Content-Type`, `Authorization`, `X-Session`, and `Idempotency-Key`.
- **Read endpoints** use query params + `X-Session`. Never send a JSON body on GET.
- **Mutation endpoints** need `Content-Type: application/json`, `X-Session`, and `session` in the body.
- **Phone OTP endpoints are public**. Email OTP endpoints require `X-Session` and `session` in the body.
- **Do not hardcode `123456`**. Use the real OTP start/verify flow; only local dev may expose `data.dev_otp`.
- **Sessions are bound to a user** — after signup/login a session acts as exactly one user, and authenticated endpoints enforce that the session's user owns or belongs to the resource being read/modified (otherwise `403`). An anonymous (unbound) session is rejected with `403` on endpoints that need a user.
- **`POST /api/transaction` is not idempotent** — avoid automatic retry.
- **Money units**: substack balances and Cybrid fiat transfers use **cents**; internal transaction create accepts decimal dollars but returns cents.
- **`204` responses still include JSON** — do not assume an empty body.
- **README mentions SQLite** but the backend uses PostgreSQL.

---

## Recommended Integration Order

1. Configure `API_BASE_URL`.
2. Implement `GET /api/session` and store `data.uuid`.
3. Implement phone OTP wrappers for login/signup entry.
4. Implement email OTP wrappers for recovery email verification during signup.
5. Create shared `apiGet` and `apiMutate` helpers (see above).
6. Build typed wrappers for user, stack, substack, transaction, notification, affiliate.
7. Add idempotency key generation for Cybrid quote, trade, transfer, and fiat-transfer calls.
8. If running in a browser on another port, add backend CORS or a frontend dev proxy.

## Endpoint Count Summary

| Group | Count |
|-------|-------|
| Infrastructure (`/health`) | 1 |
| Session | 2 |
| OTP | 4 |
| Audit | 1 |
| User | 5 |
| Stack | 5 |
| SubStack | 4 |
| Transaction | 2 |
| Recurring Deposit | 4 |
| Notification | 5 |
| Affiliate | 1 |
| Cybrid proxy | 65 |
| **Total** | **99** |

# WeStack API Guide

## OTP

All OTP responses use the standard envelope:

```json
{
  "code": 200,
  "data": {},
  "message": "OK"
}
```

Phone OTPs do not require an authenticated user. If `X-Session` is present and valid it is reused; otherwise the backend creates a session and returns it. Email OTPs require a valid session via `X-Session` or `body.session`.

OTP codes are 6-digit numeric values, expire after `OTP_TTL_MINUTES` minutes, are single-use, and allow up to `OTP_MAX_ATTEMPTS` verification attempts. The backend stores only HMAC hashes of OTP codes and destinations.

### Start Phone OTP

`POST /api/otp/phone/start`

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
    "otp_request_id": "9f4b5f13-3d7d-4dd4-998a-64df0894c7fa",
    "session": "11111111-1111-1111-1111-111111111111",
    "expires_at": "2026-06-15T21:10:00.000Z",
    "resend_after_seconds": 30
  },
  "message": "OK"
}
```

### Verify Phone OTP

`POST /api/otp/phone/verify`

Request:

```json
{
  "otp_request_id": "9f4b5f13-3d7d-4dd4-998a-64df0894c7fa",
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
    "session": "11111111-1111-1111-1111-111111111111",
    "phone": "+15551234567",
    "existing_user_identifier": null
  },
  "message": "OK"
}
```

For `purpose=login`, `existing_user_identifier` is the matching `users.user_identifier` when `users.phone_e164` matches the verified phone. If no user exists, it is `null` and the frontend can continue signup. Verifying OTP does not create a user.

### Start Email OTP

`POST /api/otp/email/start`

Headers:

```http
X-Session: 11111111-1111-1111-1111-111111111111
```

Request:

```json
{
  "session": "11111111-1111-1111-1111-111111111111",
  "email": "user@example.com",
  "purpose": "recovery_email"
}
```

Response:

```json
{
  "code": 200,
  "data": {
    "otp_request_id": "0f1c1819-211a-40a3-890c-cb56abcf513b",
    "expires_at": "2026-06-15T21:10:00.000Z",
    "resend_after_seconds": 30
  },
  "message": "OK"
}
```

### Verify Email OTP

`POST /api/otp/email/verify`

Headers:

```http
X-Session: 11111111-1111-1111-1111-111111111111
```

Request:

```json
{
  "session": "11111111-1111-1111-1111-111111111111",
  "otp_request_id": "0f1c1819-211a-40a3-890c-cb56abcf513b",
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

### Local Development OTPs

Production responses and logs never include OTP codes. For local testing only, set `OTP_DEV_EXPOSE=true` and ensure `NODE_ENV` is not `production`; start responses then include `data.dev_otp`. Alternatively set `OTP_DEV_LOG=true` to log local OTPs without returning them.

### Provider Environment

Production delivery requires provider webhooks:

```env
OTP_HASH_SECRET=replace_with_a_long_random_secret
OTP_SMS_WEBHOOK_URL=https://sms-provider.example/send
OTP_EMAIL_WEBHOOK_URL=https://email-provider.example/send
OTP_PROVIDER_AUTH_TOKEN=optional_bearer_token
OTP_TTL_MINUTES=10
OTP_RESEND_AFTER_SECONDS=30
OTP_MAX_ATTEMPTS=5
```

The backend sends this JSON payload to the webhook:

```json
{
  "channel": "phone",
  "destination": "+15551234567",
  "purpose": "login",
  "code": "123456",
  "expiresAt": "2026-06-15T21:10:00.000Z"
}
```

## Stacks, Substacks & Transactions

All responses use the standard `{ code, data, message }` envelope. Auth follows
the standard model (`X-Session` header on every request; `session` in the body on
`POST`/`PUT`/`DELETE`). Monetary values are in **cents** unless otherwise noted.

### Types

```ts
type StackAPIType = {
  stack_name: string;
  stack_identifier: string;
  owner_identifier: string;
  goal_amount?: number | null;     // cents; null when unset
  goal_deadline?: string | null;   // ISO; null when unset
  created_at?: string | null;      // ISO, read-only
  updated_at?: string | null;      // ISO, read-only
  category?: string | null;        // optional presentation metadata
  emoji?: string | null;           // optional presentation metadata
};

type StackMemberAPIType = {
  user_identifier: string;
  firstname: string;
  lastname: string;
  handle?: string | null;          // currently null
  avatar_url?: string | null;      // currently null
  raised_cents: number;            // cents contributed into the stack
  role?: "owner" | "member";
};

type SubStackAPIType = {
  balance: number;                 // cents
  stack_identifier: string;
  substack_identifier: string;
  substack_name: string;
  users_list: string[];            // ALWAYS an array, even for one user
  owner_identifier?: string;
  goal_amount?: number | null;     // cents; null when unset
  goal_deadline?: string | null;   // ISO; null when unset
  created_at?: string | null;      // ISO, read-only
  updated_at?: string | null;      // ISO, read-only
};

type TransactionAPIType = {
  initiated_by: string;
  processor: "Internal" | "ACH" | "Moonpay" | "Stripe" | "Apple" | "Google" | "CashApp" | "Bitcoin";
  transaction_type: "Initial" | "Credit" | "Debit" | "Fee" | "Penalty" | "Adjustment" | "Settled" | "Roundup";
  amount: number;                  // POST accepts decimal dollars; reads return cents
  to_identifier: string;
  from_identifier: string;
  notation: string;
  balance?: number;
  created_at?: string | null;      // ISO, read-only
  status?: "pending" | "settled" | "failed" | null; // defaults to "settled"
};

type RecurringDepositAPIType = {
  recurring_deposit_identifier?: string;
  from_identifier: string;
  to_identifier: string;           // destination substack
  amount_cents: number;            // positive integer cents
  frequency: "weekly" | "biweekly" | "monthly";
  next_run_at: string;             // ISO
  created_at?: string | null;
  updated_at?: string | null;
};
```

### Behavior notes

- `GET /api/substacks` always returns `users_list` as a `string[]`, including the
  single-member case. `POST`/`PUT`/`DELETE` round-trip it as an array.
- Goal fields (`goal_amount`, `goal_deadline`) and presentation metadata
  (`category`, `emoji`) are returned as `null` when unset. On `PUT` they are
  preserved when omitted.
- `created_at`/`updated_at` are server-managed ISO timestamps on stacks and
  substacks. `GET /api/stacks` and `GET /api/substacks` are returned newest-first.
- `GET /api/transactions` returns results **newest-first** and every transaction
  includes `created_at` (ISO) and `status` (defaults to `"settled"`).

### New endpoints

- `GET /api/stack/members?stack_identifier=<uuid>` — member roster
  (`StackMemberAPIType[]`).
- `POST /api/recurring-deposit`, `GET /api/recurring-deposits?key=&value=`,
  `PUT /api/recurring-deposit`, `DELETE /api/recurring-deposit` — recurring
  deposit CRUD.

Example create transaction (decimal dollars in, cents out):

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

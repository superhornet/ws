# OTP Relay

A tiny standalone service that turns the WeStack backend's generic OTP webhook into a real SMS (Twilio) or email (SendGrid) message.

The backend never talks to Twilio/SendGrid directly. It `POST`s this JSON to whatever URL you put in `OTP_SMS_WEBHOOK_URL` / `OTP_EMAIL_WEBHOOK_URL`:

```json
{ "channel": "phone", "destination": "+15551234567", "purpose": "signup", "code": "123456", "expiresAt": "2026-01-01T00:00:00.000Z" }
```

...with header `Authorization: Bearer <OTP_PROVIDER_AUTH_TOKEN>`. This relay receives that payload, authenticates it, and forwards it to the provider. Provider API keys live **here**, not in the main backend.

## Endpoints

| Method | Path      | Purpose                         |
| ------ | --------- | ------------------------------- |
| GET    | `/health` | Liveness + which channels are configured |
| POST   | `/sms`    | Send the code via Twilio        |
| POST   | `/email`  | Send the code via SendGrid      |

## Run locally

```bash
cd otp-relay
npm install
cp .env.example .env   # then fill in values
npm start
```

Then point the WeStack backend at it (in the root `.env`):

```
OTP_SMS_WEBHOOK_URL=http://localhost:4000/sms
OTP_EMAIL_WEBHOOK_URL=http://localhost:4000/email
OTP_PROVIDER_AUTH_TOKEN=<same value as RELAY_AUTH_TOKEN here>
OTP_DEV_EXPOSE=false
```

> Note: when the backend runs in Docker and the relay runs on your host, use `http://host.docker.internal:4000/sms` instead of `localhost`.

## Provider setup

See the main chat / the project notes for step-by-step Twilio and SendGrid setup. Summary:

- **Twilio**: create account → get a phone number or Messaging Service → copy Account SID + Auth Token → set `TWILIO_*` vars.
- **SendGrid**: create account → verify a sender/domain → create an API key → set `SENDGRID_API_KEY` + `SENDGRID_FROM_EMAIL`.

import express from "express";
import dotenv from "dotenv";
import twilio from "twilio";
import sgMail from "@sendgrid/mail";

dotenv.config();

const PORT = Number(process.env.PORT ?? 4000);

// Shared secret the WeStack backend sends as `Authorization: Bearer <token>`.
// Set the same value in the backend's OTP_PROVIDER_AUTH_TOKEN. Leave blank to disable auth (NOT recommended).
const RELAY_AUTH_TOKEN = process.env.RELAY_AUTH_TOKEN ?? "";

// Twilio (SMS)
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID ?? "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN ?? "";
const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER ?? "";
const TWILIO_MESSAGING_SERVICE_SID = process.env.TWILIO_MESSAGING_SERVICE_SID ?? "";

// SendGrid (email)
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY ?? "";
const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL ?? "";

const twilioClient =
  TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN
    ? twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    : null;

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

const app = express();
app.use(express.json({ limit: "16kb" }));

/**
 * Validates the bearer token. Returns true if the request may proceed.
 * Responds with 401 and returns false otherwise.
 */
function isAuthorized(req, res) {
  if (!RELAY_AUTH_TOKEN) {
    return true;
  }
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
  if (token !== RELAY_AUTH_TOKEN) {
    res.status(401).json({ error: "unauthorized" });
    return false;
  }
  return true;
}

/**
 * The backend POSTs: { channel, destination, purpose, code, expiresAt }.
 * Returns the validated payload, or null after responding with 400.
 */
function readPayload(req, res) {
  const { channel, destination, code } = req.body ?? {};
  if (!channel || !destination || !code) {
    res.status(400).json({ error: "missing required fields: channel, destination, code" });
    return null;
  }
  return req.body;
}

function otpMessageText(code) {
  return `Your verification code is ${code}. It expires shortly. If you did not request this, ignore this message.`;
}

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    sms: twilioClient ? "configured" : "not_configured",
    email: SENDGRID_API_KEY ? "configured" : "not_configured",
  });
});

app.post("/sms", async (req, res) => {
  if (!isAuthorized(req, res)) {
    return;
  }
  const payload = readPayload(req, res);
  if (!payload) {
    return;
  }
  if (!twilioClient) {
    return res.status(500).json({ error: "twilio is not configured on the relay" });
  }
  try {
    const message = { to: payload.destination, body: otpMessageText(payload.code) };
    if (TWILIO_MESSAGING_SERVICE_SID) {
      message.messagingServiceSid = TWILIO_MESSAGING_SERVICE_SID;
    } else {
      message.from = TWILIO_FROM_NUMBER;
    }
    const result = await twilioClient.messages.create(message);
    res.json({ ok: true, sid: result.sid });
  } catch (error) {
    console.error("[relay] sms delivery failed:", error?.message ?? error);
    res.status(502).json({ error: "sms delivery failed" });
  }
});

app.post("/email", async (req, res) => {
  if (!isAuthorized(req, res)) {
    return;
  }
  const payload = readPayload(req, res);
  if (!payload) {
    return;
  }
  if (!SENDGRID_API_KEY) {
    return res.status(500).json({ error: "sendgrid is not configured on the relay" });
  }
  try {
    await sgMail.send({
      to: payload.destination,
      from: SENDGRID_FROM_EMAIL,
      subject: "Your verification code",
      text: otpMessageText(payload.code),
      html: `<p>Your verification code is <strong>${payload.code}</strong>.</p><p>It expires shortly. If you did not request this, ignore this email.</p>`,
    });
    res.json({ ok: true });
  } catch (error) {
    console.error("[relay] email delivery failed:", error?.response?.body ?? error?.message ?? error);
    res.status(502).json({ error: "email delivery failed" });
  }
});

app.listen(PORT, () => {
  console.log(`OTP relay listening on http://localhost:${PORT}`);
  console.log(`  SMS:   ${twilioClient ? "Twilio configured" : "NOT configured"}`);
  console.log(`  Email: ${SENDGRID_API_KEY ? "SendGrid configured" : "NOT configured"}`);
  console.log(`  Auth:  ${RELAY_AUTH_TOKEN ? "bearer token required" : "OPEN (no token)"}`);
});

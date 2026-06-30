import { HTMLStatusError } from "./HTMLStatusError.ts";

type OtpChannel = "phone" | "email";

interface OtpDeliveryPayload {
    channel: OtpChannel;
    destination: string;
    purpose: string;
    code: string;
    expiresAt: string;
}

function isProduction(): boolean {
    return process.env.NODE_ENV === "production";
}

function deliveryUrl(channel: OtpChannel): string | undefined {
    if (channel === "phone") {
        return process.env.OTP_SMS_WEBHOOK_URL;
    }
    return process.env.OTP_EMAIL_WEBHOOK_URL;
}

export function canExposeDevOtp(): boolean {
    return !isProduction() && process.env.OTP_DEV_EXPOSE === "true";
}

function logDevOtp(payload: OtpDeliveryPayload): void {
    // Never log plaintext OTPs in production, regardless of flags.
    if (!isProduction() && process.env.OTP_DEV_LOG === "true") {
        console.info(`[dev otp] ${payload.channel} ${payload.destination} ${payload.purpose}: ${payload.code}`);
    }
}

export async function sendOtp(payload: OtpDeliveryPayload): Promise<void> {
    // In dev-expose mode the code is returned to the caller as `data.dev_otp`,
    // so a real SMS/email provider is not required. Provider configuration errors
    // must only block OTP start when NOT in dev-expose mode.
    if (canExposeDevOtp()) {
        logDevOtp(payload);
        return;
    }

    const url = deliveryUrl(payload.channel);
    if (!url) {
        // Local convenience: allow logging-only delivery outside production.
        if (!isProduction() && process.env.OTP_DEV_LOG === "true") {
            logDevOtp(payload);
            return;
        }
        throw new HTMLStatusError("OTP delivery provider is not configured", 500);
    }

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };
    if (process.env.OTP_PROVIDER_AUTH_TOKEN) {
        headers.Authorization = `Bearer ${process.env.OTP_PROVIDER_AUTH_TOKEN}`;
    }

    const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        throw new HTMLStatusError("OTP delivery failed", 502);
    }
}

import {
    createHmac,
    randomInt,
    randomUUID,
    timingSafeEqual,
} from "node:crypto";
import { HTMLStatusError } from "../libs/HTMLStatusError.ts";
import { query, withTransaction } from "../libs/postgresDB.ts";
import { canExposeDevOtp, sendOtp } from "../libs/otpDelivery.ts";
import { toIso } from "../libs/dates.ts";
import { Session } from "./Session.ts";
import { User } from "./User.ts";

type OtpChannel = "phone" | "email";
type OtpPurpose = "login" | "signup" | "recovery_email";

interface OtpStartResult {
    otp_request_id: string;
    session?: string;
    expires_at: string;
    resend_after_seconds: number;
    dev_otp?: string;
}

interface PhoneVerifyResult {
    verified: true;
    session: string;
    phone: string;
    existing_user_identifier: string | null;
}

interface EmailVerifyResult {
    verified: true;
    email: string;
}

interface OtpRow {
    otp_request_id: string;
    channel: OtpChannel;
    destination_hash: string;
    purpose: OtpPurpose;
    session_uuid: string | null;
    otp_hash: string;
    expires_at: Date | string;
    verified_at: Date | string | null;
    attempt_count: number;
    resend_available_at: Date | string;
}

const OTP_LENGTH = 6;
const OTP_TTL_MINUTES = Number(process.env.OTP_TTL_MINUTES ?? 10);
const RESEND_AFTER_SECONDS = Number(process.env.OTP_RESEND_AFTER_SECONDS ?? 30);
const MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS ?? 5);

function otpSecret(): string {
    const secret = process.env.OTP_HASH_SECRET;
    if (secret) {
        return secret;
    }
    if (process.env.NODE_ENV === "production") {
        throw new HTMLStatusError("OTP_HASH_SECRET is required", 500);
    }
    return process.env.POSTGRES_PASSWORD ?? "westack-local-otp-secret";
}

function hmac(value: string): string {
    return createHmac("sha256", otpSecret()).update(value).digest("hex");
}

function constantTimeEqual(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left, "hex");
    const rightBuffer = Buffer.from(right, "hex");
    if (leftBuffer.length !== rightBuffer.length) {
        return false;
    }
    return timingSafeEqual(leftBuffer, rightBuffer);
}

/**
 * Dev-only override: when `OTP_DEV_FIXED_CODE` is set to a 6-digit value and we
 * are not in production, every generated OTP becomes that fixed code. This lets
 * a frontend hardcode e.g. `123456` while real OTP delivery is still being wired
 * up. The normal hash/verify path is unchanged because the stored hash is still
 * derived from whatever code `generateNumericOtp` returns.
 */
function devFixedOtp(): string | undefined {
    if (process.env.NODE_ENV === "production") {
        return undefined;
    }
    const fixed = process.env.OTP_DEV_FIXED_CODE;
    return fixed && /^\d{6}$/.test(fixed) ? fixed : undefined;
}

function generateNumericOtp(): string {
    const fixed = devFixedOtp();
    if (fixed) {
        return fixed;
    }
    let otp = "";
    for (let index = 0; index < OTP_LENGTH; index++) {
        otp += randomInt(10).toString();
    }
    return otp;
}

function hashDestination(channel: OtpChannel, destination: string): string {
    return hmac(`${channel}:${destination}`);
}

function hashOtp(otpRequestId: string, destinationHash: string, code: string): string {
    return hmac(`${otpRequestId}:${destinationHash}:${code}`);
}

function assertPurpose(channel: OtpChannel, purpose: string | undefined): asserts purpose is OtpPurpose {
    const allowed = channel === "phone"
        ? ["login", "signup"]
        : ["recovery_email"];
    if (!purpose || !allowed.includes(purpose)) {
        throw new HTMLStatusError("Invalid OTP purpose", 400);
    }
}

export class OtpRequest {
    static normalizePhone(phone: string | undefined): string {
        if (!phone) {
            throw new HTMLStatusError("Phone is required", 400);
        }
        const normalized = phone.replace(/[()\-\s.]/g, "");
        if (!/^\+[1-9]\d{7,14}$/.test(normalized)) {
            throw new HTMLStatusError("Phone must be E.164 format", 400);
        }
        return normalized;
    }

    static normalizeEmail(email: string | undefined): string {
        if (!email) {
            throw new HTMLStatusError("Email is required", 400);
        }
        const normalized = email.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
            throw new HTMLStatusError("Email is invalid", 400);
        }
        return normalized;
    }

    static async startPhone(input: {
        phone?: string;
        purpose?: string;
        sessionHeader?: string | undefined;
    }): Promise<OtpStartResult> {
        const purpose = input.purpose;
        assertPurpose("phone", purpose);
        const phone = OtpRequest.normalizePhone(input.phone);
        const session = await OtpRequest.resolveOptionalSession(input.sessionHeader);
        return OtpRequest.start("phone", phone, purpose, session);
    }

    static async verifyPhone(input: {
        otp_request_id?: string;
        phone?: string;
        code?: string;
        purpose?: string;
    }): Promise<PhoneVerifyResult> {
        const purpose = input.purpose;
        assertPurpose("phone", purpose);
        const phone = OtpRequest.normalizePhone(input.phone);
        const row = await OtpRequest.verify("phone", phone, purpose, input.otp_request_id, input.code);
        // Phone OTPs always persist a session at `start` (see resolveOptionalSession),
        // so a verified row must carry one.
        if (!row.session_uuid) {
            throw new HTMLStatusError("Phone OTP request is missing its session", 500);
        }
        const session = row.session_uuid;
        const existingUser = await User.findIdentifierByPhone(phone);
        // Login: the verified phone already maps to a user, so bind this session
        // to them. Signup has no user yet; binding happens at user creation.
        if (existingUser) {
            await Session.bindUser(session, existingUser);
        }
        return {
            verified: true,
            session,
            phone,
            existing_user_identifier: existingUser,
        };
    }

    /**
     * Returns the most recently verified phone number (E.164) tied to a session,
     * or `null` when the session has no verified phone OTP. Used during user
     * creation to link the phone proven during the signup OTP flow to the new
     * `users.phone_e164` record.
     */
    static async verifiedPhoneForSession(session: string | undefined): Promise<string | null> {
        if (!session) {
            return null;
        }
        const rows = await query<{ phone_e164: string | null }>(
            `SELECT phone_e164
            FROM otp_requests
            WHERE session_uuid = $1
                AND channel = 'phone'
                AND verified_at IS NOT NULL
                AND phone_e164 IS NOT NULL
            ORDER BY verified_at DESC
            LIMIT 1;`,
            [session],
        );
        return rows.at(0)?.phone_e164 ?? null;
    }

    static async startEmail(input: {
        session?: string;
        email?: string;
        purpose?: string;
    }): Promise<OtpStartResult> {
        const purpose = input.purpose;
        assertPurpose("email", purpose);
        const session = await OtpRequest.requireSession(input.session);
        const email = OtpRequest.normalizeEmail(input.email);
        return OtpRequest.start("email", email, purpose, session);
    }

    static async verifyEmail(input: {
        session?: string;
        otp_request_id?: string;
        email?: string;
        code?: string;
        purpose?: string;
    }): Promise<EmailVerifyResult> {
        const purpose = input.purpose;
        assertPurpose("email", purpose);
        const session = await OtpRequest.requireSession(input.session);
        const email = OtpRequest.normalizeEmail(input.email);
        const row = await OtpRequest.verify("email", email, purpose, input.otp_request_id, input.code);
        if (row.session_uuid !== session) {
            throw new HTMLStatusError("OTP request does not belong to this session", 403);
        }
        return {
            verified: true,
            email,
        };
    }

    private static async start(
        channel: OtpChannel,
        destination: string,
        purpose: OtpPurpose,
        session: string,
    ): Promise<OtpStartResult> {
        const destinationHash = hashDestination(channel, destination);
        await OtpRequest.assertResendAvailable(channel, destinationHash, purpose);

        const otpRequestId = randomUUID();
        const code = generateNumericOtp();
        const otpHash = hashOtp(otpRequestId, destinationHash, code);

        // Persist the plaintext phone (E.164) so the verified number can be linked
        // to the user record created later in the signup flow. The destination is
        // only stored for the phone channel; email destinations stay hashed-only.
        const phoneE164 = channel === "phone" ? destination : null;
        const rows = await query<{ expires_at: Date | string; resend_available_at: Date | string }>(
            `INSERT INTO otp_requests (
                otp_request_id, channel, destination_hash, purpose, session_uuid,
                otp_hash, expires_at, resend_available_at, phone_e164
            ) VALUES (
                $1, $2, $3, $4, $5, $6,
                NOW() + ($7::text || ' minutes')::interval,
                NOW() + ($8::text || ' seconds')::interval,
                $9
            )
            RETURNING expires_at, resend_available_at;`,
            [otpRequestId, channel, destinationHash, purpose, session, otpHash, OTP_TTL_MINUTES, RESEND_AFTER_SECONDS, phoneE164],
        );
        const row = rows.at(0);
        if (!row) {
            throw new HTMLStatusError("Failed to create OTP request", 500);
        }

        await sendOtp({
            channel,
            destination,
            purpose,
            code,
            expiresAt: toIso(row.expires_at),
        });

        const result: OtpStartResult = {
            otp_request_id: otpRequestId,
            expires_at: toIso(row.expires_at),
            resend_after_seconds: RESEND_AFTER_SECONDS,
        };
        if (channel === "phone") {
            result.session = session;
        }
        if (canExposeDevOtp()) {
            result.dev_otp = code;
        }
        return result;
    }

    private static async verify(
        channel: OtpChannel,
        destination: string,
        purpose: OtpPurpose,
        otpRequestId: string | undefined,
        code: string | undefined,
    ): Promise<OtpRow> {
        if (!otpRequestId) {
            throw new HTMLStatusError("OTP request ID is required", 400);
        }
        if (!code || !/^\d{6}$/.test(code)) {
            throw new HTMLStatusError("OTP code must be 6 digits", 400);
        }

        const destinationHash = hashDestination(channel, destination);
        return withTransaction(async (client) => {
            const result = await client.query<OtpRow>(
                `SELECT otp_request_id, channel, destination_hash, purpose, session_uuid,
                    otp_hash, expires_at, verified_at, attempt_count, resend_available_at
                FROM otp_requests
                WHERE otp_request_id = $1
                    AND channel = $2
                    AND destination_hash = $3
                    AND purpose = $4
                FOR UPDATE;`,
                [otpRequestId, channel, destinationHash, purpose],
            );
            const row = result.rows.at(0);
            if (!row) {
                throw new HTMLStatusError("OTP request not found", 404);
            }
            if (row.verified_at) {
                throw new HTMLStatusError("OTP request has already been verified", 409);
            }
            if (new Date(row.expires_at).getTime() <= Date.now()) {
                throw new HTMLStatusError("OTP request has expired", 400);
            }
            if (row.attempt_count >= MAX_ATTEMPTS) {
                throw new HTMLStatusError("OTP attempt limit exceeded", 403);
            }

            const expected = hashOtp(row.otp_request_id, row.destination_hash, code);
            const verified = constantTimeEqual(expected, row.otp_hash);
            if (!verified) {
                await client.query(
                    `UPDATE otp_requests
                    SET attempt_count = attempt_count + 1, updated_at = NOW()
                    WHERE otp_request_id = $1;`,
                    [row.otp_request_id],
                );
                throw new HTMLStatusError("Invalid OTP code", 403);
            }

            const update = await client.query<OtpRow>(
                `UPDATE otp_requests
                SET verified_at = NOW(), attempt_count = attempt_count + 1, updated_at = NOW()
                WHERE otp_request_id = $1
                RETURNING otp_request_id, channel, destination_hash, purpose, session_uuid,
                    otp_hash, expires_at, verified_at, attempt_count, resend_available_at;`,
                [row.otp_request_id],
            );
            const updated = update.rows.at(0);
            if (!updated) {
                throw new HTMLStatusError("Failed to verify OTP request", 500);
            }
            return updated;
        });
    }

    private static async assertResendAvailable(
        channel: OtpChannel,
        destinationHash: string,
        purpose: OtpPurpose,
    ): Promise<void> {
        const rows = await query<{ resend_available_at: Date | string }>(
            `SELECT resend_available_at
            FROM otp_requests
            WHERE channel = $1
                AND destination_hash = $2
                AND purpose = $3
                AND verified_at IS NULL
                AND expires_at > NOW()
            ORDER BY created_at DESC
            LIMIT 1;`,
            [channel, destinationHash, purpose],
        );
        const row = rows.at(0);
        if (row && new Date(row.resend_available_at).getTime() > Date.now()) {
            throw new HTMLStatusError("OTP resend cooldown active", 409);
        }
    }

    private static async resolveOptionalSession(sessionHeader: string | undefined): Promise<string> {
        if (sessionHeader && await Session.exists(sessionHeader)) {
            return sessionHeader;
        }
        return OtpRequest.createSession();
    }

    private static async requireSession(session: string | undefined): Promise<string> {
        if (!session || !(await Session.exists(session))) {
            throw new HTMLStatusError("Session ID Required", 403);
        }
        return session;
    }

    private static async createSession(): Promise<string> {
        const session = await Session.create() as { uuid?: string };
        if (!session.uuid) {
            throw new HTMLStatusError("Failed to create session", 500);
        }
        return session.uuid;
    }
}

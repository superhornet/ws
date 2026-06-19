import { beforeEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";

process.env.OTP_HASH_SECRET = "test-otp-secret";
process.env.OTP_DEV_EXPOSE = "true";
process.env.NODE_ENV = "test";

interface OtpRow {
    otp_request_id: string;
    channel: "phone" | "email";
    destination_hash: string;
    purpose: "login" | "signup" | "recovery_email";
    session_uuid: string | null;
    phone_e164: string | null;
    otp_hash: string;
    expires_at: Date;
    verified_at: Date | null;
    attempt_count: number;
    resend_available_at: Date;
    created_at: Date;
    updated_at: Date;
}

const rows: OtpRow[] = [];
let sentOtp: { destination: string; code: string } | null = null;
let existingPhoneUser: string | null = null;

mock.module("../../main/ts/libs/otpDelivery.ts", {
    namedExports: {
        canExposeDevOtp: () => true,
        sendOtp: async (payload: { destination: string; code: string }) => {
            sentOtp = {
                destination: payload.destination,
                code: payload.code,
            };
        },
    },
});

mock.module("../../main/ts/models/Session.ts", {
    namedExports: {
        Session: class {
            static async exists(session: string): Promise<boolean> {
                return session === "11111111-1111-1111-1111-111111111111";
            }

            static async create(): Promise<{ uuid: string }> {
                return { uuid: "11111111-1111-1111-1111-111111111111" };
            }

            static async bindUser(): Promise<void> {
                return;
            }
        },
    },
});

mock.module("../../main/ts/models/User.ts", {
    namedExports: {
        User: class {
            static async findIdentifierByPhone(): Promise<string | null> {
                return existingPhoneUser;
            }
        },
    },
});

function future(ms: number): Date {
    return new Date(Date.now() + ms);
}

function insertOtp(params: unknown[]): { rows: Array<{ expires_at: Date; resend_available_at: Date }> } {
    const row: OtpRow = {
        otp_request_id: params[0] as string,
        channel: params[1] as "phone" | "email",
        destination_hash: params[2] as string,
        purpose: params[3] as "login" | "signup" | "recovery_email",
        session_uuid: params[4] as string,
        otp_hash: params[5] as string,
        phone_e164: (params[8] as string | null) ?? null,
        expires_at: future(10 * 60 * 1000),
        verified_at: null,
        attempt_count: 0,
        resend_available_at: future(30 * 1000),
        created_at: new Date(),
        updated_at: new Date(),
    };
    rows.push(row);
    return { rows: [{ expires_at: row.expires_at, resend_available_at: row.resend_available_at }] };
}

mock.module("../../main/ts/libs/postgresDB.ts", {
    namedExports: {
        query: async (sql: string, params: unknown[] = []) => {
            if (sql.includes("INSERT INTO otp_requests")) {
                return insertOtp(params).rows;
            }
            if (sql.includes("SELECT phone_e164")) {
                return rows
                    .filter((row) =>
                        row.session_uuid === params[0] &&
                        row.channel === "phone" &&
                        row.verified_at &&
                        row.phone_e164
                    )
                    .sort((left, right) =>
                        (right.verified_at?.getTime() ?? 0) - (left.verified_at?.getTime() ?? 0)
                    )
                    .slice(0, 1)
                    .map((row) => ({ phone_e164: row.phone_e164 }));
            }
            if (sql.includes("SELECT resend_available_at")) {
                return rows
                    .filter((row) =>
                        row.channel === params[0] &&
                        row.destination_hash === params[1] &&
                        row.purpose === params[2] &&
                        !row.verified_at &&
                        row.expires_at.getTime() > Date.now()
                    )
                    .sort((left, right) => right.created_at.getTime() - left.created_at.getTime())
                    .slice(0, 1)
                    .map((row) => ({ resend_available_at: row.resend_available_at }));
            }
            return [];
        },
        withTransaction: async <T>(callback: (client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: OtpRow[] }> }) => Promise<T>) =>
            callback({
                query: async (sql: string, params: unknown[] = []) => {
                    if (sql.includes("SELECT otp_request_id")) {
                        return {
                            rows: rows.filter((row) =>
                                row.otp_request_id === params[0] &&
                                row.channel === params[1] &&
                                row.destination_hash === params[2] &&
                                row.purpose === params[3]
                            ),
                        };
                    }
                    if (sql.includes("attempt_count = attempt_count + 1") && !sql.includes("verified_at")) {
                        const row = rows.find((entry) => entry.otp_request_id === params[0]);
                        if (row) {
                            row.attempt_count += 1;
                            row.updated_at = new Date();
                        }
                        return { rows: [] };
                    }
                    if (sql.includes("SET verified_at = NOW()")) {
                        const row = rows.find((entry) => entry.otp_request_id === params[0]);
                        if (!row) {
                            return { rows: [] };
                        }
                        row.verified_at = new Date();
                        row.attempt_count += 1;
                        row.updated_at = new Date();
                        return { rows: [row] };
                    }
                    return { rows: [] };
                },
            }),
    },
});

const { OtpRequest } = await import("../../main/ts/models/OtpRequest.ts");

function resetState(): void {
    rows.length = 0;
    sentOtp = null;
    existingPhoneUser = null;
}

describe("OTP lifecycle", () => {
    beforeEach(() => {
        resetState();
    });

    it("starts a phone OTP with a numeric code and a session", async () => {
        const result = await OtpRequest.startPhone({
            phone: "+1 (555) 123-4567",
            purpose: "login",
        });

        assert.equal(result.session, "11111111-1111-1111-1111-111111111111");
        assert.equal(result.resend_after_seconds, 30);
        assert.match(result.otp_request_id, /^[0-9a-f-]{36}$/);
        assert.match(result.dev_otp ?? "", /^\d{6}$/);
        assert.equal(sentOtp?.destination, "+15551234567");
        assert.equal(rows[0]?.otp_hash.length, 64);
    });

    it("verifies phone OTP once and returns an existing user identifier", async () => {
        existingPhoneUser = "22222222-2222-2222-2222-222222222222";
        const start = await OtpRequest.startPhone({
            phone: "+15551234567",
            purpose: "login",
        });

        const verified = await OtpRequest.verifyPhone({
            otp_request_id: start.otp_request_id,
            phone: "+15551234567",
            code: sentOtp?.code,
            purpose: "login",
        });

        assert.equal(verified.verified, true);
        assert.equal(verified.session, "11111111-1111-1111-1111-111111111111");
        assert.equal(verified.phone, "+15551234567");
        assert.equal(verified.existing_user_identifier, "22222222-2222-2222-2222-222222222222");

        await assert.rejects(
            OtpRequest.verifyPhone({
                otp_request_id: start.otp_request_id,
                phone: "+15551234567",
                code: sentOtp?.code,
                purpose: "login",
            }),
            /already been verified/,
        );
    });

    it("links the verified signup phone to its session for user creation", async () => {
        const start = await OtpRequest.startPhone({
            phone: "+1 (555) 765-4321",
            purpose: "signup",
        });

        assert.equal(
            await OtpRequest.verifiedPhoneForSession("11111111-1111-1111-1111-111111111111"),
            null,
            "phone must not be linkable before verification",
        );

        await OtpRequest.verifyPhone({
            otp_request_id: start.otp_request_id,
            phone: "+15557654321",
            code: sentOtp?.code,
            purpose: "signup",
        });

        assert.equal(
            await OtpRequest.verifiedPhoneForSession("11111111-1111-1111-1111-111111111111"),
            "+15557654321",
        );
    });

    it("rejects invalid phone OTP attempts", async () => {
        const start = await OtpRequest.startPhone({
            phone: "+15551234567",
            purpose: "signup",
        });

        await assert.rejects(
            OtpRequest.verifyPhone({
                otp_request_id: start.otp_request_id,
                phone: "+15551234567",
                code: "000000",
                purpose: "signup",
            }),
            /Invalid OTP code/,
        );
        assert.equal(rows[0]?.attempt_count, 1);
    });

    it("requires a valid session for email OTP and verifies against that session", async () => {
        const start = await OtpRequest.startEmail({
            session: "11111111-1111-1111-1111-111111111111",
            email: " User@Example.COM ",
            purpose: "recovery_email",
        });

        assert.equal(start.session, undefined);
        const verified = await OtpRequest.verifyEmail({
            session: "11111111-1111-1111-1111-111111111111",
            otp_request_id: start.otp_request_id,
            email: "user@example.com",
            code: sentOtp?.code,
            purpose: "recovery_email",
        });
        assert.deepEqual(verified, {
            verified: true,
            email: "user@example.com",
        });
    });
});

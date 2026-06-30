import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Request, Response } from "express";
import { sendOtp } from "../../src/main/ts/libs/otpDelivery.ts";
import { HTMLStatusError, processError } from "../../src/main/ts/libs/HTMLStatusError.ts";

const originalEnv = { ...process.env };
const originalFetch = globalThis.fetch;

function restoreGlobals(): void {
    process.env = { ...originalEnv };
    globalThis.fetch = originalFetch;
}

function mockResponse() {
    const res = {
        statusCode: -1,
        body: {} as Record<string, unknown>,
        status(code: number) {
            this.statusCode = code;
            return this;
        },
        json(payload: Record<string, unknown>) {
            this.body = payload;
            return this;
        },
    };
    return res;
}

describe("OTP delivery failures", () => {
    afterEach(() => {
        restoreGlobals();
    });

    it("throws a 502 when the configured provider rejects delivery", async () => {
        process.env.NODE_ENV = "production";
        process.env.OTP_DEV_EXPOSE = "false";
        process.env.OTP_DEV_LOG = "false";
        process.env.OTP_SMS_WEBHOOK_URL = "https://otp-provider.test/sms";
        globalThis.fetch = async () => new Response(null, { status: 503 });

        await assert.rejects(
            sendOtp({
                channel: "phone",
                destination: "+15551234567",
                purpose: "login",
                code: "123456",
                expiresAt: "2026-01-01T00:00:00.000Z",
            }),
            (error) => {
                assert.ok(error instanceof HTMLStatusError);
                assert.equal(error.statusCode, 502);
                assert.equal(error.message, "OTP delivery failed");
                return true;
            },
        );
    });
});

describe("HTTP error mapping", () => {
    it("maps HTMLStatusError(502) to the bad gateway JSON envelope", () => {
        const req = {} as Request;
        const res = mockResponse();

        processError(
            req,
            res as unknown as Response,
            new HTMLStatusError("OTP delivery failed", 502),
        );

        assert.equal(res.statusCode, 502);
        assert.deepEqual(res.body, {
            code: 502,
            data: null,
            message: "OTP delivery failed",
        });
    });
});

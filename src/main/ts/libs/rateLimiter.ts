import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { createHash } from "node:crypto";
import type { Request } from "express";

function otpDestinationKey(req: Request): string {
    const body = req.body as { phone?: unknown; email?: unknown } | undefined;
    const candidate = body?.phone ?? body?.email;
    const destination = typeof candidate === "string" ? candidate : "missing-destination";
    return createHash("sha256")
        .update(`${ipKeyGenerator(req.ip ?? "unknown")}:${destination.trim().toLowerCase()}`)
        .digest("hex");
}

// General rate limit: 100 requests per 15 minutes per IP
export const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: true,
    legacyHeaders: false,
});

// Stricter limit on session creation: 10 per 15 minutes per IP
export const sessionLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { code: 429, data: null, message: "Too many session requests, please try again later" },
});

// Stricter limit on financial endpoints: 30 per 15 minutes per IP
export const financialLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { code: 429, data: null, message: "Too many requests, please try again later" },
});

// Stricter limit on user creation: 10 per 15 minutes per IP
export const userCreationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { code: 429, data: null, message: "Too many requests, please try again later" },
});

// OTP limit by IP + destination to slow abuse without blocking a shared IP outright.
export const otpStartLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: otpDestinationKey,
    message: { code: 429, data: null, message: "Too many OTP requests, please try again later" },
});

export const otpVerifyLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: otpDestinationKey,
    message: { code: 429, data: null, message: "Too many OTP verification attempts, please try again later" },
});

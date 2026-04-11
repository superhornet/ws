import rateLimit from "express-rate-limit";

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

import express from "express";
import helmet from "helmet";
import cors from "cors";
import {
    financialLimiter,
    generalLimiter,
    otpStartLimiter,
    otpVerifyLimiter,
    sessionLimiter,
} from "./libs/rateLimiter.ts";
import {sessionAuth} from "./libs/sessionAuth.ts";
import {router as healthRouter} from "./routes/index.ts";
import {router as auditRouter} from "./controllers/AuditController.ts";
import {router as sessionRouter} from "./controllers/SessionController.ts";
import {router as userRouter} from "./controllers/UserController.ts";
import {router as affiliateRouter  } from "./controllers/AffiliateController.ts";
import {router as notificationRouter} from "./controllers/NotificationController.ts";
import {router as stackRouter } from "./controllers/StackController.ts";
import {router as substackRouter } from "./controllers/SubstackController.ts";
import {router as cybridRouter } from "./controllers/CybridController.ts";
import {router as transactionRouter } from "./controllers/TransactionController.ts";
import {router as recurringDepositRouter } from "./controllers/RecurringDepositController.ts";
import {router as otpRouter } from "./controllers/OtpController.ts";

const DEFAULT_CORS_ORIGINS = ["http://localhost:8081", "http://127.0.0.1:8081"];

/**
 * Allowed CORS origins, read from the comma-separated `CORS_ALLOWED_ORIGINS`
 * env var and falling back to local development defaults.
 */
function corsOrigins(): string[] {
    const configured = process.env.CORS_ALLOWED_ORIGINS;
    if (!configured) {
        return DEFAULT_CORS_ORIGINS;
    }
    return configured.split(",").map((origin) => origin.trim()).filter(Boolean);
}

/**
 * @class App
 *
 */
export class App {
    public express;
    public applicationName = "WeStack API";

    /**
     * Sets up the App object attributes,
     * Loads routes and middleware,
     * Initializes the database.
     */
    constructor() {
        this.express = express();
        this.loadRoutes();
//        this.database = database;
    }

    /**
     * Enable .json() for req.body content.
     * Enable urlencoded() for future use.
     * Set up routes
     */
    public loadRoutes(): void {
        // When running behind a platform load balancer / reverse proxy (Render,
        // Railway, Fly, Nginx, Caddy, etc.) the real client IP arrives in
        // `X-Forwarded-For`. Tell Express how many proxy hops to trust so
        // rate limiting keys on the real client IP, not the proxy's.
        // Set TRUST_PROXY=1 (one proxy) or e.g. "loopback" in production.
        const trustProxy = process.env.TRUST_PROXY;
        if (trustProxy) {
            const numericHops = Number(trustProxy);
            this.express.set("trust proxy", Number.isNaN(numericHops) ? trustProxy : numericHops);
        }
        this.express.use(cors({
            origin: corsOrigins(),
            methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            allowedHeaders: ["Content-Type", "Authorization", "X-Session", "Idempotency-Key"],
            credentials: true,
        }));
        this.express.use(helmet());
        this.express.use(generalLimiter);
        this.express.use("/api/session", sessionLimiter);
        this.express.use("/api/cybrid", financialLimiter);
        this.express.use("/api/transaction", financialLimiter);
        this.express.use(express.json({ limit: '100kb' }));
        this.express.use(express.urlencoded({ limit: '100kb' }));
        this.express.use("/api/otp/phone/start", otpStartLimiter);
        this.express.use("/api/otp/email/start", otpStartLimiter);
        this.express.use("/api/otp/phone/verify", otpVerifyLimiter);
        this.express.use("/api/otp/email/verify", otpVerifyLimiter);
        this.express.use("/", healthRouter);
        this.express.use("/api", sessionRouter);
        this.express.use("/api", otpRouter);
        this.express.use("/api", sessionAuth);
        this.express.use("/api", auditRouter);
        this.express.use("/api", userRouter);
        this.express.use("/api", notificationRouter);
        this.express.use("/api", stackRouter);
        this.express.use("/api", substackRouter);
        this.express.use("/api", cybridRouter);
        this.express.use("/api", transactionRouter);
        this.express.use("/api", recurringDepositRouter);
        this.express.use("/api", affiliateRouter);
    }
}

// export default App;

import express from "express";
import helmet from "helmet";
import {generalLimiter, sessionLimiter, financialLimiter} from "./libs/rateLimiter.ts";
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
import {router as privyRouter } from "./controllers/PrivyController.ts";
import {router as transactionRouter } from "./controllers/TransactionController.ts";
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
        this.express.use(helmet());
        this.express.use(generalLimiter);
        this.express.use("/api/session", sessionLimiter);
        this.express.use("/api/cybrid", financialLimiter);
        this.express.use("/api/privy", financialLimiter);
        this.express.use("/api/transaction", financialLimiter);
        this.express.use(express.json({ limit: '100kb' }));
        this.express.use(express.urlencoded({ limit: '100kb' }));
        this.express.use("/", healthRouter);
        this.express.use("/api", sessionRouter);
        this.express.use("/api", sessionAuth);
        this.express.use("/api", auditRouter);
        this.express.use("/api", userRouter);
        this.express.use("/api", notificationRouter);
        this.express.use("/api", stackRouter);
        this.express.use("/api", substackRouter);
        this.express.use("/api", cybridRouter);
        this.express.use("/api", privyRouter);
        this.express.use("/api", transactionRouter);
        this.express.use("/api", affiliateRouter);
    }
}

// export default App;

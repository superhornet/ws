import express from "express";
import { router as auditRouter } from "./controllers/AuditController.js";
import { router as sessionRouter } from "./controllers/SessionController.js";
import { router as userRouter } from "./controllers/UserController.js";
import { router as notificationRouter } from "./controllers/NotificationController.js";
import { router as stackRouter } from "./controllers/StackController.js";
import { router as substackRouter } from "./controllers/SubstackController.js";
import { router as transactionRouter } from "./controllers/TransactionController.js";
//import { database } from "./libs/SQLInit.ts";
import { router as healthRouter } from "./routes/index.js";
/**
 * @class App
 *
 */
export class App {
    express;
    //public database;
    applicationName = "WeStack API";
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
    loadRoutes() {
        this.express.use(express.json());
        this.express.use(express.urlencoded());
        this.express.use("/", healthRouter);
        this.express.use("/api", sessionRouter);
        this.express.use("/api", auditRouter);
        this.express.use("/api", userRouter);
        this.express.use("/api", notificationRouter);
        this.express.use("/api", stackRouter);
        this.express.use("/api", substackRouter);
        this.express.use("/api", transactionRouter);
    }
}
// export default App;
//# sourceMappingURL=App.js.map
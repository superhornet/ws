/**
 * @class App
 *
 */
export declare class App {
    express: import("express-serve-static-core").Express;
    applicationName: string;
    /**
     * Sets up the App object attributes,
     * Loads routes and middleware,
     * Initializes the database.
     */
    constructor();
    /**
     * Enable .json() for req.body content.
     * Enable urlencoded() for future use.
     * Set up routes
     */
    loadRoutes(): void;
}
//# sourceMappingURL=App.d.ts.map
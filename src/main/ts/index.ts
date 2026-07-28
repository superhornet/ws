import { App } from "./App.ts";
import { Session } from "./models/Session.ts";

// Port for the HTTP server. Managed platforms (Render, Railway, Fly, Cloud Run,
// Heroku, etc.) inject `PORT`; local/dev and docker-compose use `SERVER_PORT`.
const rawPort = process.env.PORT ?? process.env.SERVER_PORT;

if (!rawPort) {
    throw new Error("Missing required environment variable: PORT or SERVER_PORT");
}

const port = Number(rawPort);

if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid server port: ${rawPort}`);
}

/**
 * Listen method:
 *
 * @param port
 * @param lambda
 * Starts the Express server. Database schema is applied separately by
 * scripts/migrate.mjs, not on boot.
 */
new App().express.listen(port, () => {
    // tslint:disable-next-line:no-console
    console.log(`server started at http://localhost:${port}`);
});

// Expired session rows used to be pruned by a public DELETE /api/session, which
// exposed a destructive verb to unauthenticated callers (L7). Pruning is now a
// background job; DELETE /api/session is a scoped, per-session logout. unref() so
// this timer never keeps the process alive on its own.
const SESSION_PRUNE_INTERVAL_MS = 15 * 60 * 1000;
setInterval(() => {
    Session.kill().catch((error) => console.error("Session prune failed:", error));
}, SESSION_PRUNE_INTERVAL_MS).unref();

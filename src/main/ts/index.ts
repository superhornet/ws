import { App } from "./App.ts";

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
new App().express.listen( port, () => {
  // tslint:disable-next-line:no-console
    console.log( `server started at http://localhost:${ port }` );
} );

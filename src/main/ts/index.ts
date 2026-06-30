import { App } from "./App.ts";

// Port for the HTTP server. Managed platforms (Render, Railway, Fly, Cloud Run,
// Heroku, etc.) inject `PORT`; local/dev and docker-compose use `SERVER_PORT`.
const port: string = process.env.PORT ?? process.env.SERVER_PORT ?? "3000";

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

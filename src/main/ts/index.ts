import dotenv from "dotenv";
import { App } from "./App.ts";
import { ensureDatabaseSchema } from "./libs/postgresDB.ts";

// initialize configuration
dotenv.config();

// Port for the HTTP server. Managed platforms (Render, Railway, Fly, Cloud Run,
// Heroku, etc.) inject `PORT`; local/dev and docker-compose use `SERVER_PORT`.
const port: string = process.env.PORT ?? process.env.SERVER_PORT ?? "3000";

/**
 * Listen method:
 *
 * @param port
 * @param lambda
 * Starts the Express server
 */
await ensureDatabaseSchema();

new App().express.listen( port, () => {
  // tslint:disable-next-line:no-console
    console.log( `server started at http://localhost:${ port }` );
} );

import dotenv from "dotenv";
import { App } from "./App.ts";

// initialize configuration
dotenv.config();

// port available to the node.js runtime like an environment variable
const port: string | undefined = process.env.SERVER_PORT;

/**
 * Listen method:
 *
 * @param port
 * @param lambda
 * Starts the Express server
 */
new App().express.listen( port, () => {
  // tslint:disable-next-line:no-console
    console.log( `server started at http://localhost:${ port }` );
} );

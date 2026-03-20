import dotenv from "dotenv";
import { App } from "./App.js";
// initialize configuration
dotenv.config();
// port available to the node.js runtime like an environment variable
const port = process.env.SERVER_PORT;
/**
 * Listen method:
 *
 * @param port
 * @param lambda
 * Starts the Express server
 */
new App().express.listen(port, () => {
    // tslint:disable-next-line:no-console
    console.log(`server started at http://localhost:${port}`);
});
//# sourceMappingURL=index.js.map
import { Given, Status} from "@cucumber/cucumber";
//import { ServerResponse } from "node:http";

Given('App is healthy', async function () {
    interface Health{
        message: string;
        code: number;
    }
    let result: Health;
    try {
        const response: Response = await fetch("http://localhost:3000/health");
        result = {message: response.statusText, code: response.status}
        if (result.code >= 400) {
            throw new Error(`Health Error msg: ${response.statusText}`);
        }
        //const health: Health = {response.statusText, response.ok};
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
        return Status.FAILED;
    }
    return Status.PASSED;
});

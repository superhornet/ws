import * as express from "express";
import JSONResponse from "../libs/JSONResponse.js";
import { Session } from "../models/Session.js";
export const router = express.Router();
router.get("/session", (req, res) => {
    try {
        const session = new Session();
        JSONResponse.goodToGo(req, res, "OK", session.session());
    }
    catch (error) {
        JSONResponse.serverError(req, res, error.message, null);
    }
});
//# sourceMappingURL=SessionController.js.map
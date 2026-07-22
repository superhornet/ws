
import * as express from "express";
import JSONResponse from "../libs/JSONResponse.ts";
export const router = express.Router();

/**
 * Route for /health
 */
router.get("/health", (req, res) => {
    try {
        JSONResponse.goodToGo(req, res, "OK", null);
    } catch (error) {
        JSONResponse.badRequest(req, res, (error as Error).message, null);
    }
});

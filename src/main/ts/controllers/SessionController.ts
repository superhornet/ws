import * as express from "express";
import JSONResponse from "../libs/JSONResponse.ts";
import {Session} from "../models/Session.ts";
export const router = express.Router();

router.get("/session", async (req, res) => {
    try {
        const session = await Session.create();
        JSONResponse.goodToGo(req, res, "OK", session.session() as unknown as JSON );
    } catch (error) {
        JSONResponse.serverError(req, res, (error as Error).message, null);
    }
});

router.delete("/session", (req, res) => {
    try{
        Session.kill();
        JSONResponse.noContent(req, res, "No Content", null);
    } catch (error){
        JSONResponse.serverError(req, res, (error as Error).message, null);
    }
});

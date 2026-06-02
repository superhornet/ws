import * as express from "express";
import JSONResponse from "../libs/JSONResponse.ts";
import { HTMLStatusError, processError } from "../libs/HTMLStatusError.ts";
import {Session} from "../models/Session.ts";
export const router = express.Router();

router.get("/session", async (req, res) => {
    try {
        const session = await Session.create();
        JSONResponse.goodToGo(req, res, "OK", session as unknown as JSON );
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.delete("/session", async (req, res) => {
    try{
        Session.kill();
        JSONResponse.noContent(req, res, "No Content", null);
    } catch (error){
        processError(req, res, error as HTMLStatusError);
    }
});

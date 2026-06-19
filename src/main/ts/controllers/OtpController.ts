import * as express from "express";
import JSONResponse from "../libs/JSONResponse.ts";
import { HTMLStatusError, processError } from "../libs/HTMLStatusError.ts";
import { requireBody } from "../libs/requestValidation.ts";
import { OtpRequest } from "../models/OtpRequest.ts";

export const router = express.Router();

router.post("/otp/phone/start", async (req, res) => {
    try {
        requireBody(req);
        const data = await OtpRequest.startPhone({
            phone: req.body.phone,
            purpose: req.body.purpose,
            sessionHeader: req.headers["x-session"] as string | undefined,
        });
        JSONResponse.goodToGo(req, res, "OK", data as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.post("/otp/phone/verify", async (req, res) => {
    try {
        requireBody(req);
        const data = await OtpRequest.verifyPhone({
            otp_request_id: req.body.otp_request_id,
            phone: req.body.phone,
            code: req.body.code,
            purpose: req.body.purpose,
        });
        JSONResponse.goodToGo(req, res, "OK", data as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.post("/otp/email/start", async (req, res) => {
    try {
        requireBody(req);
        const session = (req.headers["x-session"] as string | undefined) ?? req.body.session;
        const data = await OtpRequest.startEmail({
            session,
            email: req.body.email,
            purpose: req.body.purpose,
        });
        JSONResponse.goodToGo(req, res, "OK", data as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

router.post("/otp/email/verify", async (req, res) => {
    try {
        requireBody(req);
        const session = (req.headers["x-session"] as string | undefined) ?? req.body.session;
        const data = await OtpRequest.verifyEmail({
            session,
            otp_request_id: req.body.otp_request_id,
            email: req.body.email,
            code: req.body.code,
            purpose: req.body.purpose,
        });
        JSONResponse.goodToGo(req, res, "OK", data as unknown as JSON);
    } catch (error) {
        processError(req, res, error as HTMLStatusError);
    }
});

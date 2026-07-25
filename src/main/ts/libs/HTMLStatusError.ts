import type { Request, Response } from "express";
import JSONResponse from "./JSONResponse.ts";
/**
 * Custom Error so that
 * a status code can be passed with Error
 */
export class HTMLStatusError extends Error {
    private _statusCode!: number;
    public get statusCode() {
        return this._statusCode;
    }
    public set statusCode(value) {
        this._statusCode = value;
    }
    constructor(message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode;
    }
}
/**
 * Re-throw helper for model catch blocks: preserves an already-typed
 * `HTMLStatusError` (so a 404/403/400 isn't downgraded to 500) and wraps any
 * other error as a generic 500. Centralizing this guarantees no catch block can
 * forget the `instanceof` check.
 */
export function as500(error: unknown): never {
    if (error instanceof HTMLStatusError) {
        throw error;
    }
    // Log the real error server-side; never surface its message to the client.
    console.error("Wrapping as 500:", error);
    throw new HTMLStatusError("Internal Server Error", 500);
}
export function processError(req: Request, res: Response, error: HTMLStatusError) {
    if (error instanceof HTMLStatusError) {
        switch (error.statusCode.toString()) {
            case "400":
                JSONResponse.badRequest(req, res, error.message, null);
                break;
            case "403":
                JSONResponse.unauthorized(req, res, error.message, null);
                break;
            case "404":
                JSONResponse.notFound(req, res, error.message, null);
                break;
            case "409":
                JSONResponse.conflict(req, res, error.message, null);
                break;
            case "428":
                JSONResponse.preconditionRequired(req, res, error.message, null);
                break;
            case "501":
                JSONResponse.notImplemented(req, res, error.message, null);
                break;
            case "502":
                JSONResponse.badGateway(req, res, error.message, null);
                break;
            default:
                // 5xx: log the detail server-side; never put it in the response body.
                console.error("Unhandled server error:", error);
                JSONResponse.serverError(req, res, "Internal Server Error", null);
                break;
        }
    }else{
        console.error("Unhandled non-HTMLStatusError:", error);
        JSONResponse.serverError(req, res, "Internal Server Error", null);
    }

}

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
            case "501":
                JSONResponse.notImplemented(req, res, error.message, null);
                break;
            default:
                JSONResponse.serverError(req, res, error.message, null);
                break;
        }
    }else{
        JSONResponse.serverError(req, res, (error as Error).message, null);
    }

}

import type { Request, Response } from "express";
class JSONResponse {

    public static goodToGo(req: Request, res: Response, message: string, data: JSON | null) {
        res.status(200).json({
            code: 200,
            data,
            message: message || "OK"
        });
    }
    public static creationSuccess(req: Request, res: Response, message: string, data: JSON | null) {
        res.status(201).json({
            code: 201,
            data,
            message: message || "created"
        });
    }
    public static updateSuccess(req: Request, res: Response, message: string, data: JSON | null) {
        res.status(202).json({
            code: 202,
            data,
            message: message || "accepted"
        });
    }
    public static noContent(req: Request, res: Response, message: string, data: JSON | null) {
        res.status(204).json({
            code: 204,
            data,
            message: message || "no content"
        });
    }
    public static badRequest(req: Request, res: Response, message: string | null, data: JSON | null) {
        res.status(400).json({
            code: 400,
            data,
            message: message || "bad request",
        });
    }
    public static unauthorized(req: Request, res: Response, message: string, data: JSON | null) {
        res.status(403).json({
            code: 403,
            data,
            message: message || "forbidden"
        });
    }
    public static notFound(req: Request, res: Response, message: string, data: JSON | null) {
        res.status(404).json({
            code: 404,
            data,
            message: message || "not found"
        })
    }
    public static conflict(req: Request, res: Response, message: string, data: JSON | null) {
        res.status(409).json({
            code: 409,
            data,
            message: message || "conflict"
        });
    }
    public static serverError(req: Request, res: Response, message: string, data: JSON | null) {
        res.status(500).json({
            code: 500,
            data,
            message: message || "internal server error"
        });
    }
    public static notImplemented(req: Request, res: Response, message: string, data: JSON | null) {
        res.status(501).json({
            code: 501,
            data,
            message: message || "not implemented"
        });
    }
}

export default JSONResponse;

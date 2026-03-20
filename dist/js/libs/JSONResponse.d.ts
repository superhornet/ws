import type { Request, Response } from "express";
declare class JSONResponse {
    static goodToGo(req: Request, res: Response, message: string, data: JSON | null): void;
    static creationSuccess(req: Request, res: Response, message: string, data: JSON | null): void;
    static updateSuccess(req: Request, res: Response, message: string, data: JSON | null): void;
    static noContent(req: Request, res: Response, message: string, data: JSON | null): void;
    static badRequest(req: Request, res: Response, message: string | null, data: JSON | null): void;
    static unauthorized(req: Request, res: Response, message: string, data: JSON | null): void;
    static notFound(req: Request, res: Response, message: string, data: JSON | null): void;
    static serverError(req: Request, res: Response, message: string, data: JSON | null): void;
    static notImplemented(req: Request, res: Response, message: string, data: JSON | null): void;
}
export default JSONResponse;
//# sourceMappingURL=JSONResponse.d.ts.map
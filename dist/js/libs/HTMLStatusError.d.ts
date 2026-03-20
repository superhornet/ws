import type { Request, Response } from "express";
/**
 * Custom Error so that
 * a status code can be passed with Error
 */
export declare class HTMLStatusError extends Error {
    private _statusCode;
    get statusCode(): number;
    set statusCode(value: number);
    constructor(message: string, statusCode: number);
}
export declare function processError(req: Request, res: Response, error: HTMLStatusError): void;
//# sourceMappingURL=HTMLStatusError.d.ts.map
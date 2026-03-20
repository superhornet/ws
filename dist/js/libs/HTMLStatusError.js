import JSONResponse from "./JSONResponse.js";
/**
 * Custom Error so that
 * a status code can be passed with Error
 */
export class HTMLStatusError extends Error {
    _statusCode;
    get statusCode() {
        return this._statusCode;
    }
    set statusCode(value) {
        this._statusCode = value;
    }
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
    }
}
export function processError(req, res, error) {
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
                break;
        }
    }
    else {
        JSONResponse.serverError(req, res, error.message, null);
    }
}
//# sourceMappingURL=HTMLStatusError.js.map
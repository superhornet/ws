class JSONResponse {
    static goodToGo(req, res, message, data) {
        res.status(200).json({
            code: 200,
            data,
            message: message || "OK"
        });
    }
    static creationSuccess(req, res, message, data) {
        res.status(201).json({
            code: 201,
            data,
            message: message || "created"
        });
    }
    static updateSuccess(req, res, message, data) {
        res.status(202).json({
            code: 202,
            data,
            message: message || "accepted"
        });
    }
    static noContent(req, res, message, data) {
        res.status(204).json({
            code: 204,
            data,
            message: message || "no content"
        });
    }
    static badRequest(req, res, message, data) {
        res.status(400).json({
            code: 400,
            data,
            message: message || "bad request",
        });
    }
    static unauthorized(req, res, message, data) {
        res.status(403).json({
            code: 403,
            data,
            message: message || "forbidden",
            req: req.body
        });
    }
    static notFound(req, res, message, data) {
        res.status(404).json({
            code: 404,
            data,
            message: message || "not found",
            req: req.originalUrl
        });
    }
    static serverError(req, res, message, data) {
        res.status(500).json({
            code: 500,
            data,
            message: message || "internal server error",
            req: req.originalUrl,
        });
    }
    static notImplemented(req, res, message, data) {
        res.status(501).json({
            code: 501,
            data,
            message: message || "not implemented",
            req: req.originalUrl,
        });
    }
}
export default JSONResponse;
//# sourceMappingURL=JSONResponse.js.map
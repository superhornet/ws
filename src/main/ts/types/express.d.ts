import "express";

declare global {
    namespace Express {
        interface Request {
            /**
             * The user_identifier the request's session is bound to, populated
             * by the `sessionAuth` middleware. `null` for a valid but still
             * anonymous session (pre signup/login); `undefined` before the
             * middleware runs.
             */
            authUser?: string | null;
        }
    }
}

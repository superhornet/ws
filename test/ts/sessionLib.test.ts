import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Request } from "express";
import { getSession, requireSessionFromBody } from "../../src/main/ts/libs/session.ts";
import { HTMLStatusError } from "../../src/main/ts/libs/HTMLStatusError.ts";

function makeReq(headers: Record<string, string | undefined> = {}): Request {
    return { headers } as unknown as Request;
}

describe("getSession", () => {
    it("returns the x-session header when present", () => {
        const req = makeReq({ "x-session": "abc-123" });
        assert.equal(getSession(req), "abc-123");
    });

    it("throws HTMLStatusError(403) when the header is missing", () => {
        const req = makeReq({});
        assert.throws(
            () => getSession(req),
            (error: HTMLStatusError) => {
                assert.equal(error.statusCode, 403);
                assert.match(error.message, /Session ID Required/);
                return true;
            },
        );
    });

    it("throws HTMLStatusError(403) when the header is an empty string", () => {
        const req = makeReq({ "x-session": "" });
        assert.throws(
            () => getSession(req),
            (error: HTMLStatusError) => {
                assert.equal(error.statusCode, 403);
                return true;
            },
        );
    });
});

describe("requireSessionFromBody", () => {
    it("passes when data.session is a non-empty string", () => {
        const data = { session: "abc-123" };
        assert.doesNotThrow(() => requireSessionFromBody(data));
    });

    it("throws HTMLStatusError(403) when data.session is undefined", () => {
        const data: { session?: string } = {};
        assert.throws(
            () => requireSessionFromBody(data),
            (error: HTMLStatusError) => {
                assert.equal(error.statusCode, 403);
                assert.match(error.message, /Session ID Required/);
                return true;
            },
        );
    });

    it("throws HTMLStatusError(403) when data.session is an empty string", () => {
        const data = { session: "" };
        assert.throws(
            () => requireSessionFromBody(data),
            (error: HTMLStatusError) => {
                assert.equal(error.statusCode, 403);
                return true;
            },
        );
    });

    it("narrows data.session from string|undefined to string after the call", () => {
        const data: { session?: string; other: number } = { session: "abc", other: 1 };
        requireSessionFromBody(data);
        // The assertion below would not compile if the type guard were removed,
        // because `data.session` would still be `string | undefined`.
        const sessionId: string = data.session;
        assert.equal(sessionId, "abc");
    });
});

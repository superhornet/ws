import { describe, it, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { HTMLStatusError } from "../../src/main/ts/libs/HTMLStatusError.ts";

const mockCreateBookTransfer = mock.fn<(...args: unknown[]) => Promise<unknown>>();

mock.module("../../src/main/ts/libs/CybridClient.ts", {
    namedExports: {
        createBookTransfer: mockCreateBookTransfer,
    },
});

const { Cybrid } = await import("../../src/main/ts/models/Cybrid.ts");

describe("Cybrid.transferFiat", () => {

    const mockTransfer = {
        guid: "transfer-guid-123",
        transfer_type: "book",
        state: "completed",
        amount: 5000,
        asset: "USD",
    };

    beforeEach(() => {
        mockCreateBookTransfer.mock.resetCalls();
        mockCreateBookTransfer.mock.mockImplementation(async () => mockTransfer);
    });

    it("should throw when source account GUID is missing", async () => {
        await assert.rejects(
            () => Cybrid.transferFiat("", "dest-guid", 5000),
            (error: HTMLStatusError) => {
                assert.equal(error.statusCode, 400);
                assert.match(error.message, /Source account GUID/);
                return true;
            },
        );
    });

    it("should throw when destination account GUID is missing", async () => {
        await assert.rejects(
            () => Cybrid.transferFiat("source-guid", "", 5000),
            (error: HTMLStatusError) => {
                assert.equal(error.statusCode, 400);
                assert.match(error.message, /Destination account GUID/);
                return true;
            },
        );
    });

    it("should throw when amount is zero", async () => {
        await assert.rejects(
            () => Cybrid.transferFiat("source-guid", "dest-guid", 0),
            (error: HTMLStatusError) => {
                assert.equal(error.statusCode, 400);
                assert.match(error.message, /positive number/);
                return true;
            },
        );
    });

    it("should throw when amount is negative", async () => {
        await assert.rejects(
            () => Cybrid.transferFiat("source-guid", "dest-guid", -100),
            (error: HTMLStatusError) => {
                assert.equal(error.statusCode, 400);
                assert.match(error.message, /positive number/);
                return true;
            },
        );
    });

    it("should call CybridClient.createBookTransfer with correct args", async () => {
        const result = await Cybrid.transferFiat("src-guid", "dst-guid", 5000, "USD");

        assert.equal(mockCreateBookTransfer.mock.callCount(), 1);
        const call = mockCreateBookTransfer.mock.calls[0]!;
        assert.deepEqual(call.arguments, ["src-guid", "dst-guid", 5000, "USD"]);
        assert.equal(result.guid, "transfer-guid-123");
    });

    it("should pass undefined asset when not provided", async () => {
        await Cybrid.transferFiat("src-guid", "dst-guid", 1000);

        const call = mockCreateBookTransfer.mock.calls[0]!;
        assert.deepEqual(call.arguments, ["src-guid", "dst-guid", 1000, undefined]);
    });

    it("should wrap non-HTMLStatusError as 500", async () => {
        mockCreateBookTransfer.mock.mockImplementation(async () => {
            throw new Error("network failure");
        });

        await assert.rejects(
            () => Cybrid.transferFiat("src-guid", "dst-guid", 5000),
            (error: HTMLStatusError) => {
                assert.equal(error.statusCode, 500);
                assert.match(error.message, /network failure/);
                return true;
            },
        );
    });

    it("should re-throw HTMLStatusError from client unchanged", async () => {
        mockCreateBookTransfer.mock.mockImplementation(async () => {
            throw new HTMLStatusError("Quote creation failed: no guid returned", 500);
        });

        await assert.rejects(
            () => Cybrid.transferFiat("src-guid", "dst-guid", 5000),
            (error: HTMLStatusError) => {
                assert.equal(error.statusCode, 500);
                assert.match(error.message, /Quote creation failed/);
                return true;
            },
        );
    });
});

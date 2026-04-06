import { describe, it, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { Observable, of } from "rxjs";
import { HTMLStatusError } from "../../src/main/ts/libs/HTMLStatusError.ts";

const mockQuoteResult = { guid: "quote-guid-789", product_type: "book_transfer", asset: "USD", deliver_amount: 3000 };
const mockTransferResult = { guid: "transfer-guid-abc", transfer_type: "book", state: "completed" };

type QuoteFn = (arg: Record<string, unknown>) => Observable<typeof mockQuoteResult>;
type TransferFn = (arg: Record<string, unknown>) => Observable<typeof mockTransferResult>;

const mockCreateQuote = mock.fn<QuoteFn>(() => of(mockQuoteResult));
const mockCreateTransfer = mock.fn<TransferFn>(() => of(mockTransferResult));

mock.module("@cybrid/cybrid-api-bank-typescript", {
    namedExports: {
        Configuration: class {},
        CustomersBankApi: class {},
        AccountsBankApi: class {},
        QuotesBankApi: class {
            createQuote = mockCreateQuote;
        },
        TradesBankApi: class {},
        TransfersBankApi: class {
            createTransfer = mockCreateTransfer;
        },
        IdentityVerificationsBankApi: class {},
        PostQuoteBankModelProductTypeEnum: {
            Trading: "trading",
            Funding: "funding",
            CryptoTransfer: "crypto_transfer",
            InterAccount: "inter_account",
            LightningTransfer: "lightning_transfer",
            BookTransfer: "book_transfer",
        },
        PostTransferBankModelTransferTypeEnum: {
            Funding: "funding",
            Crypto: "crypto",
            InstantFunding: "instant_funding",
            InterAccount: "inter_account",
            Lightning: "lightning",
            Book: "book",
        },
    },
});

const CybridClient = await import("../../src/main/ts/libs/CybridClient.ts");

describe("CybridClient.createBookTransfer", () => {

    beforeEach(() => {
        mockCreateQuote.mock.resetCalls();
        mockCreateTransfer.mock.resetCalls();
        mockCreateQuote.mock.mockImplementation(() => of(mockQuoteResult));
        mockCreateTransfer.mock.mockImplementation(() => of(mockTransferResult));
    });

    it("should create a book_transfer quote then a book transfer", async () => {
        const result = await CybridClient.createBookTransfer("src-acct", "dst-acct", 3000, "USD");

        assert.equal(mockCreateQuote.mock.callCount(), 1);
        const quoteArgs = mockCreateQuote.mock.calls[0]!.arguments[0] as unknown as Record<string, unknown>;
        const postQuote = (quoteArgs as Record<string, Record<string, unknown>>).postQuoteBankModel;
        assert.equal(postQuote!.product_type, "book_transfer");
        assert.equal(postQuote!.asset, "USD");
        assert.equal(postQuote!.deliver_amount, 3000);

        assert.equal(mockCreateTransfer.mock.callCount(), 1);
        const transferArgs = mockCreateTransfer.mock.calls[0]!.arguments[0] as unknown as Record<string, unknown>;
        const postTransfer = (transferArgs as Record<string, Record<string, unknown>>).postTransferBankModel;
        assert.equal(postTransfer!.quote_guid, "quote-guid-789");
        assert.equal(postTransfer!.transfer_type, "book");
        assert.equal(postTransfer!.source_account_guid, "src-acct");
        assert.equal(postTransfer!.destination_account_guid, "dst-acct");

        assert.equal(result.guid, "transfer-guid-abc");
    });

    it("should default asset to USD when not provided", async () => {
        await CybridClient.createBookTransfer("src-acct", "dst-acct", 1000);

        const quoteArgs = mockCreateQuote.mock.calls[0]!.arguments[0] as unknown as Record<string, unknown>;
        const postQuote = (quoteArgs as Record<string, Record<string, unknown>>).postQuoteBankModel;
        assert.equal(postQuote!.asset, "USD");
    });

    it("should throw if quote returns no guid", async () => {
        mockCreateQuote.mock.mockImplementation(() => of({ ...mockQuoteResult, guid: undefined } as unknown as typeof mockQuoteResult));

        await assert.rejects(
            () => CybridClient.createBookTransfer("src-acct", "dst-acct", 1000),
            (error: HTMLStatusError) => {
                assert.equal(error.statusCode, 500);
                assert.match(error.message, /Quote creation failed/);
                return true;
            },
        );
    });

    it("should not call createTransfer if quote has no guid", async () => {
        mockCreateQuote.mock.mockImplementation(() => of({ ...mockQuoteResult, guid: undefined } as unknown as typeof mockQuoteResult));

        try {
            await CybridClient.createBookTransfer("src-acct", "dst-acct", 1000);
        } catch {
            // expected
        }

        assert.equal(mockCreateTransfer.mock.callCount(), 0);
    });
});

import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Mock postgresDB to prevent DB connection attempts
mock.module('../../src/main/ts/libs/postgresDB.ts', {
    namedExports: {
        query: async () => [],
        withTransaction: async (fn: (client: unknown) => Promise<unknown>) =>
            fn({ query: async () => ({ rows: [], rowCount: 0 }) })
    }
});

// --- IdempotencyKey model mocks ---

type AnyFn = (...args: unknown[]) => Promise<unknown>;
const fn = () => mock.fn<AnyFn>();

const mockAcquire = fn();
const mockComplete = fn();
const mockRelease = fn();

mock.module('../../src/main/ts/models/IdempotencyKey.ts', {
    namedExports: {
        IdempotencyKey: {
            acquire: mockAcquire,
            complete: mockComplete,
            release: mockRelease,
        }
    }
});

// --- Cybrid model mocks ---

const mockCreateTransfer = fn();
const mockCreateTrade = fn();
const mockCreateQuote = fn();
const mockTransferFiat = fn();

mock.module('../../src/main/ts/models/Cybrid.ts', {
    namedExports: {
        Cybrid: {
            createTransfer: mockCreateTransfer,
            createTrade: mockCreateTrade,
            createQuote: mockCreateQuote,
            transferFiat: mockTransferFiat,
            // Stub remaining methods so the module import doesn't fail
            createCustomer: fn(), getCustomer: fn(), listCustomers: fn(), updateCustomer: fn(),
            createAccount: fn(), getAccount: fn(), listAccounts: fn(),
            getQuote: fn(), listQuotes: fn(),
            getTrade: fn(), listTrades: fn(),
            getTransfer: fn(), listTransfers: fn(), updateTransfer: fn(),
            createIdentityVerification: fn(), getIdentityVerification: fn(), listIdentityVerifications: fn(),
            listSymbols: fn(), listAssets: fn(), listPrices: fn(),
            createDepositAddress: fn(), getDepositAddress: fn(), listDepositAddresses: fn(),
            createDepositBankAccount: fn(), getDepositBankAccount: fn(), listDepositBankAccounts: fn(),
            createExternalBankAccount: fn(), getExternalBankAccount: fn(), listExternalBankAccounts: fn(),
            patchExternalBankAccount: fn(), deleteExternalBankAccount: fn(),
            createExternalWallet: fn(), getExternalWallet: fn(), listExternalWallets: fn(), deleteExternalWallet: fn(),
            createWorkflow: fn(), getWorkflow: fn(), listWorkflows: fn(),
            createBank: fn(), getBank: fn(), listBanks: fn(), updateBank: fn(),
            createCounterparty: fn(), getCounterparty: fn(), listCounterparties: fn(),
            createPersonaSession: fn(),
            createFile: fn(), getFile: fn(), listFiles: fn(),
            createExecution: fn(), getExecution: fn(), listExecutions: fn(),
            createInvoice: fn(), getInvoice: fn(), listInvoices: fn(), cancelInvoice: fn(),
            createPaymentInstruction: fn(), getPaymentInstruction: fn(), listPaymentInstructions: fn(),
            createPlan: fn(), getPlan: fn(), listPlans: fn(),
        }
    }
});

// Mock Audit to prevent DB calls
mock.module('../../src/main/ts/models/Audit.ts', {
    namedExports: {
        Audit: class {
            constructor() { }
        }
    }
});

const express = (await import('express')).default;
const { router } =
    await import('../../src/main/ts/controllers/CybridController.ts');

function createApp() {
    const app = express();
    app.use(express.json());
    app.use('/api', router);
    return app;
}

interface JSONResult {
    status: number;
    body: Record<string, unknown>;
    headers: Record<string, string>;
}

async function sendJSON(
    app: ReturnType<typeof express>,
    method: 'POST' | 'GET' | 'PATCH' | 'DELETE',
    path: string,
    body?: unknown,
    headers: Record<string, string> = {}
): Promise<JSONResult> {
    const { request } = await import('node:http');
    return new Promise<JSONResult>((resolve, reject) => {
        const server = app.listen(0, () => {
            const addr = server.address();
            if (!addr || typeof addr === 'string') {
                server.close();
                return reject(new Error('Could not get server address'));
            }
            const payload = body === undefined ? undefined : JSON.stringify(body);
            const req = request(
                {
                    hostname: '127.0.0.1',
                    port: addr.port,
                    path,
                    method,
                    headers: {
                        'Content-Type': 'application/json',
                        ...(payload ? { 'Content-Length': Buffer.byteLength(payload).toString() } : {}),
                        ...headers
                    }
                },
                (res) => {
                    let data = '';
                    res.on('data', (chunk: string) => {
                        data += chunk;
                    });
                    res.on('end', () => {
                        server.close();
                        const responseHeaders: Record<string, string> = {};
                        for (const [k, v] of Object.entries(res.headers)) {
                            if (typeof v === 'string') responseHeaders[k] = v;
                        }
                        resolve({
                            status: res.statusCode ?? 0,
                            body: data ? (JSON.parse(data) as Record<string, unknown>) : {},
                            headers: responseHeaders
                        });
                    });
                }
            );
            req.on('error', (err: Error) => {
                server.close();
                reject(err);
            });
            if (payload) {
                req.write(payload);
            }
            req.end();
        });
    });
}

const SESSION = '12345678-1234-1234-1234-123456789012';
const IDEM_KEY = 'test-idempotency-key-001';

const mockTransferResult = {
    guid: 'transfer-guid-123',
    transfer_type: 'crypto',
    state: 'completed',
    amount: 1000,
    asset: 'BTC'
};

// =============================================================================
// Idempotency: POST /api/cybrid/transfer
// =============================================================================

describe('Idempotency on POST /api/cybrid/transfer', () => {

    beforeEach(() => {
        mockAcquire.mock.resetCalls();
        mockComplete.mock.resetCalls();
        mockRelease.mock.resetCalls();
        mockCreateTransfer.mock.resetCalls();
        mockCreateTransfer.mock.mockImplementation(async () => mockTransferResult);
    });

    it('should return 400 when Idempotency-Key header is missing', async () => {
        const app = createApp();
        const res = await sendJSON(app, 'POST', '/api/cybrid/transfer', {
            session: SESSION,
        });
        assert.equal(res.status, 400);
        assert.match(res.body.message as string, /Idempotency-Key header is required/);
        assert.equal(mockAcquire.mock.callCount(), 0, 'should not touch idempotency DB');
        assert.equal(mockCreateTransfer.mock.callCount(), 0, 'should not call model');
    });

    it('should execute and cache on first request with Idempotency-Key', async () => {
        mockAcquire.mock.mockImplementation(async () => null);
        mockComplete.mock.mockImplementation(async () => undefined);

        const app = createApp();
        const res = await sendJSON(app, 'POST', '/api/cybrid/transfer', {
            session: SESSION,
        }, { 'Idempotency-Key': IDEM_KEY });

        assert.equal(res.status, 201);
        assert.equal(res.body.message, 'Transfer created');
        assert.equal(mockAcquire.mock.callCount(), 1, 'should acquire lock');
        assert.equal(mockCreateTransfer.mock.callCount(), 1, 'should call model');
        assert.equal(mockComplete.mock.callCount(), 1, 'should cache response');
    });

    it('should return cached response on duplicate completed request', async () => {
        const cachedResponse = { code: 201, data: mockTransferResult, message: 'Transfer created' };
        mockAcquire.mock.mockImplementation(async () => ({
            id: 1,
            idempotency_key: IDEM_KEY,
            session_id: SESSION,
            route_path: '/cybrid/transfer',
            status: 'completed',
            response_code: 201,
            response_body: cachedResponse,
            created_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
        }));

        const app = createApp();
        const res = await sendJSON(app, 'POST', '/api/cybrid/transfer', {
            session: SESSION,
        }, { 'Idempotency-Key': IDEM_KEY });

        assert.equal(res.status, 201);
        assert.equal(res.body.message, 'Transfer created');
        assert.equal(res.headers['idempotent-replayed'], 'true');
        assert.equal(mockCreateTransfer.mock.callCount(), 0, 'should NOT call model on replay');
        assert.equal(mockComplete.mock.callCount(), 0, 'should NOT call complete on replay');
    });

    it('should return 409 when another request is in progress', async () => {
        mockAcquire.mock.mockImplementation(async () => ({
            id: 1,
            idempotency_key: IDEM_KEY,
            session_id: SESSION,
            route_path: '/cybrid/transfer',
            status: 'in_progress',
            response_code: null,
            response_body: null,
            created_at: new Date().toISOString(),
            completed_at: null,
        }));

        const app = createApp();
        const res = await sendJSON(app, 'POST', '/api/cybrid/transfer', {
            session: SESSION,
        }, { 'Idempotency-Key': IDEM_KEY });

        assert.equal(res.status, 409);
        assert.match(res.body.message as string, /already in progress/);
        assert.equal(mockCreateTransfer.mock.callCount(), 0, 'should NOT call model');
    });

    it('should release lock and propagate error on handler failure', async () => {
        mockAcquire.mock.mockImplementation(async () => null);
        mockRelease.mock.mockImplementation(async () => undefined);
        mockCreateTransfer.mock.mockImplementation(async () => {
            throw new Error('Cybrid API unavailable');
        });

        const app = createApp();
        const res = await sendJSON(app, 'POST', '/api/cybrid/transfer', {
            session: SESSION,
        }, { 'Idempotency-Key': IDEM_KEY });

        assert.equal(res.status, 500);
        assert.match(res.body.message as string, /Cybrid API unavailable/);
        assert.equal(mockRelease.mock.callCount(), 1, 'should release the lock');
        assert.equal(mockComplete.mock.callCount(), 0, 'should NOT cache error');
    });

    it('should return 400 for empty Idempotency-Key', async () => {
        const app = createApp();
        const res = await sendJSON(app, 'POST', '/api/cybrid/transfer', {
            session: SESSION,
        }, { 'Idempotency-Key': '' });

        // Empty header is treated as missing by Express (not sent), so returns 400 (header required)
        // Either way the request is rejected — safe behavior
        assert.equal(res.status, 400);
    });

    it('should return 400 for oversized Idempotency-Key', async () => {
        const app = createApp();
        const longKey = 'x'.repeat(256);
        const res = await sendJSON(app, 'POST', '/api/cybrid/transfer', {
            session: SESSION,
        }, { 'Idempotency-Key': longKey });

        assert.equal(res.status, 400);
        assert.match(res.body.message as string, /Idempotency-Key/);
        assert.equal(mockAcquire.mock.callCount(), 0, 'should not try to acquire');
    });

    it('should not create idempotency record for validation errors', async () => {
        const app = createApp();

        // Missing session triggers 403 before withIdempotency is reached
        const res = await sendJSON(app, 'POST', '/api/cybrid/transfer', {
            some_field: 'value', // non-empty body so we pass the empty-body check
        }, { 'Idempotency-Key': IDEM_KEY });

        assert.equal(res.status, 403);
        assert.equal(mockAcquire.mock.callCount(), 0, 'should not touch idempotency on validation error');
    });
});

// =============================================================================
// Idempotency: POST /api/cybrid/fiat-transfer
// =============================================================================

describe('Idempotency on POST /api/cybrid/fiat-transfer', () => {
    const mockFiatResult = {
        guid: 'fiat-transfer-guid-789',
        transfer_type: 'book',
        state: 'completed',
        amount: 2500,
        asset: 'USD'
    };

    beforeEach(() => {
        mockAcquire.mock.resetCalls();
        mockComplete.mock.resetCalls();
        mockRelease.mock.resetCalls();
        mockTransferFiat.mock.resetCalls();
        mockTransferFiat.mock.mockImplementation(async () => mockFiatResult);
    });

    it('should return 400 when Idempotency-Key header is missing', async () => {
        const app = createApp();
        const res = await sendJSON(app, 'POST', '/api/cybrid/fiat-transfer', {
            session: SESSION,
            source_account_guid: 'src-guid',
            destination_account_guid: 'dst-guid',
            amount: 2500,
        });
        assert.equal(res.status, 400);
        assert.match(res.body.message as string, /Idempotency-Key header is required/);
        assert.equal(mockAcquire.mock.callCount(), 0);
        assert.equal(mockTransferFiat.mock.callCount(), 0);
    });

    it('should cache and replay with Idempotency-Key', async () => {
        mockAcquire.mock.mockImplementation(async () => null);
        mockComplete.mock.mockImplementation(async () => undefined);

        const app = createApp();
        const res = await sendJSON(app, 'POST', '/api/cybrid/fiat-transfer', {
            session: SESSION,
            source_account_guid: 'src-guid',
            destination_account_guid: 'dst-guid',
            amount: 2500,
        }, { 'Idempotency-Key': IDEM_KEY });

        assert.equal(res.status, 201);
        assert.equal(mockTransferFiat.mock.callCount(), 1);
        assert.equal(mockComplete.mock.callCount(), 1);
    });

    it('should not create idempotency record when amount validation fails', async () => {
        const app = createApp();
        const res = await sendJSON(app, 'POST', '/api/cybrid/fiat-transfer', {
            session: SESSION,
            source_account_guid: 'src-guid',
            destination_account_guid: 'dst-guid',
            amount: 999999, // exceeds $5,000 cap
        }, { 'Idempotency-Key': IDEM_KEY });

        assert.equal(res.status, 400);
        assert.equal(mockAcquire.mock.callCount(), 0, 'validation runs before idempotency');
    });
});

// =============================================================================
// Idempotency: POST /api/cybrid/trade
// =============================================================================

describe('Idempotency on POST /api/cybrid/trade', () => {
    const mockTradeResult = {
        guid: 'trade-guid-456',
        side: 'buy',
        state: 'completed',
    };

    beforeEach(() => {
        mockAcquire.mock.resetCalls();
        mockComplete.mock.resetCalls();
        mockRelease.mock.resetCalls();
        mockCreateTrade.mock.resetCalls();
        mockCreateTrade.mock.mockImplementation(async () => mockTradeResult);
    });

    it('should return 400 when Idempotency-Key header is missing', async () => {
        const app = createApp();
        const res = await sendJSON(app, 'POST', '/api/cybrid/trade', {
            session: SESSION,
        });
        assert.equal(res.status, 400);
        assert.match(res.body.message as string, /Idempotency-Key header is required/);
        assert.equal(mockAcquire.mock.callCount(), 0);
        assert.equal(mockCreateTrade.mock.callCount(), 0);
    });

    it('should return cached response on duplicate', async () => {
        const cached = { code: 201, data: mockTradeResult, message: 'Trade created' };
        mockAcquire.mock.mockImplementation(async () => ({
            id: 1,
            idempotency_key: IDEM_KEY,
            session_id: SESSION,
            route_path: '/cybrid/trade',
            status: 'completed',
            response_code: 201,
            response_body: cached,
            created_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
        }));

        const app = createApp();
        const res = await sendJSON(app, 'POST', '/api/cybrid/trade', {
            session: SESSION,
        }, { 'Idempotency-Key': IDEM_KEY });

        assert.equal(res.status, 201);
        assert.equal(res.headers['idempotent-replayed'], 'true');
        assert.equal(mockCreateTrade.mock.callCount(), 0);
    });
});

// =============================================================================
// Idempotency: POST /api/cybrid/quote
// =============================================================================

describe('Idempotency on POST /api/cybrid/quote', () => {
    const mockQuoteResult = {
        guid: 'quote-guid-789',
        product_type: 'trading',
        side: 'buy',
    };

    beforeEach(() => {
        mockAcquire.mock.resetCalls();
        mockComplete.mock.resetCalls();
        mockRelease.mock.resetCalls();
        mockCreateQuote.mock.resetCalls();
        mockCreateQuote.mock.mockImplementation(async () => mockQuoteResult);
    });

    it('should return 400 when Idempotency-Key header is missing', async () => {
        const app = createApp();
        const res = await sendJSON(app, 'POST', '/api/cybrid/quote', {
            session: SESSION,
        });
        assert.equal(res.status, 400);
        assert.match(res.body.message as string, /Idempotency-Key header is required/);
        assert.equal(mockAcquire.mock.callCount(), 0);
        assert.equal(mockCreateQuote.mock.callCount(), 0);
    });

    it('should release lock on error', async () => {
        mockAcquire.mock.mockImplementation(async () => null);
        mockRelease.mock.mockImplementation(async () => undefined);
        mockCreateQuote.mock.mockImplementation(async () => {
            throw new Error('Quote service down');
        });

        const app = createApp();
        const res = await sendJSON(app, 'POST', '/api/cybrid/quote', {
            session: SESSION,
        }, { 'Idempotency-Key': IDEM_KEY });

        assert.equal(res.status, 500);
        assert.equal(mockRelease.mock.callCount(), 1);
        assert.equal(mockComplete.mock.callCount(), 0);
    });
});

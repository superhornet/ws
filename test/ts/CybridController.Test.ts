import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Mock postgresDB to prevent DB connection attempts
mock.module('../../src/main/ts/libs/postgresDB.ts', {
    namedExports: {
        query: async () => ({ rows: [], rowCount: 0 }),
        withTransaction: async (fn: (client: unknown) => Promise<unknown>) =>
            fn({ query: async () => ({ rows: [], rowCount: 0 }) })
    }
});

// --- Cybrid model method mocks ---

type AnyFn = (...args: unknown[]) => Promise<unknown>;
const fn = () => mock.fn<AnyFn>();

const mockTransferFiat = fn();

const mockCreateCustomer = fn();
const mockGetCustomer = fn();
const mockListCustomers = fn();
const mockUpdateCustomer = fn();

const mockCreateAccount = fn();
const mockGetAccount = fn();
const mockListAccounts = fn();

const mockCreateQuote = fn();
const mockGetQuote = fn();
const mockListQuotes = fn();

const mockCreateTrade = fn();
const mockGetTrade = fn();
const mockListTrades = fn();

const mockCreateTransfer = fn();
const mockGetTransfer = fn();
const mockListTransfers = fn();
const mockUpdateTransfer = fn();

const mockCreateIdentityVerification = fn();
const mockGetIdentityVerification = fn();
const mockListIdentityVerifications = fn();

const mockListSymbols = fn();
const mockListAssets = fn();
const mockListPrices = fn();

const mockCreateDepositAddress = fn();
const mockGetDepositAddress = fn();
const mockListDepositAddresses = fn();

const mockCreateDepositBankAccount = fn();
const mockGetDepositBankAccount = fn();
const mockListDepositBankAccounts = fn();

const mockCreateExternalBankAccount = fn();
const mockGetExternalBankAccount = fn();
const mockListExternalBankAccounts = fn();
const mockPatchExternalBankAccount = fn();
const mockDeleteExternalBankAccount = fn();

const mockCreateExternalWallet = fn();
const mockGetExternalWallet = fn();
const mockListExternalWallets = fn();
const mockDeleteExternalWallet = fn();

const mockCreateWorkflow = fn();
const mockGetWorkflow = fn();
const mockListWorkflows = fn();

const mockCreateBank = fn();
const mockGetBank = fn();
const mockListBanks = fn();
const mockUpdateBank = fn();

const mockCreateCounterparty = fn();
const mockGetCounterparty = fn();
const mockListCounterparties = fn();

const mockCreatePersonaSession = fn();

const mockCreateFile = fn();
const mockGetFile = fn();
const mockListFiles = fn();

const mockCreateExecution = fn();
const mockGetExecution = fn();
const mockListExecutions = fn();

const mockCreateInvoice = fn();
const mockGetInvoice = fn();
const mockListInvoices = fn();
const mockCancelInvoice = fn();

const mockCreatePaymentInstruction = fn();
const mockGetPaymentInstruction = fn();
const mockListPaymentInstructions = fn();

const mockCreatePlan = fn();
const mockGetPlan = fn();
const mockListPlans = fn();

mock.module('../../src/main/ts/models/Cybrid.ts', {
    namedExports: {
        Cybrid: {
            transferFiat: mockTransferFiat,

            createCustomer: mockCreateCustomer,
            getCustomer: mockGetCustomer,
            listCustomers: mockListCustomers,
            updateCustomer: mockUpdateCustomer,

            createAccount: mockCreateAccount,
            getAccount: mockGetAccount,
            listAccounts: mockListAccounts,

            createQuote: mockCreateQuote,
            getQuote: mockGetQuote,
            listQuotes: mockListQuotes,

            createTrade: mockCreateTrade,
            getTrade: mockGetTrade,
            listTrades: mockListTrades,

            createTransfer: mockCreateTransfer,
            getTransfer: mockGetTransfer,
            listTransfers: mockListTransfers,
            updateTransfer: mockUpdateTransfer,

            createIdentityVerification: mockCreateIdentityVerification,
            getIdentityVerification: mockGetIdentityVerification,
            listIdentityVerifications: mockListIdentityVerifications,

            listSymbols: mockListSymbols,
            listAssets: mockListAssets,
            listPrices: mockListPrices,

            createDepositAddress: mockCreateDepositAddress,
            getDepositAddress: mockGetDepositAddress,
            listDepositAddresses: mockListDepositAddresses,

            createDepositBankAccount: mockCreateDepositBankAccount,
            getDepositBankAccount: mockGetDepositBankAccount,
            listDepositBankAccounts: mockListDepositBankAccounts,

            createExternalBankAccount: mockCreateExternalBankAccount,
            getExternalBankAccount: mockGetExternalBankAccount,
            listExternalBankAccounts: mockListExternalBankAccounts,
            patchExternalBankAccount: mockPatchExternalBankAccount,
            deleteExternalBankAccount: mockDeleteExternalBankAccount,

            createExternalWallet: mockCreateExternalWallet,
            getExternalWallet: mockGetExternalWallet,
            listExternalWallets: mockListExternalWallets,
            deleteExternalWallet: mockDeleteExternalWallet,

            createWorkflow: mockCreateWorkflow,
            getWorkflow: mockGetWorkflow,
            listWorkflows: mockListWorkflows,

            createBank: mockCreateBank,
            getBank: mockGetBank,
            listBanks: mockListBanks,
            updateBank: mockUpdateBank,

            createCounterparty: mockCreateCounterparty,
            getCounterparty: mockGetCounterparty,
            listCounterparties: mockListCounterparties,

            createPersonaSession: mockCreatePersonaSession,

            createFile: mockCreateFile,
            getFile: mockGetFile,
            listFiles: mockListFiles,

            createExecution: mockCreateExecution,
            getExecution: mockGetExecution,
            listExecutions: mockListExecutions,

            createInvoice: mockCreateInvoice,
            getInvoice: mockGetInvoice,
            listInvoices: mockListInvoices,
            cancelInvoice: mockCancelInvoice,

            createPaymentInstruction: mockCreatePaymentInstruction,
            getPaymentInstruction: mockGetPaymentInstruction,
            listPaymentInstructions: mockListPaymentInstructions,

            createPlan: mockCreatePlan,
            getPlan: mockGetPlan,
            listPlans: mockListPlans
        }
    }
});

// Mock IdempotencyKey to prevent DB calls
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

// Mock Audit to prevent DB calls
mock.module('../../src/main/ts/models/Audit.ts', {
    namedExports: {
        Audit: class {
            constructor () { }
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

interface JSONResult { status: number; body: Record<string, unknown> }

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
                        resolve({
                            status: res.statusCode ?? 0,
                            body: data ? (JSON.parse(data) as Record<string, unknown>) : {}
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

const postJSON = (
    app: ReturnType<typeof express>,
    path: string,
    body: unknown,
    headers: Record<string, string> = {}
) => sendJSON(app, 'POST', path, body, headers);

const getJSON = (
    app: ReturnType<typeof express>,
    path: string,
    headers: Record<string, string> = {}
) => sendJSON(app, 'GET', path, undefined, headers);

const patchJSON = (
    app: ReturnType<typeof express>,
    path: string,
    body: unknown
) => sendJSON(app, 'PATCH', path, body);

const deleteJSON = (
    app: ReturnType<typeof express>,
    path: string,
    headers: Record<string, string> = {}
) => sendJSON(app, 'DELETE', path, undefined, headers);

// =============================================================================
// Fiat Transfer (existing)
// =============================================================================

describe('POST /api/cybrid/fiat-transfer', () => {
    const mockTransfer = {
        guid: 'transfer-guid-456',
        transfer_type: 'book',
        state: 'completed',
        amount: 2500,
        asset: 'USD'
    };

    beforeEach(() => {
        mockTransferFiat.mock.resetCalls();
        mockTransferFiat.mock.mockImplementation(async () => mockTransfer);
        mockAcquire.mock.resetCalls();
        mockAcquire.mock.mockImplementation(async () => null);
        mockComplete.mock.resetCalls();
        mockComplete.mock.mockImplementation(async () => undefined);
        mockRelease.mock.resetCalls();
    });

    it('should return 400 for empty body', async () => {
        const app = createApp();
        const res = await postJSON(app, '/api/cybrid/fiat-transfer', {});
        assert.equal(res.status, 400);
    });

    it('should return 403 when session is missing', async () => {
        const app = createApp();
        const res = await postJSON(app, '/api/cybrid/fiat-transfer', {
            source_account_guid: 'src',
            destination_account_guid: 'dst',
            amount: 1000
        });
        assert.equal(res.status, 403);
    });

    it('should return 400 when source_account_guid is missing', async () => {
        const app = createApp();
        const res = await postJSON(app, '/api/cybrid/fiat-transfer', {
            session: 'session-uuid',
            destination_account_guid: 'dst',
            amount: 1000
        });
        assert.equal(res.status, 400);
        assert.match(res.body.message as string, /Source and destination/);
    });

    it('should return 400 when destination_account_guid is missing', async () => {
        const app = createApp();
        const res = await postJSON(app, '/api/cybrid/fiat-transfer', {
            session: 'session-uuid',
            source_account_guid: 'src',
            amount: 1000
        });
        assert.equal(res.status, 400);
        assert.match(res.body.message as string, /Source and destination/);
    });

    it('should return 400 when amount is missing', async () => {
        const app = createApp();
        const res = await postJSON(app, '/api/cybrid/fiat-transfer', {
            session: 'session-uuid',
            source_account_guid: 'src',
            destination_account_guid: 'dst'
        });
        assert.equal(res.status, 400);
        assert.match(res.body.message as string, /Amount/);
    });

    it('should return 400 when amount is negative', async () => {
        const app = createApp();
        const res = await postJSON(app, '/api/cybrid/fiat-transfer', {
            session: 'session-uuid',
            source_account_guid: 'src',
            destination_account_guid: 'dst',
            amount: -500
        });
        assert.equal(res.status, 400);
        assert.match(res.body.message as string, /Amount/);
    });

    it('should return 400 when amount exceeds the $5,000 cap', async () => {
        const app = createApp();
        const res = await postJSON(app, '/api/cybrid/fiat-transfer', {
            session: 'session-uuid',
            source_account_guid: 'src',
            destination_account_guid: 'dst',
            amount: 5_000_01
        });
        assert.equal(res.status, 400);
        assert.match(res.body.message as string, /maximum transfer limit/);
    });

    it('should return 201 on successful fiat transfer', async () => {
        const app = createApp();
        const res = await postJSON(app, '/api/cybrid/fiat-transfer', {
            session: 'session-uuid',
            source_account_guid: 'src-guid',
            destination_account_guid: 'dst-guid',
            amount: 2500
        }, { 'Idempotency-Key': 'fiat-test-key' });

        assert.equal(res.status, 201);
        assert.equal(res.body.code, 201);
        assert.equal(res.body.message, 'Fiat transfer created');
        assert.deepEqual(res.body.data, mockTransfer);
    });

    it('should call Cybrid.transferFiat with correct arguments', async () => {
        const app = createApp();
        await postJSON(app, '/api/cybrid/fiat-transfer', {
            session: 'session-uuid',
            source_account_guid: 'src-guid',
            destination_account_guid: 'dst-guid',
            amount: 1000,
            asset: 'CAD'
        }, { 'Idempotency-Key': 'fiat-test-key' });

        assert.equal(mockTransferFiat.mock.callCount(), 1);
        const call = mockTransferFiat.mock.calls[0]!;
        assert.equal(call.arguments[0], 'src-guid');
        assert.equal(call.arguments[1], 'dst-guid');
        assert.equal(call.arguments[2], 1000);
        assert.equal(call.arguments[3], 'CAD');
    });
});

// =============================================================================
// Customers (existing + extended)
// =============================================================================

describe('POST /api/cybrid/customer', () => {
    const mockCustomer = {
        guid: 'customer-guid-123',
        type: 'individual',
        state: 'storing'
    };

    beforeEach(() => {
        mockCreateCustomer.mock.resetCalls();
        mockCreateCustomer.mock.mockImplementation(async () => mockCustomer);
    });

    it('should return 400 for empty body', async () => {
        const app = createApp();
        const res = await postJSON(app, '/api/cybrid/customer', {});
        assert.equal(res.status, 400);
    });

    it('should return 403 when session is missing', async () => {
        const app = createApp();
        const res = await postJSON(app, '/api/cybrid/customer', {
            type: 'individual'
        });
        assert.equal(res.status, 403);
        assert.match(res.body.message as string, /Session/);
    });

    it('should return 201 on successful customer creation', async () => {
        const app = createApp();
        const res = await postJSON(app, '/api/cybrid/customer', {
            session: 'session-uuid',
            type: 'individual'
        });

        assert.equal(res.status, 201);
        assert.equal(res.body.code, 201);
        assert.equal(res.body.message, 'Customer created');
        assert.deepEqual(res.body.data, mockCustomer);
    });

    it('should forward the request body to Cybrid.createCustomer', async () => {
        const app = createApp();
        const payload = {
            session: 'session-uuid',
            type: 'individual',
            name: { first: 'Jane', last: 'Doe' }
        };
        await postJSON(app, '/api/cybrid/customer', payload);

        assert.equal(mockCreateCustomer.mock.callCount(), 1);
        const call = mockCreateCustomer.mock.calls[0]!;
        assert.deepEqual(call.arguments[0], payload);
    });

    it('should return 500 when Cybrid.createCustomer throws', async () => {
        mockCreateCustomer.mock.mockImplementation(async () => {
            throw new Error('Cybrid down');
        });
        const app = createApp();
        const res = await postJSON(app, '/api/cybrid/customer', {
            session: 'session-uuid',
            type: 'individual'
        });
        assert.equal(res.status, 500);
    });
});

describe('GET /api/cybrid/customer/:guid', () => {
    const mockCustomer = { guid: 'cust-1', type: 'individual' };

    beforeEach(() => {
        mockGetCustomer.mock.resetCalls();
        mockGetCustomer.mock.mockImplementation(async () => mockCustomer);
    });

    it('should return 403 when x-session header is missing', async () => {
        const res = await getJSON(createApp(), '/api/cybrid/customer/cust-1');
        assert.equal(res.status, 403);
    });

    it('should return 200 and forward the guid and include_pii=false', async () => {
        const res = await getJSON(createApp(), '/api/cybrid/customer/cust-1', {
            'x-session': 'session-uuid'
        });
        assert.equal(res.status, 200);
        assert.deepEqual(res.body.data, mockCustomer);
        const call = mockGetCustomer.mock.calls[0]!;
        assert.equal(call.arguments[0], 'cust-1');
        assert.equal(call.arguments[1], false);
    });

    it('should forward include_pii=true when query param set', async () => {
        await getJSON(createApp(), '/api/cybrid/customer/cust-1?include_pii=true', {
            'x-session': 'session-uuid'
        });
        const call = mockGetCustomer.mock.calls[0]!;
        assert.equal(call.arguments[1], true);
    });
});

describe('GET /api/cybrid/customers', () => {

    beforeEach(() => {
        mockListCustomers.mock.resetCalls();
        mockListCustomers.mock.mockImplementation(async () => ({ total: 0, objects: [] }));
    });

    it('should return 403 without session header', async () => {
        const res = await getJSON(createApp(), '/api/cybrid/customers');
        assert.equal(res.status, 403);
    });

    it('should return 200 with session header', async () => {
        const res = await getJSON(createApp(), '/api/cybrid/customers', { 'x-session': 'session-uuid' });
        assert.equal(res.status, 200);
        assert.equal(mockListCustomers.mock.callCount(), 1);
    });
});

describe('PATCH /api/cybrid/customer/:guid', () => {

    beforeEach(() => {
        mockUpdateCustomer.mock.resetCalls();
        mockUpdateCustomer.mock.mockImplementation(async () => ({ guid: 'cust-1', state: 'verified' }));
    });

    it('should return 400 on empty body', async () => {
        const res = await patchJSON(createApp(), '/api/cybrid/customer/cust-1', {});
        assert.equal(res.status, 400);
    });

    it('should return 403 when session is missing', async () => {
        const res = await patchJSON(createApp(), '/api/cybrid/customer/cust-1', { name: { first: 'J' } });
        assert.equal(res.status, 403);
    });

    it('should forward guid and body on success', async () => {
        const res = await patchJSON(createApp(), '/api/cybrid/customer/cust-1', {
            session: 'session-uuid',
            name: { first: 'Jane' }
        });
        assert.equal(res.status, 200);
        const call = mockUpdateCustomer.mock.calls[0]!;
        assert.equal(call.arguments[0], 'cust-1');
    });
});

// =============================================================================
// Generic POST suite — resource groups that share the same pattern:
// empty body → 400, missing session → 403, success → 201, error → 500.
// =============================================================================

interface PostRouteCase {
    path: string;
    model: ReturnType<typeof fn>;
    body: Record<string, unknown>;
    expectedMessage: string;
}

const postRoutes: ReadonlyArray<PostRouteCase> = [
    { path: '/api/cybrid/account', model: mockCreateAccount, body: { type: 'fiat', asset: 'USD' }, expectedMessage: 'Account created' },
    { path: '/api/cybrid/quote', model: mockCreateQuote, body: { product_type: 'trading' }, expectedMessage: 'Quote created' },
    { path: '/api/cybrid/trade', model: mockCreateTrade, body: { quote_guid: 'q-1' }, expectedMessage: 'Trade created' },
    { path: '/api/cybrid/transfer', model: mockCreateTransfer, body: { transfer_type: 'book' }, expectedMessage: 'Transfer created' },
    { path: '/api/cybrid/identity-verification', model: mockCreateIdentityVerification, body: { customer_guid: 'c-1' }, expectedMessage: 'Identity verification created' },
    { path: '/api/cybrid/deposit-address', model: mockCreateDepositAddress, body: { account_guid: 'a-1' }, expectedMessage: 'Deposit address created' },
    { path: '/api/cybrid/deposit-bank-account', model: mockCreateDepositBankAccount, body: { customer_guid: 'c-1' }, expectedMessage: 'Deposit bank account created' },
    { path: '/api/cybrid/external-bank-account', model: mockCreateExternalBankAccount, body: { name: 'Checking' }, expectedMessage: 'External bank account created' },
    { path: '/api/cybrid/external-wallet', model: mockCreateExternalWallet, body: { asset: 'BTC' }, expectedMessage: 'External wallet created' },
    { path: '/api/cybrid/workflow', model: mockCreateWorkflow, body: { kind: 'kyc' }, expectedMessage: 'Workflow created' },
    { path: '/api/cybrid/bank', model: mockCreateBank, body: { name: 'Test Bank' }, expectedMessage: 'Bank created' },
    { path: '/api/cybrid/counterparty', model: mockCreateCounterparty, body: { type: 'individual' }, expectedMessage: 'Counterparty created' },
    { path: '/api/cybrid/persona-session', model: mockCreatePersonaSession, body: { identity_verification_guid: 'iv-1' }, expectedMessage: 'Persona session created' },
    { path: '/api/cybrid/file', model: mockCreateFile, body: { file_type: 'id_card' }, expectedMessage: 'File created' },
    { path: '/api/cybrid/execution', model: mockCreateExecution, body: { plan_guid: 'p-1' }, expectedMessage: 'Execution created' },
    { path: '/api/cybrid/invoice', model: mockCreateInvoice, body: { amount: 100 }, expectedMessage: 'Invoice created' },
    { path: '/api/cybrid/payment-instruction', model: mockCreatePaymentInstruction, body: { invoice_guid: 'inv-1' }, expectedMessage: 'Payment instruction created' },
    { path: '/api/cybrid/plan', model: mockCreatePlan, body: { name: 'monthly' }, expectedMessage: 'Plan created' }
];

const idempotencyRequiredPaths = new Set([
    '/api/cybrid/quote',
    '/api/cybrid/trade',
    '/api/cybrid/transfer',
]);

for (const route of postRoutes) {
    describe(`POST ${route.path}`, () => {
        const mockResult = { guid: 'mock-guid-1' };
        const needsIdempotencyKey = idempotencyRequiredPaths.has(route.path);
        const idempotencyHeaders = needsIdempotencyKey ? { 'Idempotency-Key': 'test-key' } : {};

        beforeEach(() => {
            route.model.mock.resetCalls();
            route.model.mock.mockImplementation(async () => mockResult);
            if (needsIdempotencyKey) {
                mockAcquire.mock.resetCalls();
                mockAcquire.mock.mockImplementation(async () => null);
                mockComplete.mock.resetCalls();
                mockComplete.mock.mockImplementation(async () => undefined);
                mockRelease.mock.resetCalls();
            }
        });

        it('should return 400 for empty body', async () => {
            const res = await postJSON(createApp(), route.path, {});
            assert.equal(res.status, 400);
        });

        it('should return 403 when session is missing', async () => {
            const res = await postJSON(createApp(), route.path, route.body);
            assert.equal(res.status, 403);
            assert.match(res.body.message as string, /Session/);
        });

        it('should return 201 on success and forward the body', async () => {
            const payload = { session: 'session-uuid', ...route.body };
            const res = await postJSON(createApp(), route.path, payload, idempotencyHeaders);
            assert.equal(res.status, 201);
            assert.equal(res.body.message, route.expectedMessage);
            assert.deepEqual(res.body.data, mockResult);
            assert.equal(route.model.mock.callCount(), 1);
            assert.deepEqual(route.model.mock.calls[0]!.arguments[0], payload);
        });

        it('should return 500 when the model throws', async () => {
            route.model.mock.mockImplementation(async () => {
                throw new Error('upstream fail');
            });
            const res = await postJSON(createApp(), route.path, { session: 'session-uuid', ...route.body }, idempotencyHeaders);
            assert.equal(res.status, 500);
        });
    });
}

// =============================================================================
// GET :guid routes — share the same pattern: missing session → 403,
// success → 200 with forwarded guid.
// =============================================================================

interface GetRouteCase {
    path: string;
    guid: string;
    model: ReturnType<typeof fn>;
    argIndex?: number; // index of the guid in the call arguments
}

const getGuidRoutes: ReadonlyArray<GetRouteCase> = [
    { path: '/api/cybrid/account/acct-1', guid: 'acct-1', model: mockGetAccount },
    { path: '/api/cybrid/quote/quote-1', guid: 'quote-1', model: mockGetQuote },
    { path: '/api/cybrid/trade/trade-1', guid: 'trade-1', model: mockGetTrade },
    { path: '/api/cybrid/transfer/transfer-1', guid: 'transfer-1', model: mockGetTransfer },
    { path: '/api/cybrid/identity-verification/iv-1', guid: 'iv-1', model: mockGetIdentityVerification },
    { path: '/api/cybrid/deposit-address/dep-1', guid: 'dep-1', model: mockGetDepositAddress },
    { path: '/api/cybrid/deposit-bank-account/dba-1', guid: 'dba-1', model: mockGetDepositBankAccount },
    { path: '/api/cybrid/external-bank-account/eba-1', guid: 'eba-1', model: mockGetExternalBankAccount },
    { path: '/api/cybrid/external-wallet/wallet-1', guid: 'wallet-1', model: mockGetExternalWallet },
    { path: '/api/cybrid/workflow/wf-1', guid: 'wf-1', model: mockGetWorkflow },
    { path: '/api/cybrid/bank/bank-1', guid: 'bank-1', model: mockGetBank },
    { path: '/api/cybrid/counterparty/cp-1', guid: 'cp-1', model: mockGetCounterparty },
    { path: '/api/cybrid/file/file-1', guid: 'file-1', model: mockGetFile },
    { path: '/api/cybrid/execution/exec-1', guid: 'exec-1', model: mockGetExecution },
    { path: '/api/cybrid/invoice/inv-1', guid: 'inv-1', model: mockGetInvoice },
    { path: '/api/cybrid/payment-instruction/pi-1', guid: 'pi-1', model: mockGetPaymentInstruction },
    { path: '/api/cybrid/plan/plan-1', guid: 'plan-1', model: mockGetPlan }
];

for (const route of getGuidRoutes) {
    describe(`GET ${route.path}`, () => {
        const mockResult = { guid: route.guid };

        beforeEach(() => {
            route.model.mock.resetCalls();
            route.model.mock.mockImplementation(async () => mockResult);
        });

        it('should return 403 when session header is missing', async () => {
            const res = await getJSON(createApp(), route.path);
            assert.equal(res.status, 403);
        });

        it('should return 200 and forward the guid', async () => {
            const res = await getJSON(createApp(), route.path, { 'x-session': 'session-uuid' });
            assert.equal(res.status, 200);
            assert.deepEqual(res.body.data, mockResult);
            assert.equal(route.model.mock.callCount(), 1);
            assert.equal(route.model.mock.calls[0]!.arguments[0], route.guid);
        });
    });
}

// =============================================================================
// List (index) routes — verify session enforcement and query forwarding
// =============================================================================

describe('GET /api/cybrid/symbols', () => {

    beforeEach(() => {
        mockListSymbols.mock.resetCalls();
        mockListSymbols.mock.mockImplementation(async () => ['BTC-USD']);
    });

    it('should return 403 without session header', async () => {
        const res = await getJSON(createApp(), '/api/cybrid/symbols');
        assert.equal(res.status, 403);
    });

    it('should return 200 with session header', async () => {
        const res = await getJSON(createApp(), '/api/cybrid/symbols', { 'x-session': 'session-uuid' });
        assert.equal(res.status, 200);
        assert.deepEqual(res.body.data, ['BTC-USD']);
    });
});

describe('GET /api/cybrid/assets', () => {

    beforeEach(() => {
        mockListAssets.mock.resetCalls();
        mockListAssets.mock.mockImplementation(async () => ({ total: 1, objects: [] }));
    });

    it('should forward paging and code query params', async () => {
        await getJSON(createApp(), '/api/cybrid/assets?page=1&per_page=50&code=USD', {
            'x-session': 'session-uuid'
        });
        const call = mockListAssets.mock.calls[0]!;
        assert.equal(call.arguments[0], 1);
        assert.equal(call.arguments[1], 50);
        assert.equal(call.arguments[2], 'USD');
    });
});

describe('GET /api/cybrid/prices', () => {

    beforeEach(() => {
        mockListPrices.mock.resetCalls();
        mockListPrices.mock.mockImplementation(async () => []);
    });

    it('should forward the symbol query param', async () => {
        await getJSON(createApp(), '/api/cybrid/prices?symbol=BTC-USD', {
            'x-session': 'session-uuid'
        });
        assert.equal(mockListPrices.mock.calls[0]!.arguments[0], 'BTC-USD');
    });
});

describe('GET /api/cybrid/accounts', () => {

    beforeEach(() => {
        mockListAccounts.mock.resetCalls();
        mockListAccounts.mock.mockImplementation(async () => ({ total: 0, objects: [] }));
    });

    it('should forward customer_guid, page, per_page query params', async () => {
        await getJSON(createApp(), '/api/cybrid/accounts?customer_guid=c-1&page=2&per_page=10', {
            'x-session': 'session-uuid'
        });
        const call = mockListAccounts.mock.calls[0]!;
        assert.equal(call.arguments[0], 'c-1');
        assert.equal(call.arguments[1], 2);
        assert.equal(call.arguments[2], 10);
    });
});

// =============================================================================
// PATCH /transfer/:guid and PATCH /external-bank-account/:guid
// =============================================================================

describe('PATCH /api/cybrid/transfer/:guid', () => {

    beforeEach(() => {
        mockUpdateTransfer.mock.resetCalls();
        mockUpdateTransfer.mock.mockImplementation(async () => ({ guid: 'transfer-1', state: 'updated' }));
    });

    it('should return 400 on empty body', async () => {
        const res = await patchJSON(createApp(), '/api/cybrid/transfer/transfer-1', {});
        assert.equal(res.status, 400);
    });

    it('should return 403 when session missing', async () => {
        const res = await patchJSON(createApp(), '/api/cybrid/transfer/transfer-1', { state: 'completed' });
        assert.equal(res.status, 403);
    });

    it('should return 200 and forward guid + body on success', async () => {
        const res = await patchJSON(createApp(), '/api/cybrid/transfer/transfer-1', {
            session: 'session-uuid',
            state: 'completed'
        });
        assert.equal(res.status, 200);
        assert.equal(mockUpdateTransfer.mock.calls[0]!.arguments[0], 'transfer-1');
    });
});

describe('PATCH /api/cybrid/external-bank-account/:guid', () => {

    beforeEach(() => {
        mockPatchExternalBankAccount.mock.resetCalls();
        mockPatchExternalBankAccount.mock.mockImplementation(async () => ({ guid: 'eba-1' }));
    });

    it('should return 403 when session missing', async () => {
        const res = await patchJSON(createApp(), '/api/cybrid/external-bank-account/eba-1', { state: 'refresh' });
        assert.equal(res.status, 403);
    });

    it('should return 200 and forward guid + body on success', async () => {
        const res = await patchJSON(createApp(), '/api/cybrid/external-bank-account/eba-1', {
            session: 'session-uuid',
            state: 'refresh'
        });
        assert.equal(res.status, 200);
        assert.equal(mockPatchExternalBankAccount.mock.calls[0]!.arguments[0], 'eba-1');
    });
});

describe('PATCH /api/cybrid/bank/:guid', () => {

    beforeEach(() => {
        mockUpdateBank.mock.resetCalls();
        mockUpdateBank.mock.mockImplementation(async () => ({ guid: 'bank-1' }));
    });

    it('should return 403 when session missing', async () => {
        const res = await patchJSON(createApp(), '/api/cybrid/bank/bank-1', { name: 'renamed' });
        assert.equal(res.status, 403);
    });

    it('should return 200 and forward guid + body on success', async () => {
        const res = await patchJSON(createApp(), '/api/cybrid/bank/bank-1', {
            session: 'session-uuid',
            name: 'renamed'
        });
        assert.equal(res.status, 200);
        assert.equal(mockUpdateBank.mock.calls[0]!.arguments[0], 'bank-1');
    });
});

// =============================================================================
// DELETE routes
// =============================================================================

describe('DELETE /api/cybrid/external-bank-account/:guid', () => {

    beforeEach(() => {
        mockDeleteExternalBankAccount.mock.resetCalls();
        mockDeleteExternalBankAccount.mock.mockImplementation(async () => ({ guid: 'eba-1', state: 'deleted' }));
    });

    it('should return 403 when session header is missing', async () => {
        const res = await deleteJSON(createApp(), '/api/cybrid/external-bank-account/eba-1');
        assert.equal(res.status, 403);
    });

    it('should return 200 and forward the guid on success', async () => {
        const res = await deleteJSON(createApp(), '/api/cybrid/external-bank-account/eba-1', {
            'x-session': 'session-uuid'
        });
        assert.equal(res.status, 200);
        assert.equal(mockDeleteExternalBankAccount.mock.calls[0]!.arguments[0], 'eba-1');
    });
});

describe('DELETE /api/cybrid/external-wallet/:guid', () => {

    beforeEach(() => {
        mockDeleteExternalWallet.mock.resetCalls();
        mockDeleteExternalWallet.mock.mockImplementation(async () => ({ guid: 'wallet-1', state: 'deleted' }));
    });

    it('should return 403 when session header is missing', async () => {
        const res = await deleteJSON(createApp(), '/api/cybrid/external-wallet/wallet-1');
        assert.equal(res.status, 403);
    });

    it('should return 200 and forward the guid on success', async () => {
        const res = await deleteJSON(createApp(), '/api/cybrid/external-wallet/wallet-1', {
            'x-session': 'session-uuid'
        });
        assert.equal(res.status, 200);
        assert.equal(mockDeleteExternalWallet.mock.calls[0]!.arguments[0], 'wallet-1');
    });
});

describe('DELETE /api/cybrid/invoice/:guid', () => {

    beforeEach(() => {
        mockCancelInvoice.mock.resetCalls();
        mockCancelInvoice.mock.mockImplementation(async () => ({ guid: 'inv-1', state: 'cancelled' }));
    });

    it('should return 403 when session header is missing', async () => {
        const res = await deleteJSON(createApp(), '/api/cybrid/invoice/inv-1');
        assert.equal(res.status, 403);
    });

    it('should return 200 and cancel the invoice', async () => {
        const res = await deleteJSON(createApp(), '/api/cybrid/invoice/inv-1', {
            'x-session': 'session-uuid'
        });
        assert.equal(res.status, 200);
        assert.equal(res.body.message, 'Invoice cancelled');
        assert.equal(mockCancelInvoice.mock.calls[0]!.arguments[0], 'inv-1');
    });
});

// =============================================================================
// Query-param forwarding on non-trivial list / :guid routes
// =============================================================================

describe('GET /api/cybrid/banks (type filter)', () => {

    beforeEach(() => {
        mockListBanks.mock.resetCalls();
        mockListBanks.mock.mockImplementation(async () => ({ total: 0, objects: [] }));
    });

    it('should forward page, per_page, and type query params in that order', async () => {
        await getJSON(
            createApp(),
            '/api/cybrid/banks?page=1&per_page=10&type=sandbox',
            { 'x-session': 'session-uuid' }
        );
        const call = mockListBanks.mock.calls[0]!;
        assert.equal(call.arguments[0], 1);
        assert.equal(call.arguments[1], 10);
        assert.equal(call.arguments[2], 'sandbox');
    });

    it('should omit type when not provided', async () => {
        await getJSON(createApp(), '/api/cybrid/banks', { 'x-session': 'session-uuid' });
        const call = mockListBanks.mock.calls[0]!;
        assert.equal(call.arguments[2], undefined);
    });
});

describe('GET /api/cybrid/counterparty/:guid (include_pii)', () => {

    beforeEach(() => {
        mockGetCounterparty.mock.resetCalls();
        mockGetCounterparty.mock.mockImplementation(async () => ({ guid: 'cp-1' }));
    });

    it('should default include_pii to false when the query param is absent', async () => {
        await getJSON(createApp(), '/api/cybrid/counterparty/cp-1', { 'x-session': 'session-uuid' });
        const call = mockGetCounterparty.mock.calls[0]!;
        assert.equal(call.arguments[0], 'cp-1');
        assert.equal(call.arguments[1], false);
    });

    it('should forward include_pii=true when set', async () => {
        await getJSON(
            createApp(),
            '/api/cybrid/counterparty/cp-1?include_pii=true',
            { 'x-session': 'session-uuid' }
        );
        assert.equal(mockGetCounterparty.mock.calls[0]!.arguments[1], true);
    });

    it('should treat include_pii=1 (anything non-"true") as false', async () => {
        await getJSON(
            createApp(),
            '/api/cybrid/counterparty/cp-1?include_pii=1',
            { 'x-session': 'session-uuid' }
        );
        assert.equal(mockGetCounterparty.mock.calls[0]!.arguments[1], false);
    });
});

describe('GET /api/cybrid/external-bank-account/:guid (boolean flags)', () => {

    beforeEach(() => {
        mockGetExternalBankAccount.mock.resetCalls();
        mockGetExternalBankAccount.mock.mockImplementation(async () => ({ guid: 'eba-1' }));
    });

    it('should default all three flags to false when absent', async () => {
        await getJSON(
            createApp(),
            '/api/cybrid/external-bank-account/eba-1',
            { 'x-session': 'session-uuid' }
        );
        const call = mockGetExternalBankAccount.mock.calls[0]!;
        assert.deepEqual(
            [call.arguments[0], call.arguments[1], call.arguments[2], call.arguments[3]],
            ['eba-1', false, false, false],
        );
    });

    it('should forward include_balances, force_balance_refresh and include_pii when all set to true', async () => {
        await getJSON(
            createApp(),
            '/api/cybrid/external-bank-account/eba-1?include_balances=true&force_balance_refresh=true&include_pii=true',
            { 'x-session': 'session-uuid' }
        );
        const call = mockGetExternalBankAccount.mock.calls[0]!;
        assert.deepEqual(
            [call.arguments[0], call.arguments[1], call.arguments[2], call.arguments[3]],
            ['eba-1', true, true, true],
        );
    });

    it('should forward each flag independently', async () => {
        await getJSON(
            createApp(),
            '/api/cybrid/external-bank-account/eba-1?include_balances=true',
            { 'x-session': 'session-uuid' }
        );
        const call = mockGetExternalBankAccount.mock.calls[0]!;
        assert.deepEqual(
            [call.arguments[1], call.arguments[2], call.arguments[3]],
            [true, false, false],
        );
    });
});

describe('GET /api/cybrid/payment-instructions (dual filter)', () => {

    beforeEach(() => {
        mockListPaymentInstructions.mock.resetCalls();
        mockListPaymentInstructions.mock.mockImplementation(async () => ({ total: 0, objects: [] }));
    });

    it('should return 403 without session header', async () => {
        const res = await getJSON(createApp(), '/api/cybrid/payment-instructions');
        assert.equal(res.status, 403);
    });

    it('should forward customer_guid, invoice_guid, page and per_page in that order', async () => {
        await getJSON(
            createApp(),
            '/api/cybrid/payment-instructions?customer_guid=cust-1&invoice_guid=inv-1&page=2&per_page=50',
            { 'x-session': 'session-uuid' }
        );
        const call = mockListPaymentInstructions.mock.calls[0]!;
        assert.equal(call.arguments[0], 'cust-1');
        assert.equal(call.arguments[1], 'inv-1');
        assert.equal(call.arguments[2], 2);
        assert.equal(call.arguments[3], 50);
    });

    it('should forward invoice_guid on its own when customer_guid is absent', async () => {
        await getJSON(
            createApp(),
            '/api/cybrid/payment-instructions?invoice_guid=inv-1',
            { 'x-session': 'session-uuid' }
        );
        const call = mockListPaymentInstructions.mock.calls[0]!;
        assert.equal(call.arguments[0], undefined);
        assert.equal(call.arguments[1], 'inv-1');
    });
});

describe('GET /api/cybrid/file/:guid (include_download_url)', () => {

    beforeEach(() => {
        mockGetFile.mock.resetCalls();
        mockGetFile.mock.mockImplementation(async () => ({ guid: 'file-1' }));
    });

    it('should forward include_download_url query param when provided', async () => {
        await getJSON(
            createApp(),
            '/api/cybrid/file/file-1?include_download_url=true',
            { 'x-session': 'session-uuid' }
        );
        const call = mockGetFile.mock.calls[0]!;
        assert.equal(call.arguments[0], 'file-1');
        assert.equal(call.arguments[1], 'true');
    });

    it('should pass undefined when include_download_url is absent', async () => {
        await getJSON(createApp(), '/api/cybrid/file/file-1', { 'x-session': 'session-uuid' });
        const call = mockGetFile.mock.calls[0]!;
        assert.equal(call.arguments[0], 'file-1');
        assert.equal(call.arguments[1], undefined);
    });
});

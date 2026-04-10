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

const mockTransferFiat = mock.fn<(...args: unknown[]) => Promise<unknown>>();
const mockCreateCustomer = mock.fn<(...args: unknown[]) => Promise<unknown>>();

mock.module('../../src/main/ts/models/Cybrid.ts', {
    namedExports: {
        Cybrid: {
            transferFiat: mockTransferFiat,
            createCustomer: mockCreateCustomer,
            getCustomer: mock.fn(),
            listCustomers: mock.fn(),
            createAccount: mock.fn(),
            getAccount: mock.fn(),
            listAccounts: mock.fn(),
            createQuote: mock.fn(),
            getQuote: mock.fn(),
            createTrade: mock.fn(),
            getTrade: mock.fn(),
            listTrades: mock.fn(),
            createTransfer: mock.fn(),
            getTransfer: mock.fn(),
            listTransfers: mock.fn(),
            createIdentityVerification: mock.fn(),
            getIdentityVerification: mock.fn()
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

async function postJSON(
    app: ReturnType<typeof express>,
    path: string,
    body: unknown
) {
    const { request } = await import('node:http');
    return new Promise<{ status: number; body: Record<string, unknown> }>(
        (resolve, reject) => {
            const server = app.listen(0, () => {
                const addr = server.address();
                if (!addr || typeof addr === 'string') {
                    server.close();
                    return reject(new Error('Could not get server address'));
                }
                const req = request(
                    {
                        hostname: '127.0.0.1',
                        port: addr.port,
                        path,
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' }
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
                                body: JSON.parse(data) as Record<string, unknown>
                            });
                        });
                    }
                );
                req.on('error', (err: Error) => {
                    server.close();
                    reject(err);
                });
                req.write(JSON.stringify(body));
                req.end();
            });
        }
    );
}

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

    it('should return 201 on successful fiat transfer', async () => {
        const app = createApp();
        const res = await postJSON(app, '/api/cybrid/fiat-transfer', {
            session: 'session-uuid',
            source_account_guid: 'src-guid',
            destination_account_guid: 'dst-guid',
            amount: 2500
        });

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
        });

        assert.equal(mockTransferFiat.mock.callCount(), 1);
        const call = mockTransferFiat.mock.calls[0]!;
        assert.equal(call.arguments[0], 'src-guid');
        assert.equal(call.arguments[1], 'dst-guid');
        assert.equal(call.arguments[2], 1000);
        assert.equal(call.arguments[3], 'CAD');
    });
});

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

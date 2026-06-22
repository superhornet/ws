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

// --- Privy model method mocks ---

type AnyFn = (...args: unknown[]) => Promise<unknown>;
const fn = () => mock.fn<AnyFn>();

const mockCreateWallet = fn();
const mockGetWallet = fn();
const mockListWallets = fn();

mock.module('../../src/main/ts/models/Privy.ts', {
    namedExports: {
        Privy: {
            createWallet: mockCreateWallet,
            getWallet: mockGetWallet,
            listWallets: mockListWallets
        }
    }
});

// Mock Audit to prevent DB calls
mock.module('../../src/main/ts/models/Audit.ts', {
    namedExports: {
        Audit: class {
            static async create() { return { message: '', session: '' }; }
            static async logMessage() { return { message: '' }; }
        }
    }
});

const express = (await import('express')).default;
const { router } =
    await import('../../src/main/ts/controllers/PrivyController.ts');

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

// =============================================================================
// Create wallet
// =============================================================================

describe('POST /api/privy/wallet', () => {
    const mockWallet = {
        id: 'wallet-123',
        address: '0xabc',
        chain_type: 'ethereum',
        owner_id: 'user-1'
    };

    beforeEach(() => {
        mockCreateWallet.mock.resetCalls();
        mockCreateWallet.mock.mockImplementation(async () => mockWallet);
    });

    it('should return 400 for empty body', async () => {
        const res = await postJSON(createApp(), '/api/privy/wallet', {});
        assert.equal(res.status, 400);
    });

    it('should return 403 when session is missing', async () => {
        const res = await postJSON(createApp(), '/api/privy/wallet', {
            chain_type: 'ethereum'
        });
        assert.equal(res.status, 403);
        assert.match(res.body.message as string, /Session/);
    });

    it('should return 201 on successful wallet creation', async () => {
        const res = await postJSON(createApp(), '/api/privy/wallet', {
            session: 'session-uuid',
            chain_type: 'ethereum'
        });
        assert.equal(res.status, 201);
        assert.equal(res.body.code, 201);
        assert.equal(res.body.message, 'Wallet created');
        assert.deepEqual(res.body.data, mockWallet);
    });

    it('should forward the wallet input without the session', async () => {
        await postJSON(createApp(), '/api/privy/wallet', {
            session: 'session-uuid',
            chain_type: 'ethereum',
            owner: { user_id: 'user-1' },
            display_name: 'My Wallet',
            external_id: 'ext-1'
        });
        assert.equal(mockCreateWallet.mock.callCount(), 1);
        const call = mockCreateWallet.mock.calls[0]!;
        assert.deepEqual(call.arguments[0], {
            chain_type: 'ethereum',
            owner: { user_id: 'user-1' },
            display_name: 'My Wallet',
            external_id: 'ext-1'
        });
    });

    it('should return 500 when Privy.createWallet throws', async () => {
        mockCreateWallet.mock.mockImplementation(async () => {
            throw new Error('Privy down');
        });
        const res = await postJSON(createApp(), '/api/privy/wallet', {
            session: 'session-uuid',
            chain_type: 'ethereum'
        });
        assert.equal(res.status, 500);
    });
});

// =============================================================================
// Get wallet
// =============================================================================

describe('GET /api/privy/wallet/:wallet_id', () => {
    const mockWallet = { id: 'wallet-123', address: '0xabc', chain_type: 'ethereum' };

    beforeEach(() => {
        mockGetWallet.mock.resetCalls();
        mockGetWallet.mock.mockImplementation(async () => mockWallet);
    });

    it('should return 403 when x-session header is missing', async () => {
        const res = await getJSON(createApp(), '/api/privy/wallet/wallet-123');
        assert.equal(res.status, 403);
    });

    it('should return 200 and forward the wallet id', async () => {
        const res = await getJSON(createApp(), '/api/privy/wallet/wallet-123', {
            'x-session': 'session-uuid'
        });
        assert.equal(res.status, 200);
        assert.deepEqual(res.body.data, mockWallet);
        const call = mockGetWallet.mock.calls[0]!;
        assert.equal(call.arguments[0], 'wallet-123');
    });

    it('should return 500 when Privy.getWallet throws', async () => {
        mockGetWallet.mock.mockImplementation(async () => {
            throw new Error('Privy down');
        });
        const res = await getJSON(createApp(), '/api/privy/wallet/wallet-123', {
            'x-session': 'session-uuid'
        });
        assert.equal(res.status, 500);
    });
});

// =============================================================================
// List wallets
// =============================================================================

describe('GET /api/privy/wallets', () => {

    beforeEach(() => {
        mockListWallets.mock.resetCalls();
        mockListWallets.mock.mockImplementation(async () => ({ data: [], next_cursor: '' }));
    });

    it('should return 403 without session header', async () => {
        const res = await getJSON(createApp(), '/api/privy/wallets');
        assert.equal(res.status, 403);
    });

    it('should return 200 with session header', async () => {
        const res = await getJSON(createApp(), '/api/privy/wallets', { 'x-session': 'session-uuid' });
        assert.equal(res.status, 200);
        assert.equal(mockListWallets.mock.callCount(), 1);
    });

    it('should forward query filters to Privy.listWallets', async () => {
        await getJSON(
            createApp(),
            '/api/privy/wallets?user_id=user-1&chain_type=ethereum&cursor=abc&limit=10',
            { 'x-session': 'session-uuid' }
        );
        const call = mockListWallets.mock.calls[0]!;
        assert.deepEqual(call.arguments[0], {
            user_id: 'user-1',
            chain_type: 'ethereum',
            cursor: 'abc',
            limit: 10
        });
    });
});

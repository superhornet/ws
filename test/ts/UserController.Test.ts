import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Mock postgresDB to prevent real connection attempts from anything that
// happens to slip past the User/Audit mocks.
mock.module('../../src/main/ts/libs/postgresDB.ts', {
    namedExports: {
        query: async () => [],
        withTransaction: async (fn: (client: unknown) => Promise<unknown>) =>
            fn({ query: async () => ({ rows: [{ id: 1 }] }) })
    }
});

type AnyFn = (...args: unknown[]) => Promise<unknown>;
const fn = () => mock.fn<AnyFn>();

// --- User model mock (class with constructor + static methods) ---

const mockUserConstructor = mock.fn<(input: unknown) => void>(() => { /* noop */ });
const mockFetchById = fn();
const mockUpdateUser = fn();
const mockDeleteUser = fn();

const userInstanceJSON: Record<string, unknown> = {
    id: 1,
    identifier: 'mock-user-identifier',
    firstname: 'Jane',
    lastname: 'Doe',
    email: 'jane@example.com',
    emailID: 'jane',
    emailHost: 'example.com',
    address1: '1 Main',
    address2: 'Apt 2',
    city: 'Springfield',
    state: 'IL',
    subscriptionLevel: 'Free'
};

class MockUser {
    constructor(input: unknown) {
        mockUserConstructor(input);
    }
    toJSON() {
        return { ...userInstanceJSON };
    }
    static fetchById(...args: unknown[]): Promise<unknown> {
        return mockFetchById(...args);
    }
    static updateUser(...args: unknown[]): Promise<unknown> {
        return mockUpdateUser(...args);
    }
    static deleteUser(...args: unknown[]): Promise<unknown> {
        return mockDeleteUser(...args);
    }
}

mock.module('../../src/main/ts/models/User.ts', {
    namedExports: { User: MockUser }
});

// --- Audit mock (constructor side-effect only) ---

const mockAuditConstructor = mock.fn<(message: unknown, session: unknown) => void>(() => { /* noop */ });

mock.module('../../src/main/ts/models/Audit.ts', {
    namedExports: {
        Audit: class {
            constructor(message: unknown, session: unknown) {
                mockAuditConstructor(message, session);
            }
        }
    }
});

const express = (await import('express')).default;
const { router } = await import('../../src/main/ts/controllers/UserController.ts');

function createApp() {
    const app = express();
    app.use(express.json());
    app.use('/api', router);
    return app;
}

interface JSONResult { status: number; body: Record<string, unknown> }

async function sendJSON(
    app: ReturnType<typeof express>,
    method: 'POST' | 'GET' | 'PUT' | 'DELETE',
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
                    res.on('data', (chunk: string) => { data += chunk; });
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

function resetAllMocks() {
    mockUserConstructor.mock.resetCalls();
    mockUserConstructor.mock.mockImplementation(() => { /* noop */ });
    mockAuditConstructor.mock.resetCalls();
    mockAuditConstructor.mock.mockImplementation(() => { /* noop */ });
    mockFetchById.mock.resetCalls();
    mockFetchById.mock.mockImplementation(async () => ({}));
    mockUpdateUser.mock.resetCalls();
    mockUpdateUser.mock.mockImplementation(async () => undefined);
    mockDeleteUser.mock.resetCalls();
    mockDeleteUser.mock.mockImplementation(async () => undefined);
}

// =============================================================================
// POST /api/user
// =============================================================================

describe('POST /api/user', () => {
    beforeEach(() => { resetAllMocks(); });

    it('returns 400 on empty body', async () => {
        const res = await sendJSON(createApp(), 'POST', '/api/user', {});
        assert.equal(res.status, 400);
        assert.match(res.body.message as string, /Empty JSON body/);
    });

    it('returns 403 when session is missing', async () => {
        const res = await sendJSON(createApp(), 'POST', '/api/user', {
            firstname: 'Jane', lastname: 'Doe', email: 'jane@example.com'
        });
        assert.equal(res.status, 403);
        assert.match(res.body.message as string, /Session/);
    });

    it('returns 201 with the user JSON on success', async () => {
        const res = await sendJSON(createApp(), 'POST', '/api/user', {
            session: 'sess-1',
            message: 'create user',
            firstname: 'Jane',
            lastname: 'Doe',
            email: 'jane@example.com',
            address1: '1 Main',
            address2: 'Apt 2',
            city: 'Springfield',
            state: 'IL',
            level: 'Free'
        });
        assert.equal(res.status, 201);
        assert.equal(res.body.code, 201);
        assert.equal((res.body.data as Record<string, unknown>).identifier, 'mock-user-identifier');
    });

    it('passes mapped fields to the User constructor', async () => {
        await sendJSON(createApp(), 'POST', '/api/user', {
            session: 'sess-1',
            message: 'create user',
            firstname: 'Jane',
            lastname: 'Doe',
            email: 'jane@example.com',
            address1: '1 Main',
            address2: 'Apt 2',
            city: 'Springfield',
            state: 'IL',
            level: 'Free'
        });
        assert.equal(mockUserConstructor.mock.callCount(), 1);
        const arg = mockUserConstructor.mock.calls[0]!.arguments[0] as Record<string, unknown>;
        assert.equal(arg.nameF, 'Jane');
        assert.equal(arg.nameL, 'Doe');
        assert.equal(arg.email, 'jane@example.com');
        assert.equal(arg.subscriptionLevel, 'Free');
    });

    it('records an Audit entry tied to the session', async () => {
        await sendJSON(createApp(), 'POST', '/api/user', {
            session: 'sess-1',
            message: 'create user',
            firstname: 'Jane', lastname: 'Doe', email: 'jane@example.com'
        });
        assert.equal(mockAuditConstructor.mock.callCount(), 1);
        assert.equal(mockAuditConstructor.mock.calls[0]!.arguments[1], 'sess-1');
    });

    it('returns 500 when the User constructor throws', async () => {
        mockUserConstructor.mock.mockImplementation(() => {
            throw new Error('insert failed');
        });
        const res = await sendJSON(createApp(), 'POST', '/api/user', {
            session: 'sess-1',
            firstname: 'Jane', lastname: 'Doe', email: 'jane@example.com'
        });
        assert.equal(res.status, 500);
    });
});

// =============================================================================
// GET /api/user — session via x-session header, identifier via query string
// =============================================================================

describe('GET /api/user', () => {
    beforeEach(() => { resetAllMocks(); });

    it('returns 403 when the x-session header is missing', async () => {
        const res = await sendJSON(createApp(), 'GET', '/api/user?identifier=uid-1');
        assert.equal(res.status, 403);
        assert.match(res.body.message as string, /Session/);
    });

    it('returns 400 when the identifier query param is missing', async () => {
        const res = await sendJSON(createApp(), 'GET', '/api/user', undefined, {
            'x-session': 'sess-1'
        });
        assert.equal(res.status, 400);
        assert.match(res.body.message as string, /identifier/);
    });

    it('returns 200 with the fetched user on success', async () => {
        const fetched = { id: 7, identifier: 'uid-1', firstname: 'Jane' };
        mockFetchById.mock.mockImplementation(async () => fetched);
        const res = await sendJSON(createApp(), 'GET', '/api/user?identifier=uid-1', undefined, {
            'x-session': 'sess-1'
        });
        assert.equal(res.status, 200);
        assert.deepEqual(res.body.data, fetched);
        assert.equal(mockFetchById.mock.calls[0]!.arguments[0], 'uid-1');
    });

    it('propagates 404 from User.fetchById when HTMLStatusError is thrown', async () => {
        const { HTMLStatusError } = await import('../../src/main/ts/libs/HTMLStatusError.ts');
        mockFetchById.mock.mockImplementation(async () => {
            throw new HTMLStatusError('User was not found', 404);
        });
        const res = await sendJSON(createApp(), 'GET', '/api/user?identifier=missing', undefined, {
            'x-session': 'sess-1'
        });
        assert.equal(res.status, 404);
    });

    it('records an Audit entry tied to the session header', async () => {
        await sendJSON(createApp(), 'GET', '/api/user?identifier=uid-1', undefined, {
            'x-session': 'sess-1'
        });
        assert.equal(mockAuditConstructor.mock.callCount(), 1);
        assert.equal(mockAuditConstructor.mock.calls[0]!.arguments[1], 'sess-1');
    });
});

// =============================================================================
// PUT /api/user
// =============================================================================

describe('PUT /api/user', () => {
    beforeEach(() => { resetAllMocks(); });

    it('returns 400 on empty body', async () => {
        const res = await sendJSON(createApp(), 'PUT', '/api/user', {});
        assert.equal(res.status, 400);
        assert.match(res.body.message as string, /Empty JSON body/);
    });

    it('returns 403 when session is missing', async () => {
        const res = await sendJSON(createApp(), 'PUT', '/api/user', {
            identifier: 'uid-1', firstname: 'Jane', lastname: 'Doe', email: 'jane@example.com'
        });
        assert.equal(res.status, 403);
        assert.match(res.body.message as string, /Session/);
    });

    it('returns 202 on successful update', async () => {
        const res = await sendJSON(createApp(), 'PUT', '/api/user', {
            session: 'sess-1',
            identifier: 'uid-1',
            firstname: 'Jane',
            lastname: 'Doe',
            email: 'jane@example.com'
        });
        assert.equal(res.status, 202);
    });

    it('forwards the request body to User.updateUser', async () => {
        const body = {
            session: 'sess-1',
            identifier: 'uid-1',
            firstname: 'Jane',
            lastname: 'Doe',
            email: 'jane@example.com'
        };
        await sendJSON(createApp(), 'PUT', '/api/user', body);
        assert.equal(mockUpdateUser.mock.callCount(), 1);
        assert.deepEqual(mockUpdateUser.mock.calls[0]!.arguments[0], body);
    });

    it('returns 500 when User.updateUser throws', async () => {
        mockUpdateUser.mock.mockImplementation(async () => {
            throw new Error('db down');
        });
        const res = await sendJSON(createApp(), 'PUT', '/api/user', {
            session: 'sess-1',
            identifier: 'uid-1',
            firstname: 'Jane',
            lastname: 'Doe',
            email: 'jane@example.com'
        });
        assert.equal(res.status, 500);
    });
});

// =============================================================================
// DELETE /api/user
// =============================================================================

describe('DELETE /api/user', () => {
    beforeEach(() => { resetAllMocks(); });

    it('returns 400 on empty body', async () => {
        const res = await sendJSON(createApp(), 'DELETE', '/api/user', {});
        assert.equal(res.status, 400);
        assert.match(res.body.message as string, /Empty JSON body/);
    });

    it('returns 403 when session is missing', async () => {
        const res = await sendJSON(createApp(), 'DELETE', '/api/user', {
            identifier: 'uid-1'
        });
        assert.equal(res.status, 403);
        assert.match(res.body.message as string, /Session/);
    });

    it('returns 204 on successful delete', async () => {
        const res = await sendJSON(createApp(), 'DELETE', '/api/user', {
            session: 'sess-1',
            identifier: 'uid-1'
        });
        assert.equal(res.status, 204);
    });

    it('forwards the request body to User.deleteUser', async () => {
        const body = { session: 'sess-1', identifier: 'uid-1' };
        await sendJSON(createApp(), 'DELETE', '/api/user', body);
        assert.equal(mockDeleteUser.mock.callCount(), 1);
        assert.deepEqual(mockDeleteUser.mock.calls[0]!.arguments[0], body);
    });

    it('returns 500 when User.deleteUser throws', async () => {
        mockDeleteUser.mock.mockImplementation(async () => {
            throw new Error('db down');
        });
        const res = await sendJSON(createApp(), 'DELETE', '/api/user', {
            session: 'sess-1',
            identifier: 'uid-1'
        });
        assert.equal(res.status, 500);
    });
});

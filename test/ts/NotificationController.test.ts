import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Defensive: prevent any real DB connection if mocks slip.
mock.module('../../src/main/ts/libs/postgresDB.ts', {
    namedExports: {
        query: async () => [],
        withTransaction: async (fn: (client: unknown) => Promise<unknown>) =>
            fn({ query: async () => ({ rows: [{ id: 1 }] }) })
    }
});

type AnyFn = (...args: unknown[]) => Promise<unknown>;
const fn = () => mock.fn<AnyFn>();

// --- Notification model mock ---

const mockNotificationConstructor = mock.fn<(input: unknown) => void>(() => { /* noop */ });
const mockGetAllForUser = fn();
const mockSetAsSeen = fn();
const mockSetDeleted = fn();

class MockNotification {
    public message: string;
    public identifier: string;
    constructor (input: { message: string; identifier?: string }) {
        mockNotificationConstructor(input);
        this.message = input.message;
        this.identifier = input.identifier ?? '';
    }
    static async create(input: { message: string; identifier?: string }): Promise<MockNotification> {
        return new MockNotification(input);
    }
    static getAllForUser(...args: unknown[]): Promise<unknown> {
        return mockGetAllForUser(...args);
    }
    static setAsSeen(...args: unknown[]): Promise<unknown> {
        return mockSetAsSeen(...args);
    }
    static setDeleted(...args: unknown[]): Promise<unknown> {
        return mockSetDeleted(...args);
    }
}

mock.module('../../src/main/ts/models/Notification.ts', {
    namedExports: { Notification: MockNotification }
});

// --- Audit mock ---

const mockAuditConstructor = mock.fn<(message: unknown, session: unknown) => void>(() => { /* noop */ });

mock.module('../../src/main/ts/models/Audit.ts', {
    namedExports: {
        Audit: class {
            constructor (message: unknown, session: unknown) {
                mockAuditConstructor(message, session);
            }
        }
    }
});

const express = (await import('express')).default;
const { router } = await import('../../src/main/ts/controllers/NotificationController.ts');

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
    mockNotificationConstructor.mock.resetCalls();
    mockNotificationConstructor.mock.mockImplementation(() => { /* noop */ });
    mockAuditConstructor.mock.resetCalls();
    mockAuditConstructor.mock.mockImplementation(() => { /* noop */ });
    mockGetAllForUser.mock.resetCalls();
    mockGetAllForUser.mock.mockImplementation(async () => []);
    mockSetAsSeen.mock.resetCalls();
    mockSetAsSeen.mock.mockImplementation(async () => undefined);
    mockSetDeleted.mock.resetCalls();
    mockSetDeleted.mock.mockImplementation(async () => undefined);
}

const validBody = {
    session: 'sess-1',
    identifier: '22222222-2222-2222-2222-222222222222',
    message: 'hello',
    seen: false,
    id: 0
};

// =============================================================================
// POST /api/notification
// =============================================================================

describe('POST /api/notification', () => {
    beforeEach(() => { resetAllMocks(); });

    it('returns 400 on empty body', async () => {
        const res = await sendJSON(createApp(), 'POST', '/api/notification', {});
        assert.equal(res.status, 400);
        assert.match(res.body.message as string, /Empty JSON body/);
    });

    it('returns 403 when session is missing', async () => {
        const res = await sendJSON(createApp(), 'POST', '/api/notification', {
            identifier: validBody.identifier,
            message: 'hello'
        });
        assert.equal(res.status, 403);
        assert.match(res.body.message as string, /Session/);
    });

    it('returns 201 with the notification on success', async () => {
        const res = await sendJSON(createApp(), 'POST', '/api/notification', validBody);
        assert.equal(res.status, 201);
        assert.equal(res.body.code, 201);
    });

    it('passes the request body to the Notification constructor', async () => {
        await sendJSON(createApp(), 'POST', '/api/notification', validBody);
        assert.equal(mockNotificationConstructor.mock.callCount(), 1);
        const arg = mockNotificationConstructor.mock.calls[0]!.arguments[0] as Record<string, unknown>;
        assert.equal(arg.message, 'hello');
        assert.equal(arg.identifier, validBody.identifier);
    });

    it('records an Audit entry tied to the session', async () => {
        await sendJSON(createApp(), 'POST', '/api/notification', validBody);
        assert.equal(mockAuditConstructor.mock.callCount(), 1);
        assert.equal(mockAuditConstructor.mock.calls[0]!.arguments[1], 'sess-1');
    });

    it('returns 500 when the Notification constructor throws', async () => {
        mockNotificationConstructor.mock.mockImplementation(() => {
            throw new Error('insert failed');
        });
        const res = await sendJSON(createApp(), 'POST', '/api/notification', validBody);
        assert.equal(res.status, 500);
    });
});

// =============================================================================
// GET /api/notifications
// =============================================================================

describe('GET /api/notifications', () => {
    beforeEach(() => { resetAllMocks(); });

    it('returns 403 when x-session header is missing', async () => {
        const res = await sendJSON(
            createApp(),
            'GET',
            `/api/notifications?identifier=${validBody.identifier}`
        );
        assert.equal(res.status, 403);
        assert.match(res.body.message as string, /Session/);
    });

    it('returns 400 when identifier query is missing', async () => {
        const res = await sendJSON(
            createApp(),
            'GET',
            '/api/notifications',
            undefined,
            { 'x-session': 'sess-1' }
        );
        assert.equal(res.status, 400);
    });

    it('returns 200 with the fetched notification list', async () => {
        const list = [{ id: 1, seen: false, message: 'hello', identifier: validBody.identifier }];
        mockGetAllForUser.mock.mockImplementation(async () => list);
        const res = await sendJSON(
            createApp(),
            'GET',
            `/api/notifications?identifier=${validBody.identifier}`,
            undefined,
            { 'x-session': 'sess-1' }
        );
        assert.equal(res.status, 200);
        assert.deepEqual(res.body.data, list);
    });

    it('forwards the identifier to Notification.getAllForUser', async () => {
        await sendJSON(
            createApp(),
            'GET',
            `/api/notifications?identifier=${validBody.identifier}`,
            undefined,
            { 'x-session': 'sess-1' }
        );
        assert.equal(mockGetAllForUser.mock.callCount(), 1);
        assert.equal(mockGetAllForUser.mock.calls[0]!.arguments[0], validBody.identifier);
    });

    it('returns 500 when Notification.getAllForUser throws', async () => {
        mockGetAllForUser.mock.mockImplementation(async () => {
            throw new Error('db down');
        });
        const res = await sendJSON(
            createApp(),
            'GET',
            `/api/notifications?identifier=${validBody.identifier}`,
            undefined,
            { 'x-session': 'sess-1' }
        );
        assert.equal(res.status, 500);
    });
});

// =============================================================================
// PUT /api/notification/:id
// =============================================================================

describe('PUT /api/notification/:id', () => {
    beforeEach(() => { resetAllMocks(); });

    it('returns 400 on empty body', async () => {
        const res = await sendJSON(createApp(), 'PUT', '/api/notification/7', {});
        assert.equal(res.status, 400);
        assert.match(res.body.message as string, /Empty JSON body/);
    });

    it('returns 403 when session is missing', async () => {
        const res = await sendJSON(createApp(), 'PUT', '/api/notification/7', {
            identifier: validBody.identifier
        });
        assert.equal(res.status, 403);
        assert.match(res.body.message as string, /Session/);
    });

    it('returns 400 when :id is non-numeric', async () => {
        const res = await sendJSON(createApp(), 'PUT', '/api/notification/abc', validBody);
        assert.equal(res.status, 400);
        assert.match(res.body.message as string, /Invalid notification id/);
        assert.equal(mockSetAsSeen.mock.callCount(), 0);
    });

    it('returns 400 when :id is zero', async () => {
        const res = await sendJSON(createApp(), 'PUT', '/api/notification/0', validBody);
        assert.equal(res.status, 400);
        assert.equal(mockSetAsSeen.mock.callCount(), 0);
    });

    it('returns 400 when :id is negative', async () => {
        const res = await sendJSON(createApp(), 'PUT', '/api/notification/-5', validBody);
        assert.equal(res.status, 400);
        assert.equal(mockSetAsSeen.mock.callCount(), 0);
    });

    it('returns 202 and calls setAsSeen with the parsed id on success', async () => {
        const res = await sendJSON(createApp(), 'PUT', '/api/notification/7', validBody);
        assert.equal(res.status, 202);
        assert.equal(mockSetAsSeen.mock.callCount(), 1);
        assert.equal(mockSetAsSeen.mock.calls[0]!.arguments[0], 7);
    });

    it('records an Audit entry tied to the session', async () => {
        await sendJSON(createApp(), 'PUT', '/api/notification/7', validBody);
        assert.equal(mockAuditConstructor.mock.callCount(), 1);
        assert.equal(mockAuditConstructor.mock.calls[0]!.arguments[1], 'sess-1');
    });

    it('returns 500 when setAsSeen throws', async () => {
        mockSetAsSeen.mock.mockImplementation(async () => {
            throw new Error('db down');
        });
        const res = await sendJSON(createApp(), 'PUT', '/api/notification/7', validBody);
        assert.equal(res.status, 500);
    });
});

// =============================================================================
// DELETE /api/notification/:id
// =============================================================================

describe('DELETE /api/notification/:id', () => {
    beforeEach(() => { resetAllMocks(); });

    it('returns 400 on empty body', async () => {
        const res = await sendJSON(createApp(), 'DELETE', '/api/notification/7', {});
        assert.equal(res.status, 400);
        assert.match(res.body.message as string, /Empty JSON body/);
    });

    it('returns 403 when session is missing', async () => {
        const res = await sendJSON(createApp(), 'DELETE', '/api/notification/7', {
            identifier: validBody.identifier
        });
        assert.equal(res.status, 403);
        assert.match(res.body.message as string, /Session/);
    });

    it('returns 400 when :id is non-numeric', async () => {
        const res = await sendJSON(createApp(), 'DELETE', '/api/notification/abc', validBody);
        assert.equal(res.status, 400);
        assert.match(res.body.message as string, /Invalid notification id/);
        assert.equal(mockSetDeleted.mock.callCount(), 0);
    });

    it('returns 400 when :id is zero', async () => {
        const res = await sendJSON(createApp(), 'DELETE', '/api/notification/0', validBody);
        assert.equal(res.status, 400);
        assert.equal(mockSetDeleted.mock.callCount(), 0);
    });

    it('returns 400 when :id is negative', async () => {
        const res = await sendJSON(createApp(), 'DELETE', '/api/notification/-5', validBody);
        assert.equal(res.status, 400);
        assert.equal(mockSetDeleted.mock.callCount(), 0);
    });

    it('returns 204 and calls setDeleted with the parsed id on success', async () => {
        const res = await sendJSON(createApp(), 'DELETE', '/api/notification/7', validBody);
        assert.equal(res.status, 204);
        assert.equal(mockSetDeleted.mock.callCount(), 1);
        assert.equal(mockSetDeleted.mock.calls[0]!.arguments[0], 7);
    });

    it('records an Audit entry tied to the session', async () => {
        await sendJSON(createApp(), 'DELETE', '/api/notification/7', validBody);
        assert.equal(mockAuditConstructor.mock.callCount(), 1);
        assert.equal(mockAuditConstructor.mock.calls[0]!.arguments[1], 'sess-1');
    });
});

// Copyright (c) 2026. All rights reserved.

import assert from 'node:assert/strict';
import test from 'node:test';

import { GitHubStoreError } from '../src/github-store.js';
import { KVSessionStore } from '../src/session-store.js';
import { createWorker } from '../src/index.js';
import { hashPassword, verifyPassword } from '../src/security.js';

const ORIGIN = 'https://sclife2003.github.io';
const API_URL = 'https://xueba-account.example.workers.dev';

class MemoryKV {
    constructor() { this.values = new Map(); }
    async put(key, value) { this.values.set(key, value); }
    async get(key, format) {
        const value = this.values.get(key);
        if (value == null) return null;
        return format === 'json' ? JSON.parse(value) : value;
    }
    async delete(key) { this.values.delete(key); }
}

class MemoryGitHubStore {
    constructor() {
        this.accounts = new Map();
        this.saves = new Map();
        this.shaSequence = 0;
    }

    async readAccount(key) { return this.accounts.get(key) || null; }

    async createAccount(key, value) {
        if (this.accounts.has(key)) throw new GitHubStoreError('GITHUB_CONFLICT', 409);
        const sha = `account-${++this.shaSequence}`;
        this.accounts.set(key, { value: structuredClone(value), sha });
        return { sha };
    }

    async readSave(accountId) { return this.saves.get(accountId) || null; }

    async writeSave(accountId, value, expectedSha = null) {
        const current = this.saves.get(accountId) || null;
        if ((current && current.sha !== expectedSha) || (!current && expectedSha)) {
            throw new GitHubStoreError('GITHUB_CONFLICT', 409);
        }
        const sha = `save-${++this.shaSequence}`;
        this.saves.set(accountId, { value: structuredClone(value), sha });
        return { sha };
    }
}

class ToggleRateLimiter {
    constructor() {
        this.success = true;
        this.keys = [];
    }
    async limit({ key }) {
        this.keys.push(key);
        return { success: this.success };
    }
}

function gameSave(unlockedLevel = 0) {
    return {
        schemaVersion: 3,
        unlockedLevel,
        hp: 6,
        results: {},
        stickers: {},
        badges: {},
        worldProgress: {},
        shards: 0,
        toolLevels: { pencil: 1 },
        toolUpgrades: {}
    };
}

function createHarness() {
    const store = new MemoryGitHubStore();
    const kv = new MemoryKV();
    const sessions = new KVSessionStore(kv);
    const rateLimiter = new ToggleRateLimiter();
    const env = {
        ALLOWED_ORIGINS: ORIGIN,
        AUTH_RATE_LIMITER: rateLimiter,
        PASSWORD_PEPPER: 'test-pepper-that-is-never-used-in-production'
    };
    const worker = createWorker({
        storeFactory: () => store,
        sessionFactory: () => sessions,
        now: () => new Date('2026-07-15T12:00:00.000Z'),
        passwordHasherFactory: environment => ({
            hash: password => hashPassword(password, environment.PASSWORD_PEPPER, { iterations: 1_000 }),
            verify: (password, record) => verifyPassword(password, environment.PASSWORD_PEPPER, record, { minIterations: 1_000 })
        })
    });
    return { worker, env, store, sessions, rateLimiter };
}

function request(path, { method = 'GET', token = null, body, origin = ORIGIN } = {}) {
    const headers = { Origin: origin };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    return new Request(`${API_URL}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body)
    });
}

async function json(response) {
    return response.status === 204 ? null : response.json();
}

async function register(harness, username = 'student_01') {
    const response = await harness.worker.fetch(request('/v1/register', {
        method: 'POST',
        body: { username, password: 'learn-safe-2026' }
    }), harness.env);
    return { response, body: await json(response) };
}

test('health and preflight expose only the allowed GitHub Pages origin', async () => {
    const harness = createHarness();
    const health = await harness.worker.fetch(request('/v1/health'), harness.env);
    const preflight = await harness.worker.fetch(request('/v1/save', { method: 'OPTIONS' }), harness.env);

    assert.equal(health.status, 200);
    assert.deepEqual(await json(health), { ok: true, storage: 'github-private-repository' });
    assert.equal(health.headers.get('access-control-allow-origin'), ORIGIN);
    assert.equal(health.headers.get('cache-control'), 'no-store');
    assert.equal(preflight.status, 204);
    assert.match(preflight.headers.get('access-control-allow-methods'), /PUT/);
});

test('rejects browser requests from an unapproved origin', async () => {
    const harness = createHarness();
    const response = await harness.worker.fetch(request('/v1/health', { origin: 'https://attacker.example' }), harness.env);

    assert.equal(response.status, 403);
    assert.equal(response.headers.get('access-control-allow-origin'), null);
});

test('fails closed when the production password hasher Durable Object binding is missing', async () => {
    const store = new MemoryGitHubStore();
    const sessions = new KVSessionStore(new MemoryKV());
    const worker = createWorker({
        storeFactory: () => store,
        sessionFactory: () => sessions
    });
    const env = {
        ALLOWED_ORIGINS: ORIGIN,
        AUTH_RATE_LIMITER: new ToggleRateLimiter(),
        PASSWORD_PEPPER: 'test-pepper-that-is-never-used-in-production'
    };
    const response = await worker.fetch(request('/v1/register', {
        method: 'POST',
        body: { username: 'student_01', password: 'learn-safe-2026' }
    }), env);

    assert.equal(response.status, 503);
    assert.equal((await json(response)).error.code, 'SERVICE_NOT_CONFIGURED');
});

test('shards production password hashing by the account key', async () => {
    const store = new MemoryGitHubStore();
    const sessions = new KVSessionStore(new MemoryKV());
    const shardNames = [];
    const env = {
        ALLOWED_ORIGINS: ORIGIN,
        AUTH_RATE_LIMITER: new ToggleRateLimiter(),
        PASSWORD_PEPPER: 'test-pepper-that-is-never-used-in-production',
        PASSWORD_HASHER: {
            getByName(name) {
                shardNames.push(name);
                return {
                    hash: password => hashPassword(password, env.PASSWORD_PEPPER, { iterations: 1_000 }),
                    verify: (password, record) => verifyPassword(password, env.PASSWORD_PEPPER, record, { minIterations: 1_000 })
                };
            }
        }
    };
    const worker = createWorker({
        storeFactory: () => store,
        sessionFactory: () => sessions
    });

    const first = await worker.fetch(request('/v1/register', {
        method: 'POST',
        body: { username: 'student_01', password: 'learn-safe-2026' }
    }), env);
    const second = await worker.fetch(request('/v1/register', {
        method: 'POST',
        body: { username: 'student_02', password: 'learn-safe-2026' }
    }), env);

    assert.equal(first.status, 201);
    assert.equal(second.status, 201);
    assert.equal(new Set(shardNames).size, 2);
    assert.ok(shardNames.every(name => /^account:[a-f0-9]{64}$/.test(name)));
});

test('creates an account with a password verifier and returns an opaque session', async () => {
    const harness = createHarness();
    const { response, body } = await register(harness, 'Student_01');

    assert.equal(response.status, 201);
    assert.equal(body.user.username, 'student_01');
    assert.match(body.token, /^[A-Za-z0-9_-]{43}$/);
    assert.deepEqual(body.sync, { revision: 0, hasCloudSave: false });
    assert.equal(JSON.stringify(body).includes('learn-safe-2026'), false);

    const stored = Array.from(harness.store.accounts.values())[0].value;
    assert.match(stored.accountId, /^[a-f0-9-]{36}$/);
    assert.equal(stored.username, 'student_01');
    assert.equal(stored.password.algorithm, 'PBKDF2-HMAC-SHA512');
    assert.equal(JSON.stringify(stored).includes('learn-safe-2026'), false);
    assert.equal(harness.rateLimiter.keys.length, 2);
    assert.ok(harness.rateLimiter.keys.some(key => key.startsWith('register:source:')));
    assert.ok(harness.rateLimiter.keys.some(key => key.startsWith('register:account:')));
});

test('prevents duplicate accounts and rate-limits account creation', async () => {
    const harness = createHarness();
    assert.equal((await register(harness)).response.status, 201);
    assert.equal((await register(harness)).response.status, 409);

    harness.rateLimiter.success = false;
    const limited = await register(harness, 'student_02');
    assert.equal(limited.response.status, 429);
    assert.equal(limited.body.error.code, 'RATE_LIMITED');
});

test('maps registration account-read failures to temporary GitHub unavailability', async t => {
    const harness = createHarness();
    harness.store.readAccount = async () => {
        throw new GitHubStoreError('GITHUB_UNAVAILABLE', 503);
    };
    const errorLog = t.mock.method(console, 'error', () => {});

    const result = await register(harness, 'student_02');

    assert.equal(result.response.status, 503);
    assert.equal(result.body.error.code, 'GITHUB_UNAVAILABLE');
    assert.equal(errorLog.mock.callCount(), 1);
});

test('does not log expected client errors as server failures', async t => {
    const harness = createHarness();
    assert.equal((await register(harness)).response.status, 201);
    const errorLog = t.mock.method(console, 'error', () => {});

    assert.equal((await register(harness)).response.status, 409);

    assert.equal(errorLog.mock.callCount(), 0);
});

test('logs in with generic errors that do not reveal whether an account exists', async () => {
    const harness = createHarness();
    await register(harness);

    const good = await harness.worker.fetch(request('/v1/login', {
        method: 'POST',
        body: { username: 'student_01', password: 'learn-safe-2026' }
    }), harness.env);
    const wrongPassword = await harness.worker.fetch(request('/v1/login', {
        method: 'POST',
        body: { username: 'student_01', password: 'wrong-password-2026' }
    }), harness.env);
    const missingAccount = await harness.worker.fetch(request('/v1/login', {
        method: 'POST',
        body: { username: 'student_99', password: 'wrong-password-2026' }
    }), harness.env);

    assert.equal(good.status, 200);
    assert.match((await json(good)).token, /^[A-Za-z0-9_-]{43}$/);
    assert.equal(wrongPassword.status, 401);
    assert.equal(missingAccount.status, 401);
    assert.deepEqual(await json(wrongPassword), await json(missingAccount));
});

test('requires authentication before reading or writing a save', async () => {
    const harness = createHarness();
    const read = await harness.worker.fetch(request('/v1/save'), harness.env);
    const write = await harness.worker.fetch(request('/v1/save', {
        method: 'PUT',
        body: { expectedRevision: 0, payload: gameSave() }
    }), harness.env);

    assert.equal(read.status, 401);
    assert.equal(write.status, 401);
});

test('creates, reads, and updates a private GitHub save with revision CAS', async () => {
    const harness = createHarness();
    const registration = await register(harness);
    const token = registration.body.token;

    const created = await harness.worker.fetch(request('/v1/save', {
        method: 'PUT', token, body: { expectedRevision: 0, payload: gameSave(2) }
    }), harness.env);
    const loaded = await harness.worker.fetch(request('/v1/save', { token }), harness.env);
    const updated = await harness.worker.fetch(request('/v1/save', {
        method: 'PUT', token, body: { expectedRevision: 1, payload: gameSave(3) }
    }), harness.env);
    const createdBody = await json(created);
    const loadedBody = await json(loaded);
    const updatedBody = await json(updated);

    assert.equal(created.status, 200);
    assert.equal(createdBody.revision, 1);
    assert.equal(loaded.status, 200);
    assert.deepEqual(loadedBody, {
        revision: 1,
        checksum: createdBody.checksum,
        updatedAt: '2026-07-15T12:00:00.000Z',
        save: gameSave(2)
    });
    assert.equal(updated.status, 200);
    assert.equal(updatedBody.revision, 2);
});

test('returns the current cloud payload when a device writes a stale revision', async () => {
    const harness = createHarness();
    const token = (await register(harness)).body.token;
    await harness.worker.fetch(request('/v1/save', {
        method: 'PUT', token, body: { expectedRevision: 0, payload: gameSave(4) }
    }), harness.env);

    const conflict = await harness.worker.fetch(request('/v1/save', {
        method: 'PUT', token, body: { expectedRevision: 0, payload: gameSave(1) }
    }), harness.env);
    const body = await json(conflict);

    assert.equal(conflict.status, 409);
    assert.equal(body.error.code, 'REVISION_CONFLICT');
    assert.equal(body.conflict.revision, 1);
    assert.deepEqual(body.conflict.save, gameSave(4));
});

test('fails closed when private-repository save data is corrupted out of band', async () => {
    const harness = createHarness();
    const registration = await register(harness);
    const account = Array.from(harness.store.accounts.values())[0].value;
    harness.store.saves.set(account.accountId, {
        sha: 'manual-corrupt-edit',
        value: {
            version: 1,
            accountId: account.accountId,
            revision: 1,
            schemaVersion: 3,
            checksum: 'not-trusted',
            updatedAt: '2026-07-15T12:00:00.000Z',
            payload: { ...gameSave(3), shards: -1 }
        }
    });

    const response = await harness.worker.fetch(request('/v1/save', { token: registration.body.token }), harness.env);
    const body = await json(response);
    assert.equal(response.status, 503);
    assert.equal(body.error.code, 'CORRUPT_CLOUD_SAVE');
});

test('isolates saves by the authenticated account id', async () => {
    const harness = createHarness();
    const first = await register(harness, 'student_01');
    const second = await register(harness, 'student_02');
    await harness.worker.fetch(request('/v1/save', {
        method: 'PUT', token: first.body.token, body: { expectedRevision: 0, payload: gameSave(5) }
    }), harness.env);

    const secondRead = await harness.worker.fetch(request('/v1/save', { token: second.body.token }), harness.env);
    assert.deepEqual(await json(secondRead), { revision: 0, checksum: null, updatedAt: null, save: null });
});

test('rejects invalid schema, oversized saves, and unsafe object keys', async () => {
    const harness = createHarness();
    const token = (await register(harness)).body.token;

    const schema = await harness.worker.fetch(request('/v1/save', {
        method: 'PUT', token, body: { expectedRevision: 0, payload: { ...gameSave(), schemaVersion: 99 } }
    }), harness.env);
    const oversized = await harness.worker.fetch(request('/v1/save', {
        method: 'PUT', token, body: { expectedRevision: 0, payload: { ...gameSave(), padding: 'x'.repeat(140_000) } }
    }), harness.env);
    const unsafe = await harness.worker.fetch(new Request(`${API_URL}/v1/save`, {
        method: 'PUT',
        headers: { Origin: ORIGIN, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: '{"expectedRevision":0,"payload":{"schemaVersion":3,"__proto__":{"polluted":true}}}'
    }), harness.env);

    assert.equal(schema.status, 400);
    assert.equal(oversized.status, 413);
    assert.equal(unsafe.status, 400);
});

test('stops reading a streamed request body as soon as the byte limit is exceeded', async () => {
    const harness = createHarness();
    const totalChunks = 100;
    let pulls = 0;
    let cancelled = false;
    const body = new ReadableStream({
        pull(controller) {
            pulls++;
            controller.enqueue(new Uint8Array(64 * 1024));
            if (pulls >= totalChunks) controller.close();
        },
        cancel() { cancelled = true; }
    });
    const request = new Request(`${API_URL}/v1/register`, {
        method: 'POST',
        headers: { Origin: ORIGIN, 'Content-Type': 'application/json' },
        body,
        duplex: 'half'
    });

    const response = await harness.worker.fetch(request, harness.env);

    assert.equal(response.status, 413);
    assert.equal(cancelled, true);
    assert.ok(pulls < totalChunks);
});

test('logout revokes the session immediately', async () => {
    const harness = createHarness();
    const token = (await register(harness)).body.token;
    const logout = await harness.worker.fetch(request('/v1/logout', { method: 'POST', token, body: {} }), harness.env);
    const after = await harness.worker.fetch(request('/v1/save', { token }), harness.env);

    assert.equal(logout.status, 204);
    assert.equal(after.status, 401);
});

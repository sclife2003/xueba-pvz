// Copyright (c) 2026. All rights reserved.

import assert from 'node:assert/strict';
import test from 'node:test';

import { KVSessionStore, SESSION_TTL_SECONDS } from '../src/session-store.js';

class MemoryKV {
    constructor() {
        this.values = new Map();
        this.lastPut = null;
        this.lastDeleted = null;
    }

    async put(key, value, options) {
        this.values.set(key, value);
        this.lastPut = { key, value, options };
    }

    async get(key, format) {
        const value = this.values.get(key);
        if (value == null) return null;
        return format === 'json' ? JSON.parse(value) : value;
    }

    async delete(key) {
        this.values.delete(key);
        this.lastDeleted = key;
    }
}

test('stores an opaque session by token digest with a one-day TTL', async () => {
    const kv = new MemoryKV();
    const store = new KVSessionStore(kv);
    const account = { accountId: '11111111-2222-4333-8444-555555555555', username: 'student_01' };

    const token = await store.create(account);

    assert.match(token, /^[A-Za-z0-9_-]{43}$/);
    assert.match(kv.lastPut.key, /^session:[a-f0-9]{64}$/);
    assert.equal(kv.lastPut.key.includes(token), false);
    assert.equal(kv.lastPut.value.includes(token), false);
    assert.equal(kv.lastPut.options.expirationTtl, SESSION_TTL_SECONDS);
    assert.deepEqual(await store.get(token), account);
});

test('rejects malformed or unknown bearer tokens', async () => {
    const store = new KVSessionStore(new MemoryKV());

    assert.equal(await store.get('not-a-token'), null);
    assert.equal(await store.get('a'.repeat(43)), null);
});

test('deletes a session so logout takes effect immediately', async () => {
    const kv = new MemoryKV();
    const store = new KVSessionStore(kv);
    const token = await store.create({ accountId: '11111111-2222-4333-8444-555555555555', username: 'student_01' });

    await store.delete(token);

    assert.match(kv.lastDeleted, /^session:[a-f0-9]{64}$/);
    assert.equal(await store.get(token), null);
});

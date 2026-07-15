// Copyright (c) 2026. All rights reserved.

import { randomToken } from './security.js';

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export const SESSION_TTL_SECONDS = 86_400;

function bytesToHex(value) {
    return Array.from(new Uint8Array(value), byte => byte.toString(16).padStart(2, '0')).join('');
}

export class KVSessionStore {
    constructor(kv, options = {}) {
        if (!kv || typeof kv.put !== 'function' || typeof kv.get !== 'function' || typeof kv.delete !== 'function') {
            throw new Error('SESSIONS KV binding is required');
        }
        this.kv = kv;
        this.cryptoImpl = options.cryptoImpl || globalThis.crypto;
    }

    async keyFor(token) {
        if (typeof token !== 'string' || !TOKEN_PATTERN.test(token)) return null;
        const digest = await this.cryptoImpl.subtle.digest('SHA-256', new TextEncoder().encode(token));
        return `session:${bytesToHex(digest)}`;
    }

    async create(account) {
        if (!account || typeof account.accountId !== 'string' || typeof account.username !== 'string') {
            throw new Error('Invalid session account');
        }
        const token = randomToken(this.cryptoImpl);
        const key = await this.keyFor(token);
        await this.kv.put(key, JSON.stringify({ accountId: account.accountId, username: account.username }), {
            expirationTtl: SESSION_TTL_SECONDS
        });
        return token;
    }

    async get(token) {
        const key = await this.keyFor(token);
        if (!key) return null;
        try {
            const value = await this.kv.get(key, 'json');
            if (!value || typeof value.accountId !== 'string' || typeof value.username !== 'string') return null;
            return { accountId: value.accountId, username: value.username };
        } catch {
            return null;
        }
    }

    async delete(token) {
        const key = await this.keyFor(token);
        if (key) await this.kv.delete(key);
    }
}

// Copyright (c) 2026. All rights reserved.

import { GitHubStore, GitHubStoreError } from './github-store.js';
import { KVSessionStore } from './session-store.js';
import {
    ValidationError,
    normalizeUsername,
    validateCredentials
} from './security.js';

const MAX_JSON_BODY_BYTES = 150_000;
const MAX_SAVE_BYTES = 131_072;
const MAX_SAVE_SCHEMA_VERSION = 3;
const FORBIDDEN_OBJECT_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

class ApiError extends Error {
    constructor(status, code, message, extra = null) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.code = code;
        this.extra = extra;
    }
}

function allowedOrigins(env) {
    return String(env.ALLOWED_ORIGINS || '')
        .split(',')
        .map(value => value.trim())
        .filter(Boolean);
}

function corsHeaders(request, env) {
    const origin = request.headers.get('Origin');
    const allowed = origin && allowedOrigins(env).includes(origin);
    const headers = {
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
        'Access-Control-Max-Age': '600',
        'Cache-Control': 'no-store',
        'Referrer-Policy': 'no-referrer',
        'Vary': 'Origin',
        'X-Content-Type-Options': 'nosniff'
    };
    if (allowed) headers['Access-Control-Allow-Origin'] = origin;
    return headers;
}

function jsonResponse(request, env, status, body) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders(request, env), 'Content-Type': 'application/json; charset=utf-8' }
    });
}

function emptyResponse(request, env, status) {
    return new Response(null, { status, headers: corsHeaders(request, env) });
}

function errorResponse(request, env, error) {
    const apiError = error instanceof ApiError
        ? error
        : new ApiError(500, 'INTERNAL_ERROR', '服務暫時無法使用，請稍後再試。');
    const body = { error: { code: apiError.code, message: apiError.message } };
    if (apiError.extra) Object.assign(body, apiError.extra);
    return jsonResponse(request, env, apiError.status, body);
}

async function readJsonBody(request) {
    const contentLength = request.headers.get('Content-Length');
    if (/^\d+$/.test(contentLength || '') && Number(contentLength) > MAX_JSON_BODY_BYTES) {
        if (request.body) await request.body.cancel('request body exceeds the byte limit');
        throw new ApiError(413, 'PAYLOAD_TOO_LARGE', '資料超過允許大小。');
    }

    let text = '';
    if (request.body) {
        const reader = request.body.getReader();
        const decoder = new TextDecoder();
        let byteLength = 0;
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                byteLength += value.byteLength;
                if (byteLength > MAX_JSON_BODY_BYTES) {
                    await reader.cancel('request body exceeds the byte limit');
                    throw new ApiError(413, 'PAYLOAD_TOO_LARGE', '資料超過允許大小。');
                }
                text += decoder.decode(value, { stream: true });
            }
            text += decoder.decode();
        } finally {
            reader.releaseLock();
        }
    }
    try {
        const value = JSON.parse(text);
        if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('not an object');
        return value;
    } catch {
        throw new ApiError(400, 'INVALID_JSON', '請求格式不正確。');
    }
}

function isPlainObject(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}

function validateJsonTree(value, depth = 0) {
    if (depth > 8) throw new ApiError(400, 'INVALID_SAVE', '存檔結構過深。');
    if (value === null || typeof value === 'boolean') return;
    if (typeof value === 'number') {
        if (!Number.isFinite(value)) throw new ApiError(400, 'INVALID_SAVE', '存檔包含無效數值。');
        return;
    }
    if (typeof value === 'string') {
        if (value.length > 4_096) throw new ApiError(400, 'INVALID_SAVE', '存檔文字欄位過長。');
        return;
    }
    if (Array.isArray(value)) {
        if (value.length > 200) throw new ApiError(400, 'INVALID_SAVE', '存檔陣列項目過多。');
        value.forEach(item => validateJsonTree(item, depth + 1));
        return;
    }
    if (!isPlainObject(value)) throw new ApiError(400, 'INVALID_SAVE', '存檔包含無效物件。');
    const keys = Object.keys(value);
    if (keys.length > 500 || keys.some(key => FORBIDDEN_OBJECT_KEYS.has(key))) {
        throw new ApiError(400, 'INVALID_SAVE', '存檔包含不允許的欄位。');
    }
    keys.forEach(key => validateJsonTree(value[key], depth + 1));
}

function validateSavePayload(payload) {
    if (!isPlainObject(payload)) throw new ApiError(400, 'INVALID_SAVE', '存檔必須是 JSON 物件。');
    const byteLength = new TextEncoder().encode(JSON.stringify(payload)).byteLength;
    if (byteLength > MAX_SAVE_BYTES) throw new ApiError(413, 'PAYLOAD_TOO_LARGE', '存檔超過 128 KiB。');
    validateJsonTree(payload);
    if (!Number.isSafeInteger(payload.schemaVersion) || payload.schemaVersion < 1 || payload.schemaVersion > MAX_SAVE_SCHEMA_VERSION) {
        throw new ApiError(400, 'UNSUPPORTED_SAVE_SCHEMA', '存檔版本不受支援。');
    }
    for (const field of ['results', 'stickers', 'badges', 'worldProgress', 'toolLevels', 'toolUpgrades']) {
        if (!isPlainObject(payload[field])) throw new ApiError(400, 'INVALID_SAVE', `存檔欄位 ${field} 格式不正確。`);
    }
    if (!Number.isSafeInteger(payload.unlockedLevel) || payload.unlockedLevel < 0 || payload.unlockedLevel > 100) {
        throw new ApiError(400, 'INVALID_SAVE', '關卡進度超出範圍。');
    }
    if (!Number.isFinite(payload.hp) || payload.hp < 0 || payload.hp > 100) {
        throw new ApiError(400, 'INVALID_SAVE', '生命值超出範圍。');
    }
    if (!Number.isSafeInteger(payload.shards) || payload.shards < 0 || payload.shards > 1_000_000) {
        throw new ApiError(400, 'INVALID_SAVE', '知識碎片超出範圍。');
    }
    for (const level of Object.values(payload.toolLevels)) {
        if (!Number.isSafeInteger(level) || level < 1 || level > 5) {
            throw new ApiError(400, 'INVALID_SAVE', '文具等級超出範圍。');
        }
    }
    return payload;
}

function bytesToHex(value) {
    return Array.from(new Uint8Array(value), byte => byte.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(value, cryptoImpl = globalThis.crypto) {
    const digest = await cryptoImpl.subtle.digest('SHA-256', new TextEncoder().encode(value));
    return bytesToHex(digest);
}

function bearerToken(request) {
    const header = request.headers.get('Authorization') || '';
    const match = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(header);
    return match ? match[1] : null;
}

function cloudView(stored, expectedAccountId = null) {
    if (!stored) return { revision: 0, checksum: null, updatedAt: null, save: null };
    const envelope = stored.value;
    const validEnvelope = envelope
        && envelope.version === 1
        && typeof envelope.accountId === 'string'
        && (!expectedAccountId || envelope.accountId === expectedAccountId)
        && Number.isSafeInteger(envelope.revision)
        && envelope.revision > 0
        && Number.isSafeInteger(envelope.schemaVersion)
        && /^[a-f0-9]{64}$/.test(envelope.checksum || '')
        && typeof envelope.updatedAt === 'string'
        && Number.isFinite(Date.parse(envelope.updatedAt))
        && isPlainObject(envelope.payload)
        && envelope.schemaVersion === envelope.payload.schemaVersion;
    if (!validEnvelope) {
        throw new ApiError(503, 'CORRUPT_CLOUD_SAVE', '雲端存檔格式異常，已停止覆寫。');
    }
    try {
        validateSavePayload(envelope.payload);
    } catch {
        throw new ApiError(503, 'CORRUPT_CLOUD_SAVE', '雲端存檔格式異常，已停止覆寫。');
    }
    return {
        revision: envelope.revision,
        checksum: envelope.checksum || null,
        updatedAt: envelope.updatedAt || null,
        save: envelope.payload
    };
}

async function requireSession(request, sessions) {
    const token = bearerToken(request);
    if (!token) throw new ApiError(401, 'AUTH_REQUIRED', '請先登入帳號。');
    const account = await sessions.get(token);
    if (!account) throw new ApiError(401, 'AUTH_REQUIRED', '登入已失效，請重新登入。');
    return { token, account };
}

async function enforceAuthRateLimit(request, env, route, username, cryptoImpl) {
    if (!env.AUTH_RATE_LIMITER || typeof env.AUTH_RATE_LIMITER.limit !== 'function') {
        throw new ApiError(503, 'SERVICE_NOT_CONFIGURED', '帳號服務尚未完成 rate limit 設定。');
    }
    const userKey = await sha256Hex(username || 'invalid', cryptoImpl);
    const source = request.headers.get('CF-Connecting-IP') || 'unknown';
    const sourceKey = await sha256Hex(source, cryptoImpl);
    const keys = [
        `${route}:source:${sourceKey}`,
        `${route}:account:${userKey}:${sourceKey}`
    ];
    for (const key of keys) {
        const result = await env.AUTH_RATE_LIMITER.limit({ key });
        if (!result || !result.success) throw new ApiError(429, 'RATE_LIMITED', '嘗試次數過多，請一分鐘後再試。');
    }
}

function accountSync(saved, accountId) {
    const view = cloudView(saved, accountId);
    return { revision: view.revision, hasCloudSave: !!saved };
}

function genericLoginError() {
    return new ApiError(401, 'INVALID_CREDENTIALS', '帳號或密碼不正確。');
}

function mapGitHubError(error, context) {
    if (error instanceof GitHubStoreError && error.code === 'GITHUB_CONFLICT') {
        if (context === 'register') return new ApiError(409, 'ACCOUNT_EXISTS', '這個帳號已被使用。');
        return new ApiError(409, 'REVISION_CONFLICT', '雲端進度已被另一台裝置更新。');
    }
    if (error instanceof GitHubStoreError) return new ApiError(503, 'GITHUB_UNAVAILABLE', 'GitHub 存檔服務暫時無法使用。');
    return error;
}

function productionPasswordHasherFactory(env) {
    if (!env.PASSWORD_HASHER || typeof env.PASSWORD_HASHER.getByName !== 'function') {
        throw new Error('PASSWORD_HASHER Durable Object binding is required');
    }
    function stubFor(accountKey) {
        if (typeof accountKey !== 'string' || !/^[a-f0-9]{64}$/.test(accountKey)) {
            throw new Error('Invalid password hasher shard key');
        }
        const stub = env.PASSWORD_HASHER.getByName(`account:${accountKey}`);
        if (!stub || typeof stub.hash !== 'function' || typeof stub.verify !== 'function') {
            throw new Error('PASSWORD_HASHER Durable Object RPC methods are unavailable');
        }
        return stub;
    }
    return {
        hash: (password, accountKey) => stubFor(accountKey).hash(password),
        verify: (password, record, accountKey) => stubFor(accountKey).verify(password, record)
    };
}

export function createWorker(dependencies = {}) {
    const cryptoImpl = dependencies.cryptoImpl || globalThis.crypto;
    const now = dependencies.now || (() => new Date());
    const passwordHasherFactory = dependencies.passwordHasherFactory || productionPasswordHasherFactory;
    const storeFactory = dependencies.storeFactory || (env => new GitHubStore({
        owner: env.GITHUB_DATA_OWNER,
        repo: env.GITHUB_DATA_REPO,
        branch: env.GITHUB_DATA_BRANCH || 'main',
        token: env.GITHUB_TOKEN
    }));
    const sessionFactory = dependencies.sessionFactory || (env => new KVSessionStore(env.SESSIONS, { cryptoImpl }));
    async function handleRegister(request, env, store, sessions, passwordHasher) {
        const body = await readJsonBody(request);
        let credentials;
        try {
            credentials = validateCredentials(body.username, body.password);
        } catch (error) {
            if (error instanceof ValidationError) throw new ApiError(400, error.code, error.message);
            throw error;
        }
        await enforceAuthRateLimit(request, env, 'register', credentials.username, cryptoImpl);
        const accountKey = await sha256Hex(credentials.username, cryptoImpl);
        let existingAccount;
        try {
            existingAccount = await store.readAccount(accountKey);
        } catch (error) {
            throw mapGitHubError(error, 'register');
        }
        if (existingAccount) throw new ApiError(409, 'ACCOUNT_EXISTS', '這個帳號已被使用。');

        const createdAt = now().toISOString();
        const account = {
            version: 1,
            accountId: cryptoImpl.randomUUID(),
            username: credentials.username,
            password: await passwordHasher.hash(credentials.password, accountKey),
            createdAt,
            updatedAt: createdAt
        };
        try {
            await store.createAccount(accountKey, account);
        } catch (error) {
            throw mapGitHubError(error, 'register');
        }
        const token = await sessions.create({ accountId: account.accountId, username: account.username });
        return jsonResponse(request, env, 201, {
            user: { username: account.username },
            token,
            sync: { revision: 0, hasCloudSave: false }
        });
    }

    async function handleLogin(request, env, store, sessions, passwordHasher) {
        const body = await readJsonBody(request);
        const normalized = normalizeUsername(body.username);
        await enforceAuthRateLimit(request, env, 'login', normalized, cryptoImpl);
        let credentials;
        try {
            credentials = validateCredentials(body.username, body.password);
        } catch {
            throw genericLoginError();
        }

        const accountKey = await sha256Hex(credentials.username, cryptoImpl);
        let stored;
        try {
            stored = await store.readAccount(accountKey);
        } catch (error) {
            throw mapGitHubError(error, 'login');
        }
        const dummyVerifier = await passwordHasher.hash('nonexistent-account-password', accountKey);
        const verifier = stored && stored.value && stored.value.password ? stored.value.password : dummyVerifier;
        const valid = await passwordHasher.verify(credentials.password, verifier, accountKey);
        if (!stored || !valid) throw genericLoginError();

        const account = stored.value;
        const token = await sessions.create({ accountId: account.accountId, username: account.username });
        let saved;
        try {
            saved = await store.readSave(account.accountId);
        } catch (error) {
            throw mapGitHubError(error, 'login');
        }
        return jsonResponse(request, env, 200, {
            user: { username: account.username },
            token,
            sync: accountSync(saved, account.accountId)
        });
    }

    async function handleGetSave(request, env, store, sessions) {
        const { account } = await requireSession(request, sessions);
        try {
            return jsonResponse(request, env, 200, cloudView(await store.readSave(account.accountId), account.accountId));
        } catch (error) {
            throw mapGitHubError(error, 'save');
        }
    }

    async function revisionConflict(request, env, current, accountId) {
        const view = cloudView(current, accountId);
        throw new ApiError(409, 'REVISION_CONFLICT', '雲端進度已被另一台裝置更新。', {
            conflict: view
        });
    }

    async function handlePutSave(request, env, store, sessions) {
        const { account } = await requireSession(request, sessions);
        const body = await readJsonBody(request);
        if (!Number.isSafeInteger(body.expectedRevision) || body.expectedRevision < 0) {
            throw new ApiError(400, 'INVALID_REVISION', '同步版本不正確。');
        }
        const payload = validateSavePayload(body.payload);
        let current;
        try {
            current = await store.readSave(account.accountId);
        } catch (error) {
            throw mapGitHubError(error, 'save');
        }
        const currentRevision = current ? current.value.revision : 0;
        if (body.expectedRevision !== currentRevision) return revisionConflict(request, env, current, account.accountId);

        const updatedAt = now().toISOString();
        const checksum = await sha256Hex(JSON.stringify(payload), cryptoImpl);
        const envelope = {
            version: 1,
            accountId: account.accountId,
            revision: currentRevision + 1,
            schemaVersion: payload.schemaVersion,
            checksum,
            updatedAt,
            payload
        };
        try {
            await store.writeSave(account.accountId, envelope, current ? current.sha : null);
        } catch (error) {
            if (error instanceof GitHubStoreError && error.code === 'GITHUB_CONFLICT') {
                const latest = await store.readSave(account.accountId);
                return revisionConflict(request, env, latest, account.accountId);
            }
            throw mapGitHubError(error, 'save');
        }
        return jsonResponse(request, env, 200, { revision: envelope.revision, checksum, updatedAt });
    }

    async function handleLogout(request, env, sessions) {
        const { token } = await requireSession(request, sessions);
        await sessions.delete(token);
        return emptyResponse(request, env, 204);
    }

    return {
        async fetch(request, env) {
            const origin = request.headers.get('Origin');
            if (origin && !allowedOrigins(env).includes(origin)) {
                return jsonResponse(request, { ...env, ALLOWED_ORIGINS: '' }, 403, {
                    error: { code: 'ORIGIN_FORBIDDEN', message: '不允許的網站來源。' }
                });
            }
            if (request.method === 'OPTIONS') return emptyResponse(request, env, 204);

            const path = new URL(request.url).pathname;
            if (path === '/v1/health' && request.method === 'GET') {
                return jsonResponse(request, env, 200, { ok: true, storage: 'github-private-repository' });
            }

            let store;
            let sessions;
            let passwordHasher;
            try {
                store = storeFactory(env);
                sessions = sessionFactory(env);
                passwordHasher = passwordHasherFactory(env);
            } catch {
                return errorResponse(request, env, new ApiError(503, 'SERVICE_NOT_CONFIGURED', '帳號服務尚未完成設定。'));
            }

            try {
                if (path === '/v1/register' && request.method === 'POST') return await handleRegister(request, env, store, sessions, passwordHasher);
                if (path === '/v1/login' && request.method === 'POST') return await handleLogin(request, env, store, sessions, passwordHasher);
                if (path === '/v1/logout' && request.method === 'POST') return await handleLogout(request, env, sessions);
                if (path === '/v1/save' && request.method === 'GET') return await handleGetSave(request, env, store, sessions);
                if (path === '/v1/save' && request.method === 'PUT') return await handlePutSave(request, env, store, sessions);
                throw new ApiError(404, 'NOT_FOUND', '找不到這個服務端點。');
            } catch (error) {
                if (!Number.isSafeInteger(error?.status) || error.status >= 500) {
                    console.error(JSON.stringify({
                        event: 'request_failed',
                        method: request.method,
                        path,
                        errorName: error instanceof Error ? error.name : 'UnknownError',
                        errorCode: typeof error?.code === 'string' ? error.code : null,
                        errorStatus: Number.isSafeInteger(error?.status) ? error.status : null,
                        upstreamStatus: Number.isSafeInteger(error?.upstreamStatus) ? error.upstreamStatus : null,
                        acceptedPermissions: typeof error?.acceptedPermissions === 'string' ? error.acceptedPermissions : null,
                        causeName: typeof error?.causeName === 'string' ? error.causeName : null,
                        causeMessage: typeof error?.causeMessage === 'string' ? error.causeMessage : null,
                        errorMessage: error instanceof Error ? error.message : 'Unknown failure',
                        errorStack: error instanceof Error ? error.stack : null
                    }));
                }
                return errorResponse(request, env, error);
            }
        }
    };
}

export default createWorker();

// Copyright (c) 2026. All rights reserved.

const encoder = new TextEncoder();
const RESERVED_USERNAMES = new Set(['admin', 'administrator', 'root', 'system', 'support', 'null', 'undefined']);
const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,19}$/;
const MIN_PASSWORD_LENGTH = 10;
const MAX_PASSWORD_LENGTH = 128;

// Cloudflare Workers Web Crypto rejects PBKDF2 iteration counts above 100,000.
export const PASSWORD_ITERATIONS = 100_000;

export class ValidationError extends Error {
    constructor(code, message) {
        super(message);
        this.name = 'ValidationError';
        this.code = code;
    }
}

export function normalizeUsername(value) {
    return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function validateCredentials(usernameInput, passwordInput) {
    const username = normalizeUsername(usernameInput);
    const password = typeof passwordInput === 'string' ? passwordInput : '';

    if (!USERNAME_PATTERN.test(username) || RESERVED_USERNAMES.has(username)) {
        throw new ValidationError('INVALID_USERNAME', '帳號需為 3-20 個英文字母、數字、點、底線或連字號。');
    }
    if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
        throw new ValidationError('INVALID_PASSWORD', `密碼長度需為 ${MIN_PASSWORD_LENGTH}-${MAX_PASSWORD_LENGTH} 個字元。`);
    }

    return { username, password };
}

function bytesToBase64Url(value) {
    const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value) {
    if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value)) return null;
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
    try {
        const binary = atob(base64);
        return Uint8Array.from(binary, char => char.charCodeAt(0));
    } catch {
        return null;
    }
}

async function pepperPassword(password, pepper, cryptoImpl) {
    if (typeof pepper !== 'string' || pepper.length < 16) {
        throw new Error('PASSWORD_PEPPER must contain at least 16 characters');
    }
    const key = await cryptoImpl.subtle.importKey(
        'raw',
        encoder.encode(pepper),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    return cryptoImpl.subtle.sign('HMAC', key, encoder.encode(password));
}

async function derivePasswordDigest(password, pepper, salt, iterations, cryptoImpl) {
    const peppered = await pepperPassword(password, pepper, cryptoImpl);
    const baseKey = await cryptoImpl.subtle.importKey('raw', peppered, 'PBKDF2', false, ['deriveBits']);
    return cryptoImpl.subtle.deriveBits(
        { name: 'PBKDF2', hash: 'SHA-512', salt, iterations },
        baseKey,
        256
    );
}

export async function hashPassword(password, pepper, options = {}) {
    const cryptoImpl = options.cryptoImpl || globalThis.crypto;
    const iterations = options.iterations || PASSWORD_ITERATIONS;
    if (!Number.isSafeInteger(iterations) || iterations < 1_000 || iterations > 2_000_000) {
        throw new Error('Invalid password iteration count');
    }

    const salt = cryptoImpl.getRandomValues(new Uint8Array(16));
    const digest = await derivePasswordDigest(password, pepper, salt, iterations, cryptoImpl);
    return {
        algorithm: 'PBKDF2-HMAC-SHA512',
        iterations,
        salt: bytesToBase64Url(salt),
        digest: bytesToBase64Url(digest)
    };
}

export async function verifyPassword(password, pepper, record, options = {}) {
    const cryptoImpl = options.cryptoImpl || globalThis.crypto;
    const minIterations = options.minIterations || PASSWORD_ITERATIONS;
    if (!record || record.algorithm !== 'PBKDF2-HMAC-SHA512') return false;
    if (!Number.isSafeInteger(record.iterations) || record.iterations < minIterations || record.iterations > 2_000_000) return false;

    const salt = base64UrlToBytes(record.salt);
    const expected = base64UrlToBytes(record.digest);
    if (!salt || salt.length !== 16 || !expected || expected.length !== 32) return false;

    try {
        const actual = new Uint8Array(await derivePasswordDigest(password, pepper, salt, record.iterations, cryptoImpl));
        let difference = actual.length ^ expected.length;
        const length = Math.max(actual.length, expected.length);
        for (let index = 0; index < length; index++) {
            difference |= (actual[index] || 0) ^ (expected[index] || 0);
        }
        return difference === 0;
    } catch {
        return false;
    }
}

export function randomToken(cryptoImpl = globalThis.crypto) {
    return bytesToBase64Url(cryptoImpl.getRandomValues(new Uint8Array(32)));
}

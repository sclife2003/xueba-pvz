// Copyright (c) 2026. All rights reserved.

import assert from 'node:assert/strict';
import test from 'node:test';

import {
    PASSWORD_ITERATIONS,
    ValidationError,
    hashPassword,
    normalizeUsername,
    randomToken,
    validateCredentials,
    verifyPassword
} from '../src/security.js';

const TEST_ITERATIONS = 1_000;
const TEST_PEPPER = 'test-pepper-that-is-never-used-in-production';

test('normalizes a username for stable GitHub account paths', () => {
    assert.equal(normalizeUsername('  Student.One  '), 'student.one');
});

test('accepts a lightweight username and a sufficiently long password', () => {
    assert.deepEqual(validateCredentials('Student_01', 'learn-safe-2026'), {
        username: 'student_01',
        password: 'learn-safe-2026'
    });
});

test('rejects reserved, malformed, and short credentials without echoing the password', () => {
    for (const [username, password] of [
        ['admin', 'learn-safe-2026'],
        ['a', 'learn-safe-2026'],
        ['student name', 'learn-safe-2026'],
        ['student', 'short']
    ]) {
        assert.throws(
            () => validateCredentials(username, password),
            error => error instanceof ValidationError && !error.message.includes(password)
        );
    }
});

test('uses the maximum PBKDF2 work factor supported by Cloudflare Workers', () => {
    assert.equal(PASSWORD_ITERATIONS, 100_000);
});

test('stores only a salted PBKDF2 verifier and verifies the correct password', async () => {
    const first = await hashPassword('learn-safe-2026', TEST_PEPPER, { iterations: TEST_ITERATIONS });
    const second = await hashPassword('learn-safe-2026', TEST_PEPPER, { iterations: TEST_ITERATIONS });

    assert.equal(first.algorithm, 'PBKDF2-HMAC-SHA512');
    assert.equal(first.iterations, TEST_ITERATIONS);
    assert.ok(first.salt);
    assert.ok(first.digest);
    assert.notEqual(first.salt, second.salt);
    assert.notEqual(first.digest, second.digest);
    assert.equal(JSON.stringify(first).includes('learn-safe-2026'), false);
    assert.equal(await verifyPassword('learn-safe-2026', TEST_PEPPER, first, { minIterations: TEST_ITERATIONS }), true);
    assert.equal(await verifyPassword('wrong-password', TEST_PEPPER, first, { minIterations: TEST_ITERATIONS }), false);
});

test('fails closed for an unsupported or weakened password record', async () => {
    const record = await hashPassword('learn-safe-2026', TEST_PEPPER, { iterations: TEST_ITERATIONS });

    assert.equal(await verifyPassword('learn-safe-2026', TEST_PEPPER, { ...record, algorithm: 'SHA-256' }, { minIterations: TEST_ITERATIONS }), false);
    assert.equal(await verifyPassword('learn-safe-2026', TEST_PEPPER, { ...record, iterations: 999 }, { minIterations: TEST_ITERATIONS }), false);
});

test('creates opaque 256-bit session tokens', () => {
    const first = randomToken();
    const second = randomToken();

    assert.match(first, /^[A-Za-z0-9_-]{43}$/);
    assert.notEqual(first, second);
});

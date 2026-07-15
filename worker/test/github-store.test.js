// Copyright (c) 2026. All rights reserved.

import assert from 'node:assert/strict';
import test from 'node:test';

import { GitHubStore, GitHubStoreError } from '../src/github-store.js';

const OWNER = 'school-owner';
const REPO = 'xueba-pvz-data';
const TOKEN = 'github-token-for-tests';
const ACCOUNT_KEY = 'a'.repeat(64);
const ACCOUNT_ID = '11111111-2222-4333-8444-555555555555';

function response(status, body) {
    return new Response(body == null ? null : JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' }
    });
}

function encodeJson(value) {
    return Buffer.from(JSON.stringify(value), 'utf8').toString('base64');
}

test('reads a Unicode account record from the configured private repository branch', async () => {
    const calls = [];
    const record = { version: 1, username: 'student_01', note: '跨裝置進度' };
    const store = new GitHubStore({
        owner: OWNER,
        repo: REPO,
        branch: 'data',
        token: TOKEN,
        fetchImpl: async (url, options) => {
            calls.push({ url, options });
            return response(200, { sha: 'blob-sha', content: encodeJson(record), encoding: 'base64' });
        }
    });

    const result = await store.readAccount(ACCOUNT_KEY);

    assert.deepEqual(result, { value: record, sha: 'blob-sha' });
    assert.equal(calls[0].url, `https://api.github.com/repos/${OWNER}/${REPO}/contents/accounts/${ACCOUNT_KEY}.json?ref=data`);
    assert.equal(calls[0].options.headers.Authorization, `Bearer ${TOKEN}`);
    assert.equal(calls[0].options.headers['X-GitHub-Api-Version'], '2022-11-28');
});

test('invokes fetch with the global receiver required by the Workers runtime', async () => {
    let receiver = null;
    const record = { version: 1, username: 'student_01' };
    const store = new GitHubStore({
        owner: OWNER,
        repo: REPO,
        token: TOKEN,
        fetchImpl: function fetchWithReceiverCheck() {
            receiver = this;
            return Promise.resolve(response(200, {
                sha: 'blob-sha',
                content: encodeJson(record),
                encoding: 'base64'
            }));
        }
    });

    await store.readAccount(ACCOUNT_KEY);

    assert.equal(receiver, globalThis);
});

test('returns null when an account or save file does not exist', async () => {
    const store = new GitHubStore({
        owner: OWNER,
        repo: REPO,
        token: TOKEN,
        fetchImpl: async () => response(404, { message: 'Not Found' })
    });

    assert.equal(await store.readAccount(ACCOUNT_KEY), null);
    assert.equal(await store.readSave(ACCOUNT_ID), null);
});

test('creates an account without a SHA and encodes JSON as UTF-8 base64', async () => {
    let captured;
    const record = { version: 1, username: 'student_01', note: '安全帳號' };
    const store = new GitHubStore({
        owner: OWNER,
        repo: REPO,
        branch: 'main',
        token: TOKEN,
        fetchImpl: async (url, options) => {
            captured = { url, options, body: JSON.parse(options.body) };
            return response(201, { content: { sha: 'created-sha' } });
        }
    });

    const result = await store.createAccount(ACCOUNT_KEY, record);

    assert.equal(result.sha, 'created-sha');
    assert.equal(captured.url.endsWith(`/contents/accounts/${ACCOUNT_KEY}.json`), true);
    assert.equal(captured.options.method, 'PUT');
    assert.equal(captured.body.branch, 'main');
    assert.equal(Object.hasOwn(captured.body, 'sha'), false);
    assert.deepEqual(JSON.parse(Buffer.from(captured.body.content, 'base64').toString('utf8')), record);
});

test('updates a save with the current GitHub blob SHA for compare-and-swap', async () => {
    let body;
    const envelope = { version: 1, revision: 4, payload: { unlockedLevel: 3 } };
    const store = new GitHubStore({
        owner: OWNER,
        repo: REPO,
        token: TOKEN,
        fetchImpl: async (_url, options) => {
            body = JSON.parse(options.body);
            return response(200, { content: { sha: 'next-sha' } });
        }
    });

    const result = await store.writeSave(ACCOUNT_ID, envelope, 'current-sha');

    assert.equal(result.sha, 'next-sha');
    assert.equal(body.sha, 'current-sha');
    assert.equal(body.message, `save: account ${ACCOUNT_ID} revision 4`);
});

test('maps GitHub conflicts without leaking tokens or upstream response bodies', async () => {
    const store = new GitHubStore({
        owner: OWNER,
        repo: REPO,
        token: TOKEN,
        fetchImpl: async () => response(409, { message: `conflict ${TOKEN}` })
    });

    await assert.rejects(
        () => store.writeSave(ACCOUNT_ID, { version: 1, revision: 2, payload: {} }, 'stale-sha'),
        error => error instanceof GitHubStoreError
            && error.code === 'GITHUB_CONFLICT'
            && error.status === 409
            && !error.message.includes(TOKEN)
    );
});

test('rejects path traversal before calling GitHub', async () => {
    let called = false;
    const store = new GitHubStore({
        owner: OWNER,
        repo: REPO,
        token: TOKEN,
        fetchImpl: async () => {
            called = true;
            return response(500, {});
        }
    });

    await assert.rejects(() => store.readAccount('../outside'), /Invalid account key/);
    await assert.rejects(() => store.readSave('../../secret'), /Invalid account id/);
    assert.equal(called, false);
});

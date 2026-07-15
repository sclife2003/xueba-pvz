// Copyright (c) 2026. All rights reserved.

const API_BASE = 'https://api.github.com';
const API_VERSION = '2022-11-28';
const ACCOUNT_KEY_PATTERN = /^[a-f0-9]{64}$/;
const ACCOUNT_ID_PATTERN = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const REPOSITORY_PART_PATTERN = /^[A-Za-z0-9_.-]+$/;

export class GitHubStoreError extends Error {
    constructor(code, status, details = {}) {
        super(code === 'GITHUB_CONFLICT' ? 'GitHub data changed; retry with the latest revision.' : 'GitHub storage is unavailable.');
        this.name = 'GitHubStoreError';
        this.code = code;
        this.status = status;
        this.upstreamStatus = Number.isSafeInteger(details.upstreamStatus) ? details.upstreamStatus : null;
        this.acceptedPermissions = typeof details.acceptedPermissions === 'string' ? details.acceptedPermissions : null;
        this.causeName = typeof details.causeName === 'string' ? details.causeName : null;
        this.causeMessage = typeof details.causeMessage === 'string' ? details.causeMessage : null;
    }
}

function utf8ToBase64(value) {
    const bytes = new TextEncoder().encode(value);
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
    }
    return btoa(binary);
}

function base64ToUtf8(value) {
    const binary = atob(String(value).replace(/\s/g, ''));
    const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

function validateRepositoryPart(value, label) {
    if (typeof value !== 'string' || !REPOSITORY_PART_PATTERN.test(value)) {
        throw new Error(`Invalid GitHub ${label}`);
    }
    return value;
}

export class GitHubStore {
    constructor({ owner, repo, branch = 'main', token, fetchImpl = globalThis.fetch }) {
        this.owner = validateRepositoryPart(owner, 'owner');
        this.repo = validateRepositoryPart(repo, 'repository');
        this.branch = validateRepositoryPart(branch, 'branch');
        if (typeof token !== 'string' || token.length < 8) throw new Error('Invalid GitHub token');
        if (typeof fetchImpl !== 'function') throw new Error('Invalid fetch implementation');
        this.token = token;
        this.fetchImpl = fetchImpl;
    }

    headers() {
        return {
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json',
            'X-GitHub-Api-Version': API_VERSION,
            'User-Agent': 'xueba-pvz-account-service'
        };
    }

    contentUrl(path, includeRef = false) {
        const base = `${API_BASE}/repos/${this.owner}/${this.repo}/contents/${path}`;
        return includeRef ? `${base}?ref=${encodeURIComponent(this.branch)}` : base;
    }

    async request(path, options = {}, allowNotFound = false) {
        let response;
        try {
            response = await Reflect.apply(this.fetchImpl, globalThis, [this.contentUrl(path, options.method !== 'PUT'), {
                ...options,
                headers: { ...this.headers(), ...(options.headers || {}) }
            }]);
        } catch (error) {
            throw new GitHubStoreError('GITHUB_UNAVAILABLE', 503, {
                causeName: error instanceof Error ? error.name : 'UnknownError',
                causeMessage: error instanceof Error ? error.message : 'Unknown fetch failure'
            });
        }
        if (allowNotFound && response.status === 404) return null;
        if (!response.ok) {
            const conflict = response.status === 409 || response.status === 422;
            throw new GitHubStoreError(conflict ? 'GITHUB_CONFLICT' : 'GITHUB_UNAVAILABLE', conflict ? 409 : 503, {
                upstreamStatus: response.status,
                acceptedPermissions: response.headers.get('X-Accepted-GitHub-Permissions')
            });
        }
        try {
            return await response.json();
        } catch {
            throw new GitHubStoreError('GITHUB_UNAVAILABLE', 503);
        }
    }

    async readJson(path) {
        const result = await this.request(path, { method: 'GET' }, true);
        if (!result) return null;
        if (result.encoding !== 'base64' || typeof result.content !== 'string' || typeof result.sha !== 'string') {
            throw new GitHubStoreError('GITHUB_UNAVAILABLE', 503);
        }
        try {
            return { value: JSON.parse(base64ToUtf8(result.content)), sha: result.sha };
        } catch {
            throw new GitHubStoreError('GITHUB_UNAVAILABLE', 503);
        }
    }

    async writeJson(path, value, message, sha) {
        const body = {
            message,
            content: utf8ToBase64(JSON.stringify(value)),
            branch: this.branch
        };
        if (sha) body.sha = sha;
        const result = await this.request(path, { method: 'PUT', body: JSON.stringify(body) });
        return { sha: result && result.content && result.content.sha ? result.content.sha : null };
    }

    async readAccount(accountKey) {
        if (!ACCOUNT_KEY_PATTERN.test(accountKey)) throw new Error('Invalid account key');
        return this.readJson(`accounts/${accountKey}.json`);
    }

    async createAccount(accountKey, record) {
        if (!ACCOUNT_KEY_PATTERN.test(accountKey)) throw new Error('Invalid account key');
        return this.writeJson(`accounts/${accountKey}.json`, record, `account: create ${record.accountId || accountKey}`, null);
    }

    async readSave(accountId) {
        if (!ACCOUNT_ID_PATTERN.test(accountId)) throw new Error('Invalid account id');
        return this.readJson(`saves/${accountId}.json`);
    }

    async writeSave(accountId, envelope, sha = null) {
        if (!ACCOUNT_ID_PATTERN.test(accountId)) throw new Error('Invalid account id');
        const revision = Number.isSafeInteger(envelope && envelope.revision) ? envelope.revision : 0;
        return this.writeJson(
            `saves/${accountId}.json`,
            envelope,
            `save: account ${accountId} revision ${revision}`,
            sha
        );
    }
}

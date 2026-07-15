// Copyright (c) 2026. All rights reserved.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const configPath = path.join(root, 'account-service.json');
const match = html.match(/\/\/ ACCOUNT_SERVICE_CORE_START([\s\S]*?)\/\/ ACCOUNT_SERVICE_CORE_END/);
assert.ok(match, 'account service core block must exist in index.html');
const writeGameSaveMatch = html.match(/function writeGameSave\([^)]*\) \{[\s\S]*?\n    \}/);
assert.ok(writeGameSaveMatch, 'writeGameSave must exist in index.html');

const factory = new Function(`${match[1]}\nreturn {
    AccountApiError,
    AccountService,
    isDefaultSave,
    stableSaveJson,
    syncCompletedLevelSave: typeof syncCompletedLevelSave === 'function' ? syncCompletedLevelSave : undefined
};`);
const { AccountService, isDefaultSave, stableSaveJson, syncCompletedLevelSave } = factory();
const createWriteGameSave = (localStorage, accountService) => new Function(
    'localStorage',
    'accountService',
    `const SAVE_KEY = 'test-save';\n${writeGameSaveMatch[0]}\nreturn writeGameSave;`
)(localStorage, accountService);

const nextLevelStart = html.indexOf('        nextLevel() {');
const nextLevelEnd = html.indexOf('\n\n        startLoop()', nextLevelStart);
assert.ok(nextLevelStart >= 0 && nextLevelEnd > nextLevelStart, 'GameEngine.nextLevel must exist in index.html');
const nextLevelMethod = html.slice(nextLevelStart, nextLevelEnd);

function runLevelCompletion(level, levelIdx) {
    const levels = [];
    levels[levelIdx] = level;
    const syncCalls = [];
    const TestEngine = new Function(
        'LEVELS',
        'CAMPAIGN_COUNT',
        'chapterMinigameForCompletedLevel',
        'syncCompletedLevelSave',
        'SOUND',
        `return class TestEngine {\n${nextLevelMethod}\n}`
    )(
        levels,
        11,
        () => null,
        syncCompletedLevelSave,
        { play() {} }
    );
    const engine = new TestEngine();
    engine.waveIdx = level.waves.length - 1;
    engine.levelIdx = levelIdx;
    engine.w = 800;
    engine.h = 450;
    engine.computeAndSaveStars = () => ({});
    engine.syncSave = (...args) => syncCalls.push(args);
    engine.callbacks = { onLevelComplete() {}, onPhaseChange() {} };
    engine.floatText = () => {};
    engine.startTD = () => { throw new Error('completed level must not start another wave'); };
    engine.nextLevel();
    return syncCalls;
}

class MemoryStorage {
    constructor() { this.values = new Map(); }
    getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
    setItem(key, value) { this.values.set(key, String(value)); }
    removeItem(key) { this.values.delete(key); }
}

class ManualClock {
    constructor() {
        this.nextId = 1;
        this.tasks = new Map();
    }
    set = callback => {
        const id = this.nextId++;
        this.tasks.set(id, callback);
        return id;
    };
    clear = id => this.tasks.delete(id);
    async runAll() {
        const tasks = Array.from(this.tasks.values());
        this.tasks.clear();
        for (const task of tasks) await task();
    }
}

function gameSave(unlockedLevel = 0) {
    return {
        schemaVersion: 3,
        unlockedLevel,
        hp: 0,
        results: unlockedLevel ? { '1-1': { stars: 3 } } : {},
        stickers: {},
        badges: {},
        worldProgress: {},
        shards: 0,
        toolLevels: { textbook: 1, pencil: 1, watering: 1, glue: 1, ruler: 1, eraser: 1, teacher: 1 },
        toolUpgrades: {}
    };
}

function jsonResponse(status, body) {
    return new Response(body == null ? null : JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' }
    });
}

function createService(fetchImpl, options = {}) {
    const storage = options.storage || new MemoryStorage();
    const clock = options.clock || new ManualClock();
    const states = [];
    const service = new AccountService({
        fetchImpl,
        sessionStorage: storage,
        setTimer: clock.set,
        clearTimer: clock.clear,
        onState: state => states.push(structuredClone(state))
    });
    return { service, storage, clock, states };
}

async function run() {
    assert.ok(fs.existsSync(configPath), 'public account service config must exist');
    const publicConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    assert.deepEqual(Object.keys(publicConfig).sort(), ['apiBaseUrl', 'enabled']);
    assert.equal(publicConfig.enabled, true);
    assert.equal(publicConfig.apiBaseUrl, 'https://xueba-pvz-account.sclife2003.workers.dev');
    console.log('[OK] public config enables the production Worker and contains no secrets');

    {
        const localWrites = [];
        const cloudWrites = [];
        const writeGameSave = createWriteGameSave(
            { setItem: (key, value) => localWrites.push({ key, value }) },
            { queueSave: save => cloudWrites.push(save) }
        );
        const save = gameSave(1);

        writeGameSave(save);
        assert.equal(localWrites.length, 1);
        assert.equal(cloudWrites.length, 0, 'ordinary progress changes must remain local-only');

        writeGameSave(save, { cloudSync: true });
        assert.equal(localWrites.length, 2);
        assert.equal(cloudWrites.length, 1, 'explicit completion sync must queue one cloud save');
        assert.match(html, /syncSave\(extra, options = \{\}\)[\s\S]{0,400}writeGameSave\(this\.save, options\)/);
        console.log('[OK] ordinary progress stays local unless cloud sync is explicitly requested');
    }

    {
        assert.equal(typeof syncCompletedLevelSave, 'function', 'completion sync must use an executable shared helper');
        const intermediate = runLevelCompletion({ waves: [{}], isChallenge: false }, 4);
        const finalCampaign = runLevelCompletion({ waves: [{}], isChallenge: false }, 10);
        const challenge = runLevelCompletion({ waves: [{}], isChallenge: true }, 11);

        assert.deepEqual(intermediate, [[{ unlockedLevel: 5 }, { cloudSync: true }]]);
        assert.deepEqual(finalCampaign, [[null, { cloudSync: true }]]);
        assert.deepEqual(challenge, [[null, { cloudSync: true }]]);
        console.log('[OK] intermediate, final campaign, and challenge completions each request exactly one cloud sync');
    }
    assert.ok(html.includes('renderAccountPanel()'));
    assert.ok(html.includes("this.onOpenAccount"));
    assert.ok(html.includes("this.onAccountSubmit"));
    assert.ok(html.includes("this.onAccountKeepLocal"));
    assert.ok(html.includes("this.onAccountUseCloud"));
    assert.match(html, /ui\.onAccountSync = async \(\) => \{[\s\S]{0,220}accountService\.syncNow\(loadGameSave\(\)\)/);
    assert.ok(html.includes("password.type = 'password'"));
    assert.ok(html.includes("password.autocomplete = mode === 'register' ? 'new-password' : 'current-password'"));
    assert.ok(html.includes("fetch('account-service.json', { cache: 'no-store' })"));
    assert.ok(!/localStorage\.(?:setItem|getItem)\([^\n]*(?:token|password)/i.test(html));
    console.log('[OK] account UI wiring keeps local-first saves and session-only credentials');

    assert.equal(isDefaultSave(gameSave()), true);
    assert.equal(isDefaultSave(gameSave(1)), false);
    const hpOnlySave = gameSave();
    hpOnlySave.hp = 1;
    assert.equal(isDefaultSave(hpOnlySave), false);
    assert.equal(stableSaveJson({ b: 1, a: { d: 2, c: 3 } }), stableSaveJson({ a: { c: 3, d: 2 }, b: 1 }));
    console.log('[OK] default-save and stable comparison helpers');

    {
        let calls = 0;
        const { service, clock } = createService(async () => { calls++; throw new Error('should not fetch'); });
        service.configure({ enabled: false, apiBaseUrl: '' });
        service.queueSave(gameSave(1));
        await clock.runAll();
        assert.equal(calls, 0);
        assert.equal(service.state.status, 'local-only');
        console.log('[OK] disabled service remains local-only');
    }

    {
        const calls = [];
        const { service, storage } = createService(async (url, options) => {
            calls.push({ url, options, body: options.body ? JSON.parse(options.body) : null });
            if (url.endsWith('/v1/register')) {
                return jsonResponse(201, { user: { username: 'student_01' }, token: 'a'.repeat(43), sync: { revision: 0, hasCloudSave: false } });
            }
            return jsonResponse(200, { revision: 1, checksum: 'abc', updatedAt: '2026-07-15T12:00:00.000Z' });
        });
        service.configure({ enabled: true, apiBaseUrl: 'https://account.example.workers.dev/' });
        const result = await service.register('Student_01', 'learn-safe-2026', gameSave(2));

        assert.equal(result.action, 'synced');
        assert.equal(calls.length, 2);
        assert.equal(calls[0].url, 'https://account.example.workers.dev/v1/register');
        assert.equal(calls[1].body.expectedRevision, 0);
        assert.equal(calls[1].body.payload.unlockedLevel, 2);
        assert.equal(calls[1].options.headers.Authorization, `Bearer ${'a'.repeat(43)}`);
        assert.equal(JSON.parse(storage.getItem('xueba_pvz_account_session_v1')).username, 'student_01');
        assert.equal(service.state.revision, 1);
        assert.equal(service.state.status, 'synced');
        console.log('[OK] registration creates session and uploads local progress');
    }

    {
        const cloud = gameSave(4);
        const { service } = createService(async url => {
            if (url.endsWith('/v1/login')) return jsonResponse(200, { user: { username: 'student_01' }, token: 'b'.repeat(43), sync: { revision: 4, hasCloudSave: true } });
            return jsonResponse(200, { revision: 4, checksum: 'cloud', updatedAt: '2026-07-15T12:00:00.000Z', save: cloud });
        });
        service.configure({ enabled: true, apiBaseUrl: 'https://account.example.workers.dev' });
        const result = await service.login('student_01', 'learn-safe-2026', gameSave());

        assert.equal(result.action, 'apply-cloud');
        assert.deepEqual(result.save, cloud);
        assert.equal(service.state.status, 'cloud-ready');
        assert.equal(service.state.revision, 4);
        console.log('[OK] empty device restores cloud progress after login');
    }

    {
        const { service, storage } = createService(async url => {
            if (url.endsWith('/v1/login')) {
                return jsonResponse(200, { user: { username: 'student_01' }, token: 'z'.repeat(43), sync: { revision: 2, hasCloudSave: true } });
            }
            throw new Error('network disconnected after login');
        });
        service.configure({ enabled: true, apiBaseUrl: 'https://account.example.workers.dev' });
        const result = await service.login('student_01', 'learn-safe-2026', gameSave(2));

        assert.equal(result.action, 'local-only');
        assert.equal(service.state.authenticated, true);
        assert.equal(service.state.status, 'offline');
        assert.ok(storage.getItem('xueba_pvz_account_session_v1'));
        console.log('[OK] post-login network loss keeps the session and returns to local-first mode');
    }

    {
        const cloud = gameSave(4);
        const { service } = createService(async url => {
            if (url.endsWith('/v1/login')) return jsonResponse(200, { user: { username: 'student_01' }, token: 'c'.repeat(43), sync: { revision: 4, hasCloudSave: true } });
            return jsonResponse(200, { revision: 4, checksum: 'cloud', updatedAt: '2026-07-15T12:00:00.000Z', save: cloud });
        });
        service.configure({ enabled: true, apiBaseUrl: 'https://account.example.workers.dev' });
        const result = await service.login('student_01', 'learn-safe-2026', gameSave(2));

        assert.equal(result.action, 'conflict');
        assert.equal(service.state.status, 'conflict');
        assert.equal(service.state.conflict.revision, 4);
        assert.deepEqual(service.state.conflict.save, cloud);
        console.log('[OK] divergent device and cloud saves require explicit choice');
    }

    {
        const puts = [];
        let activePuts = 0;
        let maxActivePuts = 0;
        const putResolvers = [];
        const { service, clock } = createService(async (url, options) => {
            if (url.endsWith('/v1/login')) return jsonResponse(200, { user: { username: 'student_01' }, token: 'd'.repeat(43), sync: { revision: 2, hasCloudSave: true } });
            if (options.method === 'GET') return jsonResponse(200, { revision: 2, checksum: 'same', updatedAt: '2026-07-15T12:00:00.000Z', save: gameSave(2) });
            puts.push(JSON.parse(options.body));
            activePuts++;
            maxActivePuts = Math.max(maxActivePuts, activePuts);
            return new Promise(resolve => putResolvers.push(response => {
                activePuts--;
                resolve(response);
            }));
        });
        service.configure({ enabled: true, apiBaseUrl: 'https://account.example.workers.dev' });
        await service.login('student_01', 'learn-safe-2026', gameSave(2));
        const completionSave = gameSave(3);
        service.queueSave(completionSave);
        const manualSync = service.syncNow(completionSave);

        assert.equal(clock.tasks.size, 0, 'completion sync must start immediately without a debounce timer');
        assert.equal(puts.length, 1, 'completion and immediate manual sync of the same snapshot must share one PUT');
        assert.equal(puts[0].expectedRevision, 2);
        assert.equal(puts[0].payload.unlockedLevel, 3);
        assert.equal(maxActivePuts, 1);
        putResolvers.shift()(jsonResponse(200, { revision: 3, checksum: 'next', updatedAt: '2026-07-15T12:00:01.000Z' }));
        assert.equal((await manualSync).action, 'synced');
        assert.equal(service.state.revision, 3);
        console.log('[OK] completion and immediate manual sync share one immediate PUT');
    }

    {
        const puts = [];
        let activePuts = 0;
        let maxActivePuts = 0;
        const putResolvers = [];
        const { service } = createService(async (url, options) => {
            if (url.endsWith('/v1/login')) return jsonResponse(200, { user: { username: 'student_01' }, token: 'h'.repeat(43), sync: { revision: 1, hasCloudSave: true } });
            if (options.method === 'GET') return jsonResponse(200, { revision: 1, checksum: 'same', updatedAt: '2026-07-15T12:00:00.000Z', save: gameSave(1) });
            puts.push(JSON.parse(options.body));
            activePuts++;
            maxActivePuts = Math.max(maxActivePuts, activePuts);
            return new Promise(resolve => putResolvers.push(response => {
                activePuts--;
                resolve(response);
            }));
        });
        service.configure({ enabled: true, apiBaseUrl: 'https://account.example.workers.dev' });
        await service.login('student_01', 'learn-safe-2026', gameSave(1));

        service.queueSave(gameSave(2));
        service.queueSave(gameSave(3));
        const latestSync = service.syncNow(gameSave(4));
        assert.equal(puts.length, 1, 'newer snapshot must wait while the first PUT is in flight');
        assert.equal(maxActivePuts, 1);

        putResolvers.shift()(jsonResponse(200, { revision: 2, checksum: 'second', updatedAt: '2026-07-15T12:00:01.000Z' }));
        await new Promise(resolve => setImmediate(resolve));
        assert.equal(puts.length, 2, 'latest snapshot must run after the first PUT completes');
        assert.equal(puts[1].expectedRevision, 2, 'serialized latest PUT must use the revision returned by the first PUT');
        assert.equal(puts[1].payload.unlockedLevel, 4);
        assert.equal(maxActivePuts, 1, 'cloud PUTs must never overlap');

        putResolvers.shift()(jsonResponse(200, { revision: 3, checksum: 'latest', updatedAt: '2026-07-15T12:00:02.000Z' }));
        assert.equal((await latestSync).action, 'synced');
        assert.equal(service.state.revision, 3);
        assert.equal(puts.at(-1).payload.unlockedLevel, 4, 'older snapshot must not be the final cloud write');
        console.log('[OK] newer snapshots serialize behind in-flight sync and finish last with the latest revision');
    }

    {
        const cloud = gameSave(5);
        const { service, clock } = createService(async (url, options) => {
            if (url.endsWith('/v1/login')) return jsonResponse(200, { user: { username: 'student_01' }, token: 'e'.repeat(43), sync: { revision: 1, hasCloudSave: true } });
            if (options.method === 'GET') return jsonResponse(200, { revision: 1, checksum: 'same', updatedAt: '2026-07-15T12:00:00.000Z', save: gameSave(1) });
            return jsonResponse(409, { error: { code: 'REVISION_CONFLICT', message: 'conflict' }, conflict: { revision: 2, checksum: 'cloud', updatedAt: '2026-07-15T12:00:01.000Z', save: cloud } });
        });
        service.configure({ enabled: true, apiBaseUrl: 'https://account.example.workers.dev' });
        await service.login('student_01', 'learn-safe-2026', gameSave(1));
        service.queueSave(gameSave(2));
        await service.syncNow(gameSave(2));

        assert.equal(service.state.status, 'conflict');
        assert.equal(service.state.conflict.revision, 2);
        assert.deepEqual(service.state.conflict.save, cloud);
        console.log('[OK] stale revision preserves both sides as a conflict');
    }

    {
        const cloud = gameSave(5);
        let resolveFirstPut;
        let putCount = 0;
        const firstPut = new Promise(resolve => { resolveFirstPut = resolve; });
        const { service } = createService(async (url, options) => {
            if (url.endsWith('/v1/login')) return jsonResponse(200, { user: { username: 'student_01' }, token: 'g'.repeat(43), sync: { revision: 1, hasCloudSave: true } });
            if (options.method === 'GET') return jsonResponse(200, { revision: 1, checksum: 'same', updatedAt: '2026-07-15T12:00:00.000Z', save: gameSave(1) });
            putCount++;
            if (putCount === 1) return firstPut;
            return jsonResponse(200, { revision: 3, checksum: 'unexpected', updatedAt: '2026-07-15T12:00:02.000Z' });
        });
        service.configure({ enabled: true, apiBaseUrl: 'https://account.example.workers.dev' });
        await service.login('student_01', 'learn-safe-2026', gameSave(1));

        const inFlight = service.syncNow(gameSave(2));
        service.queueSave(gameSave(3));
        resolveFirstPut(jsonResponse(409, {
            error: { code: 'REVISION_CONFLICT', message: 'conflict' },
            conflict: { revision: 2, checksum: 'cloud', updatedAt: '2026-07-15T12:00:01.000Z', save: cloud }
        }));
        assert.equal((await inFlight).action, 'conflict');

        assert.equal(putCount, 1);
        assert.equal(service.state.status, 'conflict');
        assert.deepEqual(service.state.conflict.save, cloud);
        console.log('[OK] a 409 cancels queued writes until the player chooses a side');
    }

    {
        const storage = new MemoryStorage();
        const { service } = createService(async url => {
            if (url.endsWith('/v1/register')) return jsonResponse(201, { user: { username: 'student_01' }, token: 'f'.repeat(43), sync: { revision: 0, hasCloudSave: false } });
            if (url.endsWith('/v1/logout')) return jsonResponse(204, null);
            return jsonResponse(200, { revision: 1, checksum: 'x', updatedAt: '2026-07-15T12:00:00.000Z' });
        }, { storage });
        service.configure({ enabled: true, apiBaseUrl: 'https://account.example.workers.dev' });
        await service.register('student_01', 'learn-safe-2026', gameSave());
        await service.logout();

        assert.equal(storage.getItem('xueba_pvz_account_session_v1'), null);
        assert.equal(service.state.authenticated, false);
        assert.equal(service.state.status, 'local-only');
        console.log('[OK] logout clears the local bearer session');
    }

    console.log('Account client contracts verified.');
}

run().catch(error => {
    console.error(error.stack || error);
    process.exitCode = 1;
});

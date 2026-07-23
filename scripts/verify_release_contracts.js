// Copyright (c) 2026. All rights reserved.
// Executable contracts for immutable asset releases and safe update prompts.

const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const htmlPath = path.join(root, 'index.html');
const versionPath = path.join(root, 'version.json');
const workflowPath = path.join(root, '.github', 'workflows', 'pages.yml');
const html = fs.readFileSync(htmlPath, 'utf8');

function extractBlock(source, marker) {
  const start = source.indexOf(marker);
  assert.ok(start >= 0, `${marker} must exist`);
  const bodyStart = source.indexOf('{', start);
  assert.ok(bodyStart >= 0, `${marker} must have a body`);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index++) {
    if (source[index] === '{') depth++;
    else if (source[index] === '}' && --depth === 0) {
      return source.slice(start, index + 1);
    }
  }
  assert.fail(`${marker} body must close`);
}

function extractFunction(source, name) {
  return extractBlock(source, `function ${name}(`);
}

function extractClassMethod(source, name) {
  return extractBlock(source, `        ${name}(`).trim();
}

function listRelativeFiles(directory) {
  const files = [];
  const visit = current => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else files.push(path.relative(directory, absolute).replaceAll('\\', '/'));
    }
  };
  visit(directory);
  return files.sort();
}

async function verifyReleaseMonitor() {
  const coreMatch = html.match(
    /\/\/ RELEASE_MONITOR_CORE_START([\s\S]*?)\/\/ RELEASE_MONITOR_CORE_END/
  );
  assert.ok(coreMatch, 'release monitor core block must exist in index.html');
  const releaseCore = new Function(
    `${coreMatch[1]}
return {
  BUILD_ID,
  RELEASE_CHECK_INTERVAL_MS,
  assetUrlForBuild,
  createReleaseMonitor,
  fetchVersionManifest,
  isDifferentBuildId,
  isSafeUpdatePhase
};`
  )();

  assert.equal(releaseCore.BUILD_ID, 'development');
  assert.ok(
    releaseCore.RELEASE_CHECK_INTERVAL_MS >= 5 * 60 * 1000,
    'release polling interval must remain low-frequency'
  );
  assert.equal(releaseCore.isDifferentBuildId('abc', 'abc'), false);
  assert.equal(releaseCore.isDifferentBuildId('abc', 'def'), true);
  assert.equal(releaseCore.isDifferentBuildId('abc', ''), false);

  for (const safePhase of ['menu', 'world', 'prep', 'collection', 'workshop']) {
    assert.equal(
      releaseCore.isSafeUpdatePhase(safePhase),
      true,
      `${safePhase} must be an update-safe phase`
    );
  }
  for (const unsafePhase of [
    'td',
    'maze',
    'quiz',
    'rescue_quiz',
    'minigame',
    'over',
    'level_complete'
  ]) {
    assert.equal(
      releaseCore.isSafeUpdatePhase(unsafePhase),
      false,
      `${unsafePhase} must suppress update prompts and reloads`
    );
  }

  const fetchCalls = [];
  const manifest = await releaseCore.fetchVersionManifest(
    async (url, options) => {
      fetchCalls.push({ url, options });
      return {
        ok: true,
        async json() {
          return { buildId: 'b'.repeat(40) };
        }
      };
    },
    'version.json'
  );
  assert.deepEqual(manifest, { buildId: 'b'.repeat(40) });
  assert.deepEqual(fetchCalls, [{
    url: 'version.json',
    options: { cache: 'no-store' }
  }]);

  let phase = 'td';
  let prompts = 0;
  let reloads = 0;
  let now = 1_000;
  const monitor = releaseCore.createReleaseMonitor({
    currentBuildId: 'a'.repeat(40),
    fetchVersion: async () => ({ buildId: 'b'.repeat(40) }),
    getPhase: () => phase,
    now: () => now,
    onUpdateAvailable: () => { prompts++; },
    reload: () => { reloads++; }
  });

  assert.deepEqual(await monitor.check(), {
    status: 'deferred',
    buildId: 'b'.repeat(40)
  });
  assert.equal(prompts, 0, 'unsafe phases must defer the update prompt');
  assert.equal(monitor.handlePhaseChange('level_complete'), false);
  assert.equal(prompts, 0, 'level_complete must keep the update deferred');
  phase = 'world';
  assert.equal(monitor.handlePhaseChange(phase), true);
  assert.equal(prompts, 1, 'the pending update must appear on the next safe phase');
  assert.equal(monitor.dismissUpdate(), true, 'dismiss acknowledges the active prompt');
  assert.equal(monitor.handlePhaseChange('menu'), false, 'dismiss snoozes the same build');
  now += releaseCore.RELEASE_CHECK_INTERVAL_MS - 1;
  assert.equal(monitor.handlePhaseChange('world'), false, 'snooze lasts for the polling interval');
  now += 1;
  assert.equal(monitor.handlePhaseChange('world'), true, 'the same build prompts again after snooze');
  assert.equal(prompts, 2);

  phase = 'td';
  assert.equal(monitor.confirmUpdate(), false);
  assert.equal(reloads, 0, 'confirmation cannot reload after phase becomes unsafe');
  phase = 'menu';
  assert.equal(monitor.confirmUpdate(), true);
  assert.equal(reloads, 1, 'player confirmation reloads exactly once in a safe phase');

  let networkFailurePrompts = 0;
  const failingMonitor = releaseCore.createReleaseMonitor({
    currentBuildId: 'a'.repeat(40),
    fetchVersion: async () => { throw new Error('offline'); },
    getPhase: () => 'menu',
    onUpdateAvailable: () => { networkFailurePrompts++; },
    reload: () => { throw new Error('network failure must never reload'); }
  });
  assert.deepEqual(await failingMonitor.check(), { status: 'failed' });
  assert.equal(networkFailurePrompts, 0, 'network failure remains fail-soft');

  return releaseCore;
}

async function verifySameBuildFallbackQuery(releaseCore) {
  const loaderSource = extractFunction(html, 'createAssetLoader');
  const createAssetLoader = new Function(
    'assetUrlForBuild',
    'BUILD_ID',
    `${loaderSource}; return createAssetLoader;`
  )(releaseCore.assetUrlForBuild, releaseCore.BUILD_ID);

  const requests = [];
  class ProbeImage {
    set src(url) {
      this._src = url;
      requests.push(url);
      setImmediate(() => {
        if (/\.webp\?/.test(url)) this.onerror();
        else this.onload();
      });
    }
    get src() {
      return this._src;
    }
  }

  const buildId = 'c'.repeat(40);
  const loader = createAssetLoader(() => new ProbeImage(), {
    buildId,
    assetUrlForBuild: releaseCore.assetUrlForBuild,
    spriteManifest: { enemy_probe: 'assets/probe.webp' }
  });
  assert.equal(await loader.loadEntry([
    'enemy_probe',
    'assets/probe.webp',
    'assets/probe.png'
  ]), true);
  assert.deepEqual(requests, [
    `assets/probe.webp?build=${buildId}`,
    `assets/probe.png?build=${buildId}`
  ]);
  assert.equal(
    releaseCore.assetUrlForBuild('assets/probe.webp?quality=high', buildId),
    `assets/probe.webp?quality=high&build=${buildId}`
  );
  assert.equal(
    releaseCore.assetUrlForBuild('account-service.json', buildId),
    'account-service.json'
  );
}

function verifyNoStorageDestructionOrServiceWorker() {
  const releaseCoreMatch = html.match(
    /\/\/ RELEASE_MONITOR_CORE_START([\s\S]*?)\/\/ RELEASE_MONITOR_CORE_END/
  );
  assert.ok(releaseCoreMatch, 'release monitor core must remain inspectable');
  const releaseCore = releaseCoreMatch[1];
  const forbiddenStorageCalls = [
    /localStorage\.clear\s*\(/,
    /sessionStorage\.clear\s*\(/,
    /indexedDB\.deleteDatabase\s*\(/
  ];
  for (const pattern of forbiddenStorageCalls) {
    assert.doesNotMatch(html, pattern);
  }
  assert.doesNotMatch(
    releaseCore,
    /(?:localStorage|sessionStorage)\.(?:removeItem|setItem)\s*\(|indexedDB\./i
  );
  assert.doesNotMatch(html, /navigator\.serviceWorker|service-worker|sw\.js/i);
  assert.match(html, /window\.location\.reload\(\)/);
  assert.doesNotMatch(
    html,
    /window\.location\.(?:href|assign|replace)\s*(?:=|\()\s*['"`]\//
  );
}

function verifyMinimalUpdatePromptAndRuntimeWiring(releaseCore) {
  const promptSource = extractClassMethod(html, 'renderUpdatePrompt');
  const lockModalSource = extractClassMethod(html, 'lockUpdateModal');
  const restoreModalFocusSource = extractClassMethod(html, 'restoreUpdateModalFocus');
  const PromptProbe = new Function(
    'isSafeUpdatePhase',
    `return class PromptProbe {
${promptSource}
}`
  )(releaseCore.isSafeUpdatePhase);
  const probe = new PromptProbe();
  probe.phase = 'td';
  probe.updateBuildId = 'e'.repeat(40);
  probe.onConfirmUpdate = null;
  probe.onDismissUpdate = null;
  probe.el = (tag, style, ...children) => ({
    tag,
    style,
    children,
    attributes: {},
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    },
    append(...items) {
      this.children.push(...items);
    },
    appendChild(item) {
      this.children.push(item);
    }
  });
  probe.btn = (text, style, onClick) => ({
    tag: 'button',
    text,
    style,
    onClick
  });

  assert.equal(
    probe.renderUpdatePrompt(),
    null,
    'minimal update prompt must not render in combat'
  );
  let confirmed = 0;
  let dismissed = 0;
  probe.phase = 'menu';
  probe.onConfirmUpdate = () => { confirmed++; };
  probe.onDismissUpdate = () => { dismissed++; };
  const prompt = probe.renderUpdatePrompt();
  assert.ok(prompt, 'minimal update prompt renders in a safe phase');
  assert.equal(prompt.attributes.role, 'dialog');
  assert.equal(prompt.attributes['aria-modal'], 'true');
  assert.equal(prompt.style.inset, '0');
  const buttons = [];
  const collectButtons = node => {
    if (!node) return;
    if (node.tag === 'button') buttons.push(node);
    (node.children || []).forEach(collectButtons);
  };
  collectButtons(prompt);
  assert.equal(buttons.length, 2, 'update prompt exposes dismiss and confirm actions');
  buttons[0].onClick();
  buttons[1].onClick();
  assert.equal(dismissed, 1);
  assert.equal(confirmed, 1);
  assert.equal(buttons[1].style.background, '#9a3412');
  assert.equal(buttons[1].style.color, '#fff');
  assert.match(lockModalSource, /keydown/);
  assert.match(lockModalSource, /inert/);
  assert.match(lockModalSource, /focus\(\)/);
  assert.match(restoreModalFocusSource, /focus\(\)/);

  assert.match(
    html,
    /createReleaseMonitor\(\{[\s\S]{0,900}currentBuildId:\s*BUILD_ID[\s\S]{0,900}fetchVersionManifest\(fetch,\s*'version\.json'\)/
  );
  assert.match(html, /ui\.onPhaseUpdate\s*=/);
  assert.match(html, /ui\.onConfirmUpdate\s*=/);
  assert.match(html, /ui\.onDismissUpdate\s*=/);
  assert.match(html, /releaseMonitor\.dismissUpdate\(\)/);
  assert.match(html, /window\.setInterval\([\s\S]{0,260}RELEASE_CHECK_INTERVAL_MS/);
  assert.ok(
    (html.match(/this\.renderUpdatePrompt\(\)/g) || []).length >= 5,
    'all five safe UI surfaces append the update prompt'
  );
}

function verifyWorkflowAndArtifact() {
  assert.ok(fs.existsSync(workflowPath), 'Pages workflow must exist');
  const workflow = fs.readFileSync(workflowPath, 'utf8');
  assert.match(workflow, /uses:\s*actions\/configure-pages@v5/);
  assert.match(workflow, /uses:\s*actions\/upload-pages-artifact@v4/);
  assert.match(workflow, /uses:\s*actions\/deploy-pages@v4/);
  assert.match(workflow, /RELEASE_BUILD_ID:\s*\$\{\{\s*github\.sha\s*\}\}/);
  assert.match(workflow, /pages:\s*write/);
  assert.match(workflow, /id-token:\s*write/);
  assert.doesNotMatch(workflow, /navigator\.serviceWorker|service-worker|sw\.js/i);

  const builderMatch = workflow.match(
    /\/\/ RELEASE_ARTIFACT_BUILD_START([\s\S]*?)\/\/ RELEASE_ARTIFACT_BUILD_END/
  );
  assert.ok(builderMatch, 'workflow must contain an executable artifact builder');

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'xueba-release-contract-'));
  const sourceDir = path.join(tempRoot, 'source');
  const outputDir = path.join(tempRoot, 'artifact');
  const buildId = 'd'.repeat(40);
  try {
    fs.mkdirSync(path.join(sourceDir, 'assets', 'nested'), { recursive: true });
    fs.writeFileSync(
      path.join(sourceDir, 'index.html'),
      "<script>const RELEASE_BUILD_ID = '__XUEBA_BUILD_ID__';</script>"
    );
    fs.writeFileSync(path.join(sourceDir, 'account-service.json'), '{"enabled":true}');
    fs.writeFileSync(path.join(sourceDir, 'assets', 'nested', 'sprite.webp'), 'asset');

    for (const forbidden of [
      '.agents',
      '.claude',
      '.vibemgmt',
      'scripts',
      'tests',
      'worker',
      'config'
    ]) {
      fs.mkdirSync(path.join(sourceDir, forbidden), { recursive: true });
      fs.writeFileSync(path.join(sourceDir, forbidden, 'private.txt'), 'private');
    }
    fs.writeFileSync(path.join(sourceDir, '.env.local'), 'SECRET=not-public');

    const result = childProcess.spawnSync(
      process.execPath,
      ['-e', builderMatch[1]],
      {
        cwd: sourceDir,
        encoding: 'utf8',
        env: {
          ...process.env,
          RELEASE_BUILD_ID: buildId,
          RELEASE_OUTPUT_DIR: outputDir,
          RELEASE_SOURCE_DIR: sourceDir
        }
      }
    );
    assert.equal(
      result.status,
      0,
      `artifact builder must succeed: ${result.stderr || result.stdout}`
    );

    assert.deepEqual(listRelativeFiles(outputDir), [
      'account-service.json',
      'assets/nested/sprite.webp',
      'index.html',
      'version.json'
    ]);
    assert.equal(
      fs.readFileSync(path.join(outputDir, 'index.html'), 'utf8').includes(buildId),
      true,
      'deployment index must contain github.sha provenance'
    );
    assert.equal(
      fs.readFileSync(path.join(outputDir, 'index.html'), 'utf8').includes('__XUEBA_BUILD_ID__'),
      false,
      'deployment index must contain no unresolved build token'
    );
    assert.deepEqual(
      JSON.parse(fs.readFileSync(path.join(outputDir, 'version.json'), 'utf8')),
      { buildId }
    );
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

async function run() {
  assert.ok(fs.existsSync(versionPath), 'local version.json must exist');
  assert.deepEqual(
    JSON.parse(fs.readFileSync(versionPath, 'utf8')),
    { buildId: 'development' }
  );
  const releaseCore = await verifyReleaseMonitor();
  await verifySameBuildFallbackQuery(releaseCore);
  verifyNoStorageDestructionOrServiceWorker();
  verifyMinimalUpdatePromptAndRuntimeWiring(releaseCore);
  verifyWorkflowAndArtifact();
  console.log('Release contracts verified.');
}

run().catch(error => {
  console.error(`[FAIL] ${error.stack || error.message}`);
  process.exitCode = 1;
});

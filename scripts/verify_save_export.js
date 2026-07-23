// Verifies that save export creates a real portable file while keeping the copyable code.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

function extractFunction(name) {
  const marker = `function ${name}(`;
  const start = html.indexOf(marker);
  assert.ok(start >= 0, `${name} must exist`);
  const bodyStart = html.indexOf('{', start);
  let depth = 0;
  for (let index = bodyStart; index < html.length; index++) {
    if (html[index] === '{') depth++;
    else if (html[index] === '}' && --depth === 0) return html.slice(start, index + 1);
  }
  assert.fail(`${name} must close`);
}

const b64encodeUtf8 = extractFunction('b64encodeUtf8');
const downloadSaveFile = extractFunction('downloadSaveFile');
const exportSave = extractFunction('exportSave');
const events = { appended: [], removed: [], clicks: [], prompts: [], revoked: [] };
class TestBlob {
  constructor(parts, options) { this.parts = parts; this.type = options.type; }
}
const document = {
  body: {
    appendChild(node) { events.appended.push(node); },
    removeChild(node) { events.removed.push(node); }
  },
  createElement(tag) {
    return {
      tag,
      style: {},
      click() { events.clicks.push(this); }
    };
  }
};
const window = { prompt: (...args) => events.prompts.push(args) };
const URL = {
  createObjectURL(blob) { events.blob = blob; return 'blob:xueba-save'; },
  revokeObjectURL(url) { events.revoked.push(url); }
};
const save = { schemaVersion: 3, unlockedLevel: 4, results: { '1-1': { stars: 3 } } };
const runExport = new Function(
  'window', 'document', 'URL', 'Blob', 'loadGameSave', 'btoa', 'unescape', 'encodeURIComponent',
  `${b64encodeUtf8}\n${downloadSaveFile}\n${exportSave}\nreturn exportSave;`
)(window, document, URL, TestBlob, () => save, global.btoa, global.unescape, global.encodeURIComponent);

runExport();
assert.equal(events.clicks.length, 1, 'export triggers one browser download');
assert.match(events.clicks[0].download, /^xueba-pvz-save-\d{8}\.json$/);
assert.equal(events.clicks[0].href, 'blob:xueba-save');
assert.equal(events.blob.type, 'application/json;charset=utf-8');
const exported = JSON.parse(events.blob.parts.join(''));
assert.deepEqual(exported.save, save, 'portable file contains the complete save payload');
assert.match(events.prompts[0][1], /^XBPVZ1:/, 'export keeps a copyable backwards-compatible save code');
assert.deepEqual(events.revoked, ['blob:xueba-save']);
console.log('Save export file contract verified.');

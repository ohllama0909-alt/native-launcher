const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const mods = require('../electron/mods');

function fixture(t, entry = { filename: 'example.jar', folder: 'mods' }) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'noctra-mods-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const dir = path.join(root, 'minecraft/instances/test/mods');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'example.jar'), 'test mod');
  fs.writeFileSync(path.join(dir, '.native-mods.json'), JSON.stringify({ example: entry }));
  const handlers = {};
  mods.init({ app: { getPath: () => root } }, { handle: (name, fn) => { handlers[name] = fn; } });
  return { dir, call: (name, payload) => handlers[`mods:${name}`](null, { instanceId: 'test', projectId: 'example', ...payload }) };
}

test('enabling and disabling mods renames the actual file and persists state', t => {
  const { dir, call } = fixture(t);
  assert.equal(call('toggle', { enabled: false }).example.filename, 'example.jar.disabled');
  assert.equal(fs.existsSync(path.join(dir, 'example.jar')), false);
  assert.equal(fs.readFileSync(path.join(dir, 'example.jar.disabled'), 'utf8'), 'test mod');
  assert.equal(JSON.parse(fs.readFileSync(path.join(dir, '.native-mods.json'))).example.enabled, false);
  assert.equal(call('toggle', { enabled: true }).example.filename, 'example.jar');
  assert.equal(fs.existsSync(path.join(dir, 'example.jar.disabled')), false);
});

test('legacy bare filenames can be toggled and removed', t => {
  const { dir, call } = fixture(t, 'example.jar');
  call('toggle', { enabled: false });
  assert.deepEqual(call('remove'), {});
  assert.equal(fs.existsSync(path.join(dir, 'example.jar.disabled')), false);
});

test('missing folder metadata defaults to mods during removal', t => {
  const { dir, call } = fixture(t, { filename: 'example.jar' });
  assert.deepEqual(call('remove'), {});
  assert.equal(fs.existsSync(path.join(dir, 'example.jar')), false);
});

test('toggle refuses filename collisions without overwriting either mod', t => {
  const { dir, call } = fixture(t);
  fs.writeFileSync(path.join(dir, 'example.jar.disabled'), 'other mod');
  assert.throws(() => call('toggle', { enabled: false }), /already exists/);
  assert.equal(fs.readFileSync(path.join(dir, 'example.jar'), 'utf8'), 'test mod');
  assert.equal(fs.readFileSync(path.join(dir, 'example.jar.disabled'), 'utf8'), 'other mod');
});

test('malformed filenames cannot escape the content folder', t => {
  const { call } = fixture(t, { filename: '../example.jar', folder: 'mods' });
  assert.throws(() => call('toggle', { enabled: false }), /Invalid filename/);
  assert.throws(() => call('remove'), /Invalid filename/);
});

test('non-mod content cannot be renamed by the mod toggle', t => {
  const { call } = fixture(t, { filename: 'example.jar', folder: 'resourcepacks' });
  assert.throws(() => call('toggle', { enabled: false }), /Only mods/);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../src/lib/skins.js'), 'utf8')
  .replace(/export const /g, 'const ')
  .replace(/export function /g, 'function ')
  .replace(/export \{[^}]+\};?/g, '')
  .replace(/export const accountIdentifier = skinIdentifier;/, 'const accountIdentifier = skinIdentifier;');

const skinIdentifier = new Function(`${source}; return skinIdentifier;`)();
const isLocalIdentity = new Function(`${source}; return isLocalIdentity;`)();

test('Noctra and offline avatars resolve by username instead of generated UUID', () => {
  assert.equal(skinIdentifier({ type: 'noctra', id: 'native-1', uuid: 'generated-uuid', name: 'PremiumName' }), 'PremiumName');
  assert.equal(skinIdentifier({ type: 'offline', id: 'offline-1', uuid: 'generated-uuid', name: 'OfflineName' }), 'OfflineName');
});

test('Microsoft avatars continue to resolve by authoritative UUID', () => {
  assert.equal(skinIdentifier({ type: 'microsoft', uuid: '1234-5678', name: 'PremiumName' }), '12345678');
});

test('isLocalIdentity flags locally-generated accounts so they self-heal from the wardrobe', () => {
  assert.equal(isLocalIdentity({ type: 'noctra', id: 'native-1' }), true);
  assert.equal(isLocalIdentity({ type: 'offline', id: 'offline-1' }), true);
  assert.equal(isLocalIdentity({ id: 'native-abc' }), true);
  assert.equal(isLocalIdentity({ id: 'offline-abc' }), true);
  assert.equal(isLocalIdentity({ type: 'microsoft', uuid: '1234-5678', name: 'PremiumName' }), false);
  assert.equal(isLocalIdentity(undefined), false);
});

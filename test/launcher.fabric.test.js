const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const AdmZip = require('adm-zip');

// electron/launcher.js requires the Electron main-process module.
require('./electron-stub');
const { _internals } = require('../electron/launcher');

test('Fabric Maven coordinates use the correct repository and artifact path', () => {
  const artifact = _internals.mavenArtifact({
    name: 'net.fabricmc:sponge-mixin:0.17.4+mixin.0.8.7',
    url: 'https://maven.fabricmc.net/'
  });

  assert.equal(
    artifact.relativePath,
    'net/fabricmc/sponge-mixin/0.17.4+mixin.0.8.7/sponge-mixin-0.17.4+mixin.0.8.7.jar'
  );
  assert.equal(
    artifact.url,
    `https://maven.fabricmc.net/${artifact.relativePath}`
  );
});

test('legacy Fabric Maven entries get secure default repositories', () => {
  const defaultArtifact = _internals.mavenArtifact({ name: 'net.minecraft:launchwrapper:1.12' });
  assert.equal(
    defaultArtifact.url,
    'https://libraries.minecraft.net/net/minecraft/launchwrapper/1.12/launchwrapper-1.12.jar'
  );

  const legacyHttpArtifact = _internals.mavenArtifact({
    name: 'org.ow2.asm:asm:7.0',
    url: 'http://repo.maven.apache.org/maven2/'
  });
  assert.equal(legacyHttpArtifact.url, 'https://repo.maven.apache.org/maven2/org/ow2/asm/asm/7.0/asm-7.0.jar');
});

test('Fabric library validation rejects corrupt cached JARs', async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'native-fabric-unit-'));
  const jarPath = path.join(temp, 'library.jar');
  try {
    const zip = new AdmZip();
    zip.addFile('org/spongepowered/asm/launch/MixinBootstrap.class', Buffer.from('test'));
    zip.writeZip(jarPath);

    const contents = fs.readFileSync(jarPath);
    const sha1 = crypto.createHash('sha1').update(contents).digest('hex');
    assert.equal(await _internals.fileMatches(jarPath, { sha1, size: contents.length }), true);
    assert.equal(await _internals.fileMatches(jarPath, { sha1: null, size: null }), true);

    fs.writeFileSync(jarPath, 'partial download');
    assert.equal(await _internals.fileMatches(jarPath, { sha1, size: contents.length }), false);
    assert.equal(await _internals.fileMatches(jarPath, { sha1: null, size: null }), false);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('a loader-named asset index is mirrored under the game version', () => {
  const launcherMod = require('../electron/launcher');
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'native-index-unit-'));
  const indexes = path.join(temp, 'minecraft', 'assets', 'indexes');
  fs.mkdirSync(indexes, { recursive: true });
  const profileIndex = path.join(indexes, 'fabric-loader-0.16.9-1.21.1.json');
  fs.writeFileSync(profileIndex, JSON.stringify({ objects: { 'minecraft/sounds.json': { hash: 'a'.repeat(40) } } }));

  try {
    launcherMod.init({ app: { getPath: () => temp }, getWin: () => null }, { on() {}, handle() {} });

    const canonical = launcherMod._internals.ensureCanonicalAssetIndex('1.21.1', 'fabric-loader-0.16.9-1.21.1');
    assert.equal(canonical, path.join(indexes, '1.21.1.json'));
    assert.deepEqual(
      JSON.parse(fs.readFileSync(canonical, 'utf8')),
      JSON.parse(fs.readFileSync(profileIndex, 'utf8'))
    );

    // An existing canonical index is never overwritten.
    fs.writeFileSync(canonical, JSON.stringify({ objects: { keep: { hash: 'b'.repeat(40) } } }));
    launcherMod._internals.ensureCanonicalAssetIndex('1.21.1', 'fabric-loader-0.16.9-1.21.1');
    assert.deepEqual(JSON.parse(fs.readFileSync(canonical, 'utf8')), { objects: { keep: { hash: 'b'.repeat(40) } } });

    // Vanilla installs never need mirroring.
    assert.equal(launcherMod._internals.ensureCanonicalAssetIndex('1.21.1', null), null);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { dialog } = require('electron');
const { downloadFile, writeFileAtomic } = require('./download');

const API_ROOT = 'https://api.nativelaunch.xyz';
const SLOT_COUNT = 3;
let deps = null;

const wardrobeRoot = () => path.join(deps.app.getPath('userData'), 'wardrobe');
const accountKey = (account) => crypto.createHash('sha256').update(String(account?.id || account?.name || 'guest')).digest('hex').slice(0, 24);
const accountDir = (account) => path.join(wardrobeRoot(), accountKey(account));
const metadataPath = (account) => path.join(accountDir(account), 'wardrobe.json');

function defaults() {
  return {
    selected: 0,
    syncKey: crypto.randomBytes(24).toString('hex'),
    slots: Array.from({ length: SLOT_COUNT }, () => ({ skin: null, cape: null, model: 'classic' }))
  };
}

function loadMetadata(account) {
  let value;
  try { value = JSON.parse(fs.readFileSync(metadataPath(account), 'utf8')); } catch { value = defaults(); }
  const base = defaults();
  return {
    selected: Number.isInteger(value.selected) && value.selected >= 0 && value.selected < SLOT_COUNT ? value.selected : 0,
    syncKey: typeof value.syncKey === 'string' && value.syncKey.length >= 32 ? value.syncKey : base.syncKey,
    slots: base.slots.map((fallback, index) => ({ ...fallback, ...(value.slots?.[index] || {}) }))
  };
}

function saveMetadata(account, metadata) {
  fs.mkdirSync(accountDir(account), { recursive: true });
  writeFileAtomic(metadataPath(account), JSON.stringify(metadata, null, 2));
}

function pngInfo(filePath) {
  const stat = fs.statSync(filePath);
  if (!stat.isFile() || stat.size <= 24 || stat.size > 5 * 1024 * 1024) throw new Error('Choose a PNG smaller than 5 MB.');
  const header = Buffer.alloc(24);
  const handle = fs.openSync(filePath, 'r');
  try { fs.readSync(handle, header, 0, header.length, 0); } finally { fs.closeSync(handle); }
  if (!header.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) throw new Error('The selected file is not a valid PNG.');
  const width = header.readUInt32BE(16);
  const height = header.readUInt32BE(20);
  if (!width || !height || width > 4096 || height > 4096) throw new Error('The PNG dimensions are not supported.');
  return { width, height, size: stat.size };
}

function dataUrl(filePath) {
  try { return `data:image/png;base64,${fs.readFileSync(filePath).toString('base64')}`; } catch { return null; }
}

async function artifactMatches(filePath, { sha1, size }) {
  try {
    const stat = await fs.promises.stat(filePath);
    if (!stat.isFile() || stat.size === 0 || (size && stat.size !== size)) return false;
    if (!sha1) return true;
    const hash = crypto.createHash('sha1');
    for await (const chunk of fs.createReadStream(filePath)) hash.update(chunk);
    return hash.digest('hex').toLowerCase() === String(sha1).toLowerCase();
  } catch { return false; }
}

function publicState(account) {
  const metadata = loadMetadata(account);
  const slots = metadata.slots.map((slot) => ({
    model: slot.model || 'classic',
    skinUrl: slot.skin ? dataUrl(path.join(accountDir(account), slot.skin)) : null,
    capeUrl: slot.cape ? dataUrl(path.join(accountDir(account), slot.cape)) : null,
    hasSkin: Boolean(slot.skin && fs.existsSync(path.join(accountDir(account), slot.skin))),
    hasCape: Boolean(slot.cape && fs.existsSync(path.join(accountDir(account), slot.cape)))
  }));
  return { selected: metadata.selected, slots, active: slots[metadata.selected] || slots[0] };
}

async function chooseTexture(account, kind, slotIndex, model) {
  if (!account?.id || !['skin', 'cape'].includes(kind)) throw new Error('Invalid wardrobe request.');
  const slot = Number(slotIndex);
  if (!Number.isInteger(slot) || slot < 0 || slot >= SLOT_COUNT) throw new Error('Invalid wardrobe slot.');
  const result = await dialog.showOpenDialog({
    title: kind === 'skin' ? 'Choose Minecraft skin' : 'Choose Minecraft cape',
    properties: ['openFile'],
    filters: [{ name: 'PNG texture', extensions: ['png'] }]
  });
  if (result.canceled || !result.filePaths[0]) return publicState(account);
  pngInfo(result.filePaths[0]);

  const metadata = loadMetadata(account);
  const filename = `slot-${slot + 1}-${kind}.png`;
  const bytes = fs.readFileSync(result.filePaths[0]);
  fs.mkdirSync(accountDir(account), { recursive: true });
  writeFileAtomic(path.join(accountDir(account), filename), bytes);
  metadata.slots[slot][kind] = filename;
  if (kind === 'skin') metadata.slots[slot].model = model === 'slim' ? 'slim' : 'classic';
  metadata.selected = slot;
  saveMetadata(account, metadata);
  return publicState(account);
}

async function syncWardrobe(account) {
  const metadata = loadMetadata(account);
  const slot = metadata.slots[metadata.selected];
  const encode = (filename) => filename ? fs.readFileSync(path.join(accountDir(account), filename)).toString('base64') : null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  let response;
  try {
    response = await fetch(`${API_ROOT}/v1/wardrobe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${metadata.syncKey}` },
      body: JSON.stringify({ username: account.name, model: slot.model, skin: encode(slot.skin), cape: encode(slot.cape) }),
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) throw new Error(`Wardrobe sync failed (HTTP ${response.status})`);
  return response.json();
}

function syncWardrobeInBackground(account) {
  // Wardrobe editing is offline-first. Publish when a connection is available,
  // but never make a local selection wait for the network.
  void syncWardrobe(account).catch(() => {});
}

async function minecraftRequest(account, pathname, options = {}) {
  const token = await deps.auth?.getMinecraftAccessToken?.(account.id);
  if (!token) throw new Error('Your Microsoft session expired. Sign in again to manage official cosmetics.');
  const response = await fetch(`https://api.minecraftservices.com${pathname}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...(options.headers || {}) }
  });
  if (!response.ok) {
    let detail = '';
    try { detail = (await response.json())?.errorMessage || ''; } catch {}
    throw new Error(detail || `Minecraft profile request failed (HTTP ${response.status})`);
  }
  if (response.status === 204) return null;
  return response.json();
}

const officialProfile = (account) => minecraftRequest(account, '/minecraft/profile');

async function applyOfficialSkin(account, slotIndex) {
  const metadata = loadMetadata(account);
  const slot = metadata.slots[Number(slotIndex)];
  if (!slot?.skin) throw new Error('Add a skin to this outfit before publishing it.');
  const filePath = path.join(accountDir(account), slot.skin);
  const form = new FormData();
  form.append('variant', slot.model === 'slim' ? 'SLIM' : 'CLASSIC');
  form.append('file', new Blob([fs.readFileSync(filePath)], { type: 'image/png' }), path.basename(filePath));
  return minecraftRequest(account, '/minecraft/profile/skins', { method: 'PUT', body: form });
}

async function activateOfficialCape(account, capeId) {
  if (!capeId) return minecraftRequest(account, '/minecraft/profile/capes/active', { method: 'DELETE' });
  return minecraftRequest(account, '/minecraft/profile/capes/active', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ capeId })
  });
}

async function prepareFabricInstance(instance, account, onState = () => {}) {
  if (!instance?.id || !account?.id || account.id === 'guest') return { installed: false };
  const gameDir = path.join(deps.app.getPath('userData'), 'minecraft', 'instances', String(instance.id));
  const modsDir = path.join(gameDir, 'mods');
  const cslDir = path.join(gameDir, 'CustomSkinLoader');
  const metadata = loadMetadata(account);
  const outfit = metadata.slots[metadata.selected];
  const username = String(account.name || 'Player').replace(/[^A-Za-z0-9_]/g, '_').slice(0, 16) || 'Player';

  const localSkin = path.join(cslDir, 'LocalSkin', 'skins', `${username}.png`);
  const localCape = path.join(cslDir, 'LocalSkin', 'capes', `${username}.png`);
  if (outfit.skin && fs.existsSync(path.join(accountDir(account), outfit.skin))) {
    writeFileAtomic(localSkin, fs.readFileSync(path.join(accountDir(account), outfit.skin)));
  } else {
    fs.rmSync(localSkin, { force: true });
  }
  if (outfit.cape && fs.existsSync(path.join(accountDir(account), outfit.cape))) {
    writeFileAtomic(localCape, fs.readFileSync(path.join(accountDir(account), outfit.cape)));
  } else {
    fs.rmSync(localCape, { force: true });
  }
  writeFileAtomic(path.join(cslDir, 'ExtraList', 'NativeWardrobe.json'), JSON.stringify({
    name: 'Noctra Client Wardrobe',
    type: 'CustomSkinAPI',
    root: `${API_ROOT}/csl/`
  }, null, 2));

  const trackerPath = path.join(cslDir, '.native-loader.json');
  let tracker = {};
  try { tracker = JSON.parse(fs.readFileSync(trackerPath, 'utf8')); } catch {}

  const trackedPath = tracker.filename ? path.join(modsDir, path.basename(tracker.filename)) : null;
  const mcVersion = String(instance.version || instance.mc_version);
  if (tracker.mcVersion === mcVersion && trackedPath && fs.existsSync(trackedPath)) {
    return { installed: true, filename: path.basename(trackedPath) };
  }

  try {
    onState('Preparing wardrobe support…');
    const params = new URLSearchParams({
      loaders: JSON.stringify(['fabric']),
      game_versions: JSON.stringify([mcVersion])
    });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    let response;
    try {
      response = await fetch(`https://api.modrinth.com/v2/project/idMHQ4n2/version?${params}`, { signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
    if (!response.ok) throw new Error(`Modrinth returned HTTP ${response.status}`);
    const versions = await response.json();
    const file = versions?.[0]?.files?.find((entry) => entry.primary) || versions?.[0]?.files?.[0];
    if (!file?.url || !file?.filename) throw new Error('No compatible CustomSkinLoader build was found.');

    const target = path.join(modsDir, path.basename(file.filename));
    const expected = { sha1: file.hashes?.sha1 || null, size: file.size || null };
    if (!(await artifactMatches(target, expected))) {
      fs.mkdirSync(modsDir, { recursive: true });
      await downloadFile(file.url, target, {
        retries: 3,
        expectedHashes: expected.sha1 ? { sha1: expected.sha1 } : {}
      });
    }

    if (tracker.filename && tracker.filename !== path.basename(target)) {
      const oldPath = path.join(modsDir, path.basename(tracker.filename));
      if (oldPath !== target) fs.rmSync(oldPath, { force: true });
    }
    writeFileAtomic(trackerPath, JSON.stringify({ filename: path.basename(target), version: versions[0].version_number, mcVersion }, null, 2));
    return { installed: true, filename: path.basename(target) };
  } catch (error) {
    // A wardrobe integration failure must never stop the game itself. Reuse a
    // previously installed copy when possible and expose the reason in logs.
    return { installed: Boolean(tracker.filename && fs.existsSync(path.join(modsDir, path.basename(tracker.filename)))), warning: error.message };
  }
}

function init(dependencies, ipcMain) {
  deps = dependencies;
  const profileResult = (operation) => async (...args) => {
    try { return { ok: true, profile: await operation(...args) }; }
    catch (error) { return { ok: false, error: String(error?.message || error) }; }
  };
  ipcMain.handle('wardrobe:get', (_event, account) => publicState(account));
  ipcMain.handle('wardrobe:choose', async (_event, payload) => {
    const state = await chooseTexture(payload.account, payload.kind, payload.slot, payload.model);
    syncWardrobeInBackground(payload.account);
    return state;
  });
  ipcMain.handle('wardrobe:select', (_event, { account, slot }) => {
    const metadata = loadMetadata(account);
    const index = Number(slot);
    if (!Number.isInteger(index) || index < 0 || index >= SLOT_COUNT) throw new Error('Invalid wardrobe slot.');
    metadata.selected = index;
    saveMetadata(account, metadata);
    syncWardrobeInBackground(account);
    return publicState(account);
  });
  ipcMain.handle('wardrobe:setModel', (_event, { account, slot, model }) => {
    const metadata = loadMetadata(account);
    const index = Number(slot);
    if (!Number.isInteger(index) || index < 0 || index >= SLOT_COUNT) throw new Error('Invalid wardrobe slot.');
    metadata.slots[index].model = model === 'slim' ? 'slim' : 'classic';
    saveMetadata(account, metadata);
    syncWardrobeInBackground(account);
    return publicState(account);
  });
  ipcMain.handle('wardrobe:sync', (_event, account) => syncWardrobe(account));
  ipcMain.handle('wardrobe:officialProfile', profileResult((_event, account) => officialProfile(account)));
  ipcMain.handle('wardrobe:applyOfficialSkin', profileResult((_event, { account, slot }) => applyOfficialSkin(account, slot)));
  ipcMain.handle('wardrobe:activateOfficialCape', profileResult((_event, { account, capeId }) => activateOfficialCape(account, capeId)));
}

module.exports = { init, publicState, pngInfo, prepareFabricInstance, API_ROOT };

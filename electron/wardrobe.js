const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { dialog } = require('electron');
const { downloadFile, writeFileAtomic } = require('./download');

/**
 * Locker / wardrobe storage (main process).
 *
 * Every skin and cape the player uploads is kept as a library item in
 * `{userData}/wardrobe/{accountKey}/`. One skin and one cape are *active*; the
 * active pair is what CustomSkinLoader renders in game and what gets published
 * to the Noctra wardrobe API (api.nativelaunch.xyz, see skin-server/).
 *
 * Older profiles stored three fixed "slots" (skin + cape + model each). Those
 * are migrated on read: every filled slot becomes a library item and the
 * selected slot becomes the active outfit.
 */

const API_ROOT = 'https://api.nativelaunch.xyz';

/**
 * The wardrobe API usually runs on Noctra Cloud (scripts/api.nativelaunch.xyz.nginx
 * proxies it to skin-server/server.js on port 3418). Set NATIVE_WARDROBE_API to
 * point a build at a self-hosted instance, e.g. http://127.0.0.1:3418 for the
 * server started by `npm run skin-server`.
 */
const apiRoot = () => String(process.env.NATIVE_WARDROBE_API || API_ROOT).replace(/\/+$/, '');
const SLOT_COUNT = 3; // legacy wardrobe.json
const ITEM_LIMIT = 60;
const MAX_PNG_BYTES = 5 * 1024 * 1024;
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

let deps = null;

const wardrobeRoot = () => path.join(deps.app.getPath('userData'), 'wardrobe');
const accountKey = (account) => crypto.createHash('sha256').update(String(account?.id || account?.name || 'guest')).digest('hex').slice(0, 24);
const accountDir = (account) => path.join(wardrobeRoot(), accountKey(account));
const metadataPath = (account) => path.join(accountDir(account), 'wardrobe.json');
const itemPath = (account, filename) => path.join(accountDir(account), filename);

function newSyncKey() {
  return crypto.randomBytes(24).toString('hex');
}

function emptyMetadata() {
  return { version: 2, activeSkin: null, activeCape: null, model: 'classic', items: [], syncKey: newSyncKey() };
}

/* ── items ───────────────────────────────────────────────────── */

function normalizeModel(value) {
  return value === 'slim' ? 'slim' : 'classic';
}

function cleanName(value, fallback) {
  const name = String(value || '').replace(/\s+/g, ' ').trim().slice(0, 40);
  return name || fallback;
}

function normalizeItem(raw, fallbackId) {
  if (!raw || typeof raw !== 'object') return null;
  const kind = raw.kind === 'cape' ? 'cape' : raw.kind === 'skin' ? 'skin' : null;
  if (!kind) return null;
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : fallbackId,
    kind,
    file: String(raw.file || ''),
    name: cleanName(raw.name, kind === 'cape' ? 'Cape' : 'Skin'),
    model: normalizeModel(raw.model),
    createdAt: Number(raw.createdAt) || Date.now(),
    favorite: Boolean(raw.favorite)
  };
}

/** Convert a legacy three-slot profile into library items. */
function migrateLegacy(value) {
  const metadata = emptyMetadata();
  metadata.syncKey = typeof value.syncKey === 'string' && value.syncKey.length >= 32 ? value.syncKey : metadata.syncKey;
  const slotIndex = Number.isInteger(value.selected) ? value.selected : 0;

  (value.slots || []).slice(0, SLOT_COUNT).forEach((slot, index) => {
    for (const kind of ['skin', 'cape']) {
      const file = slot?.[kind];
      if (!file) continue;
      const item = normalizeItem(
        { id: crypto.randomUUID(), kind, file, name: `Outfit ${index + 1}`, model: slot.model, createdAt: Date.now(), favorite: true },
        crypto.randomUUID()
      );
      if (!item) continue;
      metadata.items.push(item);
      if (index === slotIndex) {
        if (kind === 'skin') {
          metadata.activeSkin = item.id;
          metadata.model = item.model;
        } else {
          metadata.activeCape = item.id;
        }
      }
    }
  });

  return metadata;
}

function sanitizeMetadata(raw) {
  if (!raw || typeof raw !== 'object') return emptyMetadata();
  if (Array.isArray(raw.slots) && !Array.isArray(raw.items)) return migrateLegacy(raw);

  const metadata = emptyMetadata();
  metadata.syncKey = typeof raw.syncKey === 'string' && raw.syncKey.length >= 32 ? raw.syncKey : metadata.syncKey;
  metadata.model = normalizeModel(raw.model);
  metadata.items = (Array.isArray(raw.items) ? raw.items : [])
    .map((item, index) => normalizeItem(item, `item-${index}`))
    .filter((item) => item && item.file)
    .slice(0, ITEM_LIMIT);
  metadata.activeSkin = metadata.items.some((item) => item.id === raw.activeSkin) ? raw.activeSkin : null;
  metadata.activeCape = metadata.items.some((item) => item.id === raw.activeCape) ? raw.activeCape : null;
  return metadata;
}

function loadMetadata(account) {
  let raw = null;
  try {
    raw = JSON.parse(fs.readFileSync(metadataPath(account), 'utf8'));
  } catch {
    raw = null;
  }
  const metadata = sanitizeMetadata(raw);
  // Persist the migrated shape (and the generated sync key) on first read.
  if (!raw || raw.version !== 2) saveMetadata(account, metadata);
  return metadata;
}

function saveMetadata(account, metadata) {
  fs.mkdirSync(accountDir(account), { recursive: true });
  writeFileAtomic(metadataPath(account), JSON.stringify({ ...metadata, version: 2 }, null, 2));
}

const findItem = (metadata, id) => metadata.items.find((item) => item.id === id) || null;
const activeItem = (metadata, kind) => findItem(metadata, kind === 'skin' ? metadata.activeSkin : metadata.activeCape);

/* ── PNG validation ──────────────────────────────────────────── */

function pngInfoBuffer(buffer, label = 'PNG') {
  if (!buffer || buffer.length <= 24) throw new Error(`The selected ${label} is too small.`);
  if (buffer.length > MAX_PNG_BYTES) throw new Error('Choose a PNG smaller than 5 MB.');
  if (!buffer.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error(`The selected file is not a valid ${label}.`);
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  if (!width || !height || width > 4096 || height > 4096) throw new Error('The PNG dimensions are not supported.');
  return { width, height, size: buffer.length };
}

function pngInfo(filePath) {
  const buffer = fs.readFileSync(filePath);
  const info = pngInfoBuffer(buffer);
  return { ...info, buffer };
}

function decodeBase64Texture(value) {
  const raw = String(value || '').replace(/^data:image\/png;base64,/i, '');
  if (!raw) throw new Error('No texture data was received.');
  const buffer = Buffer.from(raw, 'base64');
  pngInfoBuffer(buffer);
  return buffer;
}

function dataUrl(account, file) {
  try {
    return `data:image/png;base64,${fs.readFileSync(itemPath(account, file)).toString('base64')}`;
  } catch {
    return null;
  }
}

/* ── public state ────────────────────────────────────────────── */

function publicItem(account, item, metadata) {
  return {
    id: item.id,
    kind: item.kind,
    name: item.name,
    model: item.model,
    createdAt: item.createdAt,
    favorite: item.favorite,
    ageDays: Math.max(0, Math.floor((Date.now() - item.createdAt) / 86_400_000)),
    active: (item.kind === 'skin' ? metadata.activeSkin : metadata.activeCape) === item.id,
    url: dataUrl(account, item.file)
  };
}

function publicState(account) {
  const metadata = loadMetadata(account);
  const items = metadata.items.map((item) => publicItem(account, item, metadata));
  const skin = items.find((item) => item.kind === 'skin' && item.active) || null;
  const cape = items.find((item) => item.kind === 'cape' && item.active) || null;

  return {
    version: 2,
    model: metadata.model,
    items,
    skins: items.filter((item) => item.kind === 'skin'),
    capes: items.filter((item) => item.kind === 'cape'),
    favorites: items.filter((item) => item.favorite),
    latest: [...items].sort((a, b) => b.createdAt - a.createdAt).slice(0, 12),
    // Field names kept stable for the account object and 3D viewer.
    active: {
      skinId: skin?.id || null,
      model: metadata.model,
      skinUrl: skin?.url || null,
      capeUrl: cape?.url || null,
      hasSkin: Boolean(skin),
      hasCape: Boolean(cape),
      skin,
      cape
    }
  };
}

/* ── mutations ───────────────────────────────────────────────── */

function storeItem(account, kind, buffer, { name, model, favorite = false } = {}) {
  const metadata = loadMetadata(account);
  const id = crypto.randomUUID();
  const file = `${kind}-${id.slice(0, 8)}.png`;
  fs.mkdirSync(accountDir(account), { recursive: true });
  writeFileAtomic(itemPath(account, file), buffer);

  const item = {
    id,
    kind,
    file,
    name: cleanName(name, kind === 'cape' ? 'Cape' : 'Skin'),
    model: kind === 'skin' ? normalizeModel(model) : 'classic',
    createdAt: Date.now(),
    favorite: Boolean(favorite)
  };

  metadata.items.unshift(item);
  if (kind === 'skin') {
    metadata.activeSkin = id;
    metadata.model = item.model;
  } else {
    metadata.activeCape = id;
  }

  const removed = metadata.items.splice(ITEM_LIMIT);
  for (const stale of removed) fs.rmSync(itemPath(account, stale.file), { force: true });

  saveMetadata(account, metadata);
  return publicState(account);
}

function addItemFromBase64(account, { kind, dataUrl: value, name, model }) {
  if (!account?.id) throw new Error('Sign in to use the locker.');
  if (kind !== 'skin' && kind !== 'cape') throw new Error('Invalid locker item.');
  return storeItem(account, kind, decodeBase64Texture(value), { name, model });
}

async function chooseTexture(account, kind, { name = null, model = 'classic' } = {}) {
  if (!account?.id || (kind !== 'skin' && kind !== 'cape')) throw new Error('Invalid locker request.');
  const result = await dialog.showOpenDialog({
    title: kind === 'skin' ? 'Choose Minecraft skin' : 'Choose Minecraft cape',
    properties: ['openFile'],
    filters: [{ name: 'PNG texture', extensions: ['png'] }]
  });
  if (result.canceled || !result.filePaths[0]) return publicState(account);
  const filePath = result.filePaths[0];
  const info = pngInfo(filePath);
  return storeItem(account, kind, info.buffer, {
    name: name || path.basename(filePath, path.extname(filePath)),
    model
  });
}

function applyItem(account, id) {
  const metadata = loadMetadata(account);
  const item = findItem(metadata, id);
  if (!item) throw new Error('That locker item no longer exists.');
  if (item.kind === 'skin') {
    metadata.activeSkin = item.id;
    metadata.model = item.model;
  } else {
    metadata.activeCape = item.id;
  }
  saveMetadata(account, metadata);
  return publicState(account);
}

function clearActive(account, kind) {
  const metadata = loadMetadata(account);
  if (kind === 'cape') metadata.activeCape = null;
  else metadata.activeSkin = null;
  saveMetadata(account, metadata);
  return publicState(account);
}

function setFavorite(account, id, favorite) {
  const metadata = loadMetadata(account);
  const item = findItem(metadata, id);
  if (!item) throw new Error('That locker item no longer exists.');
  item.favorite = Boolean(favorite);
  saveMetadata(account, metadata);
  return publicState(account);
}

function renameItem(account, id, name) {
  const metadata = loadMetadata(account);
  const item = findItem(metadata, id);
  if (!item) throw new Error('That locker item no longer exists.');
  item.name = cleanName(name, item.kind === 'cape' ? 'Cape' : 'Skin');
  saveMetadata(account, metadata);
  return publicState(account);
}

function setModel(account, model) {
  const metadata = loadMetadata(account);
  metadata.model = normalizeModel(model);
  const skin = activeItem(metadata, 'skin');
  if (skin) skin.model = metadata.model;
  saveMetadata(account, metadata);
  return publicState(account);
}

function removeItem(account, id) {
  const metadata = loadMetadata(account);
  const item = findItem(metadata, id);
  if (!item) return publicState(account);
  metadata.items = metadata.items.filter((entry) => entry.id !== id);
  if (metadata.activeSkin === id) metadata.activeSkin = null;
  if (metadata.activeCape === id) metadata.activeCape = null;
  saveMetadata(account, metadata);
  fs.rmSync(itemPath(account, item.file), { force: true });
  return publicState(account);
}

/* ── sync + in-game integration ──────────────────────────────── */

function readActiveBuffers(account) {
  const metadata = loadMetadata(account);
  const read = (item) => {
    if (!item) return null;
    try {
      return fs.readFileSync(itemPath(account, item.file));
    } catch {
      return null;
    }
  };
  return {
    metadata,
    skin: read(activeItem(metadata, 'skin')),
    cape: read(activeItem(metadata, 'cape'))
  };
}

async function syncWardrobe(account) {
  const { metadata, skin, cape } = readActiveBuffers(account);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  let response;
  try {
    response = await fetch(`${apiRoot()}/v1/wardrobe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${metadata.syncKey}` },
      body: JSON.stringify({
        username: account.name,
        model: metadata.model,
        skin: skin ? skin.toString('base64') : null,
        cape: cape ? cape.toString('base64') : null
      }),
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

async function minecraftRequest(account, pathname, options = {}, { forceRefresh = false } = {}) {
  const token = await deps.auth?.getMinecraftAccessToken?.(account.id, { forceRefresh });
  if (!token) {
    const err = new Error('Your Microsoft session expired. Sign in again to manage official cosmetics.');
    err.code = 'AUTH_EXPIRED';
    throw err;
  }
  const response = await fetch(`https://api.minecraftservices.com${pathname}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...(options.headers || {}) }
  });
  if (!response.ok) {
    let detail = '';
    try { detail = (await response.json())?.errorMessage || ''; } catch {}
    const err = new Error(detail || `Minecraft profile request failed (HTTP ${response.status})`);
    err.status = response.status;
    if (response.status === 401 || response.status === 403) err.code = 'AUTH_EXPIRED';
    else if (response.status === 402) err.code = 'NO_ENTITLEMENT';
    else if (response.status === 404) err.code = 'NO_PROFILE';
    throw err;
  }
  if (response.status === 204) return null;
  return response.json();
}

/**
 * Fetch the official Minecraft profile (skins + capes owned by the account).
 * If the first attempt fails with an auth / stale-token style error, retry once
 * with a forced token refresh so a re-login isn't required for the common case
 * of an expired Xbox → MC token exchange.
 */
async function officialProfile(account) {
  try {
    return await minecraftRequest(account, '/minecraft/profile');
  } catch (error) {
    if (error?.code === 'AUTH_EXPIRED' || error?.status === 402) {
      // 402 is emitted by Mojang when the current MC access token isn't
      // entitled — refreshing usually resolves it if the account actually
      // owns Minecraft.
      return minecraftRequest(account, '/minecraft/profile', {}, { forceRefresh: true });
    }
    throw error;
  }
}

async function applyOfficialSkin(account, id) {
  const metadata = loadMetadata(account);
  const item = id ? findItem(metadata, id) : activeItem(metadata, 'skin');
  if (!item?.file) throw new Error('Pick a skin from your locker before publishing it.');
  const filePath = itemPath(account, item.file);
  const form = new FormData();
  form.append('variant', item.model === 'slim' ? 'SLIM' : 'CLASSIC');
  form.append('file', new Blob([fs.readFileSync(filePath)], { type: 'image/png' }), `${item.name || 'skin'}.png`);
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

/** Save the active (or given) skin/cape PNG somewhere the user chooses. */
async function exportItem(account, id = null) {
  const metadata = loadMetadata(account);
  const item = id ? findItem(metadata, id) : activeItem(metadata, 'skin');
  if (!item?.file) throw new Error('Nothing to export yet — upload a skin first.');
  const result = await dialog.showSaveDialog({
    title: item.kind === 'cape' ? 'Save cape' : 'Save skin',
    defaultPath: `${String(item.name || item.kind).replace(/[^A-Za-z0-9 _-]/g, '')}.png`,
    filters: [{ name: 'PNG texture', extensions: ['png'] }]
  });
  if (result.canceled || !result.filePath) return { canceled: true };
  fs.copyFileSync(itemPath(account, item.file), result.filePath);
  return { ok: true, path: result.filePath, name: item.name };
}

/**
 * Prepare a Fabric instance's CustomSkinLoader folder:
 *  - the active skin/cape as LocalSkin textures,
 *  - an ExtraList entry pointing at the Noctra wardrobe API so other players
 *    (and other machines) resolve the same textures over the network,
 *  - the CustomSkinLoader mod itself, pinned to the instance's MC version.
 */
async function prepareFabricInstance(instance, account, onState = () => {}) {
  if (!instance?.id || !account?.id || account.id === 'guest') return { installed: false };
  const gameDir = path.join(deps.app.getPath('userData'), 'minecraft', 'instances', String(instance.id));
  const modsDir = path.join(gameDir, 'mods');
  const cslDir = path.join(gameDir, 'CustomSkinLoader');
  const { metadata, skin, cape } = readActiveBuffers(account);
  const username = String(account.name || 'Player').replace(/[^A-Za-z0-9_]/g, '_').slice(0, 16) || 'Player';

  const localSkin = path.join(cslDir, 'LocalSkin', 'skins', `${username}.png`);
  const localCape = path.join(cslDir, 'LocalSkin', 'capes', `${username}.png`);
  if (skin) writeFileAtomic(localSkin, skin);
  else fs.rmSync(localSkin, { force: true });
  if (cape) writeFileAtomic(localCape, cape);
  else fs.rmSync(localCape, { force: true });

  // CSL reads LocalSkin first; the API entry keeps the outfit in sync when the
  // player joins from another machine.
  writeFileAtomic(path.join(cslDir, 'ExtraList', 'NativeWardrobe.json'), JSON.stringify({
    name: 'Noctra Client Wardrobe',
    type: 'CustomSkinAPI',
    root: `${apiRoot()}/csl/`
  }, null, 2));

  const trackerPath = path.join(cslDir, '.native-loader.json');
  let tracker = {};
  try { tracker = JSON.parse(fs.readFileSync(trackerPath, 'utf8')); } catch {}

  const trackedPath = tracker.filename ? path.join(modsDir, path.basename(tracker.filename)) : null;
  const mcVersion = String(instance.version || instance.mc_version);
  if (tracker.mcVersion === mcVersion && trackedPath && fs.existsSync(trackedPath)) {
    return { installed: true, filename: path.basename(trackedPath), model: metadata.model };
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
    return { installed: true, filename: path.basename(target), model: metadata.model };
  } catch (error) {
    // A wardrobe integration failure must never stop the game itself. Reuse a
    // previously installed copy when possible and expose the reason in logs.
    return {
      installed: Boolean(tracker.filename && fs.existsSync(path.join(modsDir, path.basename(tracker.filename)))),
      warning: error.message,
      model: metadata.model
    };
  }
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

/* ── IPC ─────────────────────────────────────────────────────── */

function init(dependencies, ipcMain) {
  deps = dependencies;
  const profileResult = (operation) => async (...args) => {
    try { return { ok: true, profile: await operation(...args) }; }
    catch (error) {
      return {
        ok: false,
        error: String(error?.message || error),
        code: error?.code || null,
        status: error?.status || null
      };
    }
  };

  ipcMain.handle('wardrobe:get', (_event, account) => publicState(account));
  ipcMain.handle('wardrobe:upload', (_event, payload) => {
    const state = addItemFromBase64(payload.account, payload);
    syncWardrobeInBackground(payload.account);
    return state;
  });
  ipcMain.handle('wardrobe:choose', async (_event, payload) => {
    const state = await chooseTexture(payload.account, payload.kind, { model: payload.model });
    syncWardrobeInBackground(payload.account);
    return state;
  });
  ipcMain.handle('wardrobe:apply', (_event, { account, id }) => {
    const state = applyItem(account, id);
    syncWardrobeInBackground(account);
    return state;
  });
  ipcMain.handle('wardrobe:clearActive', (_event, { account, kind }) => {
    const state = clearActive(account, kind);
    syncWardrobeInBackground(account);
    return state;
  });
  ipcMain.handle('wardrobe:favorite', (_event, { account, id, favorite }) => setFavorite(account, id, favorite));
  ipcMain.handle('wardrobe:rename', (_event, { account, id, name }) => renameItem(account, id, name));
  ipcMain.handle('wardrobe:remove', (_event, { account, id }) => {
    const state = removeItem(account, id);
    syncWardrobeInBackground(account);
    return state;
  });
  ipcMain.handle('wardrobe:setModel', (_event, payload) => {
    // Accepts both the new { account, model } and the legacy { account, slot, model }.
    const state = setModel(payload.account, payload.model);
    syncWardrobeInBackground(payload.account);
    return state;
  });
  ipcMain.handle('wardrobe:export', (_event, { account, id }) => exportItem(account, id));
  ipcMain.handle('wardrobe:sync', (_event, account) => syncWardrobe(account));
  ipcMain.handle('wardrobe:officialProfile', profileResult((_event, account) => officialProfile(account)));
  ipcMain.handle('wardrobe:reauthOfficialProfile', profileResult(async (_event, account) => {
    // Drop any cached MC session and hit the API with a fresh Xbox → MC token.
    return minecraftRequest(account, '/minecraft/profile', {}, { forceRefresh: true });
  }));
  ipcMain.handle('wardrobe:applyOfficialSkin', profileResult((_event, { account, id }) => applyOfficialSkin(account, id)));
  ipcMain.handle('wardrobe:activateOfficialCape', profileResult((_event, { account, capeId }) => activateOfficialCape(account, capeId)));
}

module.exports = {
  init,
  publicState,
  pngInfo,
  pngInfoBuffer,
  addItemFromBase64,
  applyItem,
  clearActive,
  removeItem,
  setFavorite,
  setModel,
  exportItem,
  prepareFabricInstance,
  migrateLegacy,
  API_ROOT
};

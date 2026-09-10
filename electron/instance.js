const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const { shell } = require('electron');

/**
 * Instance filesystem helpers (main process).
 *
 * Instance game directory lives at:
 *   {userData}/minecraft/instances/{instanceId}/
 */

let deps = null;

const rootDir = () => {
  try {
    if (deps?.app?.getPath) return path.join(deps.app.getPath('userData'), 'minecraft');
  } catch {}
  return path.join(require('os').homedir(), '.config', 'Native', 'minecraft');
};
const instancesDir = () => path.join(rootDir(), 'instances');

function resolveInside(base, ...parts) {
  const root = path.resolve(base);
  const target = path.resolve(root, ...parts.map((part) => String(part ?? '')));
  const relative = path.relative(root, target);
  if (relative.startsWith('..' + path.sep) || relative === '..' || path.isAbsolute(relative)) {
    throw new Error('Invalid path outside the instance directory');
  }
  return target;
}

const instanceDir = (id) => resolveInside(instancesDir(), id);

/**
 * Fully verifies whether a Minecraft version is installed on disk,
 * including client jar (>1MB), version json, mod loader profile (if Fabric/Forge),
 * asset index json, asset objects, and libraries.
 */
function verifyInstallation(version, loader = 'Vanilla') {
  if (!version) return { installed: false, reason: 'no_version' };
  const root = rootDir();
  const versionsDir = path.join(root, 'versions');

  if (!fs.existsSync(versionsDir)) {
    return { installed: false, reason: 'no_versions_dir' };
  }

  const hasValidFile = (filePath, minBytes = 1) => {
    try {
      const st = fs.statSync(filePath);
      return st.isFile() && st.size >= minBytes;
    } catch {
      return false;
    }
  };

  // 1. Check Vanilla / Main Version files
  let targetJsonPath = null;
  let targetJarPath = null;

  const vanillaDir = path.join(versionsDir, version);
  const vanillaJson = path.join(vanillaDir, `${version}.json`);
  const vanillaJar = path.join(vanillaDir, `${version}.jar`);

  let foundLoader = false;
  let loaderJsonPath = null;
  let loaderBaseJsonPath = null;
  let loaderProfileName = null;

  if (loader && loader !== 'Vanilla') {
    const prefix = loader === 'Fabric' ? 'fabric-loader-' : loader === 'Forge' ? 'forge-' : null;
    if (prefix) {
      try {
        const entries = fs.readdirSync(versionsDir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory() && entry.name.startsWith(prefix) && entry.name.endsWith(`-${version}`)) {
            const possibleJson = path.join(versionsDir, entry.name, `${entry.name}.json`);
            const possibleJar = path.join(versionsDir, entry.name, `${entry.name}.jar`);
            if (hasValidFile(possibleJson)) {
              foundLoader = true;
              loaderJsonPath = possibleJson;
              loaderBaseJsonPath = path.join(versionsDir, entry.name, `${version}.json`);
              loaderProfileName = entry.name;
              if (hasValidFile(possibleJar, 1000000)) {
                targetJarPath = possibleJar;
              }
              break;
            }
          }
        }
      } catch {}
    }
    if (!foundLoader) {
      return { installed: false, reason: 'missing_loader', loader };
    }
  }

  // Check jar: must exist either under loader or vanilla (client jar must be > 1MB)
  if (!targetJarPath) {
    if (hasValidFile(vanillaJar, 1000000)) {
      targetJarPath = vanillaJar;
    }
  }

  if (!targetJarPath) {
    return { installed: false, reason: 'missing_client_jar' };
  }

  // minecraft-launcher-core places the vanilla metadata alongside a custom
  // Fabric profile instead of always creating versions/<mcVersion>/.
  targetJsonPath = hasValidFile(vanillaJson)
    ? vanillaJson
    : hasValidFile(loaderBaseJsonPath)
      ? loaderBaseJsonPath
      : loaderJsonPath;
  if (!targetJsonPath) {
    return { installed: false, reason: 'missing_version_json' };
  }

  // 2. Read version json
  let versionData = null;
  try {
    versionData = JSON.parse(fs.readFileSync(targetJsonPath, 'utf8'));
  } catch {
    return { installed: false, reason: 'invalid_version_json' };
  }

  // Inherit from parent vanilla JSON if needed
  if (versionData?.inheritsFrom) {
    const parentJson = path.join(versionsDir, versionData.inheritsFrom, `${versionData.inheritsFrom}.json`);
    if (hasValidFile(parentJson)) {
      try {
        const parentData = JSON.parse(fs.readFileSync(parentJson, 'utf8'));
        versionData = { ...parentData, ...versionData };
      } catch {}
    }
  }

  // 3. Asset index check
  const assetIndexId = versionData?.assetIndex?.id || versionData?.assets || version;
  const indexesDir = path.join(root, 'assets', 'indexes');
  const assetIndexFile = [
    path.join(indexesDir, `${assetIndexId}.json`),
    loaderProfileName ? path.join(indexesDir, `${loaderProfileName}.json`) : null,
    path.join(indexesDir, `${version}.json`)
  ].find((candidate) => candidate && hasValidFile(candidate, 10));

  if (!assetIndexFile) {
    return { installed: false, reason: 'missing_asset_index', assetIndexId };
  }

  let assetIndex = null;
  try {
    assetIndex = JSON.parse(fs.readFileSync(assetIndexFile, 'utf8'));
  } catch {
    return { installed: false, reason: 'invalid_asset_index', assetIndexId };
  }

  const objects = assetIndex?.objects;
  if (!objects || typeof objects !== 'object') {
    return { installed: false, reason: 'empty_asset_index' };
  }

  const objectKeys = Object.keys(objects);
  const totalAssets = objectKeys.length;
  if (totalAssets === 0) {
    return { installed: false, reason: 'no_assets_listed' };
  }

  const objectsDir = path.join(root, 'assets', 'objects');
  if (!fs.existsSync(objectsDir)) {
    return { installed: false, reason: 'missing_assets_dir', totalAssets };
  }

  // 4. Verify asset objects on disk
  let missingAssets = 0;
  for (let i = 0; i < totalAssets; i++) {
    const hash = objects[objectKeys[i]]?.hash;
    if (!hash || typeof hash !== 'string' || hash.length < 2) continue;
    const prefix = hash.slice(0, 2);
    const assetPath = path.join(objectsDir, prefix, hash);
    if (!hasValidFile(assetPath, 1)) {
      missingAssets++;
      if (missingAssets >= 3) {
        return {
          installed: false,
          reason: 'missing_assets',
          missingAssets,
          totalAssets,
          assetIndexId
        };
      }
    }
  }

  if (missingAssets > 0) {
    return {
      installed: false,
      reason: 'missing_assets',
      missingAssets,
      totalAssets,
      assetIndexId
    };
  }

  // 5. Libraries check
  const librariesDir = path.join(root, 'libraries');
  if (!fs.existsSync(librariesDir)) {
    return { installed: false, reason: 'missing_libraries_dir' };
  }

  return {
    installed: true,
    totalAssets,
    assetIndexId
  };
}

function isInstalled(version, loader) {
  try {
    return Boolean(verifyInstallation(version, loader)?.installed);
  } catch {
    return false;
  }
}

function installedVersions() {
  const root = rootDir();
  const versionsDir = path.join(root, 'versions');
  if (!fs.existsSync(versionsDir)) return [];

  const verified = [];
  const seen = new Set();
  const addVerified = (version, loader) => {
    if (!version) return;
    const key = `${version}:${loader}`;
    if (seen.has(key) || !verifyInstallation(version, loader).installed) return;
    seen.add(key);
    verified.push({ version, loader });
  };
  try {
    const entries = fs.readdirSync(versionsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      if (entry.name.startsWith('fabric-loader-') || entry.name.startsWith('forge-')) {
        // MCLC can install only the custom profile directory. Read its parent
        // version instead of requiring a separate versions/<mcVersion> folder.
        try {
          const profilePath = path.join(versionsDir, entry.name, `${entry.name}.json`);
          const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
          addVerified(profile.inheritsFrom, entry.name.startsWith('fabric-loader-') ? 'Fabric' : 'Forge');
        } catch {}
        continue;
      }
      const v = entry.name;
      addVerified(v, 'Vanilla');
      addVerified(v, 'Fabric');
      addVerified(v, 'Forge');
    }
  } catch {}
  return verified;
}

/* ── helpers ────────────────────────────────────────────────── */

function getDirSize(dirPath) {
  let total = 0;
  try {
    for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
      const full = path.join(dirPath, entry.name);
      if (entry.isDirectory()) total += getDirSize(full);
      else { try { total += fs.statSync(full).size; } catch { /* locked */ } }
    }
  } catch { /* unreadable */ }
  return total;
}

/* ── listDir ────────────────────────────────────────────────── */

function listDir(instanceId, subpath) {
  const base = resolveInside(instanceDir(instanceId), subpath);
  try {
    return fs.readdirSync(base, { withFileTypes: true })
      .filter((e) => !e.name.startsWith('.'))
      .map((e) => {
        const full = path.join(base, e.name);
        let size = 0, modified = 0;
        try { const s = fs.statSync(full); size = s.size; modified = s.mtimeMs; } catch {}
        return { name: e.name, isDir: e.isDirectory(), size, modified };
      })
      .sort((a, b) => {
        if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  } catch {
    return [];
  }
}

/* ── worldList ──────────────────────────────────────────────── */

function worldList(instanceId) {
  const savesDir = path.join(instanceDir(instanceId), 'saves');
  try {
    return fs.readdirSync(savesDir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => {
        const worldPath = path.join(savesDir, e.name);
        let modified = 0, sizeBytes = 0;
        try { modified = fs.statSync(worldPath).mtimeMs; } catch {}
        sizeBytes = getDirSize(worldPath);
        return { name: e.name, modified, sizeBytes };
      })
      .sort((a, b) => b.modified - a.modified);
  } catch {
    return [];
  }
}

/* ── getLogFile ─────────────────────────────────────────────── */

function getLogFile(instanceId) {
  const logPath = path.join(instanceDir(instanceId), 'logs', 'latest.log');
  try {
    const raw = fs.readFileSync(logPath, 'utf8');
    const lines = raw.split('\n');
    return lines.slice(-800).join('\n');
  } catch {
    return null;
  }
}

/* ── recent multiplayer servers ─────────────────────────────── */

function cleanServerAddress(raw) {
  let value = String(raw || '')
    .replace(/\u001b\[[0-9;]*m/g, '')
    .trim()
    .replace(/^\//, '')
    .replace(/[.)]+$/, '');

  const commaAddress = value.match(/^(.+?),\s*(\d{1,5})$/);
  if (commaAddress) value = `${commaAddress[1].trim()}:${commaAddress[2]}`;
  if (!value || value.length > 255 || /\s/.test(value)) return null;
  return value;
}

function logDate(fileName, modified, hours, minutes, seconds) {
  const datedName = fileName.match(/(\d{4})-(\d{2})-(\d{2})/);
  const base = datedName
    ? new Date(
      Number(datedName[1]),
      Number(datedName[2]) - 1,
      Number(datedName[3]),
      hours,
      minutes,
      seconds
    )
    : new Date(modified);

  if (!datedName) {
    base.setHours(hours, minutes, seconds, 0);
    // latest.log may cross midnight before being rotated.
    if (base.getTime() > modified + 60 * 60 * 1000) base.setDate(base.getDate() - 1);
  }
  return base.getTime();
}

function parseServerConnections(text, { fileName = 'latest.log', modified = Date.now() } = {}) {
  const connections = [];
  const timePattern = /\[(\d{2}):(\d{2}):(\d{2})\]/;
  // Capture the host token precisely (and optional ", port") instead of
  // greedily grabbing to end-of-line, so modded/client logs that append text
  // after the address (e.g. "Connecting to hypixel.net, 25565 [via proxy]")
  // are still picked up rather than rejected for containing spaces.
  const connectPattern = /\bConnecting to\s+([^\s,]+)(?:,\s*(\d{1,5}))?/i;

  for (const line of String(text || '').split(/\r?\n/)) {
    const connect = line.match(connectPattern);
    if (!connect) continue;
    const address = cleanServerAddress(connect[2] ? `${connect[1]}:${connect[2]}` : connect[1]);
    if (!address) continue;
    const time = line.match(timePattern);
    connections.push({
      address,
      connectedAt: time
        ? logDate(fileName, modified, Number(time[1]), Number(time[2]), Number(time[3]))
        : modified
    });
  }
  return connections;
}

function readInstanceNames() {
  try {
    const data = JSON.parse(fs.readFileSync(
      path.join(deps.app.getPath('userData'), 'instances.json'),
      'utf8'
    ));
    return new Map((data?.instances || []).map((instance) => [
      String(instance.id),
      String(instance.name || instance.id)
    ]));
  } catch {
    return new Map();
  }
}

function readLogText(filePath) {
  const buffer = fs.readFileSync(filePath);
  return filePath.endsWith('.gz') ? zlib.gunzipSync(buffer).toString('utf8') : buffer.toString('utf8');
}

function scanLogsDir(logsDir) {
  const found = [];
  let logFiles = [];
  try {
    logFiles = fs.readdirSync(logsDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && /(?:\.log|\.log\.gz)$/i.test(entry.name))
      .map((entry) => {
        const filePath = resolveInside(logsDir, entry.name);
        return { filePath, fileName: entry.name, stat: fs.statSync(filePath) };
      })
      .filter((file) => file.stat.size <= 16 * 1024 * 1024)
      .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs)
      .slice(0, 20);
  } catch {
    return found;
  }

  for (const file of logFiles) {
    try {
      const connections = parseServerConnections(readLogText(file.filePath), {
        fileName: file.fileName,
        modified: file.stat.mtimeMs
      });
      found.push(...connections);
    } catch {
      // A partially written or corrupt compressed log should not hide other history.
    }
  }
  return found;
}

function recentServers() {
  const names = readInstanceNames();
  let directories = [];
  try {
    directories = fs.readdirSync(instancesDir(), { withFileTypes: true })
      .filter((entry) => entry.isDirectory());
  } catch {
    directories = [];
  }

  const found = [];
  for (const directory of directories) {
    const logsDir = resolveInside(instanceDir(directory.name), 'logs');
    const instanceName = names.get(directory.name) || directory.name;
    for (const connection of scanLogsDir(logsDir)) {
      found.push({ ...connection, instanceId: directory.name, instanceName });
    }
  }

  // Safety net: some launches (or older data) write to the shared root game
  // directory instead of a per-instance one, so its logs are scanned too.
  for (const connection of scanLogsDir(path.join(rootDir(), 'logs'))) {
    found.push({ ...connection, instanceId: null, instanceName: 'Minecraft' });
  }

  const servers = new Map();
  for (const connection of found.sort((a, b) => b.connectedAt - a.connectedAt)) {
    const key = connection.address.toLowerCase();
    const existing = servers.get(key);
    if (!existing) {
      servers.set(key, { ...connection, visits: 1 });
    } else {
      existing.visits += 1;
    }
  }
  return [...servers.values()].slice(0, 8);
}

/* ── init ───────────────────────────────────────────────────── */

function init(dependencies, ipcMain) {
  deps = dependencies;

  ipcMain.handle('instance:listDir', (_e, instanceId, subpath) =>
    listDir(instanceId, subpath || '')
  );

  ipcMain.handle('instance:openFolder', (_e, instanceId, subpath) => {
    const target = resolveInside(instanceDir(instanceId), subpath || '');
    fs.mkdirSync(target, { recursive: true });
    return shell.openPath(target);
  });

  ipcMain.handle('instance:worldList', (_e, instanceId) => worldList(instanceId));

  ipcMain.handle('instance:deleteWorld', (_e, instanceId, worldName) => {
    const savesDir = resolveInside(instanceDir(instanceId), 'saves');
    const worldPath = resolveInside(savesDir, worldName);
    if (worldPath === savesDir) throw new Error('A world name is required');
    fs.rmSync(worldPath, { recursive: true, force: true });
  });

  ipcMain.handle('instance:getLogFile', (_e, instanceId) => getLogFile(instanceId));

  ipcMain.handle('instance:recentServers', () => recentServers());

  ipcMain.handle('instance:isInstalled', (_e, version, loader) => isInstalled(version, loader));
  ipcMain.handle('instance:verifyInstallation', (_e, version, loader) => verifyInstallation(version, loader));
  ipcMain.handle('instance:installedVersions', () => installedVersions());
}

module.exports = { init, resolveInside, isInstalled, verifyInstallation, installedVersions, cleanServerAddress, parseServerConnections };

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { BrowserWindow, safeStorage } = require('electron');
const { Auth } = require('msmc');

/**
 * Multi-account authentication (main process).
 *
 * Storage: accounts.json in userData
 *   { activeId: string|null, accounts: [{ id, name, uuid, type, refresh? }] }
 *
 * Automatically migrates the old single-account account.json on first run.
 */

let deps = null;
let mcSessions = {}; // id -> msmc mc token object
let activeAuthWindow = null;
let microsoftLoginPromise = null;

const appIcon = path.join(__dirname, '..', 'icon.png');

const accountsPath = () => path.join(deps.app.getPath('userData'), 'accounts.json');
const legacyPath  = () => path.join(deps.app.getPath('userData'), 'account.json');

function readAccounts() {
  try {
    const data = JSON.parse(fs.readFileSync(accountsPath(), 'utf8'));
    if (Array.isArray(data.accounts)) return data;
  } catch { /* not yet created */ }

  // Migrate legacy single-account file
  try {
    const legacy = JSON.parse(fs.readFileSync(legacyPath(), 'utf8'));
    if (legacy?.name) {
      const id = legacy.uuid || `ms-${Date.now()}`;
      const migrated = {
        activeId: id,
        accounts: [{ id, name: legacy.name, uuid: legacy.uuid, type: 'microsoft', refresh: legacy.refresh }]
      };
      saveAccounts(migrated);
      return migrated;
    }
  } catch { /* no legacy either */ }

  return { activeId: null, accounts: [] };
}

function saveAccounts(data) {
  const protectedData = {
    ...data,
    accounts: (data.accounts || []).map((account) => ({
      ...account,
      refresh: protectRefresh(account.refresh)
    }))
  };
  fs.writeFileSync(accountsPath(), JSON.stringify(protectedData, null, 2));
}

function protectRefresh(refresh) {
  if (!refresh || (typeof refresh === 'string' && refresh.startsWith('safe:v1:'))) return refresh;
  try {
    if (safeStorage?.isEncryptionAvailable?.()) {
      return `safe:v1:${safeStorage.encryptString(JSON.stringify(refresh)).toString('base64')}`;
    }
  } catch {}
  return refresh;
}

function revealRefresh(refresh) {
  if (typeof refresh !== 'string' || !refresh.startsWith('safe:v1:')) return refresh;
  try {
    return JSON.parse(safeStorage.decryptString(Buffer.from(refresh.slice(8), 'base64')));
  } catch {
    throw new Error('The encrypted Microsoft session could not be unlocked on this computer.');
  }
}

function microsoftAuthCode(authManager) {
  return new Promise((resolve, reject) => {
    const parent = deps?.getWin?.();
    const authWindow = new BrowserWindow({
      width: 520,
      height: 720,
      minWidth: 440,
      minHeight: 560,
      parent: parent && !parent.isDestroyed() ? parent : undefined,
      modal: false,
      frame: true,
      show: false,
      center: true,
      resizable: true,
      maximizable: false,
      fullscreenable: false,
      backgroundColor: '#f4f4f4',
      icon: appIcon,
      title: 'Sign in to Microsoft — Noctra Client',
      autoHideMenuBar: true,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        spellcheck: false,
        partition: 'persist:native-microsoft-auth'
      }
    });

    activeAuthWindow = authWindow;

    let settled = false;
    const complete = (error, code) => {
      if (settled) return false;
      settled = true;
      if (error) reject(error);
      else resolve(code);
      if (!authWindow.isDestroyed()) authWindow.close();
      return true;
    };

    const inspectRedirect = (url) => {
      if (!url?.startsWith(authManager.token.redirect)) return false;

      try {
        const callback = new URL(url);
        const code = callback.searchParams.get('code');
        if (code) return complete(null, code);

        const detail = callback.searchParams.get('error_description')
          || callback.searchParams.get('error')
          || 'Microsoft sign-in was not completed.';
        return complete(new Error(detail));
      } catch {
        return complete(new Error('Microsoft returned an invalid sign-in response.'));
      }
    };

    authWindow.on('closed', () => {
      if (activeAuthWindow === authWindow) activeAuthWindow = null;
      if (!settled) {
        settled = true;
        reject(new Error('Microsoft sign-in cancelled.'));
      }
    });

    authWindow.once('ready-to-show', () => {
      if (!authWindow.isDestroyed()) authWindow.show();
    });

    const contents = authWindow.webContents;
    contents.on('will-redirect', (event, url) => {
      if (inspectRedirect(url)) event.preventDefault();
    });
    contents.on('did-navigate', (_event, url) => inspectRedirect(url));
    contents.on('did-finish-load', () => inspectRedirect(contents.getURL()));
    contents.on('did-fail-load', (_event, errorCode, description, url, isMainFrame) => {
      // Chromium reports an aborted load while an OAuth redirect is being intercepted.
      if (!isMainFrame || errorCode === -3 || inspectRedirect(url)) return;
      complete(new Error(`Could not load Microsoft sign-in: ${description}`));
    });

    authWindow.loadURL(authManager.createLink()).catch((error) => {
      // Redirect interception can reject loadURL after the login has already completed.
      if (!settled) complete(error);
    });
  });
}

async function performMicrosoftLogin() {
  const authManager = new Auth('select_account');
  const code = await microsoftAuthCode(authManager);
  const xbox = await authManager.login(code);
  const mc = await xbox.getMinecraft();

  const id = mc.profile?.id || `ms-${Date.now()}`;
  const profile = { name: mc.profile?.name, uuid: mc.profile?.id };

  mcSessions[id] = mc;

  const data = readAccounts();
  // Replace if same uuid already exists (re-auth)
  data.accounts = data.accounts.filter(a => a.id !== id);
  data.accounts.push({ id, name: profile.name, uuid: profile.uuid, type: 'microsoft', refresh: xbox.save() });
  data.activeId = id;
  saveAccounts(data);

  return { id, ...profile };
}

async function loginMicrosoft() {
  if (microsoftLoginPromise) {
    if (activeAuthWindow && !activeAuthWindow.isDestroyed()) {
      activeAuthWindow.show();
      activeAuthWindow.focus();
    }
    return microsoftLoginPromise;
  }

  microsoftLoginPromise = performMicrosoftLogin();
  try {
    return await microsoftLoginPromise;
  } finally {
    microsoftLoginPromise = null;
  }
}

async function getMinecraftSession(accountId, { forceRefresh = false } = {}) {
  try {
    const { accounts, activeId } = readAccounts();
    const targetId = typeof accountId === 'object' ? (accountId?.id || accountId?.uuid) : accountId;
    const acc = accounts.find(a => 
      a.id === (targetId || activeId) || 
      (targetId && a.uuid === targetId) || 
      (targetId && a.name?.toLowerCase() === targetId?.toLowerCase())
    );
    if (!acc || acc.type !== 'microsoft') return null;

    if (forceRefresh) {
      delete mcSessions[acc.id];
    }

    const cached = mcSessions[acc.id];
    if (cached && (typeof cached.validate !== 'function' || cached.validate())) {
      return cached;
    }

    if (!acc.refresh) return null;

    const authManager = new Auth('select_account');
    const xbox = await authManager.refresh(revealRefresh(acc.refresh));
    const mc = await xbox.getMinecraft();
    mcSessions[acc.id] = mc;

    const data = readAccounts();
    const idx = data.accounts.findIndex(a => a.id === acc.id);
    if (idx >= 0) {
      data.accounts[idx].refresh = xbox.save();
      data.accounts[idx].name = mc.profile?.name;
      data.accounts[idx].uuid = mc.profile?.id;
      saveAccounts(data);
    }

    return mc;
  } catch {
    return null;
  }
}

/** MCLC-compatible auth for the current active account. Returns null if not an MS account or token expired. */
async function getMclcAuth() {
  const mc = await getMinecraftSession();
  return mc?.mclc?.() || null;
}

async function getMinecraftAccessToken(accountId, options = {}) {
  const mc = await getMinecraftSession(accountId, options);
  return mc?.mclc?.().access_token || null;
}

async function getMinecraftProfile(accountId, options = {}) {
  const mc = await getMinecraftSession(accountId, options);
  if (mc?.profile) {
    return mc.profile;
  }
  return null;
}

function init(dependencies, ipcMain) {
  deps = dependencies;

  ipcMain.on('auth-window:minimize', (event) => {
    const target = BrowserWindow.fromWebContents(event.sender);
    if (target && target === activeAuthWindow) target.minimize();
  });

  ipcMain.on('auth-window:close', (event) => {
    const target = BrowserWindow.fromWebContents(event.sender);
    if (target && target === activeAuthWindow) target.close();
  });

  // ── Legacy single-account handlers (kept for backward compat) ──────────

  ipcMain.handle('auth:login', async () => {
    try {
      const profile = await loginMicrosoft();
      return { ok: true, profile };
    } catch (err) {
      return { ok: false, error: String(err?.message ?? err) };
    }
  });

  ipcMain.handle('auth:restore', () => {
    const { accounts, activeId } = readAccounts();
    const acc = accounts.find(a => a.id === activeId);
    return acc ? { name: acc.name, uuid: acc.uuid } : null;
  });

  ipcMain.handle('auth:logout', () => {
    const data = readAccounts();
    const id = data.activeId;
    if (id) {
      delete mcSessions[id];
      data.accounts = data.accounts.filter(a => a.id !== id);
      data.activeId = data.accounts[0]?.id ?? null;
      saveAccounts(data);
    }
    return true;
  });

  // ── Multi-account handlers ─────────────────────────────────────────────

  ipcMain.handle('accounts:list', () => {
    const { accounts, activeId } = readAccounts();
    return {
      activeId,
      // never send refresh tokens to the renderer
      accounts: accounts.map(({ refresh: _r, ...rest }) => rest)
    };
  });

function generateOfflinePlayerUuid(username) {
  const md5 = crypto.createHash('md5').update(`OfflinePlayer:${username}`).digest();
  md5[6] = (md5[6] & 0x0f) | 0x30; // version 3
  md5[8] = (md5[8] & 0x3f) | 0x80; // variant 2
  const hex = md5.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

  ipcMain.handle('accounts:addNative', (_event, payload) => {
    const rawName = typeof payload === 'string' ? payload : payload?.name;
    const name = String(rawName || '').trim();
    const model = payload?.model === 'slim' ? 'slim' : 'classic';
    if (!name) return { ok: false, error: 'Name is required' };
    const data = readAccounts();
    const id = `native-${crypto.randomBytes(4).toString('hex')}`;
    const uuid = generateOfflinePlayerUuid(name);
    const account = { id, name, uuid, type: 'noctra', model };
    data.accounts.push(account);
    data.activeId = id;
    saveAccounts(data);
    return { ok: true, account };
  });

  const authFetch = async (endpoint, payload) => {
    const root = String(process.env.NATIVE_WARDROBE_API || 'https://api.nativelaunch.xyz').replace(/\/+$/, '');
    const options = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    };
    try {
      const res = await fetch(`${root}${endpoint}`, options);
      return await res.json();
    } catch (err) {
      try {
        const localRes = await fetch(`http://127.0.0.1:3418${endpoint}`, options);
        return await localRes.json();
      } catch {
        return { ok: false, error: 'Could not connect to Noctra Auth server.' };
      }
    }
  };

  ipcMain.handle('accounts:noctraSendCode', async (_event, payload) => {
    return authFetch('/v1/auth/register/send-code', payload);
  });

  ipcMain.handle('accounts:noctraResendCode', async (_event, payload) => {
    return authFetch('/v1/auth/resend-code', payload);
  });

  ipcMain.handle('accounts:noctraVerifyRegister', async (_event, payload) => {
    const res = await authFetch('/v1/auth/register/verify', payload);
    if (res?.ok && res?.account) {
      const data = readAccounts();
      const account = {
        id: res.account.id,
        name: res.account.name,
        email: res.account.email,
        uuid: res.account.uuid,
        type: 'noctra',
        model: res.account.model || 'classic',
        token: res.token
      };
      data.accounts = data.accounts.filter(a => a.id !== account.id && a.email !== account.email);
      data.accounts.push(account);
      data.activeId = account.id;
      saveAccounts(data);
      return { ok: true, account };
    }
    return res;
  });

  ipcMain.handle('accounts:noctraLogin', async (_event, payload) => {
    const res = await authFetch('/v1/auth/login', payload);
    if (res?.ok && res?.account) {
      const data = readAccounts();
      const account = {
        id: res.account.id,
        name: res.account.name,
        email: res.account.email,
        uuid: res.account.uuid,
        type: 'noctra',
        model: res.account.model || 'classic',
        token: res.token
      };
      data.accounts = data.accounts.filter(a => a.id !== account.id && a.email !== account.email);
      data.accounts.push(account);
      data.activeId = account.id;
      saveAccounts(data);
      return { ok: true, account };
    }
    return res;
  });

  ipcMain.handle('accounts:addOffline', (_event, name) => {
    if (!name?.trim()) return { ok: false, error: 'Name is required' };
    const cleanName = name.trim();
    const data = readAccounts();
    const id = `offline-${crypto.randomBytes(4).toString('hex')}`;
    const uuid = generateOfflinePlayerUuid(cleanName);
    const account = { id, name: cleanName, uuid, type: 'offline' };
    data.accounts.push(account);
    if (!data.activeId) data.activeId = id;
    saveAccounts(data);
    return { ok: true, account };
  });

  ipcMain.handle('accounts:addMicrosoft', async () => {
    try {
      const profile = await loginMicrosoft();
      return { ok: true, profile };
    } catch (err) {
      return { ok: false, error: String(err?.message ?? err) };
    }
  });

  ipcMain.handle('accounts:getAvatar', async (_event, uuid) => {
    const avatarUuid = uuid || 'MHF_Steve';
    const avatarsDir = path.join(deps.app.getPath('userData'), 'avatars');
    const targetPath = path.join(avatarsDir, `${avatarUuid}.png`);

    if (!fs.existsSync(targetPath)) {
      try {
        fs.mkdirSync(avatarsDir, { recursive: true });
        const url = `https://mc-heads.net/avatar/${avatarUuid}/100`;
        const res = await fetch(url);
        if (res.ok) {
          const buffer = Buffer.from(await res.arrayBuffer());
          fs.writeFileSync(targetPath, buffer);
        } else {
          return `https://mc-heads.net/avatar/${avatarUuid}/100`;
        }
      } catch (err) {
        return `https://mc-heads.net/avatar/${avatarUuid}/100`;
      }
    }

    try {
      const data = fs.readFileSync(targetPath);
      return `data:image/png;base64,${data.toString('base64')}`;
    } catch {
      return `https://mc-heads.net/avatar/${avatarUuid}/100`;
    }
  });

  ipcMain.handle('accounts:setActive', (_event, id) => {
    const data = readAccounts();
    if (!data.accounts.find(a => a.id === id)) return false;
    data.activeId = id;
    saveAccounts(data);
    return true;
  });

  ipcMain.handle('accounts:remove', (_event, id) => {
    const data = readAccounts();
    delete mcSessions[id];
    data.accounts = data.accounts.filter(a => a.id !== id);
    if (data.activeId === id) data.activeId = data.accounts[0]?.id ?? null;
    saveAccounts(data);
    return true;
  });
}

module.exports = { init, getMclcAuth, getMinecraftAccessToken, getMinecraftProfile };

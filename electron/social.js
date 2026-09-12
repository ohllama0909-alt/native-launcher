const path = require('path');
const fs = require('fs');

/**
 * Noctra Social & Friends System (Main Process).
 *
 * Provides:
 * - Real-time rich presence & server join reporting
 * - Friends list, request handling, direct messaging, and blocking
 * - Local fallback caching for instant frame-1 rendering
 * - Strict authentication against Noctra accounts only
 */

let deps = null;
let heartbeatInterval = null;
let currentPresence = {
  status: 'in-launcher',
  activity: 'In Launcher',
  serverAddress: null
};

const cachePath = () => path.join(deps.app.getPath('userData'), 'social-cache.json');

function readCache() {
  try {
    return JSON.parse(fs.readFileSync(cachePath(), 'utf8'));
  } catch {
    return { friends: [], requests: { received: [], sent: [] }, messages: {} };
  }
}

function writeCache(updater) {
  try {
    const current = readCache();
    const updated = typeof updater === 'function' ? updater(current) : { ...current, ...updater };
    fs.writeFileSync(cachePath(), JSON.stringify(updated, null, 2));
  } catch {}
}

function getActiveNoctraAccount() {
  try {
    const accountsPath = path.join(deps.app.getPath('userData'), 'accounts.json');
    if (!fs.existsSync(accountsPath)) return null;
    const data = JSON.parse(fs.readFileSync(accountsPath, 'utf8'));
    const active = (data.accounts || []).find(a => a.id === data.activeId);
    if (active && active.type === 'noctra' && (active.token || active.sessionToken)) {
      return active;
    }
  } catch {}
  return null;
}

async function socialFetch(endpoint, { method = 'GET', body = null, token = null } = {}) {
  const account = getActiveNoctraAccount();
  const authToken = token || account?.token || account?.sessionToken;
  if (!authToken) {
    return { ok: false, error: 'No active Noctra account session found.' };
  }

  const root = String(process.env.NATIVE_WARDROBE_API || 'https://api.nativelaunch.xyz').replace(/\/+$/, '');
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`
  };

  const reqOptions = {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  };

  try {
    const res = await fetch(`${root}${endpoint}`, reqOptions);
    return await res.json();
  } catch (remoteErr) {
    try {
      const localRes = await fetch(`http://127.0.0.1:3418${endpoint}`, reqOptions);
      return await localRes.json();
    } catch {
      return { ok: false, error: 'Could not connect to Noctra Social service.' };
    }
  }
}

function sendToWindow(channel, payload) {
  const win = deps?.getWin?.();
  if (win && !win.isDestroyed()) {
    win.webContents.send(channel, payload);
  }
}

function setPresence({ status, activity, serverAddress = null }) {
  currentPresence = {
    status: status || currentPresence.status,
    activity: activity || currentPresence.activity,
    serverAddress: serverAddress !== undefined ? serverAddress : currentPresence.serverAddress
  };

  sendToWindow('social:presenceUpdated', currentPresence);

  const account = getActiveNoctraAccount();
  if (account?.token) {
    socialFetch('/v1/social/presence', {
      method: 'POST',
      body: currentPresence
    }).catch(() => {});
  }
}

function getPresence() {
  return currentPresence;
}

function init(dependencies, ipcMain) {
  deps = dependencies;

  // Start background presence heartbeat
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  heartbeatInterval = setInterval(() => {
    const account = getActiveNoctraAccount();
    if (account?.token) {
      socialFetch('/v1/social/presence', {
        method: 'POST',
        body: currentPresence
      }).catch(() => {});
    }
  }, 30_000);

  ipcMain.handle('social:getFriends', async () => {
    const cache = readCache();
    const res = await socialFetch('/v1/social/friends');
    if (res?.ok && Array.isArray(res.friends)) {
      writeCache(c => ({ ...c, friends: res.friends }));
      return { ok: true, friends: res.friends };
    }
    return { ok: false, friends: cache.friends || [], error: res?.error };
  });

  ipcMain.handle('social:getRequests', async () => {
    const cache = readCache();
    const res = await socialFetch('/v1/social/requests');
    if (res?.ok && res.requests) {
      writeCache(c => ({ ...c, requests: res.requests }));
      return { ok: true, requests: res.requests };
    }
    return { ok: false, requests: cache.requests || { received: [], sent: [] }, error: res?.error };
  });

  ipcMain.handle('social:sendRequest', async (_event, targetUsername) => {
    return await socialFetch('/v1/social/requests/send', {
      method: 'POST',
      body: { username: targetUsername }
    });
  });

  ipcMain.handle('social:respondRequest', async (_event, { requestId, action }) => {
    return await socialFetch('/v1/social/requests/respond', {
      method: 'POST',
      body: { requestId, action }
    });
  });

  ipcMain.handle('social:getMessages', async (_event, { friendId, limit = 50 }) => {
    const res = await socialFetch(`/v1/social/messages/${encodeURIComponent(friendId)}?limit=${limit}`);
    return res;
  });

  ipcMain.handle('social:sendMessage', async (_event, { friendId, content }) => {
    return await socialFetch(`/v1/social/messages/${encodeURIComponent(friendId)}`, {
      method: 'POST',
      body: { content }
    });
  });

  ipcMain.handle('social:updateFriend', async (_event, { friendId, isBestFriend, nickname }) => {
    return await socialFetch('/v1/social/friends/update', {
      method: 'POST',
      body: { friendId, isBestFriend, nickname }
    });
  });

  ipcMain.handle('social:unfriend', async (_event, friendId) => {
    return await socialFetch(`/v1/social/friends/${encodeURIComponent(friendId)}`, {
      method: 'DELETE'
    });
  });

  ipcMain.handle('social:block', async (_event, targetId) => {
    return await socialFetch('/v1/social/block', {
      method: 'POST',
      body: { targetId }
    });
  });

  ipcMain.handle('social:searchUsers', async (_event, query) => {
    return await socialFetch(`/v1/social/search?q=${encodeURIComponent(query)}`);
  });

  ipcMain.handle('social:getPresence', () => {
    return currentPresence;
  });

  ipcMain.handle('social:setPresence', (_event, payload) => {
    setPresence(payload);
    return currentPresence;
  });
}

module.exports = {
  init,
  setPresence,
  getPresence,
  getActiveNoctraAccount
};

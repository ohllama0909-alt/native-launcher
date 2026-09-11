const { contextBridge, ipcRenderer } = require('electron');

// Set by main.js via webPreferences.additionalArguments.
const versionArg = process.argv.find((arg) => arg.startsWith('--app-version='));

contextBridge.exposeInMainWorld('native', {
  version: versionArg ? versionArg.slice('--app-version='.length) : null,
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
  openExternal: (url) => ipcRenderer.invoke('external:open', url),
  onMaximizedChange: (callback) =>
    ipcRenderer.on('window:maximized', (_event, isMaximized) => callback(isMaximized)),
  instances: {
    load: () => ipcRenderer.invoke('instances:load'),
    save: (data) => ipcRenderer.invoke('instances:save', data)
  },
  auth: {
    login: () => ipcRenderer.invoke('auth:login'),
    restore: () => ipcRenderer.invoke('auth:restore'),
    logout: () => ipcRenderer.invoke('auth:logout')
  },
  accounts: {
    list:         ()     => ipcRenderer.invoke('accounts:list'),
    addOffline:   (name) => ipcRenderer.invoke('accounts:addOffline', name),
    addMicrosoft: ()     => ipcRenderer.invoke('accounts:addMicrosoft'),
    setActive:    (id)   => ipcRenderer.invoke('accounts:setActive', id),
    remove:       (id)   => ipcRenderer.invoke('accounts:remove', id),
    getAvatar:    (uuid) => ipcRenderer.invoke('accounts:getAvatar', uuid)
  },
  wardrobe: {
    get: (account) => ipcRenderer.invoke('wardrobe:get', account),
    // `dataUrl` accepts a raw base64 string or a data: URL from a dropped file.
    upload: (account, kind, dataUrl, options = {}) =>
      ipcRenderer.invoke('wardrobe:upload', { account, kind, dataUrl, ...options }),
    choose: (payload) => ipcRenderer.invoke('wardrobe:choose', payload),
    apply: (account, id) => ipcRenderer.invoke('wardrobe:apply', { account, id }),
    clearActive: (account, kind) => ipcRenderer.invoke('wardrobe:clearActive', { account, kind }),
    favorite: (account, id, favorite) => ipcRenderer.invoke('wardrobe:favorite', { account, id, favorite }),
    rename: (account, id, name) => ipcRenderer.invoke('wardrobe:rename', { account, id, name }),
    remove: (account, id) => ipcRenderer.invoke('wardrobe:remove', { account, id }),
    setModel: (account, model) => ipcRenderer.invoke('wardrobe:setModel', { account, model }),
    export: (account, id) => ipcRenderer.invoke('wardrobe:export', { account, id }),
    sync: (account) => ipcRenderer.invoke('wardrobe:sync', account),
    officialProfile: (account) => ipcRenderer.invoke('wardrobe:officialProfile', account),
    reauthOfficialProfile: (account) => ipcRenderer.invoke('wardrobe:reauthOfficialProfile', account),
    applyOfficialSkin: (account, id) => ipcRenderer.invoke('wardrobe:applyOfficialSkin', { account, id }),
    activateOfficialCape: (account, capeId) => ipcRenderer.invoke('wardrobe:activateOfficialCape', { account, capeId })
  },
  settings: {
    load: () => ipcRenderer.invoke('settings:load'),
    save: (settings) => ipcRenderer.invoke('settings:save', settings),
    detectJava: () => ipcRenderer.invoke('settings:detectJava'),
    dataDir: () => ipcRenderer.invoke('settings:dataDir'),
    openDataDir: () => ipcRenderer.invoke('settings:openDataDir'),
    storageInfo: () => ipcRenderer.invoke('settings:storageInfo')
  },
  java: {
    test: (javaPath) => ipcRenderer.invoke('java:test', javaPath),
    detectFor: (major) => ipcRenderer.invoke('java:detectFor', major),
    install: (major) => ipcRenderer.invoke('java:install', major),
    browse: () => ipcRenderer.invoke('java:browse'),
    onProgress: (callback) => subscribe('java:progress', callback)
  },
  mods: {
    installed: (instanceId) => ipcRenderer.invoke('mods:installed', instanceId),
    install: (payload) => ipcRenderer.invoke('mods:install', payload),
    remove: (payload) => ipcRenderer.invoke('mods:remove', payload)
  },
  modpacks: {
    install: (projectId) => ipcRenderer.invoke('modpack:install', projectId),
    onProgress: (callback) => subscribe('modpack:progress', callback)
  },
  launcher: {
    launch: (instance, account) =>
      ipcRenderer.send('launcher:launch', { instance, account }),
    kill: () => ipcRenderer.send('launcher:kill'),
    onState: (callback) => subscribe('launcher:state', callback),
    onProgress: (callback) => subscribe('launcher:progress', callback),
    onLog: (callback) => subscribe('launcher:log', callback)
  },
  updater: {
    status: () => ipcRenderer.invoke('updater:status'),
    check: () => ipcRenderer.invoke('updater:check'),
    download: () => ipcRenderer.invoke('updater:download'),
    cancel: () => ipcRenderer.invoke('updater:cancel'),
    install: () => ipcRenderer.invoke('updater:install'),
    onStatus: (callback) => subscribe('updater:status', callback)
  },
  instance: {
    listDir:     (id, sub)  => ipcRenderer.invoke('instance:listDir', id, sub),
    openFolder:  (id, sub)  => ipcRenderer.invoke('instance:openFolder', id, sub),
    worldList:   (id)       => ipcRenderer.invoke('instance:worldList', id),
    deleteWorld: (id, name) => ipcRenderer.invoke('instance:deleteWorld', id, name),
    getLogFile:  (id)       => ipcRenderer.invoke('instance:getLogFile', id),
    isInstalled: (version, loader) => ipcRenderer.invoke('instance:isInstalled', version, loader),
    verifyInstallation: (version, loader) => ipcRenderer.invoke('instance:verifyInstallation', version, loader),
    installedVersions: ()       => ipcRenderer.invoke('instance:installedVersions'),
    recentServers: ()       => ipcRenderer.invoke('instance:recentServers')
  },
  news: {
    list: (options) => ipcRenderer.invoke('news:list', options)
  },
  server: {
    ping: (address) => ipcRenderer.invoke('server:ping', address)
  }
});

function subscribe(channel, callback) {
  const listener = (_event, payload) => callback(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

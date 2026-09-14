// Isolated Electron integration test. IPC fixtures never touch a user's library.
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const assert = require('node:assert/strict');
app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'noctra-ui-test-')));
app.commandLine.appendSwitch('disable-dev-shm-usage');
const instance = { id: 'visual-121', name: 'Tricky Trials', version: '1.21.7', mc_version: '1.21.7', loader: 'Fabric', mc_loader: 'Fabric', created: Date.now(), overrides: { resolution: { enabled: true, width: 1920, height: 1080 }, memory: { enabled: true, min: 1, max: 6 } } };
let library = { instances: [instance], selectedId: instance.id };
let manifest = Object.fromEntries(['Litematica', 'Mod Menu', 'Inventory Profiles Next', 'Chat Patches', 'FerriteCore'].map((title, i) => [String(i), { filename: `mod-${i}.jar`, folder: 'mods', metadata: { title, author: ['masa', 'Terraformers', 'blackd', 'OBro1961', 'malte0811'][i], version: ['0.26.3', '17.0.0', '2.3.1', '8.0-alpha.8', '8.2.0'][i] } }]));
let failWorlds = false, failSave = false;
const handles = {
  'instances:load': () => library,
  'instances:save': (_e, next) => { if (failSave) throw new Error('Test disk failure'); library = next; return true; },
  'settings:load': () => ({ onboarding: { completed: true, language: 'en' }, memory: { min: 1, max: 4 }, resolution: { width: 854, height: 480, fullscreen: false } }),
  'settings:systemMemory': () => ({ totalGb: 32 }), 'settings:save': () => true,
  'accounts:list': () => ({ accounts: [{ id: 'acc-1', name: 'Noctra', type: 'offline' }], activeId: 'acc-1' }),
  'wardrobe:get': () => ({ active: null, skins: [], capes: [] }), 'wardrobe:sync': () => ({ ok: true }),
  'wardrobe:avatar': () => null,
  'instance:installedVersions': () => [{ version: '1.21.7', loader: 'Fabric' }], 'instance:isInstalled': () => true,
  'instance:worldList': async () => { await new Promise(r => setTimeout(r, 180)); if (failWorlds) throw new Error('Test world read failure'); return [{ name: 'Survival Kingdom', modified: Date.now() - 86400000, sizeBytes: 73400320 }, { name: 'Redstone Lab', modified: Date.now() - 604800000, sizeBytes: 18874368 }]; },
  'mods:installed': () => manifest,
  'mods:toggle': (_e, { projectId, enabled }) => { manifest[projectId].filename = manifest[projectId].filename.replace(/\.disabled$/, '') + (enabled ? '' : '.disabled'); return manifest; },
  'instance:listDir': (_e, _id, folder) => folder === 'mods' ? Object.values(manifest).map(mod => ({ name: mod.filename, size: 1820000 })) : [],
  'instance:openFolder': () => true,
  'settings:dataDir': () => '/tmp/noctra', 'news:list': () => ({ items: [] }), 'updater:status': () => ({ type: 'idle' }),
  'social:getFriends': () => ({ friends: [] }), 'social:getRequests': () => ({ incoming: [], outgoing: [] }), 'social:getConversations': () => ({})
};
for (const [name, fn] of Object.entries(handles)) ipcMain.handle(name, fn);
for (const name of ['window:minimize', 'window:maximize', 'window:close']) ipcMain.on(name, () => {});
const pause = (ms = 250) => new Promise(resolve => setTimeout(resolve, ms));
app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1200, height: 675, frame: false, show: true, backgroundColor: '#060305', webPreferences: { preload: path.join(__dirname, '../electron/preload.js'), sandbox: true, contextIsolation: true, nodeIntegration: false } });
  const js = code => win.webContents.executeJavaScript(code);
  const click = selector => js(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) throw new Error('Missing control: ' + ${JSON.stringify(selector)}); el.click(); })()`);
  const input = (selector, value) => js(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  const screenshot = async name => { await pause(); fs.writeFileSync(path.join(__dirname, `../screenshot-instance-${name}.png`), (await win.webContents.capturePage()).toPNG()); };
  try {
    await win.loadFile(path.join(__dirname, '../dist/index.html')); await pause(1500);
    await js(`Array.from(document.querySelectorAll('.rail-btn')).find(b => (b.getAttribute('aria-label') || '').toLowerCase().includes('instances')).click()`); await pause();
    await js(`document.querySelector('.instance-card').focus()`);
    await click('.instance-card'); await pause(500);
    assert.equal(await js(`!!document.querySelector('[role="dialog"].instance-manager')`), true);
    assert.equal(await js(`document.getElementById('root').inert && !!document.querySelector('.instance-card')`), true, 'Underlying page stays mounted and inert');
    const geom = await js(`(() => { const r = document.querySelector('.instance-manager').getBoundingClientRect(); return [r.width, r.height]; })()`);
    assert.equal(geom[0] >= 900 && geom[1] >= 550, true, `Dialog is large and spacious: ${geom[0]}x${geom[1]}`);
    await screenshot('manager');
    await click('[aria-label="Enable Litematica"]'); await pause();
    assert.equal(manifest['0'].filename.endsWith('.disabled'), true);
    await click('[aria-label="Show enabled mods only"]'); await pause();
    assert.equal(await js(`document.querySelectorAll('.im-file-row').length`), 4);
    await click('.im-nav-worlds'); await screenshot('worlds-loading'); await pause(300); await screenshot('worlds');
    failWorlds = true; await click('.im-nav-mods'); await click('.im-nav-worlds'); await pause(400);
    assert.match(await js(`document.querySelector('.im-error').textContent`), /Test world read failure/);
    failWorlds = false; await click('.im-error button'); await pause(400);
    await click('.im-nav-settings'); await screenshot('advanced');
    await input('[aria-label="Window width"]', ''); await input('[aria-label="Window width"]', '1600');
    assert.equal(await js(`document.querySelector('[aria-label="Window height"]').value`), '900');
    await js(`window.confirm = () => false; undefined`);
    await click('.im-close');
    assert.equal(await js(`!!document.querySelector('.instance-manager')`), true, 'Unsaved changes block accidental dismissal');
    await click('.im-nav-worlds'); await click('.im-nav-settings');
    assert.equal(await js(`document.querySelector('[aria-label="Window width"]').value`), '1600', 'Draft survives tab changes');
    failSave = true; await click('.im-settings-footer button'); await pause();
    assert.match(await js(`document.querySelector('.im-settings-footer').textContent`), /Test disk failure/);
    failSave = false; await click('.im-settings-footer button'); await pause();
    assert.equal(library.instances[0].overrides.resolution.width, 1600, 'Save persisted through IPC');
    await click('.im-close'); await pause();
    assert.equal(await js(`document.getElementById('root').inert`), false);
    assert.equal(await js(`document.activeElement.classList.contains('instance-card')`), true, 'Focus restored');
    await click('.instance-card'); await pause(); await click('.im-nav-settings');
    assert.equal(await js(`document.querySelector('[aria-label="Window width"]').value`), '1600', 'Saved values survive reopening');
    assert.equal(await js(`document.querySelector('.im-java-field input').matches(':disabled')`), true, 'Disabled JVM controls cannot be edited by keyboard');
    await js(`document.querySelector('.im-close').focus(); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }))`);
    assert.equal(await js(`document.querySelector('.instance-manager').contains(document.activeElement) && document.activeElement !== document.querySelector('.im-close')`), true, 'Keyboard focus wraps within the popup');
    await click('.im-nav-shaders'); await click('[aria-label="Browse compatible content"]'); await pause(1500);
    assert.equal(await js(`!!document.querySelector('.im-browser') && !document.querySelector('.browse-type-tabs')`), true);
    assert.match(await js(`document.querySelector('.browse-search input').placeholder`), /shader/i);
    await screenshot('browser');
    await js(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`); await pause();
    assert.equal(await js(`!!document.querySelector('.im-browser')`), false, 'Escape first returns from browser');
    win.setSize(680, 600); await pause(); await click('.im-nav-settings'); await screenshot('compact');
    assert.equal(await js(`(() => { const el = document.querySelector('.instance-manager'); return el.scrollWidth <= el.clientWidth && el.getBoundingClientRect().right <= innerWidth; })()`), true, 'No modal overflow at compact size');
    await js(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`); await pause();
    assert.equal(await js(`!!document.querySelector('.instance-manager')`), false, 'Escape closes manager');
    console.log('PASS: modal geometry, backdrop, toggle/filter, error/retry, settings editing, draft preservation, save failure/success, reopen, focus, shader browser, compact layout and Escape.');
    app.quit();
  } catch (error) { console.error(error); await screenshot('failure'); app.exit(1); }
});

/* Manual visual-regression helper: xvfb-run electron scripts/capture-ui.js */
const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

const account = { id: 'offline-preview', name: 'OhLlama', uuid: null, type: 'offline' };
const instance = { id: 'preview', name: 'Garden Awakens', version: '1.21.4', loader: 'Fabric', mc_version: '1.21.4', mc_loader: 'Fabric' };

ipcMain.handle('accounts:list', () => ({ accounts: [account], activeId: account.id }));
ipcMain.handle('settings:load', () => ({ onboarding: { completed: true, language: 'en' } }));
ipcMain.handle('instances:load', () => ({ instances: [instance], selectedId: instance.id }));
ipcMain.handle('wardrobe:get', () => ({ selected: 0, slots: [{}, {}, {}], active: {} }));
ipcMain.handle('instance:verifyInstallation', () => ({ installed: true }));
ipcMain.handle('instance:isInstalled', () => true);
ipcMain.handle('instances:save', () => true);
ipcMain.handle('settings:dataDir', () => '/tmp/native-preview');
ipcMain.handle('updater:status', () => ({ type: 'idle' }));
ipcMain.handle('mods:installed', () => ({}));

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1366,
    height: 728,
    show: true,
    webPreferences: {
      preload: path.join(__dirname, '..', 'electron', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      additionalArguments: ['--app-version=preview']
    }
  });
  await win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  await pause(2500);
  fs.writeFileSync('/tmp/native-home.png', (await win.webContents.capturePage()).toPNG());
  await win.webContents.executeJavaScript("[...document.querySelectorAll('.nav-link')].find((item) => item.textContent.includes('Wardrobe'))?.click()");
  await pause(2200);
  console.log('Visual QA route:', await win.webContents.executeJavaScript("document.querySelector('.nav-link.active')?.textContent"));
  fs.writeFileSync('/tmp/native-wardrobe.png', (await win.webContents.capturePage()).toPNG());
  await win.webContents.executeJavaScript("[...document.querySelectorAll('.nav-link')].find((item) => item.textContent.includes('Home'))?.click()");
  await pause(700);
  await win.webContents.executeJavaScript("document.querySelector('.other-versions-tile')?.click()");
  await pause(1800);
  fs.writeFileSync('/tmp/native-action-center.png', (await win.webContents.capturePage()).toPNG());
  await win.webContents.executeJavaScript("document.querySelector('.action-center-close')?.click()");
  await pause(800);
  await win.webContents.executeJavaScript("[...document.querySelectorAll('.nav-link')].find((item) => item.textContent.includes('Browse'))?.click()");
  await pause(2500);
  await win.webContents.executeJavaScript("document.querySelector('.content-card-main')?.click()");
  await pause(1800);
  fs.writeFileSync('/tmp/native-content-detail.png', (await win.webContents.capturePage()).toPNG());
  app.quit();
});

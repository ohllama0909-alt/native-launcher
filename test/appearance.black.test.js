const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

test('appearance: default appearance is locked to black and appearance setting is removed', () => {
  // 1. Check SettingsModal has removed appearance setting tab
  const settingsModalPath = path.join(ROOT, 'src/features/settings/SettingsModal.jsx');
  const settingsModalCode = fs.readFileSync(settingsModalPath, 'utf8');

  assert.ok(!settingsModalCode.includes("id: 'appearance'"), 'Appearance tab must not be in SettingsModal TABS');
  assert.ok(!settingsModalCode.includes('AppearancePanel'), 'AppearancePanel must not be imported or rendered in SettingsModal');

  // 2. Check appearance.js defaults and locking
  const appearancePath = path.join(ROOT, 'src/lib/appearance.js');
  const appearanceCode = fs.readFileSync(appearancePath, 'utf8');

  assert.ok(appearanceCode.includes("surface: 'black'"), "DEFAULT_APPEARANCE surface must be 'black'");
  assert.ok(appearanceCode.includes("root.dataset.surface = 'black'"), "applyAppearance must set root.dataset.surface to 'black'");
  assert.ok(appearanceCode.includes("root.dataset.theme = 'black'"), "applyAppearance must set root.dataset.theme to 'black'");

  // 3. Check theme.css default variables and surfaces
  const themeCssPath = path.join(ROOT, 'src/styles/theme.css');
  const themeCss = fs.readFileSync(themeCssPath, 'utf8');

  assert.ok(themeCss.includes('--color-bg-beyond-black:#000000;'), 'Root --color-bg-beyond-black must be #000000');
  assert.ok(themeCss.includes('--page-sunken:#000000;'), 'Root --page-sunken must be #000000');
  assert.ok(themeCss.includes(":root[data-surface='black']"), "theme.css must have :root[data-surface='black']");

  // 4. Check electron/settings.js defaults to black theme and migrates
  const electronSettingsPath = path.join(ROOT, 'electron/settings.js');
  const electronSettingsCode = fs.readFileSync(electronSettingsPath, 'utf8');

  assert.ok(electronSettingsCode.includes("theme: 'black'"), "electron settings DEFAULTS must use theme: 'black'");
  assert.ok(electronSettingsCode.includes("cache.appearance.theme !== 'black'"), "electron settings load() must migrate theme to 'black'");

  // 5. Check useSettings.js defaults to black theme and migrates
  const useSettingsPath = path.join(ROOT, 'src/features/settings/useSettings.js');
  const useSettingsCode = fs.readFileSync(useSettingsPath, 'utf8');

  assert.ok(useSettingsCode.includes("theme: 'black'"), "useSettings DEFAULTS must use theme: 'black'");
  assert.ok(useSettingsCode.includes("root.dataset.surface = 'black'"), "useSettings applyAppearance must set surface = 'black'");

  // 6. Check main.jsx imports appearance.js
  const mainJsxPath = path.join(ROOT, 'src/main.jsx');
  const mainJsxCode = fs.readFileSync(mainJsxPath, 'utf8');

  assert.ok(mainJsxCode.includes("import './lib/appearance.js'"), 'main.jsx must import appearance.js directly');
});

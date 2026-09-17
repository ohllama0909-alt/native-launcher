const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

let esbuild = null;
try {
  esbuild = require('esbuild');
} catch {
  esbuild = null;
}

test('Browse redesign renders tactical glass grid, filter panel, and cards', { skip: !esbuild && 'esbuild is not installed' }, () => {
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'noctra-browse-redesign-'));
  const entry = path.join(workDir, 'entry.jsx');
  const bundle = path.join(workDir, 'bundle.cjs');

  fs.writeFileSync(entry, `
globalThis.window = {
  native: {
    version: '3.9.105',
    openExternal() {},
    minimize() {},
    maximize() {},
    close() {},
    mods: { installed: async () => ({}) },
    settings: {
      load: async () => ({ resolution: { width: 1920, height: 1080 }, memory: { min: 1, max: 4 } }),
      systemMemory: async () => ({ totalGb: 16 })
    },
    instance: {
      worldList: async () => [],
      listDir: async () => []
    }
  },
  addEventListener() {},
  removeEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  fetch: async () => ({
    ok: true,
    json: async () => ({ hits: [{ project_id: 'iris', title: 'Iris Shaders', description: 'Modern shaders mod', downloads: 5000000, follows: 12000, display_categories: ['shaders', 'optimization'] }], total_hits: 1 })
  })
};
globalThis.document = { documentElement: { dataset: {}, style: { setProperty() {} } }, addEventListener() {}, removeEventListener() {} };
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };

const React = require('react');
const { renderToString } = require('react-dom/server');
const { I18nProvider } = require(${JSON.stringify(path.join(ROOT, 'src/i18n/I18nProvider.jsx'))});
const BrowseView = require(${JSON.stringify(path.join(ROOT, 'src/features/browser/BrowseView.jsx'))}).default;
const SettingsTab = require(${JSON.stringify(path.join(ROOT, 'src/features/cluster/SettingsTab.jsx'))}).default;

const fabricInst = { id: 'f-1', name: 'Fabric 1.21', version: '1.21.1', loader: 'Fabric', totalPlaytime: 3600 };

const browseHtml = renderToString(React.createElement(I18nProvider, null,
  React.createElement(BrowseView, {
    instances: [fabricInst],
    selectedCluster: fabricInst,
    onSelectCluster() {},
    onNotify() {},
    initialResults: [{ project_id: 'iris', title: 'Iris Shaders', description: 'Modern shaders mod', downloads: 5000000, follows: 12000, display_categories: ['shaders', 'optimization'] }]
  })
));

process.stdout.write('---SPLIT---');

const settingsHtml = renderToString(React.createElement(I18nProvider, null,
  React.createElement(SettingsTab, {
    cluster: { ...fabricInst, overrides: { resolution: { enabled: true, width: 1920, height: 1080 }, memory: { enabled: true, max: 8 }, jvmEnabled: true } },
    onUpdateCluster() {},
    onDirtyChange() {}
  })
));

process.stdout.write(browseHtml + '---SPLIT---' + settingsHtml);
`);

  esbuild.buildSync({
    entryPoints: [entry],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    jsx: 'automatic',
    loader: { '.css': 'empty', '.png': 'dataurl', '.jpg': 'dataurl', '.ttf': 'dataurl' },
    outfile: bundle,
    logLevel: 'error',
    nodePaths: [path.join(ROOT, 'node_modules')]
  });

  const raw = require('child_process').execFileSync('node', [bundle], { encoding: 'utf8' });
  const parts = raw.split('---SPLIT---');
  const browseHtml = parts[1];
  const settingsHtml = parts[2];

  // Assert BrowseView UI elements
  assert.ok(browseHtml.includes('browse-header-bar'), 'Browse header bar is rendered');
  assert.ok(browseHtml.includes('browse-filter-panel'), 'Filter sidebar is rendered');
  assert.ok(browseHtml.includes('browse-category-search'), 'Category search input is rendered');
  assert.ok(browseHtml.includes('Iris Shaders'), 'Project card title is rendered');
  assert.ok(browseHtml.includes('5.0M'), 'Downloads formatted in JetBrains Mono');
  assert.ok(browseHtml.includes('browse-btn-install'), 'Install button is rendered');

  // Assert SettingsTab UI elements
  assert.ok(settingsHtml.includes('im-settings-alert-banner'), 'Proceed with caution alert banner rendered');
  assert.ok(settingsHtml.includes('im-settings-summary'), 'Summary chips rendered');
  assert.ok(settingsHtml.includes('Display'), 'Display summary chip rendered');
  assert.ok(settingsHtml.includes('Memory'), 'Memory summary chip rendered');
  assert.ok(settingsHtml.includes('Java'), 'Java summary chip rendered');
  assert.ok(settingsHtml.includes('Game Resolution'), 'Game resolution card rendered');
  assert.ok(settingsHtml.includes('Match native display'), 'Native display preset button rendered');
  assert.ok(settingsHtml.includes('im-slider'), 'Allocated memory slider rendered');
  assert.ok(settingsHtml.includes('im-save-btn'), 'Save changes button rendered');

  fs.rmSync(workDir, { recursive: true, force: true });
});

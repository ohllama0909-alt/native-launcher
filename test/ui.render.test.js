const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
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

/**
 * Renders the login screen and the Locker through react-dom/server. Catches
 * missing translations, broken hooks and dropped design elements without
 * needing a browser (and therefore runs in CI).
 */
test('login screen and locker render the designed structure', { skip: !esbuild && 'esbuild is not installed' }, () => {
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'noctra-ui-'));
  const entry = path.join(workDir, 'entry.jsx');
  const bundle = path.join(workDir, 'bundle.cjs');

  fs.writeFileSync(entry, `
globalThis.window = {
  native: { version: '3.9.23', openExternal() {}, minimize() {}, maximize() {}, close() {} },
  addEventListener() {},
  removeEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} })
};
globalThis.document = { documentElement: { dataset: {}, style: { setProperty() {} } }, addEventListener() {}, removeEventListener() {} };
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };

const React = require('react');
const { renderToString } = require('react-dom/server');
const { I18nProvider } = require(${JSON.stringify(path.join(ROOT, 'src/i18n/I18nProvider.jsx'))});
const AccountSwitcherModal = require(${JSON.stringify(path.join(ROOT, 'src/features/auth/AccountSwitcherModal.jsx'))}).default;

const account = { id: 'acct-1', name: 'OhLlama', uuid: 'abc', type: 'microsoft', isMicrosoft: true, model: 'classic' };
const html = renderToString(React.createElement(I18nProvider, null,
  React.createElement(AccountSwitcherModal, {
    open: true, firstRun: true, accounts: [account], activeId: 'acct-1',
    onAddMicrosoft() {}, onAddOffline() {}, onSwitchAccount() {}, onRemoveAccount() {}
  })
));
process.stdout.write(html);
`);

  esbuild.buildSync({
    entryPoints: [entry],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    jsx: 'automatic',
    loader: { '.css': 'empty', '.png': 'dataurl' },
    outfile: bundle,
    logLevel: 'error',
    nodePaths: [path.join(ROOT, 'node_modules')]
  });

  // The markup embeds inlined images, so give the child plenty of room.
  const html = execFileSync(process.execPath, [bundle], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  fs.rmSync(workDir, { recursive: true, force: true });

  /* ---- login screen (design reference image 1) ---- */
  assert.match(html, /Noctra <strong>Client<\/strong>/, 'wordmark is rendered');
  assert.match(html, /account-login-microsoft/, 'Microsoft sign-in button exists');
  assert.match(html, /Log in with/, 'Microsoft button keeps its label');
  assert.match(html, /account-login-native/, 'Native Account sign-in button exists');
  assert.match(html, /(Native|Noctra) Account/, 'Noctra Account button label exists');
  for (const brand of ['Discord', 'X', 'Instagram', 'YouTube', 'Patreon']) {
    assert.ok(html.includes(`aria-label="${brand}"`), `social row has ${brand}`);
  }
  assert.match(html, /account-login-art/, 'artwork panel exists');
  for (const link of ['Privacy Policy', 'Terms of Service', 'Support']) {
    assert.ok(html.includes(`>${link}</button>`), `footer has ${link}`);
  }
});

/**
 * The appearance theme is the single source of colour. New surfaces must not
 * carry their own palette; only brand marks and neutral fallbacks may.
 */
test('new surfaces take their colours from the appearance theme', () => {
  const hex = (file) => (fs.readFileSync(path.join(ROOT, file), 'utf8').match(/#[0-9a-fA-F]{3,8}\b/g) || []);
  const allowed = new Set(['#f1f0f1', '#121112', '#f35325', '#81bc06', '#05a6f0', '#ffba08', '#fff']);
  const login = hex('src/features/auth/AccountSwitcherModal.css').filter((color) => !allowed.has(color.toLowerCase()));
  assert.deepEqual(login, [], `login CSS may only use Microsoft brand colours, found ${login.join(', ')}`);
});

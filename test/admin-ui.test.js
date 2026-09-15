const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

test('admin control room renders database and badge management surfaces', () => {
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'noctra-admin-ui-'));
  const entry = path.join(workDir, 'entry.jsx');
  const bundle = path.join(workDir, 'bundle.cjs');
  fs.writeFileSync(entry, `
globalThis.window = { native: { admin: {} } };
const React = require('react');
const { renderToString } = require('react-dom/server');
const AdminView = require(${JSON.stringify(path.join(ROOT, 'src/features/admin/AdminView.jsx'))}).default;
process.stdout.write(renderToString(React.createElement(AdminView, {})));
`);

  require('esbuild').buildSync({
    entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', jsx: 'automatic',
    loader: { '.css': 'empty', '.png': 'dataurl' }, outfile: bundle, logLevel: 'error',
    nodePaths: [path.join(ROOT, 'node_modules')]
  });

  const html = execFileSync(process.execPath, [bundle], { encoding: 'utf8' });
  fs.rmSync(workDir, { recursive: true, force: true });
  assert.match(html, /Control room/);
  assert.match(html, /ADMIN ONLY/);
  assert.match(html, /Database/);
  assert.match(html, /Secrets and password data are never exposed/);
  assert.match(html, /badge management/);
});

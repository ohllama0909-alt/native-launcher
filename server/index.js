const http = require('http');
const fs = require('fs');
const path = require('path');
const server = require('./server');
const { handleRelayRoutes } = require('./relay-routes');
const db = require('./db');

const PORT = Number(process.env.PORT || process.env.NATIVE_SKIN_PORT || 3418);
const HOST = process.env.HOST || '127.0.0.1';

/**
 * Relay group + reply routes are tried first; everything else falls through to
 * the original handler, so the existing auth, social, wardrobe and texture
 * endpoints are untouched.
 */
async function handler(req, res) {
  try {
    const handled = await handleRelayRoutes(req, res);
    if (handled) return;
  } catch (error) {
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: error.message || 'Relay route failed.' }));
    }
    return;
  }
  await server.handler(req, res);
}

function createServer() {
  const instance = http.createServer(handler);
  // SSE connections must never be culled by the default keep-alive timeout.
  instance.keepAliveTimeout = 0;
  instance.headersTimeout = 0;
  instance.requestTimeout = 0;
  return instance;
}

for (const dir of ['profiles', 'textures', 'media']) {
  fs.mkdirSync(path.join(server.DATA_DIR, dir), { recursive: true });
}

const instance = createServer();
instance.listen(PORT, HOST, () => {
  console.log(`[Noctra Server] Online and listening on http://${HOST}:${PORT}`);
  console.log(`[Noctra DB] SQLite database mounted at ${db.DB_PATH}`);
});

function shutdown(signal) {
  console.log(`[Noctra Server] ${signal} received. Closing database and shutting down...`);
  db.closeDb();
  process.exit(0);
}

process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGINT', () => shutdown('SIGINT'));

module.exports = { server: instance, createServer, handler, db };

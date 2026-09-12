const server = require('./server');
const db = require('./db');

const PORT = Number(process.env.PORT || process.env.NATIVE_SKIN_PORT || 3418);
const HOST = process.env.HOST || '127.0.0.1';

server.listen(PORT, HOST).then(() => {
  console.log(`[Noctra Server] Online and listening on http://${HOST}:${PORT}`);
  console.log(`[Noctra DB] SQLite database mounted at ${db.DB_PATH}`);
});

process.on('SIGTERM', () => {
  console.log('[Noctra Server] SIGTERM received. Closing database and shutting down...');
  db.closeDb();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[Noctra Server] SIGINT received. Closing database and shutting down...');
  db.closeDb();
  process.exit(0);
});

module.exports = { server, db };

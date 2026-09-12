const server = require('./server');
const db = require('./db');

const PORT = Number(process.env.PORT || process.env.NATIVE_SKIN_PORT || 3418);
const HOST = process.env.HOST || '127.0.0.1';

server.listen(PORT, HOST).then(() => {
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

module.exports = { server, db };

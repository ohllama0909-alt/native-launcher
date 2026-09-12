/**
 * Backwards compatibility adapter for legacy references to skin-server/server.
 * Re-exports and runs the production server from server/server.
 */
const server = require('../server/server');

if (require.main === module) {
  server.listen(server.PORT, '127.0.0.1').then(() => {
    console.log(`Noctra Server (legacy skin-server entrypoint) listening on 127.0.0.1:${server.PORT}`);
  });
}

module.exports = server;

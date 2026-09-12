/**
 * Backwards compatibility adapter for legacy references to skin-server/auth-db.
 * Re-exports the production database subsystem from server/db.
 */
const db = require('../server/db');

module.exports = db;

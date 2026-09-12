const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const { initSchema } = require('./schema');
const usersMod = require('./users');
const socialMod = require('./social');

const DATA_DIR = path.resolve(
  process.env.NOCTRA_DATA_DIR ||
  process.env.NATIVE_SKIN_DATA ||
  path.join(__dirname, '..', 'data')
);
const DB_PATH = process.env.NOCTRA_DB_PATH || path.join(DATA_DIR, 'noctra.db');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');

let dbInstance = null;

function migrateLegacyDbIfPresent() {
  if (fs.existsSync(DB_PATH)) return;

  const legacyPaths = [
    path.join(__dirname, '..', '..', 'skin-server', 'data', 'noctra_auth.db'),
    path.join(DATA_DIR, 'noctra_auth.db')
  ];

  for (const legacyPath of legacyPaths) {
    if (fs.existsSync(legacyPath)) {
      try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
        fs.copyFileSync(legacyPath, DB_PATH);
        // Also copy WAL / SHM files if they exist
        if (fs.existsSync(`${legacyPath}-wal`)) fs.copyFileSync(`${legacyPath}-wal`, `${DB_PATH}-wal`);
        if (fs.existsSync(`${legacyPath}-shm`)) fs.copyFileSync(`${legacyPath}-shm`, `${DB_PATH}-shm`);
        console.log(`[Noctra DB] Successfully migrated database from legacy path: ${legacyPath} -> ${DB_PATH}`);
        break;
      } catch (err) {
        console.error(`[Noctra DB] Failed to migrate legacy DB from ${legacyPath}:`, err);
      }
    }
  }
}

function getDb() {
  if (!dbInstance) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });

    migrateLegacyDbIfPresent();

    dbInstance = new DatabaseSync(DB_PATH);
    initSchema(dbInstance);
  }
  return dbInstance;
}

function closeDb() {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch {}
    dbInstance = null;
  }
}

function backupDatabase() {
  getDb();
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(BACKUPS_DIR, `noctra_${timestamp}.db`);
  fs.copyFileSync(DB_PATH, backupFile);
  return {
    path: backupFile,
    filename: path.basename(backupFile),
    size: fs.statSync(backupFile).size,
    dbPath: DB_PATH
  };
}

module.exports = {
  getDb,
  closeDb,
  DATA_DIR,
  DB_PATH,
  BACKUPS_DIR,
  backupDatabase,

  // Users & Auth
  generateOfflinePlayerUuid: usersMod.generateOfflinePlayerUuid,
  hashPassword: usersMod.hashPassword,
  verifyPassword: usersMod.verifyPassword,
  saveVerificationCode: (email, code) => usersMod.saveVerificationCode(getDb(), email, code),
  checkVerificationCode: (email, code) => usersMod.checkVerificationCode(getDb(), email, code),
  clearVerificationCode: (email) => usersMod.clearVerificationCode(getDb(), email),
  getUserByEmail: (email) => usersMod.getUserByEmail(getDb(), email),
  getUserByUsername: (username) => usersMod.getUserByUsername(getDb(), username),
  getUserByLogin: (login) => usersMod.getUserByLogin(getDb(), login),
  createUser: (data) => usersMod.createUser(getDb(), data),
  createSession: (userId) => usersMod.createSession(getDb(), userId),
  getUserBySession: (token) => usersMod.getUserBySession(getDb(), token),
  deleteSession: (token) => usersMod.deleteSession(getDb(), token),

  // Social & Presence
  updatePresence: (userId, data) => socialMod.updatePresence(getDb(), userId, data),
  getPresence: (userId) => socialMod.getPresence(getDb(), userId),
  getFriends: (userId) => socialMod.getFriends(getDb(), userId),
  getFriendRequests: (userId) => socialMod.getFriendRequests(getDb(), userId),
  sendFriendRequest: (senderId, targetUsername) => socialMod.sendFriendRequest(getDb(), senderId, targetUsername, usersMod.getUserByUsername),
  respondFriendRequest: (requestId, userId, action) => socialMod.respondFriendRequest(getDb(), requestId, userId, action),
  removeFriend: (userId, friendId) => socialMod.removeFriend(getDb(), userId, friendId),
  updateFriendAttributes: (userId, friendId, attrs) => socialMod.updateFriendAttributes(getDb(), userId, friendId, attrs),
  blockUser: (userId, blockedId) => socialMod.blockUser(getDb(), userId, blockedId),
  unblockUser: (userId, blockedId) => socialMod.unblockUser(getDb(), userId, blockedId),
  getMessages: (userId, friendId, limit) => socialMod.getMessages(getDb(), userId, friendId, limit),
  sendMessage: (senderId, receiverId, content) => socialMod.sendMessage(getDb(), senderId, receiverId, content),
  searchUsers: (query, excludeUserId) => socialMod.searchUsers(getDb(), query, excludeUserId)
};

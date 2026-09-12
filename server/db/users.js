const crypto = require('crypto');

function generateOfflinePlayerUuid(username) {
  const md5 = crypto.createHash('md5').update(`OfflinePlayer:${username}`).digest();
  md5[6] = (md5[6] & 0x0f) | 0x30; // version 3
  md5[8] = (md5[8] & 0x3f) | 0x80; // variant 2
  const hex = md5.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

function verifyPassword(password, hash, salt) {
  try {
    const check = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(check, 'hex'), Buffer.from(hash, 'hex'));
  } catch {
    return false;
  }
}

function saveVerificationCode(db, email, code) {
  const now = Date.now();
  const expiresAt = now + 10 * 60 * 1000; // 10 minutes
  const stmt = db.prepare(`
    INSERT INTO verification_codes (email, code, created_at, expires_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(email) DO UPDATE SET
      code = excluded.code,
      created_at = excluded.created_at,
      expires_at = excluded.expires_at
  `);
  stmt.run(email.toLowerCase().trim(), String(code).trim(), now, expiresAt);
  return { code, expiresAt };
}

function checkVerificationCode(db, email, code) {
  const stmt = db.prepare(`
    SELECT * FROM verification_codes
    WHERE email = ? AND code = ? AND expires_at > ?
  `);
  const row = stmt.get(email.toLowerCase().trim(), String(code).trim(), Date.now());
  return Boolean(row);
}

function clearVerificationCode(db, email) {
  db.prepare(`DELETE FROM verification_codes WHERE email = ?`).run(email.toLowerCase().trim());
}

function getUserByEmail(db, email) {
  return db.prepare(`SELECT * FROM users WHERE lower(email) = lower(?)`).get(email.trim()) || null;
}

function getUserByUsername(db, username) {
  return db.prepare(`SELECT * FROM users WHERE lower(username) = lower(?)`).get(username.trim()) || null;
}

function getUserByLogin(db, login) {
  const val = login.trim();
  return db.prepare(`
    SELECT * FROM users 
    WHERE lower(email) = lower(?) OR lower(username) = lower(?)
  `).get(val, val) || null;
}

function createUser(db, { email, username, password, model = 'classic' }) {
  const id = `user-${crypto.randomBytes(6).toString('hex')}`;
  const uuid = generateOfflinePlayerUuid(username);
  const { hash, salt } = hashPassword(password);
  const now = Date.now();

  const stmt = db.prepare(`
    INSERT INTO users (id, email, username, password_hash, salt, uuid, model, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(id, email.toLowerCase().trim(), username.trim(), hash, salt, uuid, model === 'slim' ? 'slim' : 'classic', now);

  return {
    id,
    email: email.toLowerCase().trim(),
    username: username.trim(),
    uuid,
    model: model === 'slim' ? 'slim' : 'classic',
    createdAt: now
  };
}

function createSession(db, userId) {
  const token = `noc_${crypto.randomBytes(32).toString('hex')}`;
  const now = Date.now();
  const expiresAt = now + 90 * 24 * 60 * 60 * 1000; // 90 days
  const stmt = db.prepare(`
    INSERT INTO sessions (token, user_id, created_at, expires_at)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run(token, userId, now, expiresAt);
  return { token, expiresAt };
}

function getUserBySession(db, token) {
  if (!token) return null;
  const stmt = db.prepare(`
    SELECT u.id, u.email, u.username, u.uuid, u.model, u.created_at
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token = ? AND s.expires_at > ?
  `);
  return stmt.get(token, Date.now()) || null;
}

function deleteSession(db, token) {
  if (!token) return;
  db.prepare(`DELETE FROM sessions WHERE token = ?`).run(token);
}

module.exports = {
  generateOfflinePlayerUuid,
  hashPassword,
  verifyPassword,
  saveVerificationCode,
  checkVerificationCode,
  clearVerificationCode,
  getUserByEmail,
  getUserByUsername,
  getUserByLogin,
  createUser,
  createSession,
  getUserBySession,
  deleteSession
};

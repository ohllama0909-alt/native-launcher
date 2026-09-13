/**
 * Noctra Client Database Schema & Migration Engine
 * Uses Node.js native SQLite (DatabaseSync) with WAL mode, foreign keys,
 * and optimized compound indexes for instant queries.
 */

function initSchema(db) {
  // Performance and integrity pragmas
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA cache_size = -64000;
    PRAGMA busy_timeout = 5000;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      uuid TEXT NOT NULL,
      model TEXT DEFAULT 'classic',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS verification_codes (
      email TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS friends (
      user_id TEXT NOT NULL,
      friend_id TEXT NOT NULL,
      is_best_friend INTEGER DEFAULT 0,
      nickname TEXT DEFAULT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, friend_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS friend_requests (
      id TEXT PRIMARY KEY,
      sender_id TEXT NOT NULL,
      receiver_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at INTEGER NOT NULL,
      FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      sender_id TEXT NOT NULL,
      receiver_id TEXT NOT NULL,
      content TEXT NOT NULL,
      media_url TEXT DEFAULT NULL,
      media_name TEXT DEFAULT NULL,
      media_kind TEXT DEFAULT NULL,
      is_media INTEGER DEFAULT 0,
      is_read INTEGER DEFAULT 0,
      edited_at INTEGER DEFAULT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS message_reactions (
      message_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      reaction TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (message_id, user_id, reaction),
      FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS presence (
      user_id TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      activity TEXT,
      server_address TEXT,
      last_seen INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS blocks (
      user_id TEXT NOT NULL,
      blocked_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, blocked_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (blocked_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Query performance indexes
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_friends_user ON friends(user_id);
    CREATE INDEX IF NOT EXISTS idx_friends_friend ON friends(friend_id);
    CREATE INDEX IF NOT EXISTS idx_requests_receiver ON friend_requests(receiver_id, status);
    CREATE INDEX IF NOT EXISTS idx_requests_sender ON friend_requests(sender_id, status);
    CREATE INDEX IF NOT EXISTS idx_messages_pair ON messages(sender_id, receiver_id);
    CREATE INDEX IF NOT EXISTS idx_messages_pair_created ON messages(sender_id, receiver_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(receiver_id, sender_id, is_read);
    CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
    CREATE INDEX IF NOT EXISTS idx_reactions_message ON message_reactions(message_id);
    CREATE INDEX IF NOT EXISTS idx_presence_user ON presence(user_id);
    CREATE INDEX IF NOT EXISTS idx_blocks_pair ON blocks(user_id, blocked_id);
  `);

  // Safe migrations for databases created by older builds.
  const safeAddColumn = (table, columnDef) => {
    try {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${columnDef}`);
    } catch {}
  };
  safeAddColumn('messages', 'media_url TEXT DEFAULT NULL');
  safeAddColumn('messages', 'media_name TEXT DEFAULT NULL');
  safeAddColumn('messages', 'media_kind TEXT DEFAULT NULL');
  safeAddColumn('messages', 'is_media INTEGER DEFAULT 0');
  safeAddColumn('messages', 'edited_at INTEGER DEFAULT NULL');

  // `messages.reaction` was the original single-reaction column. Reactions now
  // live in `message_reactions`; migrate any leftover values across once and
  // then stop reading the legacy column entirely.
  try {
    const columns = db.prepare('PRAGMA table_info(messages)').all();
    const hasLegacyReaction = columns.some((column) => column.name === 'reaction');
    if (hasLegacyReaction) {
      db.exec(`
        INSERT INTO message_reactions (message_id, user_id, reaction, created_at)
        SELECT m.id, m.sender_id, m.reaction, m.created_at
        FROM messages m
        WHERE m.reaction IS NOT NULL AND TRIM(m.reaction) != ''
        ON CONFLICT(message_id, user_id, reaction) DO NOTHING
      `);
      db.exec("UPDATE messages SET reaction = NULL WHERE reaction IS NOT NULL");
    }
  } catch {}
}

module.exports = {
  initSchema
};

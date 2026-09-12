const crypto = require('crypto');

function updatePresence(db, userId, { status = 'online', activity = 'In Launcher', serverAddress = null } = {}) {
  const now = Date.now();
  const stmt = db.prepare(`
    INSERT INTO presence (user_id, status, activity, server_address, last_seen)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      status = excluded.status,
      activity = excluded.activity,
      server_address = excluded.server_address,
      last_seen = excluded.last_seen
  `);
  stmt.run(userId, String(status), activity ? String(activity) : null, serverAddress ? String(serverAddress) : null, now);
}

function getPresence(db, userId) {
  return db.prepare(`SELECT * FROM presence WHERE user_id = ?`).get(userId) || null;
}

function getFriends(db, userId) {
  const now = Date.now();
  const activeThreshold = now - 120_000; // 120 seconds timeout for online presence

  const stmt = db.prepare(`
    SELECT 
      f.friend_id AS id,
      u.username AS name,
      u.uuid,
      u.model,
      f.is_best_friend AS isBestFriend,
      f.nickname,
      f.created_at AS friendsSince,
      p.status AS rawStatus,
      p.activity,
      p.server_address AS serverAddress,
      p.last_seen AS lastSeen,
      (
        SELECT COUNT(*) FROM messages m 
        WHERE m.sender_id = f.friend_id AND m.receiver_id = f.user_id AND m.is_read = 0
      ) AS unreadCount,
      (
        SELECT content FROM messages m
        WHERE (m.sender_id = f.friend_id AND m.receiver_id = f.user_id)
           OR (m.sender_id = f.user_id AND m.receiver_id = f.friend_id)
        ORDER BY m.created_at DESC LIMIT 1
      ) AS lastMessageContent,
      (
        SELECT created_at FROM messages m
        WHERE (m.sender_id = f.friend_id AND m.receiver_id = f.user_id)
           OR (m.sender_id = f.user_id AND m.receiver_id = f.friend_id)
        ORDER BY m.created_at DESC LIMIT 1
      ) AS lastMessageTime,
      (
        SELECT sender_id FROM messages m
        WHERE (m.sender_id = f.friend_id AND m.receiver_id = f.user_id)
           OR (m.sender_id = f.user_id AND m.receiver_id = f.friend_id)
        ORDER BY m.created_at DESC LIMIT 1
      ) AS lastMessageSenderId
    FROM friends f
    JOIN users u ON f.friend_id = u.id
    LEFT JOIN presence p ON u.id = p.user_id
    WHERE f.user_id = ?
    ORDER BY f.is_best_friend DESC, u.username ASC
  `);

  const rows = stmt.all(userId);
  return rows.map(r => {
    const isOnline = r.lastSeen && r.lastSeen >= activeThreshold && r.rawStatus !== 'offline';
    return {
      id: r.id,
      name: r.name,
      uuid: r.uuid,
      model: r.model || 'classic',
      isBestFriend: Boolean(r.isBestFriend),
      nickname: r.nickname || null,
      friendsSince: r.friendsSince,
      status: isOnline ? (r.rawStatus || 'online') : 'offline',
      activity: isOnline ? (r.activity || 'In Launcher') : null,
      serverAddress: isOnline ? r.serverAddress : null,
      lastSeen: r.lastSeen || r.friendsSince,
      unreadCount: Number(r.unreadCount || 0),
      lastMessageContent: r.lastMessageContent || null,
      lastMessageTime: r.lastMessageTime || null,
      lastMessageSenderId: r.lastMessageSenderId || null
    };
  });
}

function getFriendRequests(db, userId) {
  const receivedStmt = db.prepare(`
    SELECT 
      r.id,
      r.sender_id AS userId,
      u.username AS name,
      u.uuid,
      u.model,
      r.created_at AS createdAt
    FROM friend_requests r
    JOIN users u ON r.sender_id = u.id
    WHERE r.receiver_id = ? AND r.status = 'pending'
    ORDER BY r.created_at DESC
  `);

  const sentStmt = db.prepare(`
    SELECT 
      r.id,
      r.receiver_id AS userId,
      u.username AS name,
      u.uuid,
      u.model,
      r.created_at AS createdAt
    FROM friend_requests r
    JOIN users u ON r.receiver_id = u.id
    WHERE r.sender_id = ? AND r.status = 'pending'
    ORDER BY r.created_at DESC
  `);

  return {
    received: receivedStmt.all(userId),
    sent: sentStmt.all(userId)
  };
}

function sendFriendRequest(db, senderId, targetUsername, getUserByUsernameFn) {
  const target = getUserByUsernameFn(db, targetUsername);
  if (!target) {
    throw new Error('User not found. Check the username and try again.');
  }
  if (target.id === senderId) {
    throw new Error('You cannot add yourself as a friend.');
  }

  // Check if already friends
  const friendCheck = db.prepare('SELECT 1 FROM friends WHERE user_id = ? AND friend_id = ?').get(senderId, target.id);
  if (friendCheck) {
    throw new Error('You are already friends with this player.');
  }

  // Check if blocked
  const blockCheck = db.prepare('SELECT 1 FROM blocks WHERE (user_id = ? AND blocked_id = ?) OR (user_id = ? AND blocked_id = ?)').get(senderId, target.id, target.id, senderId);
  if (blockCheck) {
    throw new Error('Cannot send friend request.');
  }

  // Check if pending request exists
  const pendingCheck = db.prepare(`
    SELECT id, sender_id, status FROM friend_requests 
    WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)) 
      AND status = 'pending'
  `).get(senderId, target.id, target.id, senderId);

  if (pendingCheck) {
    if (pendingCheck.sender_id === senderId) {
      throw new Error('A friend request has already been sent to this player.');
    } else {
      // Automatic mutual accept
      return respondFriendRequest(db, pendingCheck.id, senderId, 'accept');
    }
  }

  const id = `freq-${crypto.randomBytes(8).toString('hex')}`;
  const now = Date.now();
  db.prepare(`
    INSERT INTO friend_requests (id, sender_id, receiver_id, status, created_at)
    VALUES (?, ?, ?, 'pending', ?)
  `).run(id, senderId, target.id, now);

  return { ok: true, id, target: { id: target.id, name: target.username, uuid: target.uuid } };
}

function respondFriendRequest(db, requestId, userId, action) {
  const now = Date.now();
  const req = db.prepare('SELECT * FROM friend_requests WHERE id = ?').get(requestId);
  if (!req) {
    throw new Error('Friend request not found.');
  }

  if (action === 'accept') {
    if (req.receiver_id !== userId) {
      throw new Error('Unauthorized to accept this request.');
    }
    db.prepare('UPDATE friend_requests SET status = \'accepted\' WHERE id = ?').run(requestId);

    const insertFriend = db.prepare(`
      INSERT INTO friends (user_id, friend_id, is_best_friend, nickname, created_at)
      VALUES (?, ?, 0, NULL, ?)
      ON CONFLICT(user_id, friend_id) DO NOTHING
    `);
    insertFriend.run(req.receiver_id, req.sender_id, now);
    insertFriend.run(req.sender_id, req.receiver_id, now);
    return { ok: true, action: 'accepted' };
  }

  if (action === 'decline') {
    if (req.receiver_id !== userId) {
      throw new Error('Unauthorized to decline this request.');
    }
    db.prepare('UPDATE friend_requests SET status = \'declined\' WHERE id = ?').run(requestId);
    return { ok: true, action: 'declined' };
  }

  if (action === 'cancel') {
    if (req.sender_id !== userId) {
      throw new Error('Unauthorized to cancel this request.');
    }
    db.prepare('UPDATE friend_requests SET status = \'cancelled\' WHERE id = ?').run(requestId);
    return { ok: true, action: 'cancelled' };
  }

  throw new Error(`Invalid action: ${action}`);
}

function removeFriend(db, userId, friendId) {
  db.prepare('DELETE FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)').run(userId, friendId, friendId, userId);
  return { ok: true };
}

function updateFriendAttributes(db, userId, friendId, { isBestFriend, nickname } = {}) {
  if (typeof isBestFriend === 'boolean') {
    db.prepare('UPDATE friends SET is_best_friend = ? WHERE user_id = ? AND friend_id = ?').run(isBestFriend ? 1 : 0, userId, friendId);
  }
  if (typeof nickname !== 'undefined') {
    db.prepare('UPDATE friends SET nickname = ? WHERE user_id = ? AND friend_id = ?').run(nickname ? String(nickname).trim() : null, userId, friendId);
  }
  return { ok: true };
}

function blockUser(db, userId, blockedId) {
  const now = Date.now();
  removeFriend(db, userId, blockedId);
  db.prepare(`
    UPDATE friend_requests SET status = 'declined' 
    WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
  `).run(userId, blockedId, blockedId, userId);

  db.prepare(`
    INSERT INTO blocks (user_id, blocked_id, created_at)
    VALUES (?, ?, ?)
    ON CONFLICT(user_id, blocked_id) DO NOTHING
  `).run(userId, blockedId, now);
  return { ok: true };
}

function unblockUser(db, userId, blockedId) {
  db.prepare('DELETE FROM blocks WHERE user_id = ? AND blocked_id = ?').run(userId, blockedId);
  return { ok: true };
}

function getMessages(db, userId, friendId, limit = 50) {
  // Mark received messages as read
  db.prepare('UPDATE messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ? AND is_read = 0').run(friendId, userId);

  const stmt = db.prepare(`
    SELECT id, sender_id AS senderId, receiver_id AS receiverId, content, is_read AS isRead, created_at AS createdAt
    FROM messages
    WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
    ORDER BY created_at ASC
    LIMIT ?
  `);
  return stmt.all(userId, friendId, friendId, userId, limit);
}

function sendMessage(db, senderId, receiverId, content) {
  const clean = String(content || '').trim();
  if (!clean) throw new Error('Message content cannot be empty.');
  if (clean.length > 2000) throw new Error('Message is too long (maximum 2000 characters).');

  const blockCheck = db.prepare('SELECT 1 FROM blocks WHERE (user_id = ? AND blocked_id = ?) OR (user_id = ? AND blocked_id = ?)').get(senderId, receiverId, receiverId, senderId);
  if (blockCheck) throw new Error('Cannot send message to this player.');

  const id = `msg-${crypto.randomBytes(8).toString('hex')}`;
  const now = Date.now();
  db.prepare(`
    INSERT INTO messages (id, sender_id, receiver_id, content, is_read, created_at)
    VALUES (?, ?, ?, ?, 0, ?)
  `).run(id, senderId, receiverId, clean, now);

  return {
    id,
    senderId,
    receiverId,
    content: clean,
    isRead: 0,
    createdAt: now
  };
}

function searchUsers(db, query, excludeUserId) {
  const clean = String(query || '').trim();
  if (!clean || clean.length < 2) return [];
  const stmt = db.prepare(`
    SELECT u.id, u.username AS name, u.uuid, u.model
    FROM users u
    WHERE u.username LIKE ? AND u.id != ?
    LIMIT 10
  `);
  return stmt.all(`%${clean}%`, excludeUserId);
}

module.exports = {
  updatePresence,
  getPresence,
  getFriends,
  getFriendRequests,
  sendFriendRequest,
  respondFriendRequest,
  removeFriend,
  updateFriendAttributes,
  blockUser,
  unblockUser,
  getMessages,
  sendMessage,
  searchUsers
};

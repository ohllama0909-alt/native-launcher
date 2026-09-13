# Relay Database Migration Runbook

For whoever owns the Noctra database. This covers the group-chat + reply
release. Nothing here requires an ORM or a migration CLI: the schema is applied
by the server at boot.

## 1. How migrations work here

- Storage engine: SQLite via Node's built-in `node:sqlite` (`DatabaseSync`), WAL
  mode, foreign keys on.
- `server/db/index.js` resolves the file in this order:
  1. `NOCTRA_DB_PATH` (explicit file path), else
  2. `NOCTRA_DATA_DIR` / `NATIVE_SKIN_DATA` + `/noctra.db`, else
  3. `server/data/noctra.db`.
- On the first `getDb()` call, `server/db/schema.js` runs `initSchema()`, which
  is **idempotent**: every statement is `CREATE TABLE IF NOT EXISTS`,
  `CREATE INDEX IF NOT EXISTS`, or a guarded `ALTER TABLE` (`safeAddColumn`,
  which swallows the "duplicate column" error).
- Result: **deploy the code and restart the server. The migration applies
  itself.** There is no separate migrate command and no downtime window beyond
  the restart.

## 2. Back up first (always)

Pick either option; both produce a single-file snapshot.

```bash
# Option A - from the running server (streams the live DB as a download)
curl -fsSL http://127.0.0.1:3418/v1/auth/backup -o noctra-prerelease.db

# Option B - on the box, using the helper that writes into data/backups/
node -e "console.log(require('./server/db').backupDatabase())"
```

If you copy the file by hand, copy the sidecars too, or you will lose the most
recent writes:

```bash
cp data/noctra.db     backup/noctra.db
cp data/noctra.db-wal backup/noctra.db-wal   # if present
cp data/noctra.db-shm backup/noctra.db-shm   # if present
```

## 3. Deploy

```bash
git pull                       # or deploy the release artifact
node server/index.js           # restart under your process manager
```

Expected log lines:

```
[Noctra Server] Online and listening on http://127.0.0.1:3418
[Noctra DB] SQLite database mounted at /path/to/data/noctra.db
```

## 4. What this release changes

### New tables

| Table | Purpose | Key columns |
| --- | --- | --- |
| `groups` | one row per group chat | `id`, `name`, `description`, `icon_url`, `owner_id`, `created_at`, `updated_at` |
| `group_members` | membership + per-user state | PK `(group_id, user_id)`, `role` (`owner`/`admin`/`member`), `invited_by`, `pinned`, `muted`, `last_read_at`, `joined_at` |
| `group_messages` | group chat history | `id`, `group_id`, `sender_id`, `content`, media columns, `reply_to` (self FK), `system_kind`, `edited_at`, `deleted_at`, `created_at` |
| `group_message_reactions` | one row per user per emoji | PK `(message_id, user_id, reaction)` |

### Altered table

`messages` gains two nullable columns, added in place with no rewrite:

- `reply_to TEXT` - the message being replied to
- `deleted_at INTEGER` - soft delete, so replies pointing at it still render

### New indexes

`idx_groups_owner`, `idx_group_members_user`, `idx_group_members_group`,
`idx_group_messages_room`, `idx_group_messages_sender`,
`idx_group_messages_reply`, `idx_group_reactions_message`,
`idx_messages_reply`.

### Data repairs (run once, guarded)

- Legacy `messages.reaction` values are copied into `message_reactions` and the
  old column is blanked. Already shipped previously; still idempotent.
- Any `group_members.role` that is not one of the three valid roles is reset,
  and the row matching `groups.owner_id` is forced to `owner`, so no group can
  end up ownerless.
- `groups.updated_at` backfills from `created_at` when empty.

Nothing is dropped and nothing is destructive. Old rows are untouched.

## 5. Verify

```bash
sqlite3 data/noctra.db ".tables"
sqlite3 data/noctra.db "PRAGMA table_info(group_members);"
sqlite3 data/noctra.db "PRAGMA table_info(messages);"   # expect reply_to + deleted_at
sqlite3 data/noctra.db "PRAGMA foreign_key_check;"      # expect no output
sqlite3 data/noctra.db "PRAGMA integrity_check;"        # expect: ok
```

Smoke test the API with a real session token:

```bash
TOKEN=...
curl -s -H "Authorization: Bearer $TOKEN" \
  http://127.0.0.1:3418/v1/social/relay/groups | jq
```

## 6. Rollback

The added columns and tables are ignored by the previous build, so rolling the
code back is safe on its own. If you want the data back too:

```bash
# stop the server first
rm -f data/noctra.db data/noctra.db-wal data/noctra.db-shm
cp backup/noctra.db data/noctra.db
# restart
```

## 7. Operational notes

- **Housekeeping.** Group rows cascade: deleting a group removes its members,
  messages and reactions automatically (`ON DELETE CASCADE` + `foreign_keys=ON`).
  Deleting a user removes their memberships and messages the same way.
- **Soft deletes.** Deleted messages keep their row with `deleted_at` set so
  replies stay coherent. To hard-purge older than 90 days:
  ```sql
  DELETE FROM group_messages WHERE deleted_at IS NOT NULL AND deleted_at < (unixepoch()*1000 - 7776000000);
  DELETE FROM messages       WHERE deleted_at IS NOT NULL AND deleted_at < (unixepoch()*1000 - 7776000000);
  ```
- **Limits enforced in code**, not constraints: 50 members per group, 32-char
  group name, 200-char description, 2000-char message.
- **Legacy DB.** If `noctra.db` is missing but `noctra_auth.db` exists (old
  skin-server layout), it is copied over on boot, WAL and SHM included.
- **Timestamps** are all epoch milliseconds (`INTEGER`), not SQLite datetimes.

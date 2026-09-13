# Noctra Client — PRD (Relay module)

## Product
Noctra Client is an Electron + React + Vite Minecraft launcher. **Noctra Relay** is its
full-screen messenger: direct messages, group chats, presence, reactions, replies,
attachments and voice notes, backed by a local Node HTTP + SQLite server (port 3418)
and Server-Sent Events for realtime transport.

## Architecture
```
React renderer (src/features/social)
  RelayPage.jsx        orchestrator (inbox rail + conversation panel + composer)
  MessageRow.jsx       one message: bubble, media, reactions, hover tools, inline edit
  ThreadRow.jsx        one inbox row
  useSocial.js         DM state, SSE fan-out, optimistic sends, edit/delete/retry
  useRelayGroups.js    group state, threads, typing, read receipts
        ↓ window.native.social / window.native.relay (contextBridge)
Electron main (electron/social.js, electron/relay.js)  → HTTP + SSE client
        ↓
Node server (server/server.js legacy social API, server/relay-routes.js relay API)
        ↓
SQLite (server/db/schema.js, db/social.js, db/relay.js)
```

## Implemented — June 2026 (batch 2)
Approved batch: 4 P0 Relay fixes + UI cleanups. Constraint honoured: *files edited only,
nothing run or built.* Verified by the testing agent as a **static code review**
(`/app/test_reports/iteration_1.json`) — all four P0 items PASS; runtime verification is
still owed by the user in the launcher.

1. **Last-seen formatting** — `formatLastSeen()` in `RelayPage.jsx`: "Last seen today at
   HH:mm", "… yesterday at HH:mm", "Last seen on 12 Sep at 14:30", else "Offline".
   Online/in-game presence text unchanged.
2. **Mute no longer reverts** — `mutedIds` persisted in `noctra_relay_store_v5`, applied as
   an override in `mergedFriends`/`formattedGroups`, toggled synchronously before the
   network call; `useSocial.unreadTotal` reads the same override so the nav badge agrees.
3. **Real desktop notifications + chime** — `ipcMain.handle('app:showNotification')` in
   `electron/main.js` (electron `Notification`, silent, click restores/focuses the window),
   exposed as `window.native.showNotification`; renderer plays a synthesized 587.33→880Hz
   Web Audio chime. Skips self, muted threads and the thread already on screen.
4. **Gradients removed** — `.relay-inbox::before` wash and the dot-grid on
   `.relay-chat-main` deleted; skeletons and image scrims are flat; every surface uses
   `--page` / `--page-elevated` / `--component-bg` / `--hairline`.

Also in this batch:
- **Mod dependency prompt** (`BrowseView.jsx`): `resolveDependencies()` walks required deps
  recursively (40-step guard + seen-set) and optional deps once; `DependencyPrompt` shows a
  plain required list plus unchecked optional checkboxes and an "Install N files" confirm;
  `installBundle()` installs deps before the main file and skips already-installed ones.
- **Browse page flattened**: no gradients, no card lift/glow, solid token surfaces,
  `.dep-prompt-*` styles added.
- **Update dialog rebuilt**: zero icons, plain headline/subline per status, `vX → vY` row,
  changelog list, two buttons.
- **Login saved-accounts selector**: drawer toggle removed, always-visible clean list with
  avatar, account type, "Active" chip and hover-only remove.

## Implemented — June 2026 (batch 1)
Batch approved by the user: **P0 + P1 + P2 + design remake**. Constraint honoured:
*files edited only, nothing run or built.*

### P0 — visible DM bugs
- **Replies now survive reload.** `MESSAGE_SELECT` in `server/db/social.js` joins the
  parent row and selects `reply_to`, `edited_at`, `deleted_at`; `mapMessageRow` builds the
  `reply` object, tombstones deleted rows and strips helper columns.
- **`replyTo` is no longer dropped in IPC.** `db.sendMessage` accepts + validates `replyTo`,
  `POST /v1/social/messages/:friendId` forwards it, and `electron/social.js`
  `social:sendMessage` passes it through. RelayPage no longer bypasses the optimistic hook.
- **DM edit / delete are wired end to end.** `useSocial` handles the `message:updated` SSE
  frame and exposes `editMessage` / `deleteMessage` (via `window.native.relay`);
  `MessageRow` has an inline editor, delete action, `edited` marker and tombstone bubble.

### P1
- **`group:read` handled** in `useRelayGroups` → own reads clear unread, peer reads feed
  `activeReadAt` which drives double-tick receipts on group messages.
- **DM reactions** confirmed working through `social.setMessageReaction`; the dead
  `MessageReactionBar.jsx` and its CSS were deleted.

### P2
- **Mute** per DM (`friends.muted`) and per group (existing prefs): suppresses unread badges,
  the global badge total and desktop notifications.
- **Server-side DM pins** (`friends.pinned`) replacing the old localStorage pin list.
- **Retry on failed send** for text, media and group messages (`social.retryMessage`).
- **Drag-and-drop upload with progress**: drop overlay on the conversation panel, real
  FileReader progress bar while staging, indeterminate bar while uploading.
- **Desktop notifications** for incoming DMs and group messages when the window is
  unfocused, respecting mute and notification permission.

### P3 cleanup
- Removed the unused `groupTyping` map / `TYPING_TTL` in `server/relay-routes.js`.
- Removed dead `.relay-group-row*` and reaction-bar CSS from `relay-groups.css`.

### Design remake
`/app/design_guidelines.json` (generated by the design agent) drives a rewritten
`RelayPage.css`: 284px rail, glass headers with 18px blur, dotted-grid conversation canvas,
hairline surfaces, brand-bound accents (`--brand*` so user themes still apply), asymmetric
bubbles with 4px tail corners, floating hover toolbars, staggered row entrances, shimmer
skeletons, custom 6px scrollbars, `data-motion="reduced"` support.

## Verification status
**NOT VERIFIED** — the user asked for file edits only (no run, no build) and will test in
the launcher themselves. Static checks done: `node --check` on all touched server/Electron
files, brace/paren balance on the new JSX. Dependencies are not installed in this
workspace, so no JSX parse/build check was possible.

## Backlog
- P1: group read receipts currently start empty until the first `group:read` frame — seed
  from `group_members.last_read_at` in the group summary.
- P2: message search across all conversations; pinned messages inside a thread.
- P2: per-notification sound + "mention only" mute mode.
- P3: de-duplicate `areFriends` / `isBlockedPair` / `mapMessageRow` between
  `server/db/social.js` and `server/db/relay.js`.

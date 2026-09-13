# Relay groups - wiring checklist

The group backend, IPC bridge, hook, modals and styles all ship as new files.
Three existing files need a few lines each to connect them. Nothing else in
`RelayPage.jsx`, `useSocial.js`, `server/server.js` or `server/db/social.js`
was modified.

## 1. `electron/main.js`

```js
const relayMod = require('./relay');
// ...next to the other init calls (socialMod.init(...), wardrobeMod.init(...)):
relayMod.init();
```

## 2. `electron/preload.js`

Add a `relay` namespace next to `social` inside the `contextBridge` object:

```js
relay: {
  getGroups: () => ipcRenderer.invoke('relay:getGroups'),
  getGroup: (id) => ipcRenderer.invoke('relay:getGroup', id),
  createGroup: (payload) => ipcRenderer.invoke('relay:createGroup', payload),
  updateGroup: (id, payload) => ipcRenderer.invoke('relay:updateGroup', id, payload),
  deleteGroup: (id) => ipcRenderer.invoke('relay:deleteGroup', id),
  leaveGroup: (id) => ipcRenderer.invoke('relay:leaveGroup', id),
  addMembers: (id, userIds) => ipcRenderer.invoke('relay:addMembers', id, userIds),
  removeMember: (id, userId) => ipcRenderer.invoke('relay:removeMember', id, userId),
  setMemberRole: (id, userId, role) => ipcRenderer.invoke('relay:setMemberRole', id, userId, role),
  setGroupPrefs: (id, prefs) => ipcRenderer.invoke('relay:setGroupPrefs', id, prefs),
  markGroupRead: (id) => ipcRenderer.invoke('relay:markGroupRead', id),
  setGroupTyping: (id, isTyping) => ipcRenderer.invoke('relay:setGroupTyping', id, isTyping),
  getGroupMessages: (id, options) => ipcRenderer.invoke('relay:getGroupMessages', id, options),
  sendGroupMessage: (id, payload) => ipcRenderer.invoke('relay:sendGroupMessage', id, payload),
  reactToGroupMessage: (messageId, reaction) => ipcRenderer.invoke('relay:reactToGroupMessage', messageId, reaction),
  editGroupMessage: (messageId, content) => ipcRenderer.invoke('relay:editGroupMessage', messageId, content),
  deleteGroupMessage: (messageId) => ipcRenderer.invoke('relay:deleteGroupMessage', messageId),
  getDirectMessages: (friendId, options) => ipcRenderer.invoke('relay:getDirectMessages', friendId, options),
  sendDirectMessage: (friendId, payload) => ipcRenderer.invoke('relay:sendDirectMessage', friendId, payload),
  editDirectMessage: (messageId, content) => ipcRenderer.invoke('relay:editDirectMessage', messageId, content),
  deleteDirectMessage: (messageId) => ipcRenderer.invoke('relay:deleteDirectMessage', messageId)
},
```

## 3. `src/features/social/RelayPage.jsx`

### Imports

```jsx
import useRelayGroups from './useRelayGroups';
import GroupCreateModal from './GroupCreateModal';
import GroupSettingsModal from './GroupSettingsModal';
import MessageReactionBar from './MessageReactionBar';
import ReplyQuote, { ReplyComposerBar } from './ReplyPreview';
import './relay-groups.css';
```

### Hook

```jsx
const relayGroups = useRelayGroups({ selfId: me?.id, selfName: me?.username });
const [createOpen, setCreateOpen] = useState(false);
const [settingsOpen, setSettingsOpen] = useState(false);
```

If your social event subscription lives in `RelayPage`, forward each frame:

```jsx
useEffect(() => social.subscribe?.((event) => relayGroups.handleSocialEvent(event)), [relayGroups]);
```

(The hook also auto-subscribes when `window.native.social.onEvent` exists, so
this is only needed if events are fanned out inside the page.)

### Inbox GROUPS section (replaces the current group rows)

```jsx
{relayGroups.groups.map((group) => (
  <button
    key={group.id}
    className={`relay-group-row${group.id === relayGroups.activeGroupId ? ' is-active' : ''}${group.muted ? ' is-muted' : ''}`}
    onClick={() => relayGroups.openGroup(group.id)}
  >
    <span className="relay-group-avatar">
      {group.iconUrl ? <img src={group.iconUrl} alt="" /> : <span>{group.name.slice(0, 2).toUpperCase()}</span>}
    </span>
    <span className="relay-group-row__name">{group.name}</span>
    <span className="relay-group-row__snippet">
      {group.lastMessage
        ? (group.lastMessage.isSystem
            ? <em>{group.lastMessage.content}</em>
            : `${group.lastMessage.senderId === me?.id ? 'You' : group.lastMessage.senderName}: ${group.lastMessage.content}`)
        : `${group.memberCount} members`}
    </span>
    <span className="relay-group-row__time">{formatTime(group.lastMessage?.createdAt || group.createdAt)}</span>
    {group.unreadCount > 0
      ? <span className="relay-group-row__badge">{group.unreadCount}</span>
      : <span className="relay-group-row__members">{group.memberCount}</span>}
  </button>
))}
```

### Message bubble additions

```jsx
{message.isSystem ? (
  <div className="relay-system-message">{message.content}</div>
) : (
  <div className="relay-message">
    <ReplyQuote reply={message.reply} selfId={me?.id} onJump={scrollToMessage} />
    {/* existing bubble body */}
    <MessageReactionBar
      reactions={message.reactions}
      selfId={me?.id}
      memberNames={memberNameMap}
      align={message.senderId === me?.id ? 'right' : 'left'}
      onToggle={(emoji) => relayGroups.toggleReaction(activeGroup.id, message.id, emoji)}
    />
  </div>
)}
```

Add "Reply" to the message context menu: `relayGroups.setReplyTarget(message)`.

### Composer

```jsx
<ReplyComposerBar target={relayGroups.replyTarget} selfId={me?.id} onCancel={relayGroups.clearReply} />
```

On send, call `relayGroups.sendGroupMessage(activeGroup.id, text)` for groups
(the staged reply is attached automatically). For DMs with replies, use
`window.native.relay.sendDirectMessage(friendId, { content, replyTo })`.

### Modals

```jsx
<GroupCreateModal
  open={createOpen}
  friends={social.friends}
  uploadMedia={social.uploadMedia}
  onClose={() => setCreateOpen(false)}
  onCreate={relayGroups.createGroup}
/>

<GroupSettingsModal
  open={settingsOpen}
  group={relayGroups.activeGroup}
  selfId={me?.id}
  friends={social.friends}
  uploadMedia={social.uploadMedia}
  onClose={() => setSettingsOpen(false)}
  onUpdateGroup={relayGroups.updateGroup}
  onAddMembers={relayGroups.addMembers}
  onKickMember={relayGroups.kickMember}
  onSetMemberRole={relayGroups.setMemberRole}
  onLeaveGroup={relayGroups.leaveGroup}
  onDeleteGroup={relayGroups.deleteGroup}
/>
```

Wire the existing "New group" plus button to `setCreateOpen(true)` and the group
chat header to `setSettingsOpen(true)`.

## 4. API reference

All routes are under `/v1/social/relay` and use the same session token as the
rest of the social API.

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/groups` | list with members, roles, unread, last message |
| POST | `/groups` | `{ name, iconUrl, description, memberIds }` |
| GET | `/groups/:id` | single group summary |
| POST | `/groups/:id/update` | `{ name?, iconUrl?, description? }` - admin |
| POST | `/groups/:id/members` | `{ userIds }` - admin |
| POST | `/groups/:id/members/remove` | `{ userId }` - kick, admin |
| POST | `/groups/:id/members/role` | `{ userId, role }` - owner |
| POST | `/groups/:id/leave` | promotes an heir, deletes if last member |
| POST | `/groups/:id/delete` | owner only |
| POST | `/groups/:id/prefs` | `{ pinned?, muted? }` - per member |
| POST | `/groups/:id/read` | read receipt |
| POST | `/groups/:id/typing` | `{ isTyping }` |
| GET | `/groups/:id/messages` | `?limit=50&before=<ms>&markRead=0` |
| POST | `/groups/:id/messages` | `{ content, mediaUrl?, replyTo? }` |
| POST | `/messages/:id/react` | `{ reaction }` - same emoji toggles off |
| POST | `/messages/:id/edit` | author only |
| POST | `/messages/:id/delete` | author or admin |
| GET | `/dm/:friendId/messages` | DM history including reply previews |
| POST | `/dm/:friendId/messages` | `{ content, replyTo? }` |
| POST | `/dm-messages/:id/edit` \| `/delete` | author only |

SSE event types added to the existing stream: `group:created`,
`group:updated`, `group:deleted`, `group:removed`, `group:message`,
`group:message:updated`, `group:message:reaction`, `group:typing`,
`group:read`, plus `message:updated` for DM edits and deletes.

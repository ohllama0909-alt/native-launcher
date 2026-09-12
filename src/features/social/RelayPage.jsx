import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, ChevronDown, ChevronRight, CirclePlus, Gift, Heart, Image, Menu, MessageCircle, Mic, Paperclip, Pin, Search, Send, Settings, ShoppingCart, Smile, User, UserPlus, Users, X } from 'lucide-react';
import './RelayPage.css';

const head = (user) => user?.uuid ? `https://mc-heads.net/avatar/${user.uuid}/64` : `https://mc-heads.net/avatar/${user?.name || 'MHF_Steve'}/64`;
const time = (stamp) => stamp ? new Date(stamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '';
const STORE = 'noctra-relay-v1';

function loadLocal() {
  try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch { return {}; }
}

export default function RelayPage({ initialFriend, onClose }) {
  const [friends, setFriends] = useState([]);
  const [selected, setSelected] = useState(initialFriend || null);
  const [messages, setMessages] = useState([]);
  const [groups, setGroups] = useState(() => loadLocal().groups || []);
  const [groupMessages, setGroupMessages] = useState(() => loadLocal().groupMessages || {});
  const [pinned, setPinned] = useState(() => loadLocal().pinned || []);
  const [favorites, setFavorites] = useState(() => loadLocal().favorites || []);
  const [inboxQuery, setInboxQuery] = useState('');
  const [messageQuery, setMessageQuery] = useState('');
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [collapsed, setCollapsed] = useState({ pinned: false, groups: false, direct: false });
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef(null);
  const fileRef = useRef(null);

  const isGroup = selected?.kind === 'group';

  const refreshFriends = async () => {
    const result = await window.native?.social?.getFriends?.();
    if (result?.friends) {
      setFriends(result.friends);
      if (!selected && result.friends[0]) setSelected(result.friends[0]);
    }
  };

  const refreshMessages = async () => {
    if (!selected?.id || isGroup) return;
    const result = await window.native?.social?.getMessages?.(selected.id, 100);
    if (result?.ok) setMessages(result.messages || []);
  };

  useEffect(() => { refreshFriends(); const timer = setInterval(refreshFriends, 12000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    if (!selected?.id) return;
    setError('');
    if (isGroup) setMessages(groupMessages[selected.id] || []);
    else refreshMessages();
    const timer = isGroup ? null : setInterval(refreshMessages, 4000);
    return () => timer && clearInterval(timer);
  }, [selected?.id, isGroup]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages.length, selected?.id]);
  useEffect(() => { localStorage.setItem(STORE, JSON.stringify({ groups, groupMessages, pinned, favorites })); }, [groups, groupMessages, pinned, favorites]);

  const allThreads = useMemo(() => [...groups, ...friends], [groups, friends]);
  const visible = (items) => items.filter((item) => (item.nickname || item.name).toLowerCase().includes(inboxQuery.trim().toLowerCase()));
  const pinnedThreads = visible(allThreads.filter((item) => pinned.includes(item.id)));
  const directThreads = visible(friends.filter((item) => !pinned.includes(item.id)));
  const groupThreads = visible(groups.filter((item) => !pinned.includes(item.id)));
  const shownMessages = messages.filter((item) => !messageQuery || String(item.content || '').toLowerCase().includes(messageQuery.toLowerCase()));

  const selectThread = (thread) => { setSelected(thread); setInput(''); setMenuOpen(false); };
  const toggle = (key) => setCollapsed((value) => ({ ...value, [key]: !value[key] }));
  const toggleList = (setter, id) => setter((value) => value.includes(id) ? value.filter((item) => item !== id) : [...value, id]);

  const send = async (event) => {
    event?.preventDefault();
    const content = input.trim();
    if (!content || !selected || sending) return;
    setSending(true); setError('');
    if (isGroup) {
      const item = { id: `local-${Date.now()}`, content, senderId: 'me', createdAt: Date.now(), isRead: 1 };
      const next = [...(groupMessages[selected.id] || []), item];
      setGroupMessages((value) => ({ ...value, [selected.id]: next }));
      setMessages(next); setInput('');
    } else {
      const result = await window.native?.social?.sendMessage?.(selected.id, content);
      if (result?.ok) { setMessages((value) => [...value, result.message]); setInput(''); }
      else setError(result?.error || 'Message could not be sent.');
    }
    setSending(false);
  };

  const createGroup = () => {
    const name = window.prompt('Group name');
    if (!name?.trim()) return;
    const group = { id: `group-${Date.now()}`, name: name.trim().slice(0, 32), kind: 'group', status: 'online', activity: `${selected ? 2 : 1} members` };
    setGroups((value) => [group, ...value]); setSelected(group); setMessages([]);
  };

  const attach = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('Attachments must be smaller than 5 MB.'); return; }
    setInput((value) => `${value}${value ? ' ' : ''}📎 ${file.name}`);
    event.target.value = '';
  };

  const Thread = ({ item }) => (
    <button type="button" className={`relay-thread ${selected?.id === item.id ? 'is-active' : ''}`} onClick={() => selectThread(item)}>
      <div className="relay-thread-avatar">
        {item.kind === 'group' ? <Users size={18} /> : <img src={head(item)} alt="" onError={(e) => { e.currentTarget.src = 'https://mc-heads.net/avatar/MHF_Steve/64'; }} />}
        <i className={`relay-presence ${item.status || 'offline'}`} />
        {item.unreadCount > 0 && <b>{item.unreadCount > 9 ? '9+' : item.unreadCount}</b>}
      </div>
      <span><strong>{item.nickname || item.name}</strong><small>{item.activity || (item.status === 'offline' ? 'Offline' : 'Online')}</small></span>
      <time>{item.lastSeen ? time(item.lastSeen) : ''}</time>
    </button>
  );

  const Section = ({ name, id, items }) => (
    <section className="relay-inbox-section">
      <button type="button" className="relay-section-title" onClick={() => toggle(id)}>{collapsed[id] ? <ChevronRight size={12} /> : <ChevronDown size={12} />}<span>{name}</span><i /></button>
      {!collapsed[id] && <div>{items.length ? items.map((item) => <Thread key={item.id} item={item} />) : <p className="relay-empty-section">No conversations</p>}</div>}
    </section>
  );

  return (
    <div className="relay-page" role="dialog" aria-label="Noctra Relay">
      <aside className="relay-inbox">
        <div className="relay-inbox-head"><h1>Noctra Relay</h1><div><Search size={14} /><input value={inboxQuery} onChange={(e) => setInboxQuery(e.target.value)} placeholder="Search inbox..." /><button type="button" onClick={createGroup} title="New group"><CirclePlus size={15} /></button></div></div>
        <div className="relay-inbox-scroll">
          <Section name="Pinned" id="pinned" items={pinnedThreads} />
          <Section name="Groups" id="groups" items={groupThreads} />
          <Section name="Direct Messages" id="direct" items={directThreads} />
        </div>
      </aside>

      <main className="relay-conversation">
        <header className="relay-conversation-head">
          <div className="relay-peer">
            <div>{selected?.kind === 'group' ? <Users size={20} /> : <img src={head(selected)} alt="" onError={(e) => { e.currentTarget.src = 'https://mc-heads.net/avatar/MHF_Steve/64'; }} />}<i className={`relay-presence ${selected?.status || 'offline'}`} /></div>
            <span><strong>{selected?.nickname || selected?.name || 'Select a conversation'}</strong><small>{selected?.activity || 'No conversation selected'}</small></span>
          </div>
          <label className="relay-message-search"><Search size={14} /><input value={messageQuery} onChange={(e) => setMessageQuery(e.target.value)} placeholder="Search in conversation..." /></label>
          <div className="relay-head-actions">
            <button className={pinned.includes(selected?.id) ? 'is-active' : ''} onClick={() => selected && toggleList(setPinned, selected.id)} title="Pin conversation"><Pin size={15} /></button>
            <button className={favorites.includes(selected?.id) ? 'is-active' : ''} onClick={() => selected && toggleList(setFavorites, selected.id)} title="Favorite"><Heart size={15} /></button>
            <button onClick={createGroup} title="Create group"><UserPlus size={15} /></button>
            <button onClick={() => fileRef.current?.click()} title="Share media"><Image size={15} /></button>
            <button onClick={() => setMenuOpen((value) => !value)} title="Conversation menu"><Menu size={17} /></button>
            <button onClick={onClose} title="Close Relay"><X size={17} /></button>
          </div>
          {menuOpen && <div className="relay-menu"><button onClick={() => selected && toggleList(setPinned, selected.id)}><Pin size={14} /> Pin conversation</button><button onClick={createGroup}><Users size={14} /> New group</button><button onClick={() => setMenuOpen(false)}><Settings size={14} /> Conversation settings</button></div>}
        </header>

        <div className="relay-message-stream">
          {!selected && <div className="relay-welcome"><MessageCircle size={36} /><h2>Your conversations, uninterrupted.</h2><p>Select a friend or create a group to start using Noctra Relay.</p></div>}
          {selected && shownMessages.length === 0 && <div className="relay-welcome"><MessageCircle size={30} /><h2>Start the conversation</h2><p>Messages with {selected.nickname || selected.name} will appear here.</p></div>}
          {shownMessages.map((message, index) => {
            const mine = isGroup ? message.senderId === 'me' : message.senderId !== selected.id;
            const previous = shownMessages[index - 1];
            const divider = previous && new Date(previous.createdAt).toDateString() !== new Date(message.createdAt).toDateString();
            return <React.Fragment key={message.id}>{divider && <div className="relay-date"><span>{new Date(message.createdAt).toLocaleDateString([], { day: 'numeric', month: 'long' })}</span></div>}<div className={`relay-message ${mine ? 'is-mine' : ''}`}><div><p>{message.content}</p><span>{time(message.createdAt)} {mine && '✓✓'}</span></div></div></React.Fragment>;
          })}
          <div ref={endRef} />
        </div>

        <form className="relay-composer" onSubmit={send}>
          {error && <div className="relay-error">{error}</div>}
          <input ref={fileRef} type="file" accept="image/*,.txt,.log,.zip" hidden onChange={attach} />
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={selected ? `Type Message to ${selected.nickname || selected.name}...` : 'Select a conversation...'} disabled={!selected} maxLength={2000} />
          <div><button type="button" onClick={() => setInput((value) => `${value}${value ? ' ' : ''}🎁`)} title="Send gift"><Gift size={15} /></button><button type="button" onClick={() => setInput((value) => `${value}${value ? ' ' : ''}😊`)} title="Emoji"><Smile size={15} /></button><button type="button" title="Voice message" onClick={() => setError('Voice messages are not available on this device.')}><Mic size={15} /></button><button type="button" onClick={() => fileRef.current?.click()} title="Attach"><Paperclip size={15} /></button><button type="submit" className="relay-send" disabled={!selected || !input.trim() || sending}><Send size={15} /></button></div>
        </form>
      </main>
    </div>
  );
}

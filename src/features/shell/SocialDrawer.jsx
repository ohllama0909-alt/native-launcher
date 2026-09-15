import React, { useMemo, useState } from 'react';
import { ChevronRight, MessageSquare, Search, UserRoundPlus, Users } from 'lucide-react';
import RelayAvatar from '../social/RelayAvatar.jsx';
import './SocialDrawer.css';

const presenceOf = (friend) => {
  const status = String(friend.status || (friend.online ? 'online' : 'offline')).toLowerCase();
  if (status === 'in-game') return { online: true, tone: 'game', label: friend.activity || friend.serverAddress || 'Playing Minecraft' };
  if (['online', 'in-launcher', 'in-menus'].includes(status)) return { online: true, tone: 'launcher', label: friend.activity || 'In Noctra' };
  return { online: false, tone: 'offline', label: friend.lastSeen ? 'Recently active' : 'Offline' };
};

function FriendRow({ item, onOpen }) {
  const presence = presenceOf(item);
  return <button type="button" className={`friend-row ${presence.online ? '' : 'is-offline'}`} onClick={() => onOpen?.(item)}>
    <div className="friend-avatar"><RelayAvatar name={item.name} skinUrl={item.skinUrl} size={32}/><i className={presence.tone}/></div>
    <span><b>{item.nickname || item.name}</b><small className={presence.tone}>{presence.label}</small></span>
    {item.unreadCount > 0
      ? <i className="message-alert">{item.unreadCount > 9 ? '9+' : item.unreadCount}</i>
      : <MessageSquare size={13} strokeWidth={1.7}/>
    }
  </button>;
}

export default function SocialDrawer({ friends, account, requests = 0, onOpenRelay }) {
  const [query, setQuery] = useState('');
  const visibleFriends = useMemo(() => {
    const source = friends?.length ? friends : [];
    const term = query.trim().toLowerCase();
    return source.filter((friend) => !term || (friend.nickname || friend.name || '').toLowerCase().includes(term));
  }, [friends, query]);
  const online = visibleFriends.filter((friend) => presenceOf(friend).online);
  const offline = visibleFriends.filter((friend) => !presenceOf(friend).online);
  return <aside className="social-drawer">
    <div className="social-tabs"><div><span>Social</span><b>Friends</b></div><button type="button" onClick={() => onOpenRelay?.()} aria-label="Open Relay"><Users size={15}/><em>{friends?.length || 0}</em></button></div>
    <button type="button" className="social-requests" onClick={() => onOpenRelay?.()}><span><UserRoundPlus size={14}/> Friend requests</span>{requests > 0 ? <b>{requests} new</b> : <ChevronRight size={14}/>}</button>
    <div className="social-search"><Search size={12}/><input aria-label="Find a player" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search friends"/><button type="button" onClick={() => onOpenRelay?.()} aria-label="Add friend"><UserRoundPlus size={14}/></button></div>
    <div className="social-rule"/>
    <div className="friend-scroll">
      {online.length ? <><small className="social-count">Active now <b>{online.length}</b></small>{online.map(item => <FriendRow key={item.id || item.name} item={item} onOpen={onOpenRelay}/>)}</> : null}
      {offline.length ? <><small className="social-count offline-count">Offline <b>{offline.length}</b></small>{offline.map(item => <FriendRow key={item.id || item.name} item={item} onOpen={onOpenRelay}/>)}</> : null}
      {!visibleFriends.length ? <div className="social-empty"><span><UserRoundPlus size={18}/></span><strong>{query ? 'No matches' : 'Build your party'}</strong><p>{query ? 'Try another player name.' : 'Friends and their game activity will appear here.'}</p><button type="button" onClick={() => onOpenRelay?.()}>Open Relay</button></div> : null}
    </div>
    <button type="button" className="social-open-relay" onClick={() => onOpenRelay?.()}><MessageSquare size={14}/><span>Open Relay</span><ChevronRight size={14}/></button>
  </aside>;
}

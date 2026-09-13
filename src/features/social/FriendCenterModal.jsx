import { useEffect, useMemo, useState } from 'react';
import { Check, Clock3, Search, UserCheck, UserPlus, Users, X, XCircle } from 'lucide-react';
import RelayAvatar from './RelayAvatar.jsx';
import './FriendCenterModal.css';

const formatRequestTime = (stamp) => {
  if (!stamp) return 'Pending';
  const elapsed = Math.max(0, Date.now() - Number(stamp));
  if (elapsed < 60_000) return 'Just now';
  if (elapsed < 3_600_000) return `${Math.floor(elapsed / 60_000)}m ago`;
  if (elapsed < 86_400_000) return `${Math.floor(elapsed / 3_600_000)}h ago`;
  return `${Math.floor(elapsed / 86_400_000)}d ago`;
};

export default function FriendCenterModal({ open, social, onClose, onOpenFriend }) {
  const received = social?.requests?.received || [];
  const sent = social?.requests?.sent || [];
  const [tab, setTab] = useState('add');
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    if (!open) return undefined;
    setTab(received.length ? 'incoming' : 'add');
    setQuery('');
    setNotice(null);
    social?.refresh?.();
    const onKey = (event) => event.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (!open || tab !== 'add') return undefined;
    const clean = query.trim();
    if (clean.length < 2) {
      social?.searchPlayers?.('');
      return undefined;
    }
    const timer = setTimeout(() => social?.searchPlayers?.(clean), 250);
    return () => clearTimeout(timer);
  }, [open, tab, query, social?.searchPlayers]);

  const friendIds = useMemo(() => new Set((social?.friends || []).map((friend) => friend.id)), [social?.friends]);
  const sentIds = useMemo(() => new Set(sent.map((request) => request.userId)), [sent]);
  const incomingByUser = useMemo(() => new Map(received.map((request) => [request.userId, request])), [received]);

  if (!open) return null;

  const respond = async (request, action) => {
    setBusyId(request.id);
    setNotice(null);
    const result = await social?.respondRequest?.(request.id, action);
    setBusyId(null);
    if (!result?.ok) setNotice({ type: 'error', text: result?.error || 'Could not update that request.' });
    else if (action === 'accept') setNotice({ type: 'success', text: `${request.name} is now your friend.` });
  };

  const send = async (player) => {
    setBusyId(player.id);
    setNotice(null);
    const result = await social?.sendRequest?.(player.name);
    setBusyId(null);
    if (!result?.ok) setNotice({ type: 'error', text: result?.error || 'Could not send the friend request.' });
    else setNotice({ type: 'success', text: result.mutual ? `${player.name} is now your friend.` : `Friend request sent to ${player.name}.` });
  };

  const renderRequest = (request, incoming) => (
    <div className="friend-center-row" key={request.id}>
      <RelayAvatar name={request.name} skinUrl={request.skinUrl} size={38} />
      <div className="friend-center-row__identity">
        <strong>{request.name}</strong>
        <span>{incoming ? 'Incoming friend request' : `Sent ${formatRequestTime(request.createdAt)}`}</span>
      </div>
      <div className="friend-center-row__actions">
        {incoming ? (
          <>
            <button className="friend-center-action is-accept" disabled={busyId === request.id} onClick={() => respond(request, 'accept')} title="Accept request"><Check size={17} /></button>
            <button className="friend-center-action" disabled={busyId === request.id} onClick={() => respond(request, 'decline')} title="Decline request"><X size={16} /></button>
          </>
        ) : (
          <button className="friend-center-cancel" disabled={busyId === request.id} onClick={() => respond(request, 'cancel')}><XCircle size={14} /> Cancel</button>
        )}
      </div>
    </div>
  );

  return (
    <div className="friend-center-scrim" onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}>
      <div className="friend-center" role="dialog" aria-modal="true" aria-label="Friends">
        <aside className="friend-center-nav">
          <div className="friend-center-brand"><Users size={18} /><span>Friends</span></div>
          <button className={tab === 'add' ? 'is-active' : ''} onClick={() => setTab('add')}><UserPlus size={16} /> Add friend</button>
          <button className={tab === 'incoming' ? 'is-active' : ''} onClick={() => setTab('incoming')}><UserCheck size={16} /> Requests {received.length > 0 && <b>{received.length}</b>}</button>
          <button className={tab === 'sent' ? 'is-active' : ''} onClick={() => setTab('sent')}><Clock3 size={16} /> Sent {sent.length > 0 && <b>{sent.length}</b>}</button>
          <p>Connect using an exact Noctra or Minecraft username.</p>
        </aside>

        <section className="friend-center-content">
          <header className="friend-center-head">
            <div>
              <h2>{tab === 'add' ? 'Add a friend' : tab === 'incoming' ? 'Friend requests' : 'Sent requests'}</h2>
              <p>{tab === 'add' ? 'Search for players and send a request.' : tab === 'incoming' ? 'Accept or decline people who want to connect.' : 'Requests waiting for a response.'}</p>
            </div>
            <button className="friend-center-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
          </header>

          {notice && <div className={`friend-center-notice is-${notice.type}`}>{notice.text}</div>}

          {tab === 'add' && (
            <>
              <label className="friend-center-search">
                <Search size={16} />
                <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by username" maxLength={32} />
                {social?.searchLoading && <span className="friend-center-spinner" />}
              </label>
              <div className="friend-center-list">
                {query.trim().length < 2 ? (
                  <div className="friend-center-empty"><UserPlus size={28} /><strong>Find your crew</strong><span>Enter at least 2 characters to search.</span></div>
                ) : !social?.searchLoading && !(social?.searchResults || []).length ? (
                  <div className="friend-center-empty"><Search size={28} /><strong>No players found</strong><span>Check the spelling and try the exact username.</span></div>
                ) : (social?.searchResults || []).map((player) => {
                  const incoming = incomingByUser.get(player.id);
                  const isFriend = friendIds.has(player.id);
                  const isSent = sentIds.has(player.id);
                  return (
                    <div className="friend-center-row" key={player.id}>
                      <RelayAvatar name={player.name} skinUrl={player.skinUrl} size={38} />
                      <div className="friend-center-row__identity"><strong>{player.name}</strong><span>Noctra player</span></div>
                      {isFriend ? <button className="friend-center-status" onClick={() => onOpenFriend?.(player.id)}>Friends</button>
                        : incoming ? <button className="friend-center-primary" disabled={busyId === incoming.id} onClick={() => respond(incoming, 'accept')}>Accept</button>
                          : isSent ? <span className="friend-center-status">Request sent</span>
                            : <button className="friend-center-primary" disabled={busyId === player.id} onClick={() => send(player)}><UserPlus size={14} /> Add</button>}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {tab === 'incoming' && <div className="friend-center-list">{received.length ? received.map((request) => renderRequest(request, true)) : <div className="friend-center-empty"><UserCheck size={28} /><strong>You’re all caught up</strong><span>New requests will appear here instantly.</span></div>}</div>}
          {tab === 'sent' && <div className="friend-center-list">{sent.length ? sent.map((request) => renderRequest(request, false)) : <div className="friend-center-empty"><Clock3 size={28} /><strong>No pending requests</strong><span>Requests you send will appear here.</span></div>}</div>}
        </section>
      </div>
    </div>
  );
}

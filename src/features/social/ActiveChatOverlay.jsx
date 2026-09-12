import React, { useState, useEffect, useRef } from 'react';
import { ExternalLink, X, Paperclip, Smile, Send, CheckCheck } from 'lucide-react';
import RelayPage from './RelayPage.jsx';
import './ActiveChatOverlay.css';

function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function ActiveChatOverlay({ friend, messages = [], loading = false, onSendMessage, onClose, onOpenRelay }) {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [relayOpen, setRelayOpen] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  useEffect(() => {
    setInput('');
    setSending(false);
  }, [friend?.id]);

  if (!friend) return null;
  if (relayOpen) return <RelayPage initialFriend={friend} onClose={() => setRelayOpen(false)} />;

  const handleSend = async (e) => {
    e.preventDefault();
    const content = input.trim();
    if (!content || sending) return;
    setSending(true);
    const result = await onSendMessage(content);
    if (result?.ok) setInput('');
    setSending(false);
  };

  const avatarUrl = friend.uuid
    ? `{{https://mc-heads.net/avatar/${friend.uuid}}}/64`
    : `{{https://mc-heads.net/avatar/${friend.name}}}/64`;

  const openRelay = () => {
    setRelayOpen(true);
    onOpenRelay?.();
  };

  return (
    <div className="active-chat-overlay" onClick={(e) => e.stopPropagation()}>
      <div className="chat-overlay-header">
        <div className="chat-overlay-friend-info">
          <div className="chat-overlay-avatar-wrap">
            <img src={avatarUrl} alt={friend.name} className="chat-overlay-avatar" onError={(e) => { e.currentTarget.src = 'https://mc-heads.net/avatar/MHF_Steve/64'; }} />
            <span className={`chat-status-dot ${friend.status}`} />
          </div>
          <div className="chat-overlay-text">
            <span className="chat-friend-name">{friend.nickname || friend.name}</span>
            <span className="chat-friend-activity">{friend.activity || (friend.status === 'in-game' ? 'In-game' : friend.status === 'online' ? 'Online' : 'Offline')}</span>
          </div>
        </div>
        <div className="chat-overlay-header-actions">
          <button type="button" className="chat-open-relay-btn" onClick={openRelay} title="Open full Noctra Relay communication hub"><span>Open Relay</span><ExternalLink size={13} /></button>
          <button type="button" className="chat-close-btn" onClick={onClose} aria-label="Close fast-chat"><X size={15} /></button>
        </div>
      </div>

      <div className="chat-overlay-messages" aria-live="polite">
        {messages.length === 0 && !loading && <div className="chat-overlay-empty"><p>No messages yet with <b>{friend.nickname || friend.name}</b></p><span>Say hello!</span></div>}
        {messages.map((msg) => {
          const isMe = msg.senderId !== friend.id;
          return <div key={msg.id} className={`chat-message-row ${isMe ? 'is-outgoing' : 'is-incoming'}`}><div className="chat-bubble"><p className="chat-bubble-text">{msg.content}</p><div className="chat-bubble-meta"><span className="chat-time">{formatTime(msg.createdAt)}</span>{isMe && <CheckCheck size={12} className="chat-receipt-icon" aria-label={msg.isRead ? 'Read' : 'Delivered'} />}</div></div></div>;
        })}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="chat-overlay-footer">
        <input type="text" className="chat-message-input" value={input} onChange={(e) => setInput(e.target.value)} placeholder={`Type Message to ${friend.nickname || friend.name}...`} maxLength={2000} autoFocus />
        <div className="chat-footer-buttons">
          <button type="button" className="chat-action-btn" title="Attach file (coming soon)" disabled><Paperclip size={15} /></button>
          <button type="button" className="chat-action-btn" title="Add emoji" onClick={() => setInput((prev) => `${prev}${prev ? ' ' : ''}😊`)}><Smile size={15} /></button>
          <button type="submit" className={`chat-send-btn ${input.trim() ? 'can-send' : ''}`} disabled={!input.trim() || sending} aria-label="Send message"><Send size={14} /></button>
        </div>
      </form>
    </div>
  );
}

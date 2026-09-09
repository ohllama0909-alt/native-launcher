import React from 'react';
import Icon from '../../components/ui/Icon.jsx';
import './NotificationDrawer.css';

export default function NotificationDrawer({
  open,
  onClose,
  notifications = [],
  onClear
}) {
  if (!open) return null;

  return (
    <>
      <div className="notifications-drawer-backdrop" onClick={onClose} />
      <div className="notifications-drawer-panel" onClick={(e) => e.stopPropagation()}>
        <div className="notifications-header">
          <span className="notifications-title">Notifications</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {notifications.length > 0 && (
              <button className="sub-btn" onClick={onClear}>
                Clear All
              </button>
            )}
            <button className="icon-ctrl-btn" onClick={onClose}>
              <Icon name="x" size={16} />
            </button>
          </div>
        </div>

        <div className="notifications-list">
          {notifications.length === 0 ? (
            <div className="tab-empty-placeholder">
              <Icon name="bell-01" size={28} />
              <p>No new notifications</p>
              <span>You're all caught up!</span>
            </div>
          ) : (
            notifications.map((n) => (
              <div key={n.id} className="notif-item">
                <span className="notif-item-title">{n.title}</span>
                <p className="notif-item-body">{n.body}</p>
                <span className="notif-item-time">{n.time}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

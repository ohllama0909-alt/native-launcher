import React, { useEffect, useRef } from 'react';
import Icon from './Icon.jsx';
import './ContextMenu.css';

export default function ContextMenu({ x, y, title, items = [], onClose }) {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Ensure menu stays within window bounds
  const adjustedX = Math.min(x, window.innerWidth - 200);
  const adjustedY = Math.min(y, window.innerHeight - (items.length * 36 + 60));

  return (
    <>
      <div className="context-menu-backdrop" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />
      <div
        ref={menuRef}
        className="context-menu-popup"
        style={{ left: `${Math.max(10, adjustedX)}px`, top: `${Math.max(10, adjustedY)}px` }}
      >
        {title && <div className="context-menu-title">{title}</div>}
        {items.map((item, idx) => (
          <button
            key={idx}
            className="context-menu-item"
            onClick={() => {
              item.action();
              onClose();
            }}
          >
            {item.icon && <Icon name={item.icon} size={15} />}
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </>
  );
}

import React from 'react';
import { ArrowRight, CheckCircle2, Home, Lock } from 'lucide-react';
import Logo from './Logo.jsx';
import './NoctraAccountGate.css';

export default function NoctraAccountGate({ feature = 'locker', onOpenAccountSwitcher, onBackHome }) {
  const isLocker = feature === 'locker';

  return (
    <div className="noctra-account-gate" role="region" aria-label={isLocker ? 'Noctra Locker Restricted' : 'Noctra Relay Restricted'}>
      <div className="gate-ambient-glow" aria-hidden="true" />

      <div className="gate-card">
        <div className="gate-icon-badge">
          <Logo height={32} variant="mark" />
          <span className="gate-lock-corner" aria-hidden="true">
            <Lock size={12} strokeWidth={2.6} />
          </span>
        </div>

        <span className="gate-pill">
          {isLocker ? 'Noctra Locker Exclusive' : 'Noctra Relay Exclusive'}
        </span>

        <h2 className="gate-title">
          {isLocker
            ? 'Noctra Locker is exclusive to Noctra Accounts'
            : 'Relay is exclusive to Noctra Accounts'}
        </h2>

        <p className="gate-subtitle">
          {isLocker
            ? 'Custom skins, HD capes, and real-time wardrobe cloud sync are exclusively available on Noctra accounts. Sign in or register a Noctra account to unlock your locker.'
            : 'Group chats, direct messaging, rich presence, and server joins require a Noctra account. Sign in or register a Noctra account to connect with friends.'}
        </p>

        <div className="gate-features">
          {isLocker ? (
            <>
              <div className="gate-feature-item">
                <CheckCircle2 size={16} className="gate-feature-icon" />
                <div className="gate-feature-text">
                  <strong>Custom Skins & HD Capes</strong>
                  <small>Upload and wear custom skins with Classic or Slim player models.</small>
                </div>
              </div>
              <div className="gate-feature-item">
                <CheckCircle2 size={16} className="gate-feature-icon" />
                <div className="gate-feature-text">
                  <strong>Instant Cloud Sync</strong>
                  <small>Wardrobe states sync automatically to your CustomSkinLoader instances.</small>
                </div>
              </div>
              <div className="gate-feature-item">
                <CheckCircle2 size={16} className="gate-feature-icon" />
                <div className="gate-feature-text">
                  <strong>Cloud Wardrobe Storage</strong>
                  <small>Save and organize your favorite outfits across all your computers.</small>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="gate-feature-item">
                <CheckCircle2 size={16} className="gate-feature-icon" />
                <div className="gate-feature-text">
                  <strong>Direct & Group Messaging</strong>
                  <small>Real-time encrypted chat with rich replies, reactions, and file sharing.</small>
                </div>
              </div>
              <div className="gate-feature-item">
                <CheckCircle2 size={16} className="gate-feature-icon" />
                <div className="gate-feature-text">
                  <strong>Live Presence & Quick Join</strong>
                  <small>See when friends are online and jump right into their game servers.</small>
                </div>
              </div>
              <div className="gate-feature-item">
                <CheckCircle2 size={16} className="gate-feature-icon" />
                <div className="gate-feature-text">
                  <strong>Party Invites & Chimes</strong>
                  <small>Never miss a message with desktop notifications and audio chimes.</small>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="gate-actions">
          <button
            type="button"
            className="gate-btn-primary"
            onClick={onOpenAccountSwitcher}
          >
            <Logo height={16} variant="mark" />
            <span>Sign In with Noctra</span>
            <ArrowRight size={14} />
          </button>
          <button
            type="button"
            className="gate-btn-secondary"
            onClick={onBackHome}
          >
            <Home size={14} />
            <span>Back to Home</span>
          </button>
        </div>
      </div>
    </div>
  );
}

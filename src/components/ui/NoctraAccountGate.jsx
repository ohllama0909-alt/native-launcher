import React from 'react';
import { LogIn } from 'lucide-react';
import mascotImg from '../../assets/noctra-account-required.png';
import './NoctraAccountGate.css';

export default function NoctraAccountGate({ feature = 'locker', onOpenAccountSwitcher, onBackHome }) {
  const isLocker = feature === 'locker';

  const subtitle = isLocker
    ? 'Sign in with a Noctra account to customize your skins and capes.'
    : feature === 'relay'
    ? 'Sign in with a Noctra account to chat with friends.'
    : 'Sign in with a Noctra account to customize your public profile.';

  return (
    <div
      className="noctra-account-gate"
      role="region"
      aria-label="Noctra account required"
    >
      <div className="gate-content">
        <img
          src={mascotImg}
          alt=""
          className="gate-mascot"
          draggable="false"
          width={188}
          height={197}
        />

        <h2 className="gate-title">Noctra account required</h2>

        <p className="gate-subtitle">{subtitle}</p>

        <button
          type="button"
          className="gate-btn-signin"
          onClick={onOpenAccountSwitcher}
        >
          <LogIn size={18} strokeWidth={2.4} aria-hidden="true" />
          <span>Sign in</span>
        </button>

        {onBackHome && (
          <button
            type="button"
            className="gate-btn-home"
            onClick={onBackHome}
          >
            Back to Home
          </button>
        )}
      </div>
    </div>
  );
}

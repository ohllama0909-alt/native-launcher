import React from 'react';
import './Badges.css';

/**
 * High-quality vector SVG badge icons inspired by Icons8 & Discord badge design.
 */
export const BADGE_DEFS = {
  developer: {
    id: 'developer',
    name: 'Active Developer',
    description: 'Verified Noctra Core Developer',
    gradient: 'linear-gradient(135deg, #5865f2 0%, #3ba55d 100%)',
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M8.5 4.5a3 3 0 0 0-3 3v.5a2 2 0 0 1-2 2H3a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h.5a2 2 0 0 1 2 2v.5a3 3 0 0 0 3 3h.5a2 2 0 0 1 2 2v.5a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-.5a2 2 0 0 1 2-2h.5a3 3 0 0 0 3-3v-.5a2 2 0 0 1 2-2H21a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1h-.5a2 2 0 0 1-2-2V7.5a3 3 0 0 0-3-3h-.5a2 2 0 0 1-2-2V2a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v.5a2 2 0 0 1-2 2h-.5Z"
          fill="#5865F2"
          opacity="0.25"
        />
        <path
          d="m9.5 8.5-3.5 3.5 3.5 3.5M14.5 8.5l3.5 3.5-3.5 3.5M13 7l-2 10"
          stroke="#5865F2"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  },
  early_supporter: {
    id: 'early_supporter',
    name: 'Early Supporter',
    description: 'Supported Noctra Client in its earliest days',
    gradient: 'linear-gradient(135deg, #f47b67 0%, #faa61a 100%)',
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35Z"
          fill="url(#earlySupporterGrad)"
        />
        <defs>
          <linearGradient id="earlySupporterGrad" x1="2" y1="3" x2="22" y2="21.35" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F47B67" />
            <stop offset="1" stopColor="#FAA61A" />
          </linearGradient>
        </defs>
      </svg>
    )
  },
  bug_hunter: {
    id: 'bug_hunter',
    name: 'Bug Hunter',
    description: 'Found and reported crucial launcher bugs',
    gradient: 'linear-gradient(135deg, #3ba55d 0%, #57f287 100%)',
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M19 13v-2c0-1.1-.9-2-2-2h-.36A6.97 6.97 0 0 0 12 5a6.97 6.97 0 0 0-4.64 2H7c-1.1 0-2 .9-2 2v2c0 .34.09.66.24.95L3.41 15.78a1 1 0 1 0 1.41 1.41L6.7 15.32c.38.4.82.74 1.3 1.01V19a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-2.67c.48-.27.92-.61 1.3-1.01l1.88 1.88a1 1 0 1 0 1.41-1.41l-1.83-1.83c.15-.29.24-.61.24-.97ZM12 7a4.98 4.98 0 0 1 4.7 3.32H7.3A4.98 4.98 0 0 1 12 7Zm3 12H9v-1.22a6.97 6.97 0 0 0 6 0V19Z"
          fill="#57F287"
        />
      </svg>
    )
  },
  staff: {
    id: 'staff',
    name: 'Noctra Staff',
    description: 'Official Noctra Client Staff Team',
    gradient: 'linear-gradient(135deg, #5865f2 0%, #eb459e 100%)',
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M12 2 4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3Zm6 9.09c0 4-2.55 7.7-6 8.83-3.45-1.13-6-4.82-6-8.83V6.31l6-2.25 6 2.25v4.78Z"
          fill="#EB459E"
        />
        <path d="M10 12.5 8.5 11l-1.4 1.4L10 15.3l7-7-1.4-1.4L10 12.5Z" fill="#FFF" />
      </svg>
    )
  },
  verified: {
    id: 'verified',
    name: 'Verified',
    description: 'Verified player identity',
    gradient: 'linear-gradient(135deg, #23a55a 0%, #5865f2 100%)',
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="m23 12-2.44-2.79.34-3.69-3.61-.82-1.89-3.2L12 2.96 8.6 1.5 6.71 4.69 3.1 5.5l.34 3.7L1 12l2.44 2.79-.34 3.7 3.61.82L8.6 22.5l3.4-1.47 3.4 1.46 1.89-3.19 3.61-.82-.34-3.69L23 12Zm-12.91 4.72-3.8-3.81 1.48-1.48 2.32 2.33 5.85-5.87 1.48 1.48-7.33 7.35Z"
          fill="#5865F2"
        />
      </svg>
    )
  }
};

/**
 * Returns badge IDs for a given user entity.
 * Automatically gives Developer, Early Supporter, Bug Hunter to OhLlama.
 */
export function getUserBadges(user) {
  const name = String(user?.name || user?.username || user?.nickname || '').toLowerCase().trim();
  const badgesSet = new Set();

  // OhLlama is the creator/core developer
  if (name === 'ohllama' || name === 'ohllama0909') {
    badgesSet.add('developer');
    badgesSet.add('early_supporter');
    badgesSet.add('bug_hunter');
  }

  // Handle explicit badges from user data (array or JSON string)
  let rawBadges = user?.badges;
  if (typeof rawBadges === 'string') {
    try { rawBadges = JSON.parse(rawBadges); } catch { rawBadges = []; }
  }
  if (Array.isArray(rawBadges)) {
    for (const b of rawBadges) {
      if (BADGE_DEFS[b]) badgesSet.add(b);
    }
  }

  return Array.from(badgesSet);
}

export default function Badges({ user, size = 18, showEmpty = false }) {
  const badgeKeys = getUserBadges(user);
  if (!badgeKeys.length && !showEmpty) return null;

  return (
    <div className="noctra-badges-strip" role="group" aria-label="User Badges">
      {badgeKeys.map((key) => {
        const badge = BADGE_DEFS[key];
        if (!badge) return null;
        return (
          <div key={key} className="noctra-badge-item" title={`${badge.name} • ${badge.description}`}>
            <span className="noctra-badge-icon" style={{ width: size, height: size }}>
              {badge.icon}
            </span>
          </div>
        );
      })}
    </div>
  );
}

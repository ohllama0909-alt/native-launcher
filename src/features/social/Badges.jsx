import React from 'react';
import developerBadge from '../../assets/badges/developer.png';
import earlySupporterBadge from '../../assets/badges/early-supporter.png';
import bugHunterBadge from '../../assets/badges/bug-hunter.png';
import staffBadge from '../../assets/badges/staff.png';
import verifiedBadge from '../../assets/badges/verified.png';
import './Badges.css';

const badgeIcon = (src) => <img src={src} alt="" aria-hidden="true" draggable="false"/>;

export const BADGE_DEFS = {
  developer: {
    id: 'developer',
    name: 'Active Developer',
    description: 'Verified Noctra Core Developer',
    gradient: 'linear-gradient(135deg, #5865f2 0%, #3ba55d 100%)',
    icon: badgeIcon(developerBadge)
  },
  early_supporter: {
    id: 'early_supporter',
    name: 'Early Supporter',
    description: 'Supported Noctra Client in its earliest days',
    gradient: 'linear-gradient(135deg, #f47b67 0%, #faa61a 100%)',
    icon: badgeIcon(earlySupporterBadge)
  },
  bug_hunter: {
    id: 'bug_hunter',
    name: 'Bug Hunter',
    description: 'Found and reported crucial launcher bugs',
    gradient: 'linear-gradient(135deg, #3ba55d 0%, #57f287 100%)',
    icon: badgeIcon(bugHunterBadge)
  },
  staff: {
    id: 'staff',
    name: 'Noctra Staff',
    description: 'Official Noctra Client Staff Team',
    gradient: 'linear-gradient(135deg, #5865f2 0%, #eb459e 100%)',
    icon: badgeIcon(staffBadge)
  },
  verified: {
    id: 'verified',
    name: 'Verified',
    description: 'Verified player identity',
    gradient: 'linear-gradient(135deg, #23a55a 0%, #5865f2 100%)',
    icon: badgeIcon(verifiedBadge)
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

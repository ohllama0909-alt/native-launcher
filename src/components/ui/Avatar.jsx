import React from 'react';
import PlayerAvatar from './PlayerAvatar.jsx';

/**
 * Backwards-compatible wrapper.
 *
 * The old implementation hit mc-heads.net directly with a bare <img>, which
 * meant offline accounts (no UUID) always showed Steve and every mount
 * re-requested the render. PlayerAvatar goes through the cached IPC bridge
 * instead and falls back to a username lookup.
 */
export default function Avatar({
  uuid,
  name,
  account,
  size = 60,
  kind = 'avatar',
  className = '',
  style
}) {
  return (
    <PlayerAvatar
      uuid={uuid}
      name={name}
      account={account}
      size={size}
      kind={kind}
      className={className}
      style={style}
    />
  );
}

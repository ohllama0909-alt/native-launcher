/**
 * Player skin renders.
 *
 * The service resolves either a UUID or a plain username, which is the reason
 * offline accounts (they never get a UUID) can still show their real skin
 * instead of falling back to Steve.
 */

const SKIN_SERVICE = 'https://mc-heads.net';

/** Render kind -> pixel size requested from the service. */
export const SKIN_RENDER_SIZES = {
  avatar: 128,
  head: 180,
  bust: 220,
  body: 260
};

export function skinRenderUrl(kind, identifier) {
  const safeKind = Object.prototype.hasOwnProperty.call(SKIN_RENDER_SIZES, kind)
    ? kind
    : 'avatar';
  const size = SKIN_RENDER_SIZES[safeKind];
  return [SKIN_SERVICE, safeKind, encodeURIComponent(identifier), size].join('/');
}

/** Normalises an account into something the render service understands. */
export function skinIdentifier(account, uuid, name) {
  const rawUuid = uuid ?? account?.uuid ?? null;
  if (rawUuid) {
    const cleaned = String(rawUuid).replace(/-/g, '');
    if (/^[0-9a-fA-F]{32}$/.test(cleaned)) return cleaned;
  }

  const rawName = name ?? account?.name ?? '';
  if (/^[A-Za-z0-9_]{2,16}$/.test(rawName) && rawName.toLowerCase() !== 'guest') {
    return rawName;
  }

  return null;
}

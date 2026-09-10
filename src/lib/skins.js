/* ============================================================
   Native — player renders

   Only rendered head/avatar images are used. The raw skin PNG is
   never shown, so the UI can't flash a flat texture before the
   rendered image arrives.
   ============================================================ */

export const SKIN_SERVICE = 'https://mc-heads.net';

export const FALLBACK_SKIN = 'MHF_Steve';

export const SKIN_RENDER_SIZES = {
  avatar: 128,
  head: 128
};

const KIND_PATHS = {
  avatar: '/avatar/',
  head: '/head/'
};

/** Older callers used bust/body renders; those now fall back to a flat avatar. */
export function normalizeKind(kind) {
  return kind === 'head' ? 'head' : 'avatar';
}

/** Works with an account object, a bare uuid, or a bare username. */
export function skinIdentifier(account, uuid, name) {
  const raw =
    account?.uuid ||
    account?.id ||
    uuid ||
    account?.name ||
    name ||
    FALLBACK_SKIN;

  const value = String(raw).trim();
  if (!value || value === 'guest') return FALLBACK_SKIN;

  // mc-heads accepts both dashed and undashed uuids, but undashed is safer.
  return value.replace(/-/g, '');
}

/** Legacy alias kept for existing imports. */
export const accountIdentifier = skinIdentifier;

export function skinRenderUrl(kind, identifier, size) {
  const safeKind = normalizeKind(kind);
  const path = KIND_PATHS[safeKind];
  const pixels = Number(size) > 0 ? Math.round(Number(size)) : SKIN_RENDER_SIZES[safeKind];
  const id = encodeURIComponent(identifier || FALLBACK_SKIN);

  return SKIN_SERVICE + path + id + '/' + pixels;
}

export function fallbackSkinFor(kind = 'avatar', size) {
  return skinRenderUrl(kind, FALLBACK_SKIN, size);
}

/* ---------- preload cache ---------- */

const readyUrls = new Set();
const failedUrls = new Set();
const pending = new Map();

export function isAvatarReady(url) {
  return Boolean(url) && readyUrls.has(url);
}

export function didAvatarFail(url) {
  return Boolean(url) && failedUrls.has(url);
}

/**
 * Resolves once the image is decoded and safe to paint. Repeat calls for the
 * same url share one request, so switching accounts back and forth is instant.
 */
export function preloadAvatar(url) {
  if (!url) return Promise.resolve(false);
  if (readyUrls.has(url)) return Promise.resolve(true);
  if (failedUrls.has(url)) return Promise.resolve(false);
  if (pending.has(url)) return pending.get(url);

  const task = new Promise((resolve) => {
    if (typeof Image === 'undefined') {
      resolve(false);
      return;
    }

    const image = new Image();
    image.decoding = 'async';

    image.onload = () => {
      readyUrls.add(url);
      resolve(true);
    };

    image.onerror = () => {
      failedUrls.add(url);
      resolve(false);
    };

    image.src = url;
  }).finally(() => {
    pending.delete(url);
  });

  pending.set(url, task);
  return task;
}

/** Warm the cache for every signed-in account so the drawer opens instantly. */
export function preloadAccountAvatars(accounts = [], size = 64) {
  accounts.forEach((account) => {
    preloadAvatar(skinRenderUrl('avatar', skinIdentifier(account), size));
  });
}

/* ---------- locker helpers ---------- */

/** Read a dropped/selected File as a data URL (renderer only). */
export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Could not read that file.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Classic (4px arms) or slim (3px arms)?
 *
 * In the 64x64 layout the right arm occupies x=40..56 for classic skins and
 * x=40..55 for slim ones, so the column at x=54..55 is only opaque on classic
 * textures. Anything unreadable falls back to classic — the user can still
 * flip the model in the locker.
 */
export function detectSkinModel(dataUrl) {
  return new Promise((resolve) => {
    if (typeof document === 'undefined' || !dataUrl) {
      resolve('classic');
      return;
    }
    const image = new Image();
    image.onload = () => {
      try {
        if (image.naturalWidth !== 64 || image.naturalHeight !== 64) {
          resolve('classic');
          return;
        }
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        context.drawImage(image, 0, 0);
        const { data } = context.getImageData(54, 20, 2, 12);
        let opaque = 0;
        for (let i = 3; i < data.length; i += 4) {
          if (data[i] > 8) opaque += 1;
        }
        resolve(opaque > 0 ? 'classic' : 'slim');
      } catch {
        resolve('classic');
      }
    };
    image.onerror = () => resolve('classic');
    image.src = dataUrl;
  });
}

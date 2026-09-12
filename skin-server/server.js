const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const path = require('path');
const authDb = require('./auth-db');
const { sendVerificationCodeEmail } = require('./mailer');

/**
 * Noctra wardrobe API (CustomSkinLoader "CustomSkinAPI" backend).
 *
 *   GET  /health
 *   GET  /csl/:username.json        -> { username, skins: { default, slim }, capes: { default } }
 *   GET  /csl/textures/:sha256      -> the stored PNG
 *   POST /v1/wardrobe               -> publish the active outfit (Bearer sync key)
 *
 * CustomSkinLoader reads the profile document and expects **absolute texture
 * URLs**, so the response is built from the public origin — `NATIVE_SKIN_PUBLIC_URL`
 * when set, otherwise the request's own host (works behind the nginx proxy in
 * scripts/api.nativelaunch.xyz.nginx, and locally on 127.0.0.1:3418).
 */

const PORT = Number(process.env.NATIVE_SKIN_PORT || 3418);
const DATA_DIR = path.resolve(process.env.NATIVE_SKIN_DATA || path.join(__dirname, 'data'));
const PUBLIC_URL = (process.env.NATIVE_SKIN_PUBLIC_URL || '').replace(/\/+$/, '');
const profilesDir = path.join(DATA_DIR, 'profiles');
const texturesDir = path.join(DATA_DIR, 'textures');
const requests = new Map();

function send(res, status, value, headers = {}) {
  const body = Buffer.isBuffer(value) ? value : Buffer.from(typeof value === 'string' ? value : JSON.stringify(value));
  res.writeHead(status, {
    'Content-Type': Buffer.isBuffer(value) ? 'image/png' : 'application/json; charset=utf-8',
    'Content-Length': body.length,
    'Cache-Control': status === 200 ? 'public, max-age=90' : 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Access-Control-Allow-Origin': '*',
    ...headers
  });
  res.end(body);
}

function usernameOf(value) {
  const name = String(value || '').trim();
  if (!/^[A-Za-z0-9_]{3,16}$/.test(name)) throw new Error('Invalid Minecraft username.');
  return name;
}

function pngBuffer(value) {
  if (value == null || value === '') return null;
  const raw = String(value).replace(/^data:image\/png;base64,/i, '');
  const data = Buffer.from(raw, 'base64');
  if (data.length <= 24 || data.length > 5 * 1024 * 1024) throw new Error('Invalid PNG size.');
  if (!data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) throw new Error('Invalid PNG texture.');
  return data;
}

function atomicWrite(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;
  fs.writeFileSync(temporary, data);
  fs.renameSync(temporary, filePath);
}

function textureHash(buffer) {
  if (!buffer) return null;
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');
  const target = path.join(texturesDir, hash);
  if (!fs.existsSync(target)) atomicWrite(target, buffer);
  return hash;
}

function profilePath(username) {
  return path.join(profilesDir, `${username.toLowerCase()}.json`);
}

function readProfile(username) {
  try { return JSON.parse(fs.readFileSync(profilePath(username), 'utf8')); } catch { return null; }
}

function allowed(ip) {
  const now = Date.now();
  const item = requests.get(ip) || { start: now, count: 0 };
  if (now - item.start > 60_000) { item.start = now; item.count = 0; }
  item.count += 1;
  requests.set(ip, item);
  return item.count <= 60;
}

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 12 * 1024 * 1024) throw new Error('Request is too large.');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

/** Public origin for texture URLs: explicit override, then proxy headers. */
function originOf(req) {
  if (PUBLIC_URL) return PUBLIC_URL;
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const proto = forwardedProto || (req.socket.encrypted ? 'https' : 'http');
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || `127.0.0.1:${PORT}`).split(',')[0].trim();
  return `${proto}://${host}`;
}

const textureUrl = (origin, hash) => (hash ? `${origin}/csl/textures/${hash}` : null);

/** CustomSkinLoader's CustomSkinAPI document. */
function customSkinProfile(profile, origin) {
  const skin = textureUrl(origin, profile.skin);
  const cape = textureUrl(origin, profile.cape);
  const slim = profile.model === 'slim';

  const skins = {};
  if (skin) {
    // CSL picks `slim` for slim player models and `default` otherwise; publish
    // the texture under the matching key and keep the other one absent.
    if (slim) skins.slim = skin;
    else skins.default = skin;
  }

  const capes = {};
  if (cape) capes.default = cape;

  return {
    username: profile.username,
    model: profile.model || 'default',
    skins,
    capes,
    // Flat duplicates keep simple clients (and debugging) working.
    skin,
    cape,
    updatedAt: profile.updatedAt
  };
}

async function handler(req, res) {
  try {
    const url = new URL(req.url, 'http://localhost');
    const ip = req.headers['cf-connecting-ip'] || req.socket.remoteAddress || 'unknown';
    if (!allowed(ip)) return send(res, 429, { error: 'Too many requests.' }, { 'Retry-After': '60' });

    if (req.method === 'OPTIONS') {
      return send(res, 204, '', {
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Max-Age': '600'
      });
    }

    if (req.method === 'GET' && url.pathname === '/health') {
      return send(res, 200, { ok: true, service: 'native-wardrobe', api: 2, providers: ['customskinapi'] });
    }

    // CustomSkinLoader accepts hash files too (".json" without the extension is
    // what some builds request).
    const profileMatch = url.pathname.match(/^\/csl\/([A-Za-z0-9_]{3,16})(?:\.json)?$/);
    if (req.method === 'GET' && profileMatch) {
      const profile = readProfile(profileMatch[1]);
      if (!profile) return send(res, 404, { error: 'Profile not found.' });
      const etag = `W/"${profile.updatedAt || 'static'}"`;
      if (req.headers['if-none-match'] === etag) return send(res, 304, '', { ETag: etag });
      return send(res, 200, customSkinProfile(profile, originOf(req)), { ETag: etag });
    }

    const textureMatch = url.pathname.match(/^\/csl\/textures\/([a-f0-9]{64})$/);
    if (req.method === 'GET' && textureMatch) {
      const target = path.join(texturesDir, textureMatch[1]);
      if (!fs.existsSync(target)) return send(res, 404, { error: 'Texture not found.' });
      return send(res, 200, fs.readFileSync(target), {
        'Cache-Control': 'public, max-age=31536000, immutable',
        ETag: `"${textureMatch[1]}"`
      });
    }

    if (req.method === 'POST' && url.pathname === '/v1/wardrobe') {
      const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
      if (token.length < 32) return send(res, 401, { error: 'Missing wardrobe key.' });
      const body = await readJson(req);
      const username = usernameOf(body.username);
      const existing = readProfile(username);
      const authHash = crypto.createHash('sha256').update(token).digest('hex');
      if (existing?.authHash && !crypto.timingSafeEqual(Buffer.from(existing.authHash, 'hex'), Buffer.from(authHash, 'hex'))) {
        return send(res, 403, { error: 'This wardrobe belongs to another key.' });
      }

      // A null skin/cape clears that slot; anything else must be a valid PNG.
      const skin = body.skin === null || body.skin === undefined ? null : textureHash(pngBuffer(body.skin));
      const cape = body.cape === null || body.cape === undefined ? null : textureHash(pngBuffer(body.cape));
      const profile = {
        username,
        model: body.model === 'slim' ? 'slim' : 'default',
        skin: skin ?? existing?.skin ?? null,
        cape: cape ?? existing?.cape ?? null,
        authHash,
        updatedAt: new Date().toISOString()
      };
      atomicWrite(profilePath(username), JSON.stringify(profile, null, 2));
      return send(res, 200, {
        ok: true,
        username,
        model: profile.model,
        skins: profile.skin ? [profile.skin] : [],
        capes: profile.cape ? [profile.cape] : [],
        profile: customSkinProfile(profile, originOf(req))
      });
    }

    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400'
      });
      return res.end();
    }

    if (req.method === 'POST' && url.pathname === '/v1/auth/register/send-code') {
      const body = await readJson(req);
      const email = String(body.email || '').trim().toLowerCase();
      const rawUsername = String(body.username || '').trim();

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return send(res, 400, { ok: false, error: 'Please enter a valid email address.' });
      }
      if (rawUsername) {
        try { usernameOf(rawUsername); } catch {
          return send(res, 400, { ok: false, error: 'Username must be 3-16 letters, numbers, or underscores.' });
        }
        if (authDb.getUserByUsername(rawUsername)) {
          return send(res, 400, { ok: false, error: 'This Minecraft username is already registered.' });
        }
      }
      if (authDb.getUserByEmail(email)) {
        return send(res, 400, { ok: false, error: 'An account with this email already exists.' });
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      authDb.saveVerificationCode(email, code);

      try {
        await sendVerificationCodeEmail(email, code, rawUsername);
      } catch (err) {
        console.error('SendGrid email error:', err);
        return send(res, 500, { ok: false, error: `Could not send verification email: ${err.message}` });
      }

      return send(res, 200, { ok: true, message: 'Verification code sent.' });
    }

    if (req.method === 'POST' && url.pathname === '/v1/auth/register/verify') {
      const body = await readJson(req);
      const email = String(body.email || '').trim().toLowerCase();
      const code = String(body.code || '').trim();
      const username = usernameOf(body.username);
      const password = String(body.password || '');
      const model = body.model === 'slim' ? 'slim' : 'classic';

      if (!password || password.length < 6) {
        return send(res, 400, { ok: false, error: 'Password must be at least 6 characters long.' });
      }

      if (!authDb.checkVerificationCode(email, code)) {
        return send(res, 400, { ok: false, error: 'Invalid or expired verification code.' });
      }

      if (authDb.getUserByEmail(email)) {
        return send(res, 400, { ok: false, error: 'An account with this email already exists.' });
      }
      if (authDb.getUserByUsername(username)) {
        return send(res, 400, { ok: false, error: 'This Minecraft username is already taken.' });
      }

      const user = authDb.createUser({ email, username, password, model });
      authDb.clearVerificationCode(email);
      const session = authDb.createSession(user.id);

      return send(res, 200, {
        ok: true,
        token: session.token,
        account: {
          id: user.id,
          name: user.username,
          email: user.email,
          uuid: user.uuid,
          type: 'noctra',
          model: user.model,
          token: session.token
        }
      });
    }

    if (req.method === 'POST' && url.pathname === '/v1/auth/login') {
      const body = await readJson(req);
      const login = String(body.login || body.email || body.username || '').trim();
      const password = String(body.password || '');

      if (!login || !password) {
        return send(res, 400, { ok: false, error: 'Username/Email and password are required.' });
      }

      const user = authDb.getUserByLogin(login);
      if (!user || !authDb.verifyPassword(password, user.password_hash, user.salt)) {
        return send(res, 401, { ok: false, error: 'Invalid username/email or password.' });
      }

      const session = authDb.createSession(user.id);
      return send(res, 200, {
        ok: true,
        token: session.token,
        account: {
          id: user.id,
          name: user.username,
          email: user.email,
          uuid: user.uuid,
          type: 'noctra',
          model: user.model,
          token: session.token
        }
      });
    }

    if (req.method === 'POST' && url.pathname === '/v1/auth/resend-code') {
      const body = await readJson(req);
      const email = String(body.email || '').trim().toLowerCase();
      const username = String(body.username || '').trim();

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return send(res, 400, { ok: false, error: 'Please enter a valid email address.' });
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      authDb.saveVerificationCode(email, code);

      try {
        await sendVerificationCodeEmail(email, code, username);
      } catch (err) {
        return send(res, 500, { ok: false, error: `Could not send verification email: ${err.message}` });
      }

      return send(res, 200, { ok: true, message: 'New code sent.' });
    }

    if (req.method === 'GET' && url.pathname === '/v1/auth/backup') {
      const backup = authDb.backupDatabase();
      const data = fs.readFileSync(backup.path);
      return send(res, 200, data, {
        'Content-Type': 'application/x-sqlite3',
        'Content-Disposition': `attachment; filename="${backup.filename}"`
      });
    }

    return send(res, 404, { error: 'Not found.' });
  } catch (error) {
    return send(res, 400, { error: error.message || 'Invalid request.' });
  }
}

function createServer() {
  return http.createServer(handler);
}

function listen(port = PORT, host = '0.0.0.0') {
  fs.mkdirSync(profilesDir, { recursive: true });
  fs.mkdirSync(texturesDir, { recursive: true });
  const server = createServer();
  return new Promise((resolve) => {
    server.listen(port, host, () => resolve(server));
  });
}

if (require.main === module) {
  fs.mkdirSync(profilesDir, { recursive: true });
  fs.mkdirSync(texturesDir, { recursive: true });
  createServer().listen(PORT, '127.0.0.1', () =>
    console.log(`Noctra wardrobe API listening on 127.0.0.1:${PORT}`)
  );
}

module.exports = { createServer, handler, listen, usernameOf, pngBuffer, customSkinProfile, originOf, textureHash, DATA_DIR };

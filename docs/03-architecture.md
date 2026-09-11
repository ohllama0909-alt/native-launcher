# Noctra Client — Technical Architecture

Target stack: **Electron + React 19 + TypeScript + Vite**, with a small
**Node/Fastify + Postgres** backend for the Noctra-branded services.

---

## 1. Why this stack

| Requirement from the mockups | Why Electron/React wins |
|---|---|
| 3D skin viewer with capes, orbit, animation | `three.js` + `skinview3d` are battle-tested in the browser; no native 3D work |
| Full messenger (Relay) with media | Web layout + WebSocket is the cheapest path to a Discord-class UI |
| Exactly reproducing this design system | CSS variables, `backdrop-filter`, grain overlays, staggered CSS animation |
| Spawning the JVM, file/zip/hash work | Node in the main process (`child_process`, `worker_threads`, streams) |
| Auto-update, custom frameless chrome, deep links | `electron-updater`, `BrowserWindow({frame:false})`, `app.setAsDefaultProtocolClient` |
| Cross-platform Win/macOS/Linux | One codebase, `electron-builder` targets nsis/dmg/AppImage+deb |

Tauri would ship smaller binaries but costs a Rust rewrite of the launch
pipeline and loses the mature Electron auto-update/crash tooling. Revisit only
if install size becomes a product requirement.

**Pinned choices**

| Concern | Choice |
|---|---|
| Bundler | Vite + `electron-vite` |
| UI | React 19, TypeScript strict |
| Styling | Tailwind v4 with the design tokens as `@theme`, plus CSS modules for complex panels |
| Animation | `motion` (Framer Motion) for React, raw CSS for entrance stagger |
| Routing | `react-router` (memory router) |
| Server state | TanStack Query |
| Client state | Zustand (slices: auth, profiles, launch, presence, relay, settings) |
| Forms | react-hook-form + zod |
| Icons | `lucide-react` + a bespoke nav-rail set as SVG sprites |
| 3D | `three` + `skinview3d` |
| Local DB | SQLite via `better-sqlite3` (profiles, gallery index, message cache) |
| Minecraft auth | `msmc` — default vanilla client ID for development, own allowlisted client ID for release |
| Secrets | `keytar` / Electron `safeStorage` for refresh tokens |
| Logging | `electron-log` with rotating files |
| Errors | Sentry (main + renderer), opt-in |
| Tests | Vitest (unit), Playwright + `@playwright/test` Electron driver (e2e) |
| Packaging | `electron-builder`, signed on Win + notarised on macOS |

---

## 2. Repository layout

```
noctra/
├─ design/                         # source mockups (read-only reference)
├─ docs/                           # this documentation
├─ packages/
│  ├─ app/                         # Electron application
│  │  ├─ electron.vite.config.ts
│  │  ├─ src/
│  │  │  ├─ main/                          # ── main process ──
│  │  │  │  ├─ index.ts                    # app bootstrap, single-instance lock
│  │  │  │  ├─ window.ts                   # frameless BrowserWindow + traffic lights
│  │  │  │  ├─ ipc/                        # one file per channel namespace
│  │  │  │  │  ├─ auth.ipc.ts
│  │  │  │  │  ├─ profiles.ipc.ts
│  │  │  │  │  ├─ launch.ipc.ts
│  │  │  │  │  ├─ content.ipc.ts           # mods/shaders/worlds/resourcepacks
│  │  │  │  │  ├─ locker.ipc.ts
│  │  │  │  │  ├─ gallery.ipc.ts
│  │  │  │  │  ├─ cloud.ipc.ts
│  │  │  │  │  └─ system.ipc.ts            # window controls, shell, paths, updates
│  │  │  │  ├─ auth/
│  │  │  │  │  ├─ provider.ts                # msmc wrapper; client ID is config
│  │  │  │  │  ├─ errors.ts                  # XErr / 403 → human messages
│  │  │  │  │  ├─ offline.ts                 # offline profile + offline UUID
│  │  │  │  │  └─ store.ts                   # safeStorage-backed token vault
│  │  │  │  ├─ game/
│  │  │  │  │  ├─ manifest.ts              # version_manifest_v2 + per-version JSON
│  │  │  │  │  ├─ assets.ts                # asset index + object download
│  │  │  │  │  ├─ libraries.ts             # natives, rules, classifier extraction
│  │  │  │  │  ├─ loaders/{fabric,forge,neoforge,quilt}.ts
│  │  │  │  │  ├─ java.ts                  # detect + managed JRE provisioning
│  │  │  │  │  ├─ classpath.ts
│  │  │  │  │  ├─ argbuilder.ts            # ${auth_player_name} etc. substitution
│  │  │  │  │  ├─ downloader.ts            # p-queue, sha1 verify, resume, retries
│  │  │  │  │  ├─ runner.ts                # spawn JVM, stream stdout/stderr
│  │  │  │  │  └─ crash.ts                 # exit-code + crash-report parsing
│  │  │  │  ├─ content/
│  │  │  │  │  ├─ jarmeta.ts               # read fabric.mod.json / mods.toml from a jar
│  │  │  │  │  ├─ scanner.ts               # index mods/shaders/worlds/resourcepacks
│  │  │  │  │  └─ modrinth.ts              # API v2 client + version resolution
│  │  │  │  ├─ gallery/
│  │  │  │  │  ├─ watcher.ts               # chokidar on screenshots dir
│  │  │  │  │  ├─ sidecar.ts               # read/write capture metadata JSON
│  │  │  │  │  └─ thumbs.ts                # sharp thumbnail cache
│  │  │  │  ├─ cloud/sync.ts               # Noctra Cloud sync engine
│  │  │  │  ├─ presence/socket.ts          # Friends Service WebSocket
│  │  │  │  ├─ db/                         # better-sqlite3 + migrations
│  │  │  │  └─ updater.ts
│  │  │  ├─ preload/index.ts               # contextBridge → window.noctra
│  │  │  ├─ shared/                        # types + zod schemas used by BOTH sides
│  │  │  │  ├─ ipc-contract.ts
│  │  │  │  ├─ models.ts
│  │  │  │  └─ events.ts
│  │  │  └─ renderer/                      # ── renderer ──
│  │  │     ├─ main.tsx
│  │  │     ├─ styles/{tokens.css,global.css,grain.png}
│  │  │     ├─ app/{router.tsx,providers.tsx}
│  │  │     ├─ components/
│  │  │     │  ├─ primitives/              # Button, Input, Toggle, Slider, Select,
│  │  │     │  │                           # Checkbox, Radio, Segmented, Badge, Chip,
│  │  │     │  │                           # Tooltip, Modal, Popover, ContextMenu,
│  │  │     │  │                           # Skeleton, ProgressBar, Avatar, Dropzone
│  │  │     │  ├─ shell/{TitleBar,NavRail,SocialRail,Bloom,Grain}.tsx
│  │  │     │  └─ patterns/{SectionLabel,ListRow,StatCard,CloudSyncIndicator,Banner,EmptyState}.tsx
│  │  │     ├─ features/
│  │  │     │  ├─ auth/                    # LoginScreen, DeviceCodeCard
│  │  │     │  ├─ home/                    # GreetingHero, LaunchButton, NewsFeed,
│  │  │     │  │                           # LatestProfiles, Partners, PromoCards
│  │  │     │  ├─ versions/                # VersionGrid, VersionCard, PatchDropdown
│  │  │     │  ├─ profile/                 # ProfilePanel + Loader|Mods|Shaders|
│  │  │     │  │                           # Worlds|Resources|Advanced tabs
│  │  │     │  ├─ friends/                 # FriendsPage, RequestsTab, ChatOverlay,
│  │  │     │  │                           # FriendContextMenu
│  │  │     │  ├─ relay/                   # Inbox, Conversation, Composer, Attachment
│  │  │     │  ├─ locker/                  # SkinViewer, CapeCarousel, ImportDialog
│  │  │     │  ├─ gallery/                 # MediaGrid, Lightbox, SmartFilters
│  │  │     │  ├─ discover/                # Modrinth browser
│  │  │     │  ├─ settings/                # tabs incl. StorageTab, AboutTab
│  │  │     │  └─ system/                  # CrashModal, UpdateBanner, OfflineBanner
│  │  │     ├─ stores/                     # zustand slices
│  │  │     ├─ hooks/
│  │  │     └─ i18n/en.json                # = docs/05-copy-deck.md
│  │  └─ resources/{icons,art,fonts}
│  └─ server/                       # Noctra backend
│     └─ src/
│        ├─ index.ts                # Fastify
│        ├─ modules/
│        │  ├─ identity/            # link Minecraft UUID → Noctra account, JWT
│        │  ├─ friends/             # friends, requests, blocks
│        │  ├─ presence/            # WS gateway + Redis presence
│        │  ├─ relay/               # conversations, messages, attachments
│        │  ├─ cloud/               # S3-compatible storage, quota, manifests
│        │  ├─ locker/              # skin/cape library metadata
│        │  ├─ content/             # news, changelog, partners, featured mods
│        │  └─ telemetry/           # opt-in crash + usage
│        └─ db/                     # Prisma schema + migrations
└─ .github/workflows/{ci.yml,release.yml}
```

---

## 3. Process boundaries

**Main process owns** all filesystem, network to Mojang/Modrinth, token storage,
the JVM child process, SQLite, and the presence socket.
**Renderer owns** nothing privileged: `contextIsolation: true`,
`nodeIntegration: false`, `sandbox: true`, strict CSP, `webSecurity` on.
External links open via `shell.openExternal` only after an allow-list check.

### 3.1 IPC contract (typed, zod-validated both ways)

```ts
// shared/ipc-contract.ts — request/response channels
export type Invoke = {
  'auth:begin':        () => { userCode: string; verificationUri: string };
  'auth:poll':         () => AuthResult;                 // pending | success | error
  'auth:session':      () => Session | null;
  'auth:logout':       () => void;

  'profiles:list':     () => Profile[];
  'profiles:create':   (d: ProfileDraft) => Profile;
  'profiles:update':   (id: string, patch: Partial<Profile>) => Profile;
  'profiles:delete':   (id: string) => void;
  'profiles:duplicate':(id: string) => Profile;

  'versions:manifest': (opts?: { includeSnapshots?: boolean }) => VersionIndex;
  'loaders:list':      (loader: LoaderKind, mc: string) => LoaderVersion[];

  'launch:start':      (profileId: string) => { taskId: string };
  'launch:cancel':     (taskId: string) => void;
  'launch:kill':       (profileId: string) => void;
  'launch:preflight':  (profileId: string) => PreflightReport;  // java, disk, ram, mods

  'content:scan':      (profileId: string, kind: ContentKind) => ContentItem[];
  'content:toggle':    (profileId: string, itemId: string, enabled: boolean) => void;
  'content:import':    (profileId: string, kind: ContentKind, paths: string[]) => ContentItem[];
  'content:delete':    (profileId: string, itemId: string) => void;
  'content:reveal':    (profileId: string, itemId: string) => void;

  'modrinth:search':   (q: ModrinthQuery) => ModrinthSearchResult;
  'modrinth:versions': (projectId: string, mc: string, loader: LoaderKind) => ModrinthVersion[];
  'modrinth:install':  (profileId: string, versionId: string) => ContentItem[];  // + deps

  'locker:skins':      () => Skin[];
  'locker:import':     (path: string, model: 'classic'|'slim', name: string) => Skin;
  'locker:apply':      (skinId: string) => void;
  'locker:capes':      () => Cape[];
  'locker:applyCape':  (capeId: string | null) => void;

  'gallery:list':      (f: GalleryFilter) => { items: Capture[]; total: number };
  'gallery:setDir':    (path: string) => void;
  'gallery:reveal':    (id: string) => void;
  'gallery:delete':    (ids: string[]) => void;

  'cloud:status':      () => CloudStatus;   // usage breakdown + lastSynced per domain
  'cloud:sync':        (domain: CloudDomain) => void;
  'cloud:prefs':       (patch: Partial<SyncPrefs>) => SyncPrefs;

  'crash:last':        (profileId: string) => CrashReport | null;
  'crash:copyLog':     (id: string) => void;
  'crash:openLog':     (id: string) => void;

  'system:window':     (a: 'minimize'|'maximize'|'close') => void;
  'system:paths':      () => AppPaths;
  'system:update':     (a: 'check'|'install') => UpdateStatus;
};

// main → renderer push events
export type Events = {
  'launch:progress': { taskId: string; phase: LaunchPhase; file?: string;
                       bytesDone: number; bytesTotal: number };
  'launch:state':    { profileId: string; state: LaunchState; pid?: number };
  'launch:crashed':  CrashReport;
  'net:status':      { online: boolean; services: Record<string, 'up'|'down'> };
  'presence:update': FriendPresence[];
  'relay:message':   RelayMessage;
  'relay:typing':    { conversationId: string; userId: string };
  'cloud:progress':  { domain: CloudDomain; done: number; total: number };
  'gallery:added':   Capture;
  'update:available':{ version: string };
};
```

Rule: the renderer never constructs a filesystem path or a Mojang URL. It only
sends IDs and receives view models.

---

## 4. Authentication

### 4.0 Implementation: `msmc` first, own client ID later

Do **not** hand-roll the five hops below at the start of the project. Use
[`msmc`](https://www.npmjs.com/package/msmc) (Hanro50), which implements the
whole chain, token refresh and an Electron launch mode:

```ts
import { Auth } from "msmc";

const auth  = new Auth("select_account");
const xbox  = await auth.launch("electron");   // opens the MS login window
const mc    = await xbox.getMinecraft();
const creds = mc.mclc();                        // access token, uuid, name → argbuilder
```

`msmc` **bundles the vanilla Minecraft launcher's client ID**, so calling
`new Auth()` with no `MStoken` authenticates real Microsoft accounts with **no
Azure registration and no approval wait**. That is what unblocks Phases 2–6 on
day 1.

**Why approval is still required for release.** The gate is not Azure, it is
Minecraft Services: hop 4 (`POST /authentication/login_with_xbox`) returns
`403 Invalid app registration` unless the client ID sits on Microsoft's
**manual allowlist**. There is no self-service bypass in the Entra portal.
`msmc`'s default works purely because it borrows an already-allowlisted ID.

| | msmc default ID | Own approved ID |
|---|---|---|
| Development / personal use | Works immediately | — |
| Public release | Not officially sanctioned; revocable at any time | The legitimate path |
| MS consent screen branding | reads *Minecraft Launcher* | reads *Noctra* |

**The swap** is a one-liner once the allowlist request lands — pass an
`MStoken` to the constructor:

```ts
new Auth({ client_id: process.env.NOCTRA_CLIENT_ID, redirect: "http://localhost:5123/callback" });
```

Register the app as **Mobile and desktop applications** against the
`consumers` tenant (personal Microsoft accounts) with scope
`XboxLive.signin offline_access`, then submit the Minecraft AppID registration
form — see roadmap task 0.1. Keep the abstraction behind
`main/auth/provider.ts` so neither path leaks into the rest of the codebase.

### 4.1 Microsoft / Xbox → Minecraft (5 hops)

Reference only — `msmc` performs all of this for you. Understand it so you can
debug failures and map errors to the UI.

```
1. Azure AD OAuth              → Microsoft access_token + refresh_token
   scope: XboxLive.signin offline_access
   flow:  device code (preferred — no embedded browser, survives MFA)
          POST https://login.microsoftonline.com/consumers/oauth2/v2.0/devicecode
          POST https://login.microsoftonline.com/consumers/oauth2/v2.0/token  (poll)
2. Xbox Live user auth         → XBL token + uhs
   POST https://user.auth.xboxlive.com/user/authenticate
        RpsTicket: d=<ms_access_token>, RelyingParty: http://auth.xboxlive.com
3. XSTS authorization          → XSTS token
   POST https://xsts.auth.xboxlive.com/xsts/authorize
        RelyingParty: rp://api.minecraftservices.com/
   known error XErr: 2148916233 (no Xbox account), 2148916238 (child account)
4. Minecraft services login    → minecraft access_token (24 h)
   POST https://api.minecraftservices.com/authentication/login_with_xbox
        identityToken: "XBL3.0 x=<uhs>;<xsts_token>"
5. Entitlement + profile
   GET  https://api.minecraftservices.com/entitlements/mcstore
   GET  https://api.minecraftservices.com/minecraft/profile   → uuid, name, skins, capes
```

**Storage:** the Microsoft `refresh_token` is the only long-lived secret →
Electron `safeStorage.encryptString` into `userData/auth.bin` (DPAPI on Windows,
Keychain on macOS, libsecret on Linux). Never the renderer, never plain JSON.
On boot: silent refresh; on failure show the re-auth modal and block launching.

**Blocker to schedule early — but no longer a hard stop.** Shipping publicly
requires a client ID on the Minecraft Services allowlist, and that review is
manual and slow. Submit the request in Phase 0 regardless, then keep building
against `msmc`'s default client ID (§4.0) so nothing waits on it. Follow up via
`enforce@minecraft.net` if the request stalls.

**Offline mode:** a locally stored username + offline UUID
(`UUID.nameUUIDFromBytes("OfflinePlayer:" + name)`), launch allowed only for
already-downloaded versions; all online-only features are disabled with the
offline banner from the mockups.

### 4.2 Noctra account (Relay / friends / cloud)
After step 5 the launcher posts the Minecraft access token to
`POST /api/identity/link`. The server verifies it against
`api.minecraftservices.com/minecraft/profile`, upserts the Noctra account keyed
by Minecraft UUID, and returns a short-lived Noctra JWT (15 min) + rotating
refresh token. All Noctra endpoints and the presence WebSocket use that JWT.
No passwords exist anywhere in the system.

---

## 5. Game launch pipeline

```
preflight ─► resolve ─► download ─► verify ─► extract natives ─► build args ─► spawn ─► watch
```

| Step | Detail |
|---|---|
| **preflight** | Java present & correct major, free disk ≥ required, RAM sane, mod/loader compatibility, entitlement valid |
| **resolve** | `version_manifest_v2.json` → version JSON → merge loader profile JSON (`inheritsFrom`) → flatten libraries with `rules` evaluated for the current OS/arch |
| **download** | `p-queue` with 8 workers over: client jar, libraries, `assetIndex` objects (`resources.download.minecraft.net/<h[0:2]>/<h>`), log4j config, loader jars, managed JRE. Resume via HTTP `Range`; SHA-1 verified per file; 3 retries with backoff. Progress is emitted as `{file, bytesDone, bytesTotal}` — this is exactly what the mockup's `Fetching {file}… / 78.4 MB / 112.5 MB` renders |
| **natives** | extract LWJGL/`*-natives-*` classifiers into `versions/<id>/natives`, honour `extract.exclude` |
| **args** | substitute `${auth_player_name} ${auth_uuid} ${auth_access_token} ${version_name} ${game_directory} ${assets_root} ${assets_index_name} ${user_type} ${clientid} ${xuid} ${launcher_name} ${launcher_version} ${natives_directory} ${classpath}`; apply `-Xmx` from the RAM slider, per-profile JVM args, `--width/--height` or `--fullscreen`, optional `--quickPlayMultiplayer` |
| **spawn** | `child_process.spawn(java, args, { cwd: profileDir })`; the access token is passed via argv only — **never logged**, scrubbed from all log output |
| **watch** | tail stdout/stderr into a ring buffer + rotating file; detect the window-ready line; on exit ≠ 0 run crash analysis |

### 5.1 Directory layout on disk

```
%APPDATA%/Noctra/            (Win) · ~/Library/Application Support/Noctra (mac) · ~/.local/share/Noctra (linux)
├─ auth.bin
├─ noctra.db
├─ logs/
├─ runtimes/java-21/ java-17/ java-8/
├─ shared/
│  ├─ assets/{indexes,objects}/
│  ├─ libraries/
│  └─ versions/<versionId>/{<id>.json,<id>.jar,natives/}
├─ profiles/<profileId>/
│  ├─ profile.json
│  ├─ mods/  (+ mods/.disabled/)
│  ├─ shaderpacks/ resourcepacks/ saves/ config/
│  ├─ screenshots/
│  ├─ logs/ crash-reports/
│  └─ options.txt
└─ cache/{thumbs,modrinth,manifest}/
```

Assets/libraries/versions are **shared** across profiles — that's what makes
switching \"frictionless\". Disabling a mod moves the jar into `mods/.disabled/`
rather than renaming, so the enable toggle is instant and lossless.

### 5.2 Java requirements

| Minecraft | Java major |
|---|---|
| ≤ 1.16.5 | 8 |
| 1.17.x | 16 (17 works) |
| 1.18 – 1.20.4 | 17 |
| 1.20.5 + | 21 |

Detect installed JREs (registry on Windows, `/usr/lib/jvm`, `/Library/Java`,
`JAVA_HOME`, `java -version`), otherwise provision a managed JRE from the
Adoptium API into `runtimes/`. Never ask the user to install Java manually.

### 5.3 Crash analysis (powers the crash modal)
1. Capture exit code (the mockup shows `255`) and the last ~200 stderr lines.
2. Find the newest file in `crash-reports/`.
3. Parse the `-- MOD/Suspected Mods --` / `Suspected Mods:` block when present.
4. Otherwise walk the top stack frames, drop `net.minecraft.*`, `java.*`,
   `sun.*`, and map the remaining root package to an installed jar via the
   `fabric.mod.json` / `mods.toml` index built by `content/jarmeta.ts`.
5. Extract the human line (`The internal server encountered a fatal error…`)
   from the `Description:` field.
6. Emit `CrashReport { exitCode, description, suspectJar, suspectName, logPath }`.
7. Offer `Relaunch Game`, `Copy Crash Log`, `Open Crash Log`, and — as an
   enhancement beyond the mockup — `Disable {suspect} and relaunch`.

---

## 6. Content management

### 6.1 Jar metadata
Read with `yauzl` (streaming, no extraction):
- Fabric/Quilt: `fabric.mod.json` / `quilt.mod.json` → `id, name, version, authors, depends, icon`
- Forge/NeoForge: `META-INF/mods.toml` (+ `mcmod.info` for ≤1.12) → `modId, displayName, version, authors, dependencies`
Icons are extracted to `cache/thumbs/mods/<sha1>.png`. Results cached by file
sha1 + mtime so re-scans are instant — the mockup's `28 mods loaded` must appear
without a visible delay.

### 6.2 Modrinth API v2 (`https://api.modrinth.com/v2`)
- **Required:** a descriptive `User-Agent` (e.g. `Noctra/0.9.2 (contact@noctra.app)`); respect `X-Ratelimit-*` headers and back off on `429`.
- `GET /search` with `facets` for loader/MC-version/project-type + `index`
  (`relevance|downloads|follows|newest|updated`) → powers the Discover browser and `NEW MODS!`.
- `GET /project/{id|slug}` and `GET /project/{id}/version` → version list;
  filter by `game_versions` and `loaders`, prefer `version_type: release`.
- `GET /version_files` (hash lookup by sha1/sha512) → identifies locally
  dropped jars and drives the `Update available` chip.
- Install = resolve required `dependencies` transitively, confirm the set with
  the user, download each `files[].url`, verify `hashes.sha1`, write to
  `mods/`, then re-scan.
- Attribution: show project author + a link back to Modrinth; honour each
  project's licence and any `server_side/client_side` flags.

### 6.3 Loader metadata
| Loader | Source |
|---|---|
| Fabric | `https://meta.fabricmc.net/v2/versions/loader/{mc}` → profile JSON |
| Quilt | `https://meta.quiltmc.org/v3/versions/loader/{mc}` |
| Forge | `https://maven.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json` + installer jar, run the installer's processors headlessly |
| NeoForge | `https://maven.neoforged.net/releases/net/neoforged/neoforge/maven-metadata.xml` |

Forge is the hardest: pre-1.13 is a simple JSON merge, 1.13+ requires running
the installer's binary-patch processors. Budget for it separately.

---

## 7. Locker (skins & capes)

- **Read** the active skin/cape from `GET /minecraft/profile` (`skins[]`, `capes[]`).
- **Apply skin:** `POST /minecraft/profile/skins` (multipart: `variant=classic|slim`, `file`)
  or `POST .../skins` with a URL. **Reset:** `DELETE /minecraft/profile/skins/active`.
- **Capes:** `PUT /minecraft/profile/capes/active { capeId }`, `DELETE .../capes/active`.
  Only capes the account already owns can be equipped — the carousel shows owned
  capes and greys out the rest with an ownership tooltip.
- **Library** (favourites, names, history, the `13d`/`27d`/`45d` ages) is Noctra's
  own data: PNGs in Noctra Cloud, metadata in Postgres, mirrored to local SQLite.
- **Viewer:** `skinview3d` on a `three.js` canvas — orbit controls, idle/walk
  animation, cape physics, 64×64 and legacy 64×32, classic/slim arms. Validate
  dimensions on import and reject HD skins with a clear error.

---

## 8. Gallery

- `chokidar` watches every profile's `screenshots/` plus the user-configured
  folder (`Change default folder path`).
- On a new file: hash it, generate a 320px WebP thumbnail with `sharp`, index
  into SQLite (`path, sha1, takenAt, size, w, h, profileId`).
- **Smart-filter metadata** (server, nearby players, coordinates, MC version)
  cannot be read from a PNG. Sources, in order of fidelity:
  1. A tiny companion Fabric/Forge mod that writes `<screenshot>.noctra.json`
     on every F2 — the only reliable path, and it is how the mockup's
     \"players who were nearby\" filter can exist.
  2. Correlate the capture timestamp with the game log (`Connecting to <host>`,
     join/leave messages) as a fallback.
  3. Manual tagging in the lightbox.
- Queries are SQL with indexes on `takenAt`, `serverId`, and a join table for
  `capture_players`. Grid is virtualised (`@tanstack/react-virtual`).

---

## 9. Noctra backend

### 9.1 Services
| Module | Responsibility |
|---|---|
| `identity` | Minecraft-token verification, account upsert, JWT issue/rotate |
| `friends` | friends, requests (received/sent), blocks, best-friends, nicknames |
| `presence` | WebSocket gateway; Redis `presence:{uuid}` with TTL heartbeat; fan-out to friends |
| `relay` | conversations (dm/group), messages, read receipts, typing, attachments |
| `cloud` | S3-compatible object storage, per-user quota, per-domain sync manifests |
| `locker` | skin/cape library metadata + PNG storage |
| `content` | news feed, changelog, partners, featured mods (CMS-fed) |
| `telemetry` | opt-in crash reports and anonymous usage |

### 9.2 Data model (Postgres via Prisma, abridged)
```
User(id, mcUuid unique, mcName, createdAt, plan, storageQuotaBytes)
Friendship(id, aId, bId, createdAt, bestFriend, nickname)      -- normalised a<b
FriendRequest(id, fromId, toId, status, createdAt)
Block(id, userId, blockedId)
Conversation(id, kind, name, iconUrl, createdAt)
Participant(conversationId, userId, role, pinned, muted, lastReadAt)
Message(id, conversationId, senderId, body, createdAt, editedAt, deletedAt)
Attachment(id, messageId, kind, objectKey, bytes, width, height)
CloudObject(id, userId, domain, key, sha256, bytes, updatedAt)  -- domain: captures|assets|locker|configs
SyncPrefs(userId, autoSyncCaptures, syncResources, backupConfigurations, uploadOnlyWhenGameClosed)
Skin(id, userId, name, objectKey, model, favorite, lastUsedAt)
NewsItem(id, kind, title, body, badge, publishedAt)
Partner(id, name, logoKey, url, order)
```

### 9.3 Presence protocol
Client → `HELLO {jwt}`, then `HEARTBEAT` every 25 s and
`STATUS {state, server?, activity?}` on change. Server → `PRESENCE_BULK` on
connect, `PRESENCE_DELTA` thereafter, plus `MESSAGE`, `TYPING`,
`FRIEND_REQUEST`, `FRIEND_ACCEPTED`. Reconnect with jittered exponential
backoff; on permanent failure the renderer shows
`Unable to connect to Noctra Friends Service.` and the cached offline list.

Presence source in the launcher: game process state + a log tail for
`Connecting to <host>:<port>` / `Stopping singleplayer server`, mapped to the
mockup's strings (`In-game: {server}`, `In-game: Singleplayer`, `In Launcher`,
`In Menus`, `Idle` after 10 min of no input).

### 9.4 Cloud sync engine
Per-domain manifest of `{path, sha256, bytes, mtime}`. Sync = diff local vs
remote manifest → upload/download the delta with presigned URLs → write the new
manifest. Conflicts resolve last-write-wins with a local `.bak`. Worlds are
zipped before upload. Honour `Upload only when game is closed`. On quota
exhaustion pause and surface `Storage full` + `Upgrade`. Everything the mockups
label `All … synced to Noctra Cloud` / `Syncing with Noctra Cloud…` /
`Last synced: {when}` is driven by this engine's status object.

---

## 10. Security & compliance

- `contextIsolation`, `sandbox`, `nodeIntegration: false`, strict CSP
  (`default-src 'self'`), no remote code execution, `webview` disabled.
- Minecraft access token: memory-only in main, never to the renderer, never
  logged, scrubbed by a regex in the log transport.
- All downloads hash-verified; loader installers pinned by checksum.
- Mods are arbitrary code: show an explicit trust prompt for jars added from
  outside Modrinth, and never auto-enable them.
- Auto-update over HTTPS with signature verification (`electron-updater` +
  code-signing cert on Windows, notarisation on macOS).
- Never distribute Minecraft assets yourself — always download from Mojang CDNs
  at first launch.
- Do not use Mojang/Microsoft branding beyond the required \"Log in with
  Microsoft\" affordance; ship a clear \"not affiliated with Mojang\" notice in About.
- GDPR: explicit consent for telemetry, an export endpoint, and account deletion
  that purges cloud objects.

---

## 11. Performance budget

| Metric | Target |
|---|---|
| Cold start to interactive Home | < 1.2 s |
| Nav rail route change | < 100 ms |
| Mod list scan, 60 jars (warm cache) | < 150 ms |
| Gallery grid, 5 000 captures | 60 fps (virtualised) |
| Idle CPU (game not running) | < 1 % |
| Idle RSS | < 260 MB |
| Installer size | < 110 MB per platform |

Techniques: lazy-load every route, preload only Home + shell, keep the skin
viewer and gallery lightbox in separate chunks, virtualise all long lists, move
hashing/zip/thumbnail work into `worker_threads`, cache manifests on disk with
ETag revalidation.

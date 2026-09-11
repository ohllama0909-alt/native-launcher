# Noctra Client — Build Roadmap (from scratch)

**Scope:** ship the launcher in the 19 mockups as a real cross-platform desktop
app, plus the Noctra backend that powers Relay, friends and cloud sync.

**Assumption for all estimates:** one experienced full-time developer.
`dw` = developer-week (5 focused days). A team of 3 (desktop / backend /
frontend) compresses the calendar to roughly **40 % of the serial total**
because Phases 3–8 parallelise well.

**Serial total: ~62 dw (~14 months solo) · Team of 3: ~25 calendar weeks (~6 months)**

---

## Phase map

| # | Phase | Milestone | Est. | Runs in parallel with |
|---|---|---|---|---|
| 0 | Foundations & legal | Repo, CI, signed empty app ships | 3 dw | — |
| 1 | Design system | Storybook of every component matching the mockups | 5 dw | 2 |
| 2 | Auth | Real Microsoft login, session persisted | 4 dw | 1 |
| 3 | Launch core | **Vanilla Minecraft launches.** *First playable* | 7 dw | 4 |
| 4 | Home shell | Home with real profiles, launch states, offline mode | 4 dw | 3 |
| 5 | Versions & profiles | Version grid, profile panel, loaders, advanced settings | 8 dw | 6 |
| 6 | Content & Modrinth | Mods/shaders/worlds/resources + Discover browser | 6 dw | 5 |
| 7 | Locker & Gallery | Skin viewer, capes, screenshot gallery with smart filters | 7 dw | 8 |
| 8 | Noctra backend | Identity, friends, presence, Relay, Cloud | 9 dw | 7 |
| 9 | Social frontend | Friends page, chat overlay, full Relay UI | 5 dw | — |
| 10 | Settings, resilience, release | Settings, crash modal, edge cases, auto-update, store pages | 6 dw | — |

**Gates**
- **G1 (end of P3)** — Vanilla 1.21 launches from a hand-written profile JSON on Windows, macOS and Linux.
- **G2 (end of P6)** — a modded Fabric profile launches, built entirely through the UI.
- **G3 (end of P9)** — two accounts see each other's presence and exchange Relay messages with an image.
- **G4 (end of P10)** — signed, auto-updating public beta.

---

## Phase 0 — Foundations & legal · 3 dw

| # | Task | Est. |
|---|---|---|
| 0.1 | **Submit the Azure application for Minecraft auth API access.** Do this on day 1 — approval is the longest lead time in the project | 0.2 dw |
| 0.2 | Monorepo (pnpm workspaces), `packages/app` + `packages/server`, TS strict, ESLint + Prettier, commitlint | 0.4 dw |
| 0.3 | `electron-vite` scaffold: main / preload / renderer, HMR, frameless window, `contextIsolation` + `sandbox` on | 0.5 dw |
| 0.4 | Typed IPC skeleton (`shared/ipc-contract.ts`) with zod validation and a codegen'd `window.noctra` | 0.5 dw |
| 0.5 | `electron-builder` targets (nsis, dmg, AppImage + deb), icons, app IDs, protocol handler `noctra://` | 0.4 dw |
| 0.6 | GitHub Actions: lint + typecheck + unit on PR; tag → 3-OS build matrix → draft release | 0.5 dw |
| 0.7 | `electron-log` rotating file transport + token-scrubbing regex; Sentry wired but opt-in | 0.2 dw |
| 0.8 | Licence audit, trademark/ToS review, "not affiliated with Mojang" notice, privacy policy draft | 0.3 dw |

**DoD:** a signed, empty Noctra window installs and auto-updates on all three OSes from CI.

---

## Phase 1 — Design system · 5 dw

Implement `docs/01-design-book.md` exactly. Storybook is the deliverable.

| # | Task | Est. |
|---|---|---|
| 1.1 | `tokens.css` + Tailwind v4 `@theme` from §8 of the design book; Figtree self-hosted (300/500/700/900, `font-display: swap`) | 0.4 dw |
| 1.2 | Shell: `TitleBar` (drag region, build string, online counter, window controls), `NavRail` (8 items, active bar, tooltips, badges), `SocialRail` (collapsible < 1280px) | 0.8 dw |
| 1.3 | Atmosphere: `Bloom` radial-gradient layer + `Grain` noise overlay, `prefers-reduced-motion` respected | 0.2 dw |
| 1.4 | Primitives: Button (6 variants × 6 states), Input, SearchField, Toggle, Checkbox, Radio, Slider, Segmented, Select/Dropdown, Textarea | 1.0 dw |
| 1.5 | Overlays: Modal, Popover, Tooltip, ContextMenu, Toast — all focus-trapped, Esc-dismissible, portal-rendered | 0.7 dw |
| 1.6 | Data display: Avatar + presence dot, Badge, Chip, ProgressBar (determinate + shimmer), Skeleton, StatPair, SectionLabel, ListRow, Card | 0.8 dw |
| 1.7 | Patterns: `Dropzone`, `CloudSyncIndicator` (3 states), `Banner` (offline/update), `EmptyState`, `Carousel` with ‹ › | 0.6 dw |
| 1.8 | Motion presets (§6) as reusable variants; entrance stagger hook | 0.2 dw |
| 1.9 | Storybook with a visual-diff snapshot per component + an a11y axe pass | 0.3 dw |

**DoD:** every component in the design book renders in Storybook and is
pixel-compared against the corresponding crop from `/design`.

---

## Phase 2 — Authentication · 4 dw

| # | Task | Est. |
|---|---|---|
| 2.1 | Device-code OAuth against Azure AD (`XboxLive.signin offline_access`), polling with correct `authorization_pending` / `slow_down` handling | 0.7 dw |
| 2.2 | XBL → XSTS → `login_with_xbox` chain; map `XErr` 2148916233 / 2148916238 to human messages | 0.8 dw |
| 2.3 | Entitlement check + `/minecraft/profile`; persist `uuid`, `name`, skins, capes | 0.4 dw |
| 2.4 | Token vault on `safeStorage`; silent refresh on boot; refresh-failure → re-auth modal | 0.6 dw |
| 2.5 | Login screen (§1 of screen specs): split layout, Microsoft + GitHub buttons, 5 social links, footer, hero art | 0.7 dw |
| 2.6 | Device-code card, error state, offline profile creation, `Continue offline` | 0.5 dw |
| 2.7 | Account menu behind the greeting chevron: switch account, multi-account store, logout | 0.3 dw |

**DoD:** a real Microsoft account signs in, the session survives a restart, and
logout clears the vault.

---

## Phase 3 — Launch core (headless) · 7 dw · **GATE G1**

The riskiest phase. Build it as a CLI-testable module before any UI touches it.

| # | Task | Est. |
|---|---|---|
| 3.1 | Version manifest client + on-disk cache with ETag revalidation; release/snapshot split | 0.4 dw |
| 3.2 | Version JSON resolver with `inheritsFrom` merging and full `rules` evaluation (os name/arch/version, features) | 0.8 dw |
| 3.3 | Download engine: `p-queue` ×8, SHA-1 verify, `Range` resume, 3 retries + backoff, granular progress events | 1.0 dw |
| 3.4 | Asset index + object download to `shared/assets/objects/<h[0:2]>/<hash>`; legacy `virtual/legacy` mapping for ≤1.7 | 0.6 dw |
| 3.5 | Library resolution + natives extraction with `extract.exclude`; Apple-Silicon LWJGL handling | 0.8 dw |
| 3.6 | Java: detect installed JREs per-OS, version→major mapping table, managed JRE provisioning from Adoptium | 0.9 dw |
| 3.7 | Classpath + argument builder, full `${…}` substitution, `-Xmx`, window size / fullscreen, quick-play | 0.7 dw |
| 3.8 | Runner: spawn the JVM, stream logs to a ring buffer + file, detect ready/exit, kill support | 0.5 dw |
| 3.9 | Crash analyser: exit code, newest crash report, suspected-mod extraction, description line | 0.6 dw |
| 3.10 | Preflight report: java, free disk, RAM sanity, entitlement, compatibility | 0.4 dw |
| 3.11 | Matrix test: 1.7.10, 1.8.9, 1.12.2, 1.16.5, 1.20.1, 1.21.x vanilla on Win/mac/Linux | 0.3 dw |

**DoD:** `pnpm launch --version 1.21.4` boots Minecraft and reaches the main
menu on all three OSes.

**Risks:** LWJGL natives on macOS arm64; the 1.7–1.12 legacy asset layout;
`java.library.path` quirks on Linux. Mitigation: the 3.11 matrix runs in CI
nightly against a headless display.

---

## Phase 4 — Home shell · 4 dw

| # | Task | Est. |
|---|---|---|
| 4.1 | Three-column shell wired to the router; nav rail navigation + keyboard shortcuts | 0.4 dw |
| 4.2 | `GreetingHero`: greeting, last-played, total playtime (from a local play-session table) | 0.4 dw |
| 4.3 | `LaunchButton` state machine — all 6 states from the design book, driven by `launch:progress` / `launch:state` | 1.0 dw |
| 4.4 | Progress sub-lines: `Fetching {file}…`, `{done} / {total}`, pause and cancel | 0.4 dw |
| 4.5 | `LATEST PROFILES` tiles + overflow menu; `PARTNERS` row | 0.4 dw |
| 4.6 | `NEWS FEED`: changelog card, `NEW VERSION!` promo, `PARTNER PROGRAM`, `NEW MODS!` strip — fed by `/api/content` with a bundled fallback | 0.6 dw |
| 4.7 | Network monitor + offline mode: banner, disabled launch, cached lists, degraded news feed | 0.5 dw |
| 4.8 | Social rail with mock data (real data arrives in P9) | 0.3 dw |

**DoD:** clicking LAUNCH on Home downloads and starts the game with live
progress; pulling the network shows the offline state from the mockup.

---

## Phase 5 — Versions & profiles · 8 dw

| # | Task | Est. |
|---|---|---|
| 5.1 | Profile model + SQLite persistence; create / rename / duplicate / delete; per-profile directory scaffolding | 0.7 dw |
| 5.2 | `CHANGE VERSION` grid: cards grouped by major line, key art, active ring, launch/gear/pencil actions | 0.9 dw |
| 5.3 | Patch dropdown per card, snapshot toggle, current-patch check mark | 0.4 dw |
| 5.4 | `ProfilePanel` modal shell: header (`VERSION x ▾`, search, filter, folder, close), left sub-nav, fetching/skeleton state | 0.8 dw |
| 5.5 | **Loader tab** + Fabric installation via `meta.fabricmc.net` | 0.7 dw |
| 5.6 | Quilt (same shape as Fabric) | 0.3 dw |
| 5.7 | **Forge** — pre-1.13 JSON merge path | 0.7 dw |
| 5.8 | **Forge 1.13+** — run installer processors headlessly, apply binary patches | 1.3 dw |
| 5.9 | NeoForge | 0.4 dw |
| 5.10 | **Advanced tab**: resolution block (W/H, presets, 3 checkboxes), RAM slider with ticks + system-RAM guard, JVM textarea, three `Enabled` toggles, settings search | 1.0 dw |
| 5.11 | Global defaults in Settings with per-profile override semantics ("Overrides global RAM settings for this specific profile") | 0.4 dw |
| 5.12 | Profile import/export (`.noctra` bundle) and Modrinth `.mrpack` import | 0.4 dw |

**DoD:** create a Fabric 1.21.7 profile in the UI, set 6 GB RAM and 1920×1080, launch it.

---

## Phase 6 — Content & Modrinth · 6 dw · **GATE G2**

| # | Task | Est. |
|---|---|---|
| 6.1 | Jar metadata reader (`fabric.mod.json`, `quilt.mod.json`, `mods.toml`, `mcmod.info`) + icon extraction, sha1+mtime cache | 0.9 dw |
| 6.2 | Content scanner for mods / shaderpacks / resourcepacks / saves; `{n} mods loaded` | 0.5 dw |
| 6.3 | **Mods tab**: search, rows (name, `By {author}`, `v{v} • {size}`), `Enabled` toggle via `.disabled/`, configure / reveal / delete | 0.9 dw |
| 6.4 | Drop zone `3rd Party Mods` with drag-over state, multi-file import, trust prompt for non-Modrinth jars | 0.5 dw |
| 6.5 | Compatibility engine: loader + MC-version mismatch chips, missing-dependency warnings, blocking pre-launch confirm | 0.7 dw |
| 6.6 | Shaders tab (+ Iris/OptiFine presence check) and Resources tab with drag-to-reorder priority | 0.6 dw |
| 6.7 | **Worlds tab**: scan `saves/` + `level.dat` (NBT) for name/mode/seed/last-played, icon, size; `Fetching worlds…`; import `.zip`; duplicate / delete / open folder | 0.8 dw |
| 6.8 | Modrinth API client: search with facets, project + version endpoints, hash lookup, rate-limit backoff, disk cache | 0.7 dw |
| 6.9 | **Discover** browser: search, type/loader/version/category filters, project detail with gallery + changelog, `Install` with transitive dependency resolution and a confirm sheet | 1.0 dw |
| 6.10 | `Update available` chips + one-click update per mod and bulk "update all" | 0.4 dw |

**DoD:** search a mod in Discover, install it with its dependencies into a
Fabric profile, and launch successfully.

---

## Phase 7 — Locker & Gallery · 7 dw

| # | Task | Est. |
|---|---|---|
| 7.1 | `skinview3d` viewer: orbit, idle/walk animation, cape mesh, classic/slim, 64×64 + legacy 64×32 | 1.0 dw |
| 7.2 | `CURRENT SKIN` block with action icons; apply skin via `POST /minecraft/profile/skins` | 0.6 dw |
| 7.3 | `UPLOAD SKIN` drop zone + **import popup** (preview, `Name`, `File`, `Wide`/`Slim`, `Save`), dimension validation with a clear HD-skin error | 0.7 dw |
| 7.4 | `CAPES` carousel — owned capes equip/unequip, unowned greyed with ownership tooltip | 0.5 dw |
| 7.5 | `FAVORITES` + `LATEST` carousels: star toggle, names, age labels (`13d`), local SQLite + cloud mirror | 0.6 dw |
| 7.6 | Screenshot watcher (`chokidar`), sha1 index, `sharp` WebP thumbnails, SQLite schema + indexes | 0.8 dw |
| 7.7 | `GALLERY` grid, virtualised; hover metadata; `Grid`/`List`/`Detailed` views; `Newest`/`Oldest`/`Size` sorting | 0.9 dw |
| 7.8 | Lightbox: arrows, zoom, copy, reveal, delete, share | 0.5 dw |
| 7.9 | **Smart Filters**: player (avatars + `Find a player...`), server, date (`Last Week`, `Last Month`, month calendar range) | 0.8 dw |
| 7.10 | **Companion capture mod** (Fabric + Forge): on F2, write `<shot>.noctra.json` with server, coords, MC version, nearby players; auto-injected into profiles; log-correlation fallback | 1.0 dw |
| 7.11 | Empty state with `Change default folder path` | 0.2 dw |

**DoD:** F2 in-game makes the screenshot appear in the gallery within a second,
filterable by the server it was taken on.

---

## Phase 8 — Noctra backend · 9 dw

| # | Task | Est. |
|---|---|---|
| 8.1 | Fastify + Prisma + Postgres + Redis scaffold, Docker Compose for dev, migrations, OpenAPI | 0.7 dw |
| 8.2 | `identity`: verify a Minecraft token, upsert the account by UUID, issue JWT + rotating refresh | 0.7 dw |
| 8.3 | `friends`: list, search, request (send/accept/reject/cancel), unfriend, block, best-friend, nickname; rate limits and anti-spam | 1.0 dw |
| 8.4 | `presence`: WS gateway, `HELLO`/`HEARTBEAT`/`STATUS`, Redis TTL presence, friend fan-out, reconnect semantics | 1.2 dw |
| 8.5 | `relay`: conversations (dm/group), message send/edit/delete, pagination, read receipts, typing, search, pin/mute | 1.5 dw |
| 8.6 | Attachments: presigned S3 upload, MIME + size limits, image transcode + thumbnails, virus scan hook | 0.8 dw |
| 8.7 | `cloud`: per-domain manifests, presigned up/download, quota accounting, usage breakdown endpoint (Captures/Assets/Locker/Configs/Other/Free) | 1.3 dw |
| 8.8 | `locker` service: skin/cape library storage + metadata | 0.4 dw |
| 8.9 | `content` CMS: news, changelog, partners, featured mods; CDN-cached | 0.6 dw |
| 8.10 | `telemetry`: opt-in crash + usage ingestion, retention policy | 0.3 dw |
| 8.11 | Observability + load test presence/relay to 10 k concurrent sockets | 0.5 dw |

**DoD:** all endpoints documented and load-tested; two dev clients exchange
messages and see presence changes in under 200 ms.

---

## Phase 9 — Social frontend · 5 dw · **GATE G3**

| # | Task | Est. |
|---|---|---|
| 9.1 | Presence client in main + `presence` Zustand slice; mapping game state → the mockup's status strings | 0.6 dw |
| 9.2 | `FRIENDS MENU`: Friends / Requests tabs, `{n} Online` / `{n} Offline` groups, search, add-friend flow | 0.8 dw |
| 9.3 | Requests tab: `{n} Received` / `{n} Sent`, relative + absolute timestamps, accept/reject/cancel with optimistic UI | 0.5 dw |
| 9.4 | Friend context menu — all 8 actions, including `Join Server` (quick-play into the friend's server) and `Copy IGN` | 0.6 dw |
| 9.5 | `Active Chat Overlay` docked panel + `Open Relay` escalation | 0.5 dw |
| 9.6 | **Relay**: 3-pane layout, inbox with `Pinned`/`Groups`/`Direct Messages`, unread pills, inbox search | 0.8 dw |
| 9.7 | Conversation view: grouped bubbles, day dividers, inline images with zoom/download, file attachments, typing indicator, in-thread search | 0.9 dw |
| 9.8 | Composer: attach, emoji picker, paste-image, drag-drop upload with progress, optimistic send + `Retry` on failure | 0.6 dw |
| 9.9 | Group management: create, rename, add/remove members, leave; desktop notifications with mute respect | 0.5 dw |

**DoD:** two accounts on two machines see each other's in-game status and
exchange a message with an image attachment.

---

## Phase 10 — Settings, resilience, release · 6 dw · **GATE G4**

| # | Task | Est. |
|---|---|---|
| 10.1 | Settings shell + tabs: General, Game, Java, Storage, Account, Privacy, Appearance, About | 0.7 dw |
| 10.2 | **Storage tab**: `NoctraCloud`, `STANDARD` badge, `Upgrade`, stacked usage bar with the 6 legend segments, `See Detailed Stats`, 4 sync-preference toggles | 0.9 dw |
| 10.3 | About pane with the verbatim About copy, version/build hash, licences, Mojang disclaimer | 0.2 dw |
| 10.4 | **Crash modal**: danger glyph, description with exit code, `Suspected Cause`, three actions, support hint, plus `Disable {suspect} and relaunch` | 0.7 dw |
| 10.5 | Full edge-case matrix from screen specs §11.2 — 12 cases, each with a test | 1.0 dw |
| 10.6 | `electron-updater`: staged rollout, update banner, `Restart to update`, rollback path | 0.5 dw |
| 10.7 | i18n plumbing with the copy deck as `en.json`; pseudo-locale test for layout breakage | 0.4 dw |
| 10.8 | Accessibility pass: full keyboard traversal, focus rings, `aria-label`s, reduced-motion, contrast audit | 0.5 dw |
| 10.9 | Playwright e2e: login → create profile → install mod → launch → crash → recover | 0.6 dw |
| 10.10 | Perf pass against the budget in architecture §11 | 0.3 dw |
| 10.11 | Release: code signing (Win EV), macOS notarisation, landing page, changelog, beta programme | 0.5 dw |

---

## Critical path

```
P0.1 Azure approval ──────────────────────────────┐ (external, start day 1)
P0 → P1 ┐                                         │
        ├→ P3 Launch core → P4 Home → P5 Profiles → P6 Content → G2
P0 → P2 ┘                                         │
P0 → P8 Backend ───────────────→ P9 Social ───────┴→ P10 Release
P1 → P7 Locker/Gallery ────────────────────────────┘
```

P3 and P8 are the two long poles and are fully independent — start the backend
in parallel the moment the design system is stable.

---

## Risk register

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| Azure/Minecraft auth app not approved | **Blocks everything online** | Medium | Submit day 1; build the whole launch core against an offline profile so P3–P6 are unblocked |
| Forge 1.13+ installer processors | High | High | Time-boxed to 1.3 dw; fall back to shipping Fabric/NeoForge first and Forge 1.13+ post-beta |
| macOS arm64 LWJGL natives | High | Medium | Nightly CI matrix from P3.11; keep an x64-Rosetta fallback path |
| Modrinth rate limits at scale | Medium | Medium | Aggressive disk cache, a server-side proxy with shared cache, honest User-Agent |
| Gallery smart-filter metadata unavailable | Medium | High | Companion mod is the primary path (P7.10); log correlation + manual tagging as graceful degradation |
| Presence/Relay scaling cost | Medium | Medium | Redis presence with TTL, no message fan-out storage per recipient, load test at P8.11 |
| Cloud storage cost per free user | Medium | Medium | Quota from day 1, dedupe by sha256, worlds zipped, `Upload only when game is closed` default on |
| Electron install size vs. expectation | Low | Medium | Measure from P0; revisit Tauri only if it becomes a stated requirement |
| Legal pressure over branding | High | Low | No Mojang marks, clear disclaimer, no redistribution of game assets, ToS review in P0.8 |

---

## Definition of done (per feature)

1. Matches the mockup at 1× and 1.5× DPI, checked against the `/design` crop.
2. All interactive elements have `data-testid`, a focus ring and a keyboard path.
3. Loading, empty, error and offline states all implemented — no bare spinners.
4. Copy comes from `docs/05-copy-deck.md`; no hard-coded strings in components.
5. Unit tests for logic, a Playwright path for the happy flow.
6. No new `any`; zod validation at every IPC and network boundary.
7. No secret, token or absolute user path in any log line.
8. Perf budget respected; no layout thrash on the 60 fps surfaces.

---

## Post-1.0 backlog

| Priority | Item |
|---|---|
| P1 | Server browser + saved servers with ping, wired to `Join Server` |
| P1 | Modpack one-click install (`.mrpack`, CurseForge) |
| P1 | In-game overlay HUD for the mods teased on Home (`ADVANCED KEYBINDS`, `COMBAT HUD`, `WEATHER CHANGER`) |
| P2 | Partner Program / creator dashboard behind `BECOME A CREATOR` |
| P2 | Themes and accent customisation (the token layer already allows it) |
| P2 | Voice channels in Relay |
| P2 | Cloud plan tiers + billing behind `Upgrade` |
| P3 | Mobile companion app for Relay |
| P3 | Plugin API for third-party launcher extensions |

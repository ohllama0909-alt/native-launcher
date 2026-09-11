# Noctra Client — Screen Specifications

Every screen and state present in `/design`, transcribed and specified.
Copy is verbatim from the mockups. `{…}` marks dynamic values.

---

## 0. App shell (all screens)

**Title bar — 40px, draggable, frameless window**

| Zone | Content |
|---|---|
| Left | `N` glyph · `Noctra Client` · `Build 0.9.2` · `● {9101} Online` |
| Right | minimise `—` · maximise `▢` · close `✕` (32px icon buttons; close hover → `--danger`) |

**Nav rail — 72px, icon only + tooltip**

| # | Icon | Route | Tooltip |
|---|---|---|---|
| 1 | home | `/home` | Home |
| 2 | users | `/friends` | Friends |
| 3 | message-square | `/relay` | Relay |
| 4 | layers | `/versions` | Versions |
| 5 | shirt | `/locker` | Locker |
| 6 | image | `/gallery` | Gallery |
| 7 | shopping-bag | `/discover` | Discover |
| — | settings *(pinned bottom)* | `/settings` | Settings |

Active item: purple icon, `--primary-tint-08` backplate, 2px purple bar on inner edge.
Badges: unread Relay count, pending friend requests count.

---

## 1. Login

*Mockups: `098de8…e1147.png` (window), `a1bd0f…a02b6.png` (laptop render)*

Annotation: *"A clean and secure gateway to your game. The login screen features
seamless Microsoft authentication and quick access to the project's GitHub repository."*

**Layout — 50 / 50 split, no nav rail**

Left pane (`--surface-0` + purple bloom):
- `N` glyph 96px, then `Noctra Client` (`h1`)
- Primary button, light fill `#F0F0F0` / dark text: Microsoft 4-colour logo + `Log in with` `Microsoft`
- Secondary button, `--surface-2`: GitHub mark + `View code` `GitHub`
- Social row — 5 circular 40px `--surface-2` icon buttons: **Discord, X, Instagram, YouTube, Patreon**
- Footer, `caption`/`--text-tertiary`, dot-separated: `Privacy Policy · Terms of Service · Support`

Right pane: full-bleed stylised Minecraft render — purple-lit blocks, lanterns,
a glowing `N`-marked cube. Ships as a static asset; may slowly parallax on cursor move.

**States**
| State | UI |
|---|---|
| Idle | as above |
| Auth pending | Microsoft button → spinner + `Waiting for Microsoft…`; `msmc`'s Electron login window is open on top; `Cancel` closes it and restores the idle state |
| Error | inline `--danger` message under the button + `Try again`. Map `XErr` 2148916233 → `This Microsoft account has no Xbox profile`, 2148916238 → `This is a child account — ask the family manager to grant permission`, `403 Invalid app registration` → `Noctra isn't authorised for Minecraft services yet` |
| Offline | Microsoft button disabled; `Continue offline` secondary appears (offline profile, no online play) |
| Success | 220ms fade to `/home` |

> Auth is implemented with `msmc`, which opens its own Electron window for the
> Microsoft login rather than showing a device code. If you later switch to the
> device-code flow, add a card with the user code, `Copy code`,
> `Open browser again` and `Cancel`.

---

## 2. About

*Mockup: `537c37…b01b5.png`*

Section label `ABOUT` top-left with a downward scroll chevron.
Body, left-aligned, generous negative space:

> `Noctra Client is a personal UI/UX concept of a custom Minecraft launcher.`
> `Drawing inspiration from Lunar, Feather, and other 3rd party launchers, this project is simply my take on how a modern, user-friendly Minecraft client could look.`

Ship as a Settings → About pane with version, build hash, licences, and links.

---

## 3. Home

*Mockups: `a0c44f…342a9.png` (default), `1157ee…bb2a7.png` (annotated + states),
`8ab221…349cb.png` (downloading), `94c575…3500d.png` (offline)*

Annotation: *"The home page is designed to be clean, familiar, and easy to
navigate. By splitting the interface into three clear sections — a main menu on
the left, core game actions in the center, and a friends list on the right —
everything you need is instantly accessible without feeling cluttered."*

### 3.1 Centre column, top to bottom

1. **Greeting hero** — `Good to see you, {dbrn} ▾` (chevron opens the account menu),
   `Last played: {Hypixel} — {16 hours ago}`, `Total playtime: {1,364h}`.
   Purple bloom background.
2. **Launch block** — hero `LAUNCH` button with sub-line `{Fabric} {1.21.3}`;
   beneath it a secondary `CHANGE VERSION` button with chevron.
3. **Two-column strip**
   - `LATEST PROFILES` — profile tiles: `Hypixel Bedwars` / `Forge 1.8.9`,
     `WorldEdit` / `Fabric 1.21.11`, each with `⋯`
   - `PARTNERS` — row of circular partner logos + overflow `⋯`
4. **`NEWS FEED`** — cards:
   - `CHANGELOG` card: big `N`, bullets `Performance optimizations`,
     `General bug fixes & stability`, `READ MORE` ghost button
   - Promo card: `NEW VERSION!` badge, pixel render, `New Minecraft version!`,
     `26.1`, `Ready in Noctra`
   - `PARTNER PROGRAM` card → `BECOME A CREATOR`
   - `NEW MODS!` strip → `ADVANCED KEYBINDS`, `COMBAT HUD`, `WEATHER CHANGER`

### 3.2 Social rail (320px)
Tabs `Friends` | `Requests`; search `Find a player...`; add-friend icon button.
Groups: `{8} Online` then `{34} Offline`. Rows as spec'd in the design book.
Statuses seen: `In-game: Hypixel`, `In-game: Singleplayer`,
`In-game: Private Server`, `In-game: Donut SMP`, `In Launcher`, `In Menus`,
`Idle`, `Offline for 3 days`, `Offline for 21 hours`, `Offline for 36 days`.

### 3.3 Home states

| State | Spec |
|---|---|
| **Default / online** | as above; global counter `● 9101 Online` |
| **Downloading** | Annotation: *"The downloading state updates the main button and adds a progress bar beneath it. This gives clear information about the files being downloaded and the remaining size."* Button label → `DOWNLOADING`; progress bar underneath; lines `Fetching {fabric-loader-0.15.7.jar}…` and `{78.4 MB} / {112.5 MB}`; pause `‖` and cancel `✕` icon buttons; `CHANGE VERSION` disabled |
| **Offline** | Annotation: *"If the connection drops, the launcher shows an offline notification banner and disables the primary launch button until the network is restored."* Top banner `--warning`: `Noctra is running in offline mode. No connection available.` + `Potential Solutions`; title bar shows `Offline` instead of the online counter; LAUNCH disabled; social rail replaced by wifi-slash glyph + `Unable to connect to Noctra Friends Service.` and a cached `{42} Offline` list; news feed shows placeholder cards |
| **Running** | button → `RUNNING`, secondary `Kill` |
| **Crashed** | crash modal (§9.1) over Home |

---

## 4. Friends menu

*Mockup: `ce55ab…d633d.png`*

Section label `FRIENDS MENU`. Annotation: *"Keep your community close. Toggle
effortlessly between your active friends list and incoming requests."*

**Friends tab** — `{8} Online` / `{34} Offline`, search `Find a player...`.

**Requests tab** — `{7} Received` / `{5} Sent`.
Received rows: `Received 2 hours ago`, `Received yesterday`, `Received 11.04 · 15:11`
→ accept ✓ / reject ✕. Sent rows: `Sent 1 hour ago`, `Sent 17.04 · 03:34` → cancel ✕.

**Active Chat Overlay** — docked panel, header `Active Chat Overlay` + `Open Relay`
button (escalates to the full Relay window). Bubble thread with timestamps;
composer `Type Message to {masaya46}...` with attach, emoji and send buttons.

**Contextual Actions (Right-click)** — 220px glass menu:
`Join Server` · `Send Message` · `Add to Group` | `Add Best Friend` ·
`Set Nickname` · `Copy IGN` | `Unfriend` · `Block`.

---

## 5. Noctra Relay

*Mockup: `059a75…d5c18.png`*

Section label `RELAY`. Annotation: *"For deeper conversations, the Fast-Chat
seamlessly expands into Noctra Relay. It's a dedicated, full-screen
communication hub where you can manage direct messages, organize group chats,
and share media without needing third-party software."*

**Three panes**

1. Nav rail (shared shell, Relay item active)
2. **Inbox, ~320px** — `Noctra Relay` header; search `Search inbox...`; `+` new
   conversation; groups `Pinned`, `Groups`, `Direct Messages`; rows show avatar,
   name, snippet (`You: …` when self-sent), timestamp, unread pill
3. **Conversation, fluid** — header: avatar, `{cuvsa}`, `In-game: {Donut SMP}`,
   in-thread search `Search in conversation...`, `⋯`. Thread with day divider
   (`19 April`), grouped bubbles (self right, purple; peer left, `--surface-2`),
   inline image attachments with zoom/download on hover, file attachments
   (`latest_crash.log`, `screenshot_f2_14.png`), typing indicator
   `{cuvsa} is typing…`, composer `Type Message to {cuvsa}...`

Requirements: WebSocket transport, optimistic send with `sending / sent /
delivered / failed → Retry`, drag-drop upload with progress, message search,
conversation pinning and muting, group create/rename/leave.

---

## 6. Change Version

*Mockups: `c65d0c…a8f89.png` (grid + dropdown), `2e0b74…9f428.png` (overview)*

Section label `CHANGE VERSION`. Annotation: *"A frictionless version switcher.
Easily navigate through different Minecraft releases and manage your specific
profiles with just a few clicks."*

**Responsive grid of version cards**, one per major line. Observed:
`26.1` (`26.1.1 ▾`), `1.21` (`1.21.7 ▾`), `1.20` (`1.20.4 ▾`), `1.19` (`1.19.1 ▾`),
`1.16` (`1.16.5 ▾`), `1.13` (`1.13.1 ▾`), `1.12` (`1.12.2 ▾`), `1.8` (`1.8.9 ▾`),
`1.7` (`1.7.10 ▾`).

**Card anatomy** — patch selector chip top-left, major version in `display-2`,
version key art, and a footer action row: `LAUNCH` (primary on the active card,
secondary elsewhere), gear (open profile panel), pencil (rename / edit profile).
The currently selected card gets a purple ring + brighter art.

**Patch dropdown (open state)** — glass panel listing e.g. `1.21.11`, `1.21.10`,
`1.21.9`, `1.21.8`; current item gets a purple check; snapshot toggle at the bottom.

---

## 7. Profile panel (per-version)

Opened from a version card's gear. Modal, ~1040×680, `--r-lg`.

**Header** — `VERSION {1.21.7} ▾`, search, filter icon, open-folder icon, close ✕.
**Left sub-nav (200px)** — `Loader`, `Mods`, `Shaders`, `Worlds`, `Resources`;
divider; `Advanced` pinned to the bottom. Active item: purple icon + tinted row.
**Right panel** — content per tab, with the cloud sync indicator top-right.

### 7.1 Loader
Loader choice cards `Vanilla` / `Fabric` / `Forge` / `NeoForge` / `Quilt`,
each with an installed-version selector and an `Install` / `Installed` state.

### 7.2 Mods — *mockup `75e345…5587b.png`*
- Search `Find a mod...`; count `{28} mods loaded`
- Drop zone `3rd Party Mods` — `Drag & drop files here, or browse to add mods.`
- Sync indicator: `All mods synced to Noctra Cloud` / `Last synced: {18 mins ago}`
- Rows (verbatim from the mockup):

| Mod | Author | Version · Size | State |
|---|---|---|---|
| `Litematica` | `By masa` | `v0.26.3 · 1.82MB` | `Enabled` |
| `Mod Menu` | `By TerraFormers` | `v17.0.0 · 1.12MB` | `Enabled` |
| `Inventory Profiles Next` | `By blackd` | `v2.3.1 · 1.48MB` | `Enabled` |
| `Chat Patches` | `By OBro1961` | `v8.0-alpha.8 · 1.93MB` | `Enabled` |
| `FerriteCore` | `By malte0811` | `v8.2.0 · 2.16MB` | `Enabled` |

Row actions: `Enabled` toggle, configure, reveal in folder, delete (danger).
Extras to build: dependency warnings, loader/MC-version mismatch chip,
`Update available` chip wired to Modrinth.

### 7.3 Shaders / Resources
Same list pattern; drop zone titles `Shaders` / `Resource Packs`; resources
support drag-to-reorder priority.

### 7.4 Worlds — *mockup `732461…55266.png`*
Search `Find a world...`; drop zone `Worlds` —
`Drag & drop files here, or browse to add worlds.`
Loading state: `Fetching worlds…` with skeleton rows;
sync indicator `Syncing with Noctra Cloud…` / `Last synced: -`.
Row: world icon, name, seed/mode/last-played, size; actions: open folder,
back up to cloud, duplicate, delete.

### 7.5 Advanced — *mockup `4e0e54…55d7f.png`*
Search `Search settings...`. Sync: `All settings synced to Noctra Cloud` /
`Last synced: {2 hours ago}`.

| Block | Copy | Controls |
|---|---|---|
| `Advanced Settings` | `Proceed with caution. Modifying these settings may cause game instability.` | — (warning header) |
| `Game Resolution` | `Define custom launch resolution and fullscreen preferences.` | `W 1920` × `H 1080` numeric inputs; presets `1080p` `1440p` `4K`; checkboxes `Fullscreen mode`, `Borderless Window`, `Lock Aspect Ratio`; `Enabled` toggle |
| `Allocated Memory` | `Overrides global RAM settings for this specific profile.` | slider, value `{6 GB} / {32 GB}`, ticks `1 GB · 8 GB · 16 GB · 24 GB · 32 GB`; `Enabled` toggle |
| `JVM Arguments` | `Custom Java execution flags for advanced performance tweaking.` | mono textarea, `Reset to recommended`; `Enabled` toggle |

### 7.6 Fetching Data state
Annotation: *"Smooth transitions and clear visual feedback while the profile
configuration is being processed."* → skeletons in the content panel, sub-nav
stays interactive, `--primary-500` indeterminate bar under the panel header.

---

## 8. Locker

*Mockup: `ccff04…8f1ff.png`*

Section label `LOCKER`. Annotation: *"Your personal wardrobe, built right in.
The Locker allows you to instantly swap, preview, and manage your Minecraft
skins without ever opening a browser. Mark your go-to outfits as favorites for
quick access before joining a server."*
Header right: `All cosmetics synced to Noctra Cloud`.

**Blocks**
- `CURRENT SKIN` — large interactive 3D skin viewer (orbit, idle walk animation),
  action icons below (rotate, download, set as active, favourite)
- `UPLOAD SKIN` — drop zone, `Drag & drop file or browse`
- `CAPES` — horizontal carousel of cape thumbnails with ‹ › arrows
- `FAVORITES` — carousel; tiles show name (`unnamed-2`) and age (`13d`, `27d`, `45d`), star badge
- `LATEST` — carousel of recently used/uploaded skins

**Skin import popup** — annotation: *"Seamless skin importing. Instantly preview
your uploaded file, adjust the specific player model type, and assign a custom
name — all within one streamlined popup."*
Fields: live preview · `Name` (default `unnamed-3`) · `File` (filename + reveal) ·
`Player Model` radios `Wide` / `Slim` · `Save` primary.

**To build:** three.js skin renderer supporting 64×64 and legacy 64×32 skins,
slim/wide arm models, cape mesh, HD skin rejection with a clear error.

---

## 9. Gallery

*Mockup: `bcac39…0c79f.png`*

Section label `GALLERY`. Annotation: *"A smarter way to organize your
screenshots. Find exactly what you're looking for with advanced Smart Filters
that let you sort media by date, specific servers, or even players who were
nearby."*
Header: search `Search in gallery...`; right: `All media synced to Noctra Cloud`,
`{3.8 GB} / {10.0 GB} used`.

**Centre** — responsive media grid; hover reveals date, server and nearby-player avatars;
click opens a lightbox (arrows, zoom, copy, share, delete, reveal in folder).

**Right sidebar**
- `View` — `Grid` | `List` | `Detailed` (segmented)
- `Sorting` — `Newest` | `Oldest` | `Size`
- `Smart Filters` — collapsible groups:
  - `Filter by player` — search `Find a player...` + row of nearby-player avatars
  - `Filter by server` — collapsed by default
  - `Filter by date` — `Last Week`, `Last Month`, and a month calendar
    (`April 2020`, headers `Mon Tue Wed Thu Fri Sat Sun`) for range selection

**Empty state** — `Your Gallery is empty.` ·
`Press F2 in-game to capture your first memory!` · `Think this is a mistake?` →
`Change default folder path`.

**Metadata source:** a companion in-game mod (or log/RPC scrape) records server
address, coordinates, MC version and nearby players at capture time into a
sidecar JSON next to each screenshot.

---

## 10. Settings

*Storage tab visible in `bbafc9…e9b51.png`*

Annotation: *"The general settings panel acts as the control center for the
entire launcher. The Storage tab showcased here provides a clear, visual
breakdown of your synced data, making it easy to manage your files."*

Tabs: `General`, `Game`, `Java`, `Storage`, `Account`, `Privacy`, `Appearance`, `About`.

**Storage tab — `NoctraCloud`, plan badge `STANDARD`, `Upgrade` button**
- `Storage` — `{5.6 GB} / {10.0 GB} used` stacked bar with legend:
  `Captures (3.2 GB)` · `Assets (1.4 GB)` · `Locker (0.4 GB)` ·
  `Configs (0.5 GB)` · `Other (<0.1 GB)` · `Free (4.4 GB)`; link `See Detailed Stats`
- `Sync Preferences` — toggles `Auto-Sync Captures`, `Sync Resources`,
  `Backup Configurations`, `Upload only when game is closed`

---

## 11. System & edge cases

*Mockup: `bbafc9…e9b51.png`*

Annotation: *"When a game crash occurs, the launcher is designed to reduce user
frustration. It automatically identifies the potential cause of the issue and
provides quick action buttons to copy or open the crash logs for easier
troubleshooting."*

### 11.1 Game Crash Detected modal
- `--danger` starburst glyph, title `Game Crash Detected`
- `The internal server encountered a fatal error while updating a block entity. (Exit Code: 255)`
- `Suspected Cause` → `Lithium (lithium-fabric-mc1.21.0-0.12.2.jar)` in mono
- `Exit Code: 255`
- Buttons: `Relaunch Game` (primary) · `Copy Crash Log` · `Open Crash Log`
- Footer: `If this issue persists, please reach out to Support.`
- Suspect detection: parse the crash report's `-- MOD/Suspected Mods --` section
  and the top non-Minecraft stack frames, map the package back to an installed jar.

### 11.2 Full edge-case matrix to implement

| Case | Behaviour |
|---|---|
| No internet at boot | Offline banner, cached profiles/friends, offline launch of already-downloaded versions |
| Auth token expired | Silent refresh via msmc's stored refresh token; on failure a re-auth modal, launch blocked |
| Manifest / CDN unreachable | `Couldn't reach Mojang services` + `Retry`, offline launch still allowed |
| Download failure / checksum mismatch | Per-file retry ×3, then `Download failed` + `Retry` / `View log` |
| Disk full | Pre-flight free-space check with required size in the error |
| Java missing / wrong major | `Java {21} required` + `Download Java` (managed JRE) |
| RAM > physical | Inline warning at 70% of system RAM, hard cap at 90% |
| Mod ↔ loader/MC mismatch | Amber chip on the row + blocking confirm before launch |
| Cloud quota exceeded | Sync pauses, `Storage full` banner + `Upgrade` |
| Two instances of the launcher | Single-instance lock, focus the existing window |
| Game already running | LAUNCH → `RUNNING` + `Kill`; second launch asks to confirm |
| Update available | Purple banner `Update available` + `Restart to update` |

# Noctra Client — UI/UX Design System & Technical Specification

> **Project**: Noctra Client (Minecraft Desktop Launcher)  
> **Concept Designer**: dbm (2026)  
> **Role**: Comprehensive UI/UX Design & Architecture Specification  
> **Target Platform**: Electron / React Desktop Application (Cross-Platform: Windows, macOS, Linux)  
> **Source Asset Directory**: [`redesign/`](file:///home/ubuntu/nativelauncher/redesign)

---

## 1. Executive Summary & Design Vision

The **Noctra Client** redesign represents a modern, high-contrast, gaming-oriented UI/UX architecture for a custom Minecraft launcher. Drawing inspiration from Lunar Client, Feather, Badlion, and modern gaming hubs like Steam and Discord, Noctra establishes a streamlined 3-tier desktop workflow:

1. **Effortless Game Launch & Profile Management**: Instant access to launch actions, granular Java/memory controls, and 1-click mod/addon customization.
2. **Deep Social & Community Integration**: Real-time presence, in-launcher friend lists, quick-chat flyouts, and the full-screen **Noctra Relay** communication hub.
3. **Integrated Player Personalization**: The **Locker** wardrobe for 3D skins and animated capes, alongside the **Gallery** screenshot vault with intelligent server/player metadata tagging.
4. **Resilient System States**: High-visibility offline fallback warnings, real-time downloading progress feeds, and automated root-cause detection for game crashes.

---

## 2. Design System Tokens & Style Guide

### 2.1 Color Palette

Based on the official Noctra Style Guide ([`3bee7b248243369.69efde1bb0db3.png`](file:///home/ubuntu/nativelauncher/redesign/3bee7b248243369.69efde1bb0db3.png)):

| Token Name | Hex Code | Purpose / Usage |
| :--- | :--- | :--- |
| **Beyond Black** | `#060305` | Primary application background, deep dark canvas |
| **Surface Dark** | `#0c090c` | Side navigation rail, drawer headers, card backdrops |
| **Surface Elevated** | `#141015` | Elevated panels, modal containers, interactive cards |
| **Surface Border** | `rgba(255, 255, 255, 0.08)` | Subtle 1px dividers, card boundaries, input borders |
| **Surface Hover** | `rgba(255, 255, 255, 0.05)` | Hover state for lists, buttons, and menu items |
| **Purple Freedom** | `#a051a2` | Primary brand accent, active navigation pills, outgoing chat |
| **Purple Muted / Glow** | `rgba(160, 81, 162, 0.20)` | Glow effects, card focus borders, backdrop highlights |
| **Light Gray** | `#d2d2d2` | Primary body typography, labels, active icon states |
| **Pure White** | `#ffffff` | High-emphasis headings, key metrics, brand logo |
| **Muted Gray** | `#75717a` | Secondary descriptions, timestamps, inactive icons |
| **Launch Teal** | `#3aa89f` | Primary "LAUNCH" button gradient, accent actions |
| **Status Green** | `#22c55e` | Online presence, active download bar, "Enabled" toggles |
| **Warning Orange** | `#f97316` | Offline status indicator, pinned conversation badge |
| **Alert Red** | `#ef4444` | Crash notification badge, delete/unfriend actions |
| **VIP Gold** | `#f59e0b` | "Best Friend" star, NoctraCloud "Upgrade" badge |

```css
:root {
  --color-bg-beyond-black: #060305;
  --color-surface-dark: #0c090c;
  --color-surface-elevated: #141015;
  --color-surface-border: rgba(255, 255, 255, 0.08);
  --color-surface-border-subtle: rgba(255, 255, 255, 0.04);
  --color-primary-purple: #a051a2;
  --color-primary-purple-hover: #b665b8;
  --color-primary-purple-glow: rgba(160, 81, 162, 0.25);
  --color-launch-teal: #3aa89f;
  --color-launch-teal-hover: #48c1b7;
  --color-text-primary: #d2d2d2;
  --color-text-heading: #ffffff;
  --color-text-muted: #75717a;
  --color-success: #22c55e;
  --color-warning: #f97316;
  --color-danger: #ef4444;
  --color-gold: #f59e0b;
}
```

### 2.2 Typography

- **Font Family**: `Figtree` (Geometric Sans-Serif designed by Erik Kennedy)
- **Secondary / Fallbacks**: `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- **Typographic Scale**:
  - **Hero / Display**: `32px` – `36px` | Weight: `900 Black` (e.g., Version badges `26.1`, `1.21`, "LAUNCH")
  - **H1 / Modal Titles**: `22px` – `24px` | Weight: `700 Bold` ("CHANGE VERSION", "GALLERY", "LOCKER")
  - **H2 / Section Titles**: `16px` – `18px` | Weight: `700 Bold` ("LATEST PROFILES", "PARTNERS", "NEWS FEED")
  - **Body / Standard**: `13px` – `14px` | Weight: `500 Medium` (Menu items, form inputs, player names)
  - **Caption / Meta**: `11px` – `12px` | Weight: `400 Light` / `500 Medium` (Timestamps, build version, sub-labels)
  - **Micro**: `10px` | Weight: `700 Bold` (Uppercase tags e.g. "NEW VERSION!", "EXIT CODE: 255")

---

## 3. Global Architecture & Navigation Framework

The application window uses a frameless Electron structure with a unified three-column layout:

```
+----+---------------------------------------------------+--------------------+
|    | Top Bar: Brand, Build v0.9.2, Presence Count      | Win Controls: - [] X|
|    +---------------------------------------------------+--------------------+
| L  |                                                   |                    |
| E  |                                                   | R I G H T          |
| F  |              C E N T E R                          |                    |
| T  |                                                   | S O C I A L        |
|    |              V I E W P O R T                      |                    |
| R  |                                                   | D R A W E R        |
| A  |   (Home / Version Switcher / Locker / Gallery)   |                    |
| I  |                                                   | (Friends, Requests,|
| L  |                                                   |  Active Chat)      |
|    |                                                   |                    |
+----+---------------------------------------------------+--------------------+
```

### 3.1 Left Icon Navigation Rail
- Fixed width: `60px`
- Items (Top to Bottom):
  1. **Brand Glyph**: Noctra geometric "N" in pure white
  2. *Divider*
  3. **Home**: Dashboard, launch button, quick profiles, news feed
  4. **Account / Wardrobe (Locker)**: 3D skin editor, capes, cosmetics
  5. **Notifications**: System alerts, update announcements
  6. *Divider*
  7. **Noctra Relay (Chat)**: Instant messaging & groups
  8. **Versions / Profiles**: Minecraft instance & mod pack manager
  9. **Servers / Browser**: Community multiplayer server directory
  10. **Gallery**: In-game screenshot capture vault
  11. *Spacer*
  12. **Store / Cart**: Cosmetics marketplace (with unread badge indicator)
  13. **Settings**: Global launcher settings, storage, Java, cloud sync

### 3.2 Right Social Drawer
- Fixed width: `280px`
- Header tab toggle: `Friends` vs `Requests` (with pending badge dot)
- Fast player search input with `+` Add Friend button
- Categorized status groups:
  - `Online`: Real-time presence tags (`In-game: Hypixel`, `In Launcher`, `Idle`, `In Menus`)
  - `Offline`: Relative duration badges (`Offline for 3 days`, `Offline for 21 hours`)

---

## 4. Visual Screen Analysis & Detailed Specifications

### Screen 1: Splash & Microsoft Authentication
*Reference Image: [`098de8248243369.69f217d9e1147.png`](file:///home/ubuntu/nativelauncher/redesign/098de8248243369.69f217d9e1147.png) | Mockup: [`a1bd0f248243369.69f1f8e5a02b6.png`](file:///home/ubuntu/nativelauncher/redesign/a1bd0f248243369.69f1f8e5a02b6.png)*

- **Layout Structure**: 50/50 split screen.
  - **Left Side**: Pure `#060305` dark background centered card:
    - Noctra 3D geometric "N" logo (`48px` height)
    - "Noctra Client" wordmark (`24px`, bold)
    - **Primary Button**: `Log in with Microsoft`
      - Background: `#ffffff`, text: `#000000`, 4-color Microsoft logo glyph
      - Border-radius: `10px`, height: `44px`
    - **Secondary Button**: `View code GitHub`
      - Background: `rgba(255, 255, 255, 0.06)`, border: `1px solid rgba(255, 255, 255, 0.12)`
      - White text with GitHub Octocat icon
    - **Social Media Rail**: Discord, X (Twitter), Instagram, YouTube, Behance/Pinterest
    - **Footer Links**: `Privacy Policy • Terms of Service • Support`
  - **Right Side**: Full-bleed 3D isometric dark-mode Minecraft scene with glowing purple lanterns and a monolithic Noctra obsidian plinth.

---

### Screen 2: Home Page (Main Dashboard)
*Reference Image: [`a0c44f248243369.69f217d9342a9.png`](file:///home/ubuntu/nativelauncher/redesign/a0c44f248243369.69f217d9342a9.png) | Overview: [`1157ee248243369.69f12e63bb2a7.png`](file:///home/ubuntu/nativelauncher/redesign/1157ee248243369.69f12e63bb2a7.png)*

- **Top Status & Greeting**:
  - `Good to see you, [Skin Head] dbrn ˇ` (clickable account selector dropdown)
  - Activity subtitle: `Last played: Hypixel • 16 hours ago | Total playtime: 1,364h`
- **Hero Launch Section**:
  - **Launch Action Card**:
    - High-emphasis Teal pill container (`#3aa89f` gradient)
    - Large bold `L A U N C H` typography
    - Modloader/Version subtitle: `Fabric 1.21.3`
    - Secondary dropdown trigger bar: `CHANGE VERSION ˇ`
  - **Latest Profiles Card**:
    - Fast access pills for recent instances:
      - `Hypixel Bedwars (Forge 1.8.9)`
      - `WorldEdit (Fabric 1.21.11)`
    - Pagination dots indicator
  - **Partner Servers / Communities**:
    - Circular badge matrix: Hypixel, Badlion, Lunar, GommeHD, etc.
- **News Feed (2x2 Grid)**:
  - **Card 1 (Changelog)**: 3D Noctra glyph, release notes bullet points, `READ MORE` action
  - **Card 2 (Update Release)**: Minecraft key art, `NEW VERSION!` badge, `26.1 Ready in Noctra`
  - **Card 3 (Creator Program)**: `BECOME A CREATOR - Get your custom code, earn revenue`
  - **Card 4 (Module Highlights)**: `NEW MODS! - Combat HUD, Weather Changer, Advanced Keystrokes`

---

### Screen 3: Home Page States (Downloading & Offline Failover)
*Downloading: [`8ab221248243369.69f217d9349cb.png`](file:///home/ubuntu/nativelauncher/redesign/8ab221248243369.69f217d9349cb.png) | Offline: [`94c575248243369.69f217d93500d.png`](file:///home/ubuntu/nativelauncher/redesign/94c575248243369.69f217d93500d.png)*

- **Downloading State**:
  - Launch button transforms into an active green gradient status bar: `DOWNLOADING - Fabric 1.21.8`
  - In-button quick controls: Cancel (`✕`) and Pause (`||`)
  - Sub-button progress rail: Full-width neon green fill
  - Progress status text: `Fetching fabric-loader-0.15.7.jar...` (left) | `78.4 MB / 112.5 MB` (right)
- **Offline State**:
  - Top edge banner: Warm amber warning bar (`#f97316`)
    - Icon: Crossed-out Wi-Fi symbol
    - Message: `Noctra is running in offline mode. No connection available.`
    - Action link: `Potential Solutions ↗`
  - Disabled Launch button: Charcoal gray disabled background, muted white text
  - News feed cards: Content obscured by semi-transparent backdrop with disconnected Wi-Fi watermark
  - Friends Drawer: Displays `Unable to connect to Noctra Friends Service` with fallback offline roster

---

### Screen 4: Version Switcher
*Reference Image: [`c65d0c248243369.69f217daa8f89.png`](file:///home/ubuntu/nativelauncher/redesign/c65d0c248243369.69f217daa8f89.png) | Overview: [`2e0b74248243369.69f1f8e59f428.png`](file:///home/ubuntu/nativelauncher/redesign/2e0b74248243369.69f1f8e59f428.png)*

- **Layout**: 3-column responsive card grid.
- **Card Design**:
  - Rich themed background wallpaper corresponding to each official Minecraft update (e.g. Tricky Trials 1.21, Nether Update 1.16, Aquatic 1.13, Combat 1.8)
  - Giant release numeral overlay (`26.1`, `1.21`, `1.20`, `1.19`, `1.16`, `1.13`, `1.12`, `1.8`, `1.7`)
  - Top-left subversion pill: e.g. `1.21.7 ˇ` (opens interactive flyout for `1.21.11`, `1.21.10`, `1.21.9`, `1.21.8`)
  - Bottom bar actions:
    - Edit/Tag icon (`✏️`)
    - Modloader icon (e.g., Anvil for Forge on 1.8.9, Fabric badge on 1.21)
    - Settings gear icon (`⚙️`)
    - Card-specific `LAUNCH` button (active teal on selected profile, subtle dark button on inactive)

---

### Screen 5: Mod & Addon Management Modal
*Reference Image: [`75e345248243369.69f217db5587b.png`](file:///home/ubuntu/nativelauncher/redesign/75e345248243369.69f217db5587b.png)*

- **Modal Header**:
  - Version target pill: `1.21.7 ˇ`
  - Search field: `Find a mod...`
  - Quick action toolbar: Check Updates icon, Filter icon, Open Local Mods Folder icon (`📁`), Modal Close (`✕`)
- **Navigation Sidebar**:
  - `Loader` (Fabric / Forge / Quilt / NeoForge)
  - `Mods` (Active tab with purple pill highlight)
  - `Shaders` (OptiFine / Iris shader packs)
  - `Worlds` (Singleplayer save files)
  - `Resources` (Resource & texture packs)
  - `Advanced` (JVM & resolution preferences)
- **Mod Content Area**:
  - **Upload Banner**: `+ 3rd Party Mods | Drag & drop files here, or browse to add mods. | All mods synced to Noctra Cloud`
  - **Mod List Rows**:
    - Mod icon (rounded square, 36x36px)
    - Mod title + Author (e.g. `Litematica` by `masa`, `Mod Menu` by `Terraformers`, `FerriteCore` by `malte0811`)
    - Metadata badge: Version `v0.26.3` • Size `1.82MB`
    - Toggle Switch: `Enabled [✔]` (green check indicator)
    - Action buttons: Settings gear (`⚙️`), Delete trashcan (`🗑️`)

---

### Screen 6: Advanced Game & JVM Settings
*Reference Image: [`4e0e54248243369.69f217db55d7f.png`](file:///home/ubuntu/nativelauncher/redesign/4e0e54248243369.69f217db55d7f.png)*

- **Warning Banner**:
  - Red alert icon: `Proceed with caution. Modifying these settings may cause game instability.`
  - Noctra Cloud sync status: `Last synced: 2 hours ago`
- **Section 1: Game Resolution**:
  - Width & Height inputs: `W 1920` × `H 1080`
  - Mode Checkboxes: `Fullscreen mode`, `Borderless Window [✔]`, `Lock Aspect Ratio [✔]`
  - Quick Resolution Pills: `1080p`, `1440p`, `4K`, `Match Native Display`, `Visualize on screen`
- **Section 2: Allocated Memory (RAM)**:
  - Header badge: `6 GB / 32 GB` (Current allocation vs Total system physical memory)
  - Interactive slider bar with stepped markers at `1 GB`, `8 GB`, `16 GB`, `24 GB`, `32 GB`
  - Reset to recommended default icon
- **Section 3: JVM Arguments**:
  - Custom execution flags textarea for garbage collection tuning (e.g. `-XX:+UseG1GC`)

---

### Screen 7: Locker (Wardrobe & 3D Skin Manager)
*Reference Image: [`ccff04248243369.69f20f618f1ff.png`](file:///home/ubuntu/nativelauncher/redesign/ccff04248243369.69f20f618f1ff.png)*

- **Primary 3D Stage**:
  - Interactive WebGL viewport rendering the active player skin using `skinview3d`
  - Rotation handle, pose selector (Standing, Running, Sneaking, Elytra flight), reset camera
  - Cosmetic layer visibility toggles: Cape toggle, Ears/Hat layer toggle, Armor toggle
- **Skin & Cape Management Sections**:
  - **Upload Skin Dropzone**: `+ Drag & drop file or browse`
  - **Capes Carousel**: Horizontal list of owned official Minecraft and client capes (Cherry, Creeper, 15th Anniversary, etc.)
  - **Favorites Grid**: Starred skins with custom nickname and last worn timestamp (`suit (13d)`, `unnamed-1 (27d)`)
  - **Latest Grid**: Recent skins gallery
- **Import Skin Dialog**:
  - Left: Real-time 3D preview of the imported texture
  - Right form fields:
    - Name input (`unnamed-3`)
    - File path selector (`15d28829ff3a6321.png`)
    - Player Model radio toggle: `Wide` (Classic 4px arms) vs `Slim` (Alex 3px arms)
    - Save action button (`✔ Save`)

---

### Screen 8: Gallery (Screenshot Manager & Smart Filters)
*Reference Image: [`bcac39248243369.69f214d70c79f.png`](file:///home/ubuntu/nativelauncher/redesign/bcac39248243369.69f214d70c79f.png)*

- **Header Bar**:
  - Search input: `Search in gallery...`
  - Cloud storage meter: `All media synced to Noctra Cloud • 3.8 GB / 10.0 GB used`
  - Open in local filesystem folder icon (`📁`)
- **Right Filter Sidebar**:
  - **View Modes**: `Grid` (active) | `List` | `Detailed`
  - **Sorting**: `↑ Newest` (active) | `↓ Oldest` | `Size`
  - **Smart Filters**:
    - **Filter by player**: Player search + avatar head chips for nearby players detected during capture
    - **Filter by server**: Dropdown (e.g. Hypixel, Donut SMP, Singleplayer)
    - **Filter by date**: Quick pills (`Last Week`, `Last Month`) + interactive mini calendar datepicker
- **Screenshot Grid**:
  - 3-column card grid with server watermark and timestamp badge
  - Hover action menu: Delete (`🗑️`), Share/Export, Copy image to clipboard, Fullscreen lightbox
- **Empty State**:
  - Framed camera illustration
  - Headline: `Your Gallery is empty.`
  - Guide text: `Press F2 in-game to capture your first memory!`
  - Resolution link: `Think this is a mistake? Change default folder path`

---

### Screen 9: Social System (Friends, Chat Overlay & Context Menu)
*Reference Image: [`ce55ab248243369.69f205e3d633d.png`](file:///home/ubuntu/nativelauncher/redesign/ce55ab248243369.69f205e3d633d.png)*

- **Tabs**:
  - `Friends`: List of accepted contacts grouped by online presence
  - `Requests`: Received invitations (with green accept `✔` and red decline `✕`) & Sent invitations (with cancel `✕`)
- **Fast-Chat Overlay**:
  - Compact floating messenger drawer
  - Incoming bubble: Dark charcoal `#1a161b` with sender timestamp
  - Outgoing bubble: Purple Freedom `#a051a2` with delivered checkmark
  - Input footer with attachment clip, emoji picker, and send arrow
- **Contextual Right-Click Actions**:
  - `Join Server` (highlighted cyan/teal action)
  - `Send Message`
  - `Add to Group`
  - `Add Best Friend` (gold star)
  - `Set Nickname`
  - `Copy IGN`
  - `Unfriend` / `Block` (danger red)

---

### Screen 10: Noctra Relay (Full-Screen Communications)
*Reference Image: [`059a75248243369.69f205e3d5c18.png`](file:///home/ubuntu/nativelauncher/redesign/059a75248243369.69f205e3d5c18.png)*

- **Purpose**: A native Discord-alternative communication hub built directly into the client.
- **Left Panel (Channel & DM Navigation)**:
  - `Search inbox...`
  - `Pinned`: High-priority threads with pinned thumbtack icon
  - `Groups`: Multi-user party/group conversations with avatar collage
  - `Direct Messages`: Comprehensive contact roster with presence status
- **Main Chat Viewport**:
  - Conversation header: User avatar, player IGN (`cuvsa`), verified checkmark, server location (`In-game: Donut SMP`), voice call trigger, media gallery button
  - Rich chat feed: Date dividers (`19 April`), grouped speech bubbles, emoji reactions
  - Media embedding: In-line expandable screenshot cards with download and zoom controls
  - Real-time typing indicators: `cuvsa is typing...`
  - Expanded input toolbar: GIF library, emoji picker, voice note recorder, file attachments

---

### Screen 11: NoctraCloud & Storage Management
*Reference Image: [`bbafc9248243369.69f217dbe9b51.png`](file:///home/ubuntu/nativelauncher/redesign/bbafc9248243369.69f217dbe9b51.png)*

- **Cloud Storage Breakdown**:
  - Multi-segmented storage capacity bar (`5.6 GB / 10.0 GB used`):
    - `Capture`: 3.2 GB (Purple)
    - `Assets`: 1.4 GB (Orange)
    - `Configs`: 0.5 GB (Blue)
    - `Locker`: 0.4 GB (Yellow)
    - `Other`: <0.1 GB (Teal)
    - `Free`: 4.4 GB (Green)
  - NoctraCloud Tier badge: `STANDARD` with `Upgrade ↗` gold pill
- **Sync Preferences**:
  - `Auto-Sync Captures [✔]`
  - `Sync Resources [✔]`
  - `Backup Configurations [✔]`
  - `Upload only when game is closed [ ]`

---

### Screen 12: Game Crash & Failure Recovery
*Reference Image: [`bbafc9248243369.69f217dbe9b51.png`](file:///home/ubuntu/nativelauncher/redesign/bbafc9248243369.69f217dbe9b51.png)*

- **Crash Diagnostics Modal**:
  - Red geometric warning badge: Exploding block glyph
  - Title: `Game Crash Detected`
  - Diagnostic error summary: `The internal server encountered a fatal error while updating a block entity. (Exit Code: 255)`
  - **Automated Root-Cause Detection**:
    - `Suspected Cause`: Identifies culprit jar file directly from stacktrace (e.g. `Lithium (lithium-fabric-mc1.21.3-0.12.2.jar)`)
  - **Immediate Remediation Actions**:
    - Primary Button: `Relaunch Game` (gamepad icon)
    - Secondary Buttons: `Copy Crash Log` | `Open Crash Log`
    - Support Link: Direct escalation to Noctra Help Center

---

## 5. Implementation Roadmap for NativeLauncher

The following architecture aligns NativeLauncher's React/Electron foundation with the Noctra design system:

```
src/
├── styles/
│   ├── theme.css            <-- Inject Noctra tokens: #060305, #a051a2, #3aa89f, Figtree font
│   └── typography.css       <-- Figtree @font-face declarations
├── components/
│   ├── layout/
│   │   ├── NavigationRail.jsx <-- 60px Left icon navigation bar
│   │   ├── TitleBar.jsx       <-- Frameless window header with online presence & window controls
│   │   └── SocialDrawer.jsx   <-- 280px Right Friends & Fast-Chat panel
│   └── ui/
│       ├── Button.jsx         <-- Noctra primary (teal), secondary (purple), ghost buttons
│       ├── Modal.jsx          <-- Frosted dark elevated modal wrapper
│       └── Slider.jsx         <-- Noctra stepped RAM allocation slider
└── features/
    ├── home/                  <-- Home dashboard with launch card, latest profiles, news feed
    ├── instances/             <-- Version Switcher grid with subversion selector
    ├── mods/                  <-- Mod Management modal with cloud sync and search
    ├── wardrobe/              <-- Locker skin/cape manager with skinview3d
    ├── gallery/               <-- Screenshot manager with smart player/server filters
    ├── relay/                 <-- Full-screen chat and group messenger
    └── crash/                 <-- Crash recovery dialog with automated culprit detection
```

---
*Document generated as part of the NativeLauncher Noctra Redesign initiative.*

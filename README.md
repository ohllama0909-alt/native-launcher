# Noctra Client

A modern Minecraft launcher for Windows, Linux and macOS. Built with Electron, React and Vite.

## Features

- **Instances** — create as many instances as you like, each with its own version, mod loader and memory allocation. Rename, duplicate, delete, or open the folder on disk.
- **Versions** — the full Minecraft version list pulled live from Mojang's manifest (releases, snapshots, beta and alpha), with per-version mod loader availability.
- **Loaders** — Vanilla, Fabric, Forge, NeoForge and Quilt.
- **Browse** — search Modrinth for mods, modpacks, shaderpacks, resourcepacks and datapacks. Each download is routed to the right folder, and `.mrpack` modpacks are unpacked into a brand new instance.
- **Accounts** — Microsoft sign-in plus offline accounts, with real skins and avatars for both.
- **Auto updates** — delivered through GitHub releases.

## Repository Contents

- **`src/` & `electron/`**: Noctra Client desktop application source code.
- **[`docs/`](./docs/)**: Comprehensive documentation suite:
  - [01 — Design Book](./docs/01-design-book.md): Brand, color palette, typography, spacing, component library
  - [02 — Screen Specs](./docs/02-screen-specs.md): Detailed per-screen specification and edge cases
  - [03 — Architecture](./docs/03-architecture.md): Electron + React + TS architecture, IPC contract, launch pipeline
  - [04 — Roadmap](./docs/04-roadmap.md): 10-phase build roadmap from scratch with estimates and gates
  - [05 — Copy Deck](./docs/05-copy-deck.md): Complete verbatim string catalog for i18n
- **[`design/`](./design/)**: High-resolution UI/UX design mockups covering all client interfaces.

## Getting started

Requires Node.js 18 or newer.

```bash
npm install
npm run dev
```

`npm run dev` starts Vite on port 5173 and launches Electron against it with hot reload.

To run a production build locally:

```bash
npm start
```

## Packaging

```bash
npm run dist:win     # NSIS installer + portable zip
npm run dist:linux   # AppImage + deb
npm run dist:mac     # dmg + zip
```

Builds land in `release/`.

## Tech

[Electron](https://www.electronjs.org/) · [React 18](https://react.dev/) · [Vite](https://vite.dev/) · [minecraft-launcher-core](https://github.com/Pierce01/MinecraftLauncher-core) · [msmc](https://github.com/Hanro50/MSMC) · [electron-updater](https://www.electron.build/auto-update)

Game content is provided by [Modrinth](https://modrinth.com/). Noctra Client is an unofficial project and is not affiliated with Mojang or Microsoft.


# Native

A Minecraft launcher for Windows, Linux and macOS. Built with Electron, React and Vite.

## Features

- **Instances** — create as many instances as you like, each with its own version, mod loader and memory allocation. Rename, duplicate, delete, or open the folder on disk.
- **Versions** — the full Minecraft version list pulled live from Mojang's manifest (releases, snapshots, beta and alpha), with per-version mod loader availability.
- **Loaders** — Vanilla, Fabric, Forge, NeoForge and Quilt.
- **Browse** — search Modrinth for mods, modpacks, shaderpacks, resourcepacks and datapacks. Each download is routed to the right folder, and `.mrpack` modpacks are unpacked into a brand new instance.
- **Accounts** — Microsoft sign-in plus offline accounts, with real skins and avatars for both.
- **Auto updates** — delivered through GitHub releases.

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

Builds land in `release/`. `npm run dist:win:publish` bumps the version, ensures the GitHub release exists and publishes the artifacts.

## Project structure

```
electron/          Main process: window, auth, launcher, mods, modpacks, updater
  main.js          Window creation and the IPC surface
  preload.js       The window.native bridge exposed to the renderer
  auth.js          Microsoft and offline accounts, cached avatars
  mods.js          Content downloads into mods/shaderpacks/resourcepacks/datapacks
  modpacks.js      .mrpack installer
src/
  components/ui/   Shared primitives (NativeIcon, PlayerAvatar, Logo, Button...)
  features/
    shell/         App frame, navbar and window controls
    home/          Landing view
    instances/     Instance grid and the create-instance flow
    clusters/      Versions page
    browser/       Modrinth browser
    cluster/       Instance detail
    auth/          Accounts drawer
    settings/      Settings
    updater/       Update centre
  lib/
    mojang.js      Version manifest + loader availability
    skins.js       Skin and avatar URL resolution
    contentApi.js  CurseForge and Modrinth normalisation
  styles/          Design tokens and global styles
```

## Where data lives

Everything is stored under the Electron user-data directory:

| Path | Contents |
| --- | --- |
| `instances.json` | Your instance list |
| `accounts.json` | Accounts and the active account id |
| `avatars/` | Cached player avatars |
| `minecraft/` | Assets, libraries, versions |
| `minecraft/instances/<id>/` | One game directory per instance |

## Tech

[Electron](https://www.electronjs.org/) · [React 18](https://react.dev/) · [Vite](https://vite.dev/) · [minecraft-launcher-core](https://github.com/Pierce01/MinecraftLauncher-core) · [msmc](https://github.com/Hanro50/MSMC) · [electron-updater](https://www.electron.build/auto-update)

Game content is provided by [Modrinth](https://modrinth.com/). Native is an unofficial project and is not affiliated with Mojang or Microsoft.

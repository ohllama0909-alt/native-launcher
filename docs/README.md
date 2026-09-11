# Noctra Client — Documentation

Design book and build roadmap derived from the 19 UI/UX mockups in [`/design`](../design).

| Doc | What's inside |
|---|---|
| [01 — Design Book](./01-design-book.md) | Brand, colour system, typography, spacing, radii, motion, iconography, full component library spec |
| [02 — Screen Specs](./02-screen-specs.md) | Screen-by-screen breakdown of every mockup: regions, copy, states, edge cases |
| [03 — Architecture](./03-architecture.md) | Electron + React + TS structure, module map, IPC contract, auth flow, game launch pipeline, Modrinth integration, Noctra backend |
| [04 — Roadmap](./04-roadmap.md) | 10 phases, milestones, task breakdown with estimates, risks, definition of done |
| [05 — Copy Deck](./05-copy-deck.md) | Every string in the mockups, verbatim, ready for i18n |

## Project metadata (from cover mockup)

```
PROJECT   Noctra Client
ROLE      UI/UX Design
PLATFORM  Desktop Application
CONCEPT   dbrn · 2026
BUILD     0.9.2 (as shown in all mockups)
```

## One-paragraph product definition

Noctra Client is a third-party Minecraft desktop launcher. It manages Minecraft
versions and mod loaders (Vanilla / Fabric / Forge), per-version profiles with
mods, shaders, worlds and resource packs, a built-in skin & cape wardrobe
("Locker"), an in-launcher screenshot gallery with smart filters, a full social
layer (friends, requests, fast-chat and a full-screen messenger called "Noctra
Relay"), and cloud sync of configs/cosmetics/captures via "Noctra Cloud".
Stated design inspiration: Lunar Client, Feather Client and other third-party
launchers.

## Mockup → screen index

| File | Screen |
|---|---|
| `81f124…b22c4.png` | Cover / project metadata + Home & Settings preview |
| `3bee7b…b0db3.png` | **Style guide** — palette + typography |
| `537c37…b01b5.png` | About |
| `098de8…e1147.png` | Login page (full window) |
| `a1bd0f…a02b6.png` | Login page (laptop presentation render) |
| `a0c44f…342a9.png` | Home — default / online |
| `1157ee…bb2a7.png` | Home — annotated + Offline & Downloading states |
| `8ab221…349cb.png` | Home — Downloading state |
| `94c575…3500d.png` | Home — Offline state |
| `ce55ab…d633d.png` | Friends menu — Friends / Requests / chat overlay / context menu |
| `059a75…d5c18.png` | Noctra Relay — full-screen messenger |
| `c65d0c…a8f89.png` | Change Version — version grid + version dropdown |
| `2e0b74…9f428.png` | Version switcher overview + profile panels + fetching state |
| `75e345…5587b.png` | Profile panel — Mods |
| `732461…55266.png` | Profile panel — Worlds (loading / syncing) |
| `4e0e54…55d7f.png` | Profile panel — Advanced (resolution / RAM / JVM) |
| `ccff04…8f1ff.png` | Locker — skins, capes, upload popup |
| `bcac39…0c79f.png` | Gallery — grid, smart filters, empty state |
| `bbafc9…e9b51.png` | System states — Game Crash Detected modal + NoctraCloud storage |

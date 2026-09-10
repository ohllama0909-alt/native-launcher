# Noctra Client redesign implementation

This branch applies the Noctra reference system to the existing Native launcher without replacing its Electron IPC, account, instance, launch, download, settings, wardrobe, update, or filesystem behavior.

## Exact foundation tokens

| Role | Value |
|---|---|
| Beyond Black | `#060305` |
| Rail / drawer surface | `#0c090c` |
| Elevated surface | `#141015` |
| Border | `rgba(255,255,255,0.08)` |
| Hover | `rgba(255,255,255,0.05)` |
| Purple Freedom | `#a051a2` |
| Purple hover | `#b665b8` |
| Purple glow | `rgba(160,81,162,0.25)` |
| Launch teal | `#3aa89f` |
| Launch teal hover | `#48c1b7` |
| Primary text | `#d2d2d2` |
| Heading | `#ffffff` |
| Muted text | `#75717a` |
| Success | `#22c55e` |
| Warning | `#f97316` |
| Danger | `#ef4444` |
| Gold | `#f59e0b` |

## Typography

Primary family: **Figtree**, then Segoe UI/system sans fallbacks. Mono data uses JetBrains Mono/Consolas. Display/launch text is 34px/900 with 0.18em tracking; page titles are 22–28px/700; section labels are 10px/700 uppercase; body UI is 13–14px/500; metadata is 9–11px.

## Geometry

- Navigation rail: `60px` fixed.
- Frameless title bar: `38px` fixed.
- Social drawer: `280px` fixed; hidden below `980px`.
- Main content: between the rail, title bar, and drawer.
- Launch stack: `98px`; teal action `72px`; version control `26px`.
- Home card radius: `9px`; system radius scale: `4 / 6 / 8 / 10 / 12 / 16px`.
- Home gutter: `44px` desktop, `24px` compact.
- Version/profile cards: 37px rows with 7px radius.
- Borders are 1px; elevation uses restrained black shadows and purple glow only for branded focus.

## Backend compatibility

All existing hook and IPC boundaries remain intact. The home launch/install/kill control still uses `useLauncher`, install state still uses `useIsInstalled`, profile selection and settings still use the existing callbacks, and the application continues to use the same Shell, modal, updater, account, instance, wardrobe, and Electron preload APIs.

## Responsive and accessibility behavior

The social drawer collapses at 980px, the home layout drops the partners column at 1100px, controls retain native labels/tooltips, reduced-motion preferences collapse animations, and text/controls use high-contrast foregrounds against the Beyond Black surface.

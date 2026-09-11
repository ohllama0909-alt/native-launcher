# 1:1 Visual Fidelity & Design System Standards

## 1. The 1:1 Reference Alignment Rule
Any redesigned screen must achieve visual identity with its canonical mockup at standard viewport (1200×675) and gracefully adapt to window resizing, maximization, and Appearance presets.

### Canonical Mockups
- **Versions Page Grid Screen:** `redesign/c65d0c248243369.69f217daa8f89.png`
- **Feature Overview & Mod Management:** `redesign/2e0b74248243369.69f1f8e59f428.png`

---

## 2. Versions Page Specifications
1. **Header Layout:**
   - Section title: `CHANGE VERSION` in Poppins/Figtree 800 uppercase, tracking `0.12em`.
   - Subtle snapshots filter chip and `+ New instance` action button aligned to the right.

2. **3-Column Card Grid:**
   - Grid columns: `repeat(3, minmax(0, 1fr))` with 20px gap.
   - Canonical 3×3 ordering matching mockup `c65d0c248243369.69f217daa8f89.png`:
     - Row 1: **26.1** (`26.1.1`) | **1.21** (`1.21.7`, active) | **1.20** (`1.20.4`)
     - Row 2: **1.19** (`1.19.1`) | **1.16** (`1.16.5`) | **1.13** (`1.13.1`)
     - Row 3: **1.12** (`1.12.2`) | **1.8** (`1.8.9`) | **1.7** (`1.7.10`)
   - Scrollable container for additional versions (26.2, 1.18, 1.17, 1.15, 1.14, snapshots).

3. **Card Anatomy & Interactivity:**
   - **Artwork:** Full-bleed official widescreen key art with vertical gradient scrim. Inactive cards are subtly dimmed; the selected card is vivid and highlighted.
   - **Center Display:** Prominent major version numeral (`26.1`, `1.21`, `1.20`, etc.) centered in Poppins 800.
   - **Top-Left Patch Chip:** Translucent pill showing active patch (e.g. `1.21.7 ▾`). Clicking toggles a glass dropdown listing available release patches.
   - **Bottom Action Bar:**
     - Left: Loader icon button displaying the version's mod loader (Forge Anvil for 1.8/1.7, Fabric spool for modern versions, Vanilla for 1.13). Clicking cycles through available loaders.
     - Right: Settings gear button to configure instance/mods (`onOpenCluster`), and `LAUNCH` button.
   - **Selected Card Highlighting:** Selected card receives a 1.5px solid `var(--brand)` border with `var(--brand-glow)` box-shadow. Its `LAUNCH` button is filled with `var(--launch-gradient)` and `var(--launch-shadow)`.

---

## 3. Appearance System Integration
All components must consume CSS variables and dataset attributes defined by `src/lib/appearance.js` and `src/styles/theme.css`:
- **Accent Color:** `--brand`, `--brand-glow`, `--brand-border`, `--brand-subtle`, `--launch-gradient`, `--launch-shadow`, `--fg-on-brand`.
- **Surface Mode:** `data-surface` (`dim`, `dark`, `midnight`, `black`) drives `--component-bg` and `--page`.
- **Corner Radius:** `data-radius` (`sharp`, `soft`, `round`) applies `--radius-lg`, `--radius-sm`, and sharp overrides.
- **Glow Toggle:** `data-glow="off"` suppresses glow shadows automatically.

---

## 4. Visual Verification Pipeline
Automated headless screenshot verification via Electron + Xvfb:
```bash
xvfb-run --auto-servernum --server-args="-screen 0 1920x1080x24" /home/ubuntu/noctra-client/packages/app/node_modules/.bin/electron scripts/verify-screenshot.js
```
Outputs:
- `screenshot-versions-view.png` — Grid overview with 1.21 highlighted.
- `screenshot-versions-dropdown.png` — Patch dropdown open on 1.21 matching `c65d`.
- `screenshot-theme-mint.png` / `ember` / `rose` — Theme adaptability proof.

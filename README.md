# Canto de Barro

**Canto de Barro** is a fully playable browser-native voxel sandbox inspired by Mexico’s landscapes, town architecture, material culture, and color. It is a real first-person building game—not a video, animation, or texture swap—and runs directly as a static GitHub Pages site.

## Play

**GitHub Pages:** <https://dh73.github.io/MMMMmmmmmmmaincra/>

The published site uses the readable files in `main` directly:

- `index.html`
- `styles.css`
- `src/game.js`
- `src/world.js`
- `manifest.webmanifest`
- `sw.js`

There is no archive loader, source reconstruction step, clone requirement, local server requirement, or generated runtime bundle. GitHub Pages serves the repository root and the browser imports the game modules normally.

## Implemented game

- Deterministic **80 × 40 × 80** editable voxel world split into **25 independently rebuildable chunks**.
- Exposed-face chunk meshing rather than one scene object per cube.
- First-person pointer-lock controls, gravity, collision, jumping, sprinting, swimming, step-up, and creative flight.
- Mining with material hardness and progress feedback; placement with an eight-slot hotbar.
- Desktop and touch controls.
- Eighteen original material types; no Minecraft code, textures, sounds, models, or branding.
- Day/night lighting, sun, moon, stars, atmospheric fog, water, clouds, fireflies, papel picado, and a festival particle finale.
- A generated pueblo with adobe houses, tiled roofs, bell tower, market, milpa, plaza, and ofrenda.
- Four major landmarks: **Pirámide del Viento**, **Cerro de Obsidiana**, **Cenote Azul**, and **Campo de Cempasúchil**.
- A persistent quest, **Camino de los Cuatro Rumbos**, culminating in an offering at the central altar.
- Autosave of world edits, position, seed, time, selected block, statistics, and quest progress.
- Seeded world creation, screenshot export, synthesized ambient music, interaction sound effects, installable manifest, and offline service worker.

## Controls

| Action | Desktop |
|---|---|
| Move | `W A S D` |
| Look | Mouse |
| Jump | `Space` |
| Sprint | `Shift` |
| Mine | Hold left mouse |
| Place / offer | Right mouse |
| Select block | `1`–`8` or wheel |
| Creative flight | `F` |
| Travel codex | `C` |
| Respawn | `R` |
| Toggle sound | `M` |
| Screenshot | `F2` |
| Pause | `Esc` |

## Development and verification

```bash
npm install
npm run check
```

The verification suite covers:

- deterministic generation;
- safe-spawn and collision invariants;
- landmark and altar generation;
- edit serialization and replay;
- 3D-DDA voxel targeting;
- bounded exposed-face renderer output;
- chunk partitioning;
- the native HTML/CSS/ES-module resource graph;
- web-manifest structure.

The GitHub Pages workflow runs these checks before deploying the repository root.

A headless Chromium visual test was attempted in the development environment, but that container could not initialize a GL backend. It is deliberately not reported as a passing visual test.

## Cultural direction

The game uses broad landscape and architectural inspiration—adobe, cantera, terracotta, milpa, nopal, cempasúchil, plazas, markets, cenotes, and mountain terrain—without presenting itself as a historical reconstruction or copying a specific sacred site.

## License and trademarks

MIT licensed. **Canto de Barro** is independent and is not affiliated with or endorsed by Mojang Studios or Microsoft. “Minecraft” is a trademark of Microsoft; this project uses none of its code or assets.

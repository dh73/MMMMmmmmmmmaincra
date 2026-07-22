# Canto de Barro

**Canto de Barro** is a fully playable browser-native voxel sandbox inspired by Mexico’s landscapes, town architecture, material culture, and color. It is not a video, an animation, or a texture swap: the world generator, chunk renderer, movement, collision, construction, quest, UI, generated textures, and synthesized audio are original.

## Play

The repository root is the game entrypoint. GitHub Pages can publish `main` directly, or use the included Pages workflow.

For local play:

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173` in a modern browser.

The entrypoint reads the committed game pack, verifies its exact SHA-256 (`2cf8185682e3bfe52f00d4ebbfcc619797153a5479a1f0a1da030395d70a39d5`), decompresses the complete modular source in-browser, reconstructs the ES-module graph with Blob URLs, and launches the game. A modified or incomplete pack is rejected before execution.

To inspect or edit the normal source tree locally:

```bash
bash unpack-source.sh
```

## Implemented game

- Deterministic **96 × 48 × 96** editable voxel world split into **36 independently rebuildable chunks**.
- Exposed-face meshing rather than one scene object per cube.
- First-person pointer-lock controls, gravity, collision, jumping, sprinting, swimming, step-up, and creative flight.
- Mining with material hardness and progress feedback; placement with an eight-slot hotbar.
- Desktop and touch controls.
- Runtime-generated pixel textures; no Minecraft code, textures, sounds, models, or branding.
- Day/night lighting, sun, moon, stars, atmospheric fog, animated water, clouds, fireflies, papel picado, and a festival particle finale.
- A generated pueblo with adobe houses, tiled roofs, bell tower, market, milpa, plaza, and ofrenda.
- Four major landmarks: **Pirámide del Viento**, **Cerro de Obsidiana**, **Cenote Azul**, and **Campo de Cempasúchil**.
- A persistent quest, **Camino de los Cuatro Rumbos**, culminating in an offering at the central altar.
- Autosave of world edits, position, seed, time, selected block, statistics, and quest progress.
- Seeded world reset, screenshot export, synthesized ambient music, and interaction sound effects.

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

## Verification

The source package contains the deterministic Node test suite. Before publication it passed:

- deterministic generation;
- safe-spawn invariants;
- all landmark and altar generation checks;
- edit serialization and replay;
- exact 3D-DDA voxel ray traversal;
- bounded exposed-face renderer output;
- local-only chunk rebuild behavior;
- static HTTP, manifest, and HTML resource-graph smoke checks.

The complete modular source can be unpacked and checked with:

```bash
bash unpack-source.sh
npm run check
```

A headless Chromium visual test was attempted in the development environment, but local browser navigation was blocked by administrator policy. It is deliberately not reported as a passing visual test.

## Cultural direction

The game uses broad landscape and architectural inspiration—adobe, cantera, terracotta, milpa, maguey, cempasúchil, plazas, markets, cenotes, and mountain terrain—without presenting itself as a historical reconstruction or copying a specific sacred site.

## License and trademarks

The packaged source is MIT licensed. **Canto de Barro** is independent and is not affiliated with or endorsed by Mojang Studios or Microsoft. “Minecraft” is a trademark of Microsoft; this project uses none of its code or assets.

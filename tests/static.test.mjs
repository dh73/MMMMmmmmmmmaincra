import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');
const game = await readFile(new URL('../src/game.js', import.meta.url), 'utf8');
const world = await readFile(new URL('../src/world.js', import.meta.url), 'utf8');
const physics = await readFile(new URL('../src/player-physics.js', import.meta.url), 'utf8');
const controller = await readFile(new URL('../src/player-controller.js', import.meta.url), 'utf8');
const serviceWorker = await readFile(new URL('../sw.js', import.meta.url), 'utf8');
const manifest = JSON.parse(await readFile(new URL('../manifest.webmanifest', import.meta.url), 'utf8'));

assert.match(html, /src="\.\/src\/game\.js"/);
assert.match(html, /src="\.\/src\/player-controller\.js"/);
assert.match(html, /type="importmap"/);
assert.match(game, /new CantoDeBarro/);
assert.match(world, /class VoxelWorld/);
assert.match(physics, /fixedStep:\s*1\s*\/\s*120/);
assert.match(physics, /class VoxelPlayerPhysics/);
assert.match(controller, /document\.pointerLockElement === this\.canvas/);
assert.match(controller, /physics\.advance/);
assert.match(serviceWorker, /player-physics\.js/);
assert.match(serviceWorker, /player-controller\.js/);
assert(css.length > 5000);
assert.equal(manifest.start_url, './');
assert.equal(manifest.display, 'fullscreen');
console.log('static graph tests passed');

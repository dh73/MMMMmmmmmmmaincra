import assert from 'node:assert/strict';
import { BLOCKS, LANDMARKS, VoxelWorld, WORLD } from '../src/world.js';

const first = new VoxelWorld('prueba-1325');
const second = new VoxelWorld('prueba-1325');
assert.deepEqual(first.data, second.data, 'generation must be deterministic');
assert.equal(first.data.length, WORLD.width * WORLD.height * WORLD.depth);
assert(first.spawn.y > first.highest(first.spawn.x, first.spawn.z), 'spawn must be above terrain');
assert.equal(first.collides(first.spawn.x-.3, first.spawn.y, first.spawn.z-.3, first.spawn.x+.3, first.spawn.y+1.7, first.spawn.z+.3), false, 'spawn volume must be clear');
for (const landmark of LANDMARKS) {
  let occupied = 0;
  for (let z = landmark.z - 3; z <= landmark.z + 3; z += 1) {
    for (let x = landmark.x - 3; x <= landmark.x + 3; x += 1) {
      for (let y = 8; y < WORLD.height; y += 1) if (first.get(x, y, z) !== BLOCKS.AIR) occupied += 1;
    }
  }
  assert(occupied > 40, `${landmark.name} must have generated structure/terrain`);
}
assert.equal(first.get(first.altar.x, first.altar.y, first.altar.z), BLOCKS.GLOW, 'altar light must exist');
const ray = first.raycast({ x:40.5,y:30,z:40.5 }, { clone(){ return this; }, normalize(){ return this; }, x:0,y:-1,z:0 }, 30);
assert(ray && ray.y >= 15, 'vertical DDA ray must hit the pueblo');
first.set(40, 19, 40, BLOCKS.ADOBE, true);
assert.deepEqual(first.serializeEdits(), [[40,19,40,BLOCKS.ADOBE]]);
const restored = new VoxelWorld('prueba-1325');
restored.applyEdits(first.serializeEdits());
assert.equal(restored.get(40,19,40), BLOCKS.ADOBE, 'edits must replay');
first.buildMeshes();
assert.equal(first.chunks.size, (WORLD.width / WORLD.chunk) * (WORLD.depth / WORLD.chunk));
let vertices = 0;
for (const chunk of first.chunks.values()) vertices += chunk.opaque.geometry.attributes.position.count + chunk.transparent.geometry.attributes.position.count;
assert(vertices > 10000 && vertices < 2000000, `mesh vertex count must remain bounded, got ${vertices}`);
console.log(`world tests passed: ${vertices} vertices across ${first.chunks.size} chunks`);

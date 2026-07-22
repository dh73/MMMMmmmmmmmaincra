import assert from 'node:assert/strict';
import { VoxelPlayerPhysics } from '../src/player-physics.js';

class Vec3 {
  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
  clone() { return new Vec3(this.x, this.y, this.z); }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
}

class TestWorld {
  constructor() {
    this.blocks = new Map();
    for (let x = 0; x < 16; x += 1) {
      for (let z = 0; z < 16; z += 1) this.blocks.set(`${x},0,${z}`, 1);
    }
  }
  get(x, y, z) { return this.blocks.get(`${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`) || 0; }
  set(x, y, z, id = 1) { this.blocks.set(`${x},${y},${z}`, id); }
}

function makeRig(position = new Vec3(8.5, 3, 8.5)) {
  const world = new TestWorld();
  const player = {
    position,
    velocity: new Vec3(),
    yaw: Math.PI,
    grounded: false,
    flying: false,
    inWater: false,
  };
  const physics = new VoxelPlayerPhysics(world, player, {
    bounds: { width: 16, height: 16, depth: 16 },
    isSolid: (id) => id === 1,
    isWater: (id) => id === 2,
  });
  return { world, player, physics };
}

{
  const { player, physics } = makeRig();
  assert.equal(physics.settle(), true, 'spawn settles onto the floor');
  assert.ok(Math.abs(player.position.y - 1) < 0.03, `feet should settle at y=1, got ${player.position.y}`);
  for (let i = 0; i < 240; i += 1) physics.advance(1 / 120, { forward: 0, right: 0, yaw: Math.PI });
  assert.ok(Math.abs(player.position.x - 8.5) < 1e-9, 'idle player must not drift on x');
  assert.ok(Math.abs(player.position.z - 8.5) < 1e-9, 'idle player must not drift on z');
}

{
  const { player, physics } = makeRig();
  physics.settle();
  for (let i = 0; i < 240; i += 1) physics.advance(1 / 120, { forward: 1, right: 0, yaw: Math.PI });
  assert.ok(player.position.z > 12, `forward input should move the player, got z=${player.position.z}`);
  assert.ok(player.grounded, 'walking should remain grounded');
}

{
  const { world, player, physics } = makeRig(new Vec3(4.5, 2, 4.5));
  physics.settle();
  world.set(4, 1, 6);
  world.set(4, 2, 6);
  for (let i = 0; i < 180; i += 1) physics.advance(1 / 120, { forward: 1, right: 0, yaw: Math.PI });
  assert.ok(player.position.z < 5.71, `wall collision must stop penetration, got z=${player.position.z}`);
  assert.equal(physics.collides(), false, 'resolved player AABB must remain outside solids');
}

{
  const { player, physics } = makeRig();
  physics.settle();
  physics.requestJump();
  let peak = player.position.y;
  for (let i = 0; i < 240; i += 1) {
    physics.advance(1 / 120, { forward: 0, right: 0, yaw: Math.PI });
    peak = Math.max(peak, player.position.y);
  }
  assert.ok(peak > 2.1 && peak < 2.5, `jump height should be Minecraft-like, peak=${peak}`);
  assert.ok(player.grounded, 'player should land after jump');
  assert.ok(Math.abs(player.position.y - 1) < 0.03, 'landing returns to the original floor');
}

{
  const { player, physics } = makeRig();
  physics.settle();
  player.flying = true;
  for (let i = 0; i < 120; i += 1) physics.advance(1 / 120, { forward: 0, right: 0, up: 1, yaw: Math.PI });
  assert.ok(player.position.y > 5, 'creative flight must move upward while Space is held');
}

console.log('player physics invariants: ok');

const EPSILON = 1e-5;

export const PLAYER_PHYSICS = Object.freeze({
  fixedStep: 1 / 120,
  maximumFrame: 0.05,
  radius: 0.30,
  height: 1.80,
  eye: 1.62,
  walkSpeed: 4.317,
  sprintSpeed: 5.612,
  swimSpeed: 2.35,
  flySpeed: 8.0,
  groundAcceleration: 24,
  airAcceleration: 5.5,
  waterAcceleration: 7.5,
  flyAcceleration: 12,
  gravity: 24,
  waterGravity: 5.5,
  jumpSpeed: 7.75,
  swimJumpSpeed: 4.1,
  terminalVelocity: 32,
  coyoteTime: 0.10,
  jumpBuffer: 0.12,
  collisionIncrement: 0.075,
  groundProbe: 0.055,
  stepHeight: 0.60,
});

function damp(current, target, rate, dt) {
  return target + (current - target) * Math.exp(-rate * dt);
}

function finite(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

export class VoxelPlayerPhysics {
  constructor(world, player, options = {}) {
    this.world = world;
    this.player = player;
    this.constants = { ...PLAYER_PHYSICS, ...(options.constants || {}) };
    this.bounds = options.bounds || { width: Infinity, height: Infinity, depth: Infinity };
    this.isSolid = options.isSolid || ((id) => Boolean(id));
    this.isWater = options.isWater || (() => false);
    this.accumulator = 0;
    this.jumpBuffer = 0;
    this.coyote = 0;
    this.horizontalDistance = 0;
    this.lastHorizontalSpeed = 0;

    player.radius = this.constants.radius;
    player.height = this.constants.height;
    player.eye = this.constants.eye;
    player.velocity.set(finite(player.velocity.x), finite(player.velocity.y), finite(player.velocity.z));
  }

  voxelIsSolid(x, y, z) {
    if (y < 0) return true;
    if (x < 0 || z < 0 || x >= this.bounds.width || z >= this.bounds.depth) return true;
    if (y >= this.bounds.height) return false;
    return this.isSolid(this.world.get(x, y, z));
  }

  collides(position = this.player.position) {
    const player = this.player;
    const minX = position.x - player.radius + EPSILON;
    const maxX = position.x + player.radius - EPSILON;
    const minY = position.y + EPSILON;
    const maxY = position.y + player.height - EPSILON;
    const minZ = position.z - player.radius + EPSILON;
    const maxZ = position.z + player.radius - EPSILON;

    for (let y = Math.floor(minY); y <= Math.floor(maxY); y += 1) {
      for (let z = Math.floor(minZ); z <= Math.floor(maxZ); z += 1) {
        for (let x = Math.floor(minX); x <= Math.floor(maxX); x += 1) {
          if (this.voxelIsSolid(x, y, z)) return true;
        }
      }
    }
    return false;
  }

  sampleWater() {
    const p = this.player.position;
    return this.isWater(this.world.get(p.x, p.y + 0.15, p.z))
      || this.isWater(this.world.get(p.x, p.y + this.player.height * 0.62, p.z));
  }

  probeGround() {
    const probe = this.player.position.clone();
    probe.y -= this.constants.groundProbe;
    return this.collides(probe);
  }

  settle(maxDrop = 8, maxRise = 4) {
    const p = this.player.position;
    const step = 0.025;

    for (let rise = 0; this.collides() && rise < maxRise; rise += step) p.y += step;
    if (this.collides()) return false;

    let dropped = 0;
    while (dropped < maxDrop) {
      p.y -= step;
      if (this.collides()) {
        p.y += step;
        break;
      }
      dropped += step;
    }

    this.player.grounded = this.probeGround();
    this.player.velocity.set(0, 0, 0);
    return this.player.grounded;
  }

  requestJump() {
    this.jumpBuffer = this.constants.jumpBuffer;
  }

  advance(frameDt, input) {
    const dt = Math.min(this.constants.maximumFrame, Math.max(0, finite(frameDt)));
    this.accumulator = Math.min(this.accumulator + dt, this.constants.fixedStep * 8);
    this.horizontalDistance = 0;

    while (this.accumulator >= this.constants.fixedStep) {
      this.fixedUpdate(this.constants.fixedStep, input);
      this.accumulator -= this.constants.fixedStep;
    }
    return this.horizontalDistance;
  }

  fixedUpdate(dt, input) {
    const player = this.player;
    const positionBefore = player.position.clone();
    player.inWater = this.sampleWater();
    player.grounded = !player.flying && this.probeGround();
    this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
    this.coyote = player.grounded ? this.constants.coyoteTime : Math.max(0, this.coyote - dt);

    let forward = finite(input.forward);
    let right = finite(input.right);
    const magnitude = Math.hypot(forward, right);
    if (magnitude > 1) {
      forward /= magnitude;
      right /= magnitude;
    }

    const sprint = Boolean(input.sprint) && forward > 0.05 && !player.inWater && !player.flying;
    const speed = player.flying
      ? this.constants.flySpeed
      : player.inWater
        ? this.constants.swimSpeed
        : sprint
          ? this.constants.sprintSpeed
          : this.constants.walkSpeed;
    const yaw = finite(input.yaw, player.yaw);
    const sin = Math.sin(yaw);
    const cos = Math.cos(yaw);
    const desiredX = (-sin * forward + cos * right) * speed;
    const desiredZ = (-cos * forward - sin * right) * speed;
    const acceleration = player.flying
      ? this.constants.flyAcceleration
      : player.inWater
        ? this.constants.waterAcceleration
        : player.grounded
          ? this.constants.groundAcceleration
          : this.constants.airAcceleration;

    player.velocity.x = damp(player.velocity.x, desiredX, acceleration, dt);
    player.velocity.z = damp(player.velocity.z, desiredZ, acceleration, dt);

    if (player.flying) {
      const vertical = finite(input.up) - finite(input.down);
      player.velocity.y = damp(player.velocity.y, vertical * speed, this.constants.flyAcceleration, dt);
      this.jumpBuffer = 0;
      this.coyote = 0;
    } else {
      if (this.jumpBuffer > 0 && (this.coyote > 0 || player.inWater)) {
        player.velocity.y = player.inWater ? this.constants.swimJumpSpeed : this.constants.jumpSpeed;
        player.grounded = false;
        this.jumpBuffer = 0;
        this.coyote = 0;
      }
      const gravity = player.inWater ? this.constants.waterGravity : this.constants.gravity;
      player.velocity.y = Math.max(-this.constants.terminalVelocity, player.velocity.y - gravity * dt);
      if (player.inWater) player.velocity.y *= Math.exp(-1.8 * dt);
    }

    this.moveHorizontal('x', player.velocity.x * dt);
    this.moveHorizontal('z', player.velocity.z * dt);
    this.moveAxis('y', player.velocity.y * dt);

    if (!player.flying) player.grounded = this.probeGround();
    if (player.grounded && player.velocity.y < 0) player.velocity.y = 0;

    const dx = player.position.x - positionBefore.x;
    const dz = player.position.z - positionBefore.z;
    const horizontal = Math.hypot(dx, dz);
    this.horizontalDistance += horizontal;
    this.lastHorizontalSpeed = horizontal / dt;
  }

  moveHorizontal(axis, distance) {
    if (!distance) return true;
    const player = this.player;
    const originalAxis = player.position[axis];
    const originalY = player.position.y;
    if (this.moveAxis(axis, distance, false)) return true;

    const partialAxis = player.position[axis];
    if (player.grounded && this.constants.stepHeight > 0) {
      const lift = this.constants.stepHeight;
      player.position[axis] = originalAxis;
      player.position.y = originalY + lift;
      if (!this.collides() && this.moveAxis(axis, distance, false)) {
        this.moveAxis('y', -lift, false);
        return true;
      }
      player.position[axis] = partialAxis;
      player.position.y = originalY;
    }

    player.velocity[axis] = 0;
    return false;
  }

  moveAxis(axis, distance, zeroVelocity = true) {
    if (!distance) return true;
    const player = this.player;
    const count = Math.max(1, Math.ceil(Math.abs(distance) / this.constants.collisionIncrement));
    const increment = distance / count;

    for (let index = 0; index < count; index += 1) {
      const old = player.position[axis];
      player.position[axis] += increment;
      if (!this.collides()) continue;
      player.position[axis] = old;
      if (zeroVelocity) player.velocity[axis] = 0;
      if (axis === 'y' && increment < 0) player.grounded = true;
      return false;
    }
    return true;
  }
}

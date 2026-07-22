import { BLOCKS, BLOCK_INFO, WORLD } from './world.js';
import { VoxelPlayerPhysics } from './player-physics.js';

const game = window.CantoDeBarro;
if (!game) throw new Error('Player controller loaded before the game instance.');

const movementCodes = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space',
  'ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight',
]);
const isTyping = (event) => event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement;
const requestLock = (canvas, onFailure) => {
  try {
    const result = canvas.requestPointerLock();
    if (result && typeof result.catch === 'function') result.catch(onFailure);
  } catch (error) {
    onFailure(error);
  }
};

const physics = new VoxelPlayerPhysics(game.world, game.player, {
  bounds: WORLD,
  isSolid: (id) => Boolean(BLOCK_INFO[id]?.solid),
  isWater: (id) => id === BLOCKS.WATER,
});
game.physics = physics;
game.keys.clear();
game.player.velocity.set(0, 0, 0);
physics.settle();

game._bobPhase = 0;
game._bobAmount = 0;
game._sprintView = 0;

game.look = function look(dx, dy) {
  if (!this.started || this.paused) return;
  const ownsLook = this.touchMode
    ? Boolean(this.touchLook)
    : document.pointerLockElement === this.canvas;
  if (!ownsLook || !Number.isFinite(dx) || !Number.isFinite(dy)) return;
  this.player.yaw -= dx * 0.00185;
  this.player.pitch = Math.max(-Math.PI * 0.495, Math.min(Math.PI * 0.495, this.player.pitch - dy * 0.00175));
};

game.jump = function jump() {
  if (!this.started || this.paused) return;
  physics.requestJump();
};

const originalKeyDown = game.keyDown.bind(game);
game.keyDown = function keyDown(event) {
  if (isTyping(event)) return;
  if (movementCodes.has(event.code)) event.preventDefault();
  originalKeyDown(event);
};

game.start = function start() {
  this.started = true;
  this.keys.clear();
  this.player.velocity.set(0, 0, 0);
  physics.settle();
  document.activeElement?.blur?.();
  document.querySelector('#splash').classList.add('hidden');
  document.querySelector('#hud').classList.remove('hidden');
  this.soundscape.start();
  if (this.touchMode) {
    this.paused = false;
  } else {
    this.paused = true;
    requestLock(this.canvas, () => {
      this.paused = true;
      document.querySelector('#pause').classList.remove('hidden');
      this.flash('Haz clic en “Volver al mundo” para capturar el ratón.');
    });
  }
  this.updateCamera();
  this.flash('WASD para caminar · espacio para saltar · ratón para mirar');
};

game.resume = function resume() {
  this.keys.clear();
  this.player.velocity.set(0, 0, 0);
  document.querySelector('#pause').classList.add('hidden');
  this.soundscape.start();
  if (this.touchMode) this.paused = false;
  else {
    this.paused = true;
    requestLock(this.canvas, () => document.querySelector('#pause').classList.remove('hidden'));
  }
};

game.pointerLockChanged = function pointerLockChanged() {
  if (this.touchMode || !this.started) return;
  const locked = document.pointerLockElement === this.canvas;
  this.paused = !locked;
  this.keys.clear();
  this.player.velocity.x = 0;
  this.player.velocity.z = 0;
  this.mining = false;
  document.querySelector('#pause').classList.toggle('hidden', locked || !document.querySelector('#codex').classList.contains('hidden'));
  if (locked) this.clock.getDelta();
};

game.playerCollides = function playerCollides(position = this.player.position) {
  return physics.collides(position);
};

game.updatePlayer = function updatePlayer(dt) {
  const player = this.player;
  const before = player.position.clone();
  const forward = (this.keys.has('KeyW') ? 1 : 0) - (this.keys.has('KeyS') ? 1 : 0) - this.touchMove.y;
  const right = (this.keys.has('KeyD') ? 1 : 0) - (this.keys.has('KeyA') ? 1 : 0) + this.touchMove.x;
  const up = this.keys.has('Space') ? 1 : 0;
  const down = this.keys.has('ControlLeft') || this.keys.has('ControlRight') ? 1 : 0;

  physics.advance(dt, {
    forward,
    right,
    up,
    down,
    sprint: this.keys.has('ShiftLeft') || this.keys.has('ShiftRight'),
    yaw: player.yaw,
  });

  this.stats.distance += before.distanceTo(player.position);
  if (player.position.y < -3 || !Number.isFinite(player.position.x + player.position.y + player.position.z)) this.respawn();

  const moving = physics.lastHorizontalSpeed > 0.65;
  if (moving && player.grounded && Math.floor(performance.now() / 360) !== Math.floor((performance.now() - dt * 1000) / 360)) {
    this.soundscape.tone(92, 0.028, 0.014, 'square');
  }
};

game.updateCamera = function updateCamera() {
  const player = this.player;
  const horizontalSpeed = physics.lastHorizontalSpeed;
  const walking = player.grounded && !player.flying && horizontalSpeed > 0.15;
  const targetBob = walking ? Math.min(1, horizontalSpeed / 4.4) : 0;
  this._bobAmount += (targetBob - this._bobAmount) * 0.18;
  if (walking) this._bobPhase += physics.horizontalDistance * 10.5;

  const bobY = Math.sin(this._bobPhase) * 0.035 * this._bobAmount;
  const bobX = Math.cos(this._bobPhase * 0.5) * 0.018 * this._bobAmount;
  this.camera.position.copy(player.position);
  this.camera.position.y += player.eye + bobY;
  this.camera.rotation.y = player.yaw;
  this.camera.rotation.x = player.pitch;
  this.camera.rotation.z = bobX * 0.16;

  const sprinting = (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')) && horizontalSpeed > 4.6 && player.grounded;
  this._sprintView += ((sprinting ? 1 : 0) - this._sprintView) * 0.12;
  const fov = 72 + this._sprintView * 4;
  if (Math.abs(this.camera.fov - fov) > 0.01) {
    this.camera.fov = fov;
    this.camera.updateProjectionMatrix();
  }
};

game.respawn = function respawn() {
  this.player.position.copy(this.world.spawn);
  this.player.velocity.set(0, 0, 0);
  physics.accumulator = 0;
  physics.settle();
  this.updateCamera();
  this.flash('Has vuelto a la plaza');
};

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) return;
  game.keys.clear();
  game.player.velocity.set(0, 0, 0);
  game.mining = false;
});

window.addEventListener('blur', () => {
  game.keys.clear();
  game.player.velocity.x = 0;
  game.player.velocity.z = 0;
});

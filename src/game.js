import * as THREE from 'three';
import { BLOCKS, BLOCK_INFO, LANDMARKS, PLACEABLE, VoxelWorld, WORLD } from './world.js';

const $ = (selector) => document.querySelector(selector);
const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
const SAVE_PREFIX = 'canto-de-barro:v3:';

class Soundscape {
  constructor() {
    this.context = null;
    this.master = null;
    this.enabled = true;
    this.nextNote = 0;
    this.noteIndex = 0;
    this.scale = [0, 3, 5, 7, 10, 12, 15, 17];
  }

  start() {
    if (!this.enabled) return;
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = 0.13;
      this.master.connect(this.context.destination);
    }
    if (this.context.state === 'suspended') this.context.resume();
  }

  tone(frequency, duration = 0.08, volume = 0.08, type = 'triangle') {
    if (!this.enabled || !this.context || !this.master) return;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain).connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.03);
  }

  hit(id) {
    const hard = BLOCK_INFO[id]?.hardness ?? 1;
    this.tone(120 + hard * 28, 0.045, 0.055, hard > 1.3 ? 'square' : 'triangle');
  }

  place(id) {
    this.tone(210 + id * 8, 0.09, 0.07, 'sine');
  }

  chime() {
    [523.25, 659.25, 783.99, 1046.5].forEach((note, index) => {
      setTimeout(() => this.tone(note, 0.48, 0.06, 'sine'), index * 120);
    });
  }

  update(realTime) {
    if (!this.enabled || !this.context || realTime < this.nextNote) return;
    this.nextNote = realTime + 2.8 + Math.random() * 2.4;
    const semitone = this.scale[this.noteIndex++ % this.scale.length];
    this.tone(110 * 2 ** (semitone / 12), 1.5, 0.018, 'sine');
  }

  toggle() {
    this.enabled = !this.enabled;
    if (this.master) this.master.gain.value = this.enabled ? 0.13 : 0;
    return this.enabled;
  }
}

class CantoDeBarro {
  constructor() {
    this.canvas = $('#game');
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x7bc0d1);
    this.scene.fog = new THREE.FogExp2(0x93c5c9, 0.0115);
    this.camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.05, 220);
    this.camera.rotation.order = 'YXZ';

    this.seed = new URLSearchParams(location.search).get('seed') || localStorage.getItem('canto-de-barro:last-seed') || 'Tenochtitlan-1325';
    $('#seed').value = this.seed;
    this.world = new VoxelWorld(this.seed);
    this.scene.add(this.world.group);

    this.player = {
      position: this.world.spawn.clone(),
      velocity: new THREE.Vector3(),
      yaw: Math.PI,
      pitch: -0.08,
      radius: 0.31,
      height: 1.75,
      eye: 1.58,
      grounded: false,
      flying: false,
      inWater: false,
    };

    this.keys = new Set();
    this.started = false;
    this.paused = true;
    this.touchMode = matchMedia('(pointer: coarse)').matches;
    this.touchMove = new THREE.Vector2();
    this.touchLook = null;
    this.mining = false;
    this.mineProgress = 0;
    this.mineTargetKey = '';
    this.target = null;
    this.selected = 0;
    this.time = 0.31;
    this.day = 1;
    this.visited = new Set();
    this.questComplete = false;
    this.stats = { mined: 0, placed: 0, distance: 0, startedAt: Date.now() };
    this.lastSave = 0;
    this.messageTimer = 0;
    this.fpsFrames = 0;
    this.fpsTime = 0;
    this.fpsValue = 60;
    this.soundscape = new Soundscape();
    this.clock = new THREE.Clock();

    this.setupLights();
    this.setupSky();
    this.setupDecorations();
    this.load();
    this.world.buildMeshes();
    this.setupUI();
    this.setupEvents();
    this.updateQuestUI();
    this.resize();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  setupLights() {
    this.hemi = new THREE.HemisphereLight(0xa8d9e4, 0x5d3527, 1.45);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffe1a1, 2.2);
    this.sun.position.set(45, 70, 22);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.left = -48;
    this.sun.shadow.camera.right = 48;
    this.sun.shadow.camera.top = 48;
    this.sun.shadow.camera.bottom = -48;
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 150;
    this.sun.shadow.bias = -0.0008;
    this.scene.add(this.sun, this.sun.target);
    this.sun.target.position.set(40, 0, 40);

    this.altarLight = new THREE.PointLight(0xff9b32, 2.7, 20, 1.6);
    this.altarLight.position.set(this.world.altar.x + 0.5, this.world.altar.y + 1.2, this.world.altar.z + 0.5);
    this.scene.add(this.altarLight);
  }

  setupSky() {
    const starCount = 900;
    const positions = new Float32Array(starCount * 3);
    for (let index = 0; index < starCount; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 85 + Math.random() * 60;
      const elevation = 22 + Math.random() * 85;
      positions[index * 3] = 40 + Math.cos(angle) * radius;
      positions[index * 3 + 1] = elevation;
      positions[index * 3 + 2] = 40 + Math.sin(angle) * radius;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.stars = new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0xfff2cd, size: 0.5, transparent: true, opacity: 0 }));
    this.scene.add(this.stars);

    this.sunDisc = new THREE.Mesh(new THREE.SphereGeometry(3.4, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffd066 }));
    this.moonDisc = new THREE.Mesh(new THREE.SphereGeometry(2.4, 16, 12), new THREE.MeshBasicMaterial({ color: 0xd7e4ef }));
    this.scene.add(this.sunDisc, this.moonDisc);

    this.clouds = new THREE.Group();
    const cloudMaterial = new THREE.MeshLambertMaterial({ color: 0xfff4df, transparent: true, opacity: 0.75, depthWrite: false });
    for (let index = 0; index < 18; index += 1) {
      const cloud = new THREE.Group();
      const pieces = 3 + Math.floor(Math.random() * 4);
      for (let piece = 0; piece < pieces; piece += 1) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(4 + Math.random() * 5, 1.2 + Math.random(), 2.5 + Math.random() * 3), cloudMaterial);
        mesh.position.set(piece * 3.2, Math.random() * 0.7, (Math.random() - 0.5) * 2);
        cloud.add(mesh);
      }
      cloud.position.set(Math.random() * 120 - 20, 29 + Math.random() * 14, Math.random() * 120 - 20);
      cloud.userData.speed = 0.22 + Math.random() * 0.25;
      this.clouds.add(cloud);
    }
    this.scene.add(this.clouds);
  }

  setupDecorations() {
    this.papel = new THREE.Group();
    const colors = [0xe9434b, 0x2aa8a2, 0xf3b638, 0x854fa3, 0xe66d2e];
    for (let line = 0; line < 4; line += 1) {
      for (let index = 0; index < 12; index += 1) {
        const geometry = new THREE.BufferGeometry();
        const x = 31 + index * 1.55;
        const z = 34 + line * 4.2;
        geometry.setAttribute('position', new THREE.Float32BufferAttribute([
          x, 21.2 + Math.sin(index * 0.8) * 0.3, z,
          x + 1.05, 21.2 + Math.sin((index + 1) * 0.8) * 0.3, z,
          x + 0.52, 19.9 + Math.sin(index * 0.8) * 0.3, z,
        ], 3));
        geometry.setIndex([0, 1, 2]);
        const flag = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: colors[(index + line) % colors.length], side: THREE.DoubleSide }));
        this.papel.add(flag);
      }
    }
    this.scene.add(this.papel);

    const fireflyGeometry = new THREE.BufferGeometry();
    const count = 180;
    const positions = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      positions[index * 3] = Math.random() * WORLD.width;
      positions[index * 3 + 1] = 13 + Math.random() * 13;
      positions[index * 3 + 2] = Math.random() * WORLD.depth;
    }
    fireflyGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.fireflies = new THREE.Points(fireflyGeometry, new THREE.PointsMaterial({ color: 0xffd24f, size: 0.18, transparent: true, opacity: 0, blending: THREE.AdditiveBlending }));
    this.scene.add(this.fireflies);

    const festivalPositions = new Float32Array(1200 * 3);
    const festivalColors = new Float32Array(1200 * 3);
    const palette = [new THREE.Color(0xff9d24), new THREE.Color(0xe84945), new THREE.Color(0x35a49b), new THREE.Color(0xffde62)];
    for (let index = 0; index < 1200; index += 1) {
      const radius = 2 + Math.random() * 18;
      const angle = Math.random() * Math.PI * 2;
      festivalPositions[index * 3] = 40 + Math.cos(angle) * radius;
      festivalPositions[index * 3 + 1] = 17 + Math.random() * 22;
      festivalPositions[index * 3 + 2] = 41 + Math.sin(angle) * radius;
      const color = palette[index % palette.length];
      festivalColors.set([color.r, color.g, color.b], index * 3);
    }
    const festivalGeometry = new THREE.BufferGeometry();
    festivalGeometry.setAttribute('position', new THREE.BufferAttribute(festivalPositions, 3));
    festivalGeometry.setAttribute('color', new THREE.BufferAttribute(festivalColors, 3));
    this.festival = new THREE.Points(festivalGeometry, new THREE.PointsMaterial({ size: 0.18, vertexColors: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending }));
    this.scene.add(this.festival);
  }

  setupUI() {
    const hotbar = $('#hotbar');
    PLACEABLE.forEach((id, index) => {
      const slot = document.createElement('div');
      slot.className = `slot${index === this.selected ? ' active' : ''}`;
      slot.dataset.index = String(index);
      const color = `#${BLOCK_INFO[id].color.toString(16).padStart(6, '0')}`;
      slot.innerHTML = `<small>${index + 1}</small><span class="swatch" style="background:${color}"></span><label>${BLOCK_INFO[id].name}</label>`;
      slot.addEventListener('click', () => this.select(index));
      hotbar.append(slot);
    });

    const map = $('#map');
    LANDMARKS.forEach((landmark) => {
      const marker = document.createElement('div');
      marker.className = 'map-mark';
      marker.textContent = landmark.glyph;
      marker.title = landmark.name;
      marker.style.left = `${landmark.x / WORLD.width * 100}%`;
      marker.style.top = `${landmark.z / WORLD.depth * 100}%`;
      map.append(marker);
    });
    const plaza = document.createElement('div');
    plaza.className = 'map-mark';
    plaza.textContent = '◆';
    plaza.title = 'Plaza del Pueblo';
    plaza.style.left = '50%';
    plaza.style.top = '50%';
    map.append(plaza);

    const list = $('#codex-list');
    LANDMARKS.forEach((landmark) => {
      const item = document.createElement('div');
      item.className = 'codex-item';
      item.dataset.landmark = landmark.id;
      item.innerHTML = `<b>${landmark.glyph} ${landmark.name}</b><span>${landmark.copy}</span>`;
      list.append(item);
    });
  }

  setupEvents() {
    addEventListener('resize', () => this.resize());
    addEventListener('keydown', (event) => this.keyDown(event));
    addEventListener('keyup', (event) => this.keys.delete(event.code));
    addEventListener('blur', () => this.keys.clear());
    addEventListener('beforeunload', () => this.save());
    document.addEventListener('pointerlockchange', () => this.pointerLockChanged());
    document.addEventListener('mousemove', (event) => this.look(event.movementX, event.movementY));
    this.canvas.addEventListener('mousedown', (event) => this.mouseDown(event));
    addEventListener('mouseup', (event) => { if (event.button === 0) this.mining = false; });
    this.canvas.addEventListener('contextmenu', (event) => event.preventDefault());
    this.canvas.addEventListener('wheel', (event) => this.select(this.selected + Math.sign(event.deltaY)), { passive: true });

    $('#play').addEventListener('click', () => this.start());
    $('#resume').addEventListener('click', () => this.resume());
    $('#sound').addEventListener('click', () => {
      const enabled = this.soundscape.toggle();
      $('#sound').textContent = `Sonido: ${enabled ? 'encendido' : 'apagado'}`;
    });
    $('#save').addEventListener('click', () => { this.save(); this.flash('Mundo guardado en este navegador'); });
    $('#reset').addEventListener('click', () => {
      if (!confirm('¿Borrar las construcciones y el progreso de esta semilla?')) return;
      localStorage.removeItem(this.saveKey());
      location.reload();
    });
    $('#new-world').addEventListener('click', () => {
      const seed = $('#seed').value.trim() || `Barro-${Date.now().toString(36)}`;
      localStorage.setItem('canto-de-barro:last-seed', seed);
      location.href = `${location.pathname}?seed=${encodeURIComponent(seed)}`;
    });
    $('#seed').addEventListener('keydown', (event) => { if (event.key === 'Enter') $('#new-world').click(); });
    document.querySelectorAll('[data-close="codex"]').forEach((button) => button.addEventListener('click', () => this.closeCodex()));

    this.setupTouch();
  }

  setupTouch() {
    if (!this.touchMode) return;
    $('#touch').classList.remove('hidden');
    const stick = $('#stick');
    const knob = stick.firstElementChild;
    const resetStick = () => { this.touchMove.set(0, 0); knob.style.transform = 'translate(36px,36px)'; };
    const updateStick = (event) => {
      const rect = stick.getBoundingClientRect();
      const x = clamp(event.clientX - (rect.left + rect.width / 2), -40, 40);
      const y = clamp(event.clientY - (rect.top + rect.height / 2), -40, 40);
      this.touchMove.set(x / 40, y / 40);
      knob.style.transform = `translate(${36 + x}px,${36 + y}px)`;
    };
    stick.addEventListener('pointerdown', (event) => { stick.setPointerCapture(event.pointerId); updateStick(event); });
    stick.addEventListener('pointermove', (event) => { if (stick.hasPointerCapture(event.pointerId)) updateStick(event); });
    stick.addEventListener('pointerup', resetStick);
    stick.addEventListener('pointercancel', resetStick);

    this.canvas.addEventListener('pointerdown', (event) => {
      if (!this.started || event.clientX < innerWidth * 0.35) return;
      this.touchLook = { id: event.pointerId, x: event.clientX, y: event.clientY };
      this.canvas.setPointerCapture(event.pointerId);
    });
    this.canvas.addEventListener('pointermove', (event) => {
      if (!this.touchLook || this.touchLook.id !== event.pointerId) return;
      this.look(event.clientX - this.touchLook.x, event.clientY - this.touchLook.y);
      this.touchLook.x = event.clientX;
      this.touchLook.y = event.clientY;
    });
    this.canvas.addEventListener('pointerup', () => { this.touchLook = null; });

    $('#touch-jump').addEventListener('pointerdown', () => this.jump());
    $('#touch-mine').addEventListener('pointerdown', () => { this.mining = true; });
    $('#touch-mine').addEventListener('pointerup', () => { this.mining = false; });
    $('#touch-place').addEventListener('pointerdown', () => this.place());
  }

  start() {
    this.started = true;
    this.paused = false;
    $('#splash').classList.add('hidden');
    $('#hud').classList.remove('hidden');
    this.soundscape.start();
    if (!this.touchMode) this.canvas.requestPointerLock();
    this.flash('La campana despierta. Abre el códice con C.');
  }

  resume() {
    $('#pause').classList.add('hidden');
    this.paused = false;
    this.soundscape.start();
    if (!this.touchMode) this.canvas.requestPointerLock();
  }

  pointerLockChanged() {
    if (this.touchMode || !this.started) return;
    const locked = document.pointerLockElement === this.canvas;
    this.paused = !locked;
    if (!locked && $('#codex').classList.contains('hidden')) $('#pause').classList.remove('hidden');
    else $('#pause').classList.add('hidden');
  }

  keyDown(event) {
    if (event.repeat && ['KeyF', 'KeyC', 'KeyM', 'F2'].includes(event.code)) return;
    this.keys.add(event.code);
    if (/^Digit[1-8]$/.test(event.code)) this.select(Number(event.code.slice(-1)) - 1);
    if (event.code === 'Space') { event.preventDefault(); this.jump(); }
    if (event.code === 'KeyF' && this.started) {
      this.player.flying = !this.player.flying;
      this.player.velocity.y = 0;
      this.flash(this.player.flying ? 'Vuelo creativo' : 'Pies sobre la tierra');
    }
    if (event.code === 'KeyC' && this.started) this.toggleCodex();
    if (event.code === 'KeyR' && this.started) this.respawn();
    if (event.code === 'KeyM') {
      const enabled = this.soundscape.toggle();
      this.flash(`Sonido ${enabled ? 'encendido' : 'apagado'}`);
    }
    if (event.code === 'F2') { event.preventDefault(); this.screenshot(); }
  }

  mouseDown(event) {
    if (!this.started || this.paused) return;
    this.soundscape.start();
    if (!this.touchMode && document.pointerLockElement !== this.canvas) {
      this.canvas.requestPointerLock();
      return;
    }
    if (event.button === 0) this.mining = true;
    if (event.button === 2) this.place();
  }

  look(dx, dy) {
    if (!this.started || this.paused) return;
    this.player.yaw -= dx * 0.0022;
    this.player.pitch = clamp(this.player.pitch - dy * 0.002, -Math.PI * 0.49, Math.PI * 0.49);
  }

  jump() {
    if (this.paused) return;
    if (this.player.flying) this.player.velocity.y = 6.2;
    else if (this.player.grounded || this.player.inWater) {
      this.player.velocity.y = this.player.inWater ? 4.2 : 7.2;
      this.player.grounded = false;
      this.soundscape.tone(180, 0.08, 0.05);
    }
  }

  select(index) {
    this.selected = (index + PLACEABLE.length) % PLACEABLE.length;
    document.querySelectorAll('.slot').forEach((slot, slotIndex) => slot.classList.toggle('active', slotIndex === this.selected));
  }

  toggleCodex() {
    const codex = $('#codex');
    if (codex.classList.contains('hidden')) {
      codex.classList.remove('hidden');
      this.paused = true;
      if (document.pointerLockElement) document.exitPointerLock();
    } else this.closeCodex();
  }

  closeCodex() {
    $('#codex').classList.add('hidden');
    this.paused = false;
    if (!this.touchMode) this.canvas.requestPointerLock();
  }

  updatePlayer(dt) {
    const player = this.player;
    const forwardInput = (this.keys.has('KeyW') ? 1 : 0) - (this.keys.has('KeyS') ? 1 : 0) - this.touchMove.y;
    const rightInput = (this.keys.has('KeyD') ? 1 : 0) - (this.keys.has('KeyA') ? 1 : 0) + this.touchMove.x;
    const length = Math.hypot(forwardInput, rightInput) || 1;
    const forward = forwardInput / length;
    const right = rightInput / length;
    const sprint = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
    player.inWater = this.world.get(player.position.x, player.position.y + 0.7, player.position.z) === BLOCKS.WATER;
    const speed = player.flying ? 8.5 : player.inWater ? 2.5 : sprint ? 6.5 : 4.4;
    const sin = Math.sin(player.yaw);
    const cos = Math.cos(player.yaw);
    const desiredX = (-sin * forward + cos * right) * speed;
    const desiredZ = (-cos * forward - sin * right) * speed;
    const acceleration = player.grounded ? 18 : player.flying ? 12 : 7;
    player.velocity.x += (desiredX - player.velocity.x) * Math.min(1, acceleration * dt);
    player.velocity.z += (desiredZ - player.velocity.z) * Math.min(1, acceleration * dt);

    if (player.flying) {
      const vertical = (this.keys.has('Space') ? 1 : 0) - (this.keys.has('ControlLeft') ? 1 : 0);
      player.velocity.y += (vertical * speed - player.velocity.y) * Math.min(1, 10 * dt);
    } else {
      player.velocity.y -= (player.inWater ? 7 : 21) * dt;
      player.velocity.y = Math.max(player.velocity.y, -28);
    }

    const previous = player.position.clone();
    this.moveAxis('x', player.velocity.x * dt);
    this.moveAxis('z', player.velocity.z * dt);
    player.grounded = false;
    this.moveAxis('y', player.velocity.y * dt);
    this.stats.distance += previous.distanceTo(player.position);

    if (player.position.y < -5) this.respawn();
    const moving = Math.hypot(player.velocity.x, player.velocity.z) > 0.7;
    if (moving && player.grounded && Math.floor(performance.now() / 330) !== Math.floor((performance.now() - dt * 1000) / 330)) this.soundscape.tone(95, 0.03, 0.018, 'square');
  }

  playerCollides(position = this.player.position) {
    const p = this.player;
    return this.world.collides(
      position.x - p.radius,
      position.y,
      position.z - p.radius,
      position.x + p.radius,
      position.y + p.height,
      position.z + p.radius,
    );
  }

  moveAxis(axis, amount) {
    if (!amount) return;
    const player = this.player;
    const old = player.position[axis];
    player.position[axis] += amount;
    if (!this.playerCollides()) return;

    if (axis !== 'y' && player.grounded) {
      const oldY = player.position.y;
      player.position.y += 0.62;
      if (!this.playerCollides()) return;
      player.position.y = oldY;
    }

    player.position[axis] = old;
    if (axis === 'y') {
      if (amount < 0) player.grounded = true;
      player.velocity.y = 0;
    } else player.velocity[axis] = 0;
  }

  updateCamera() {
    this.camera.position.copy(this.player.position);
    this.camera.position.y += this.player.eye;
    this.camera.rotation.y = this.player.yaw;
    this.camera.rotation.x = this.player.pitch;
  }

  updateTarget(dt) {
    const direction = new THREE.Vector3(0, 0, -1).applyEuler(this.camera.rotation);
    this.target = this.world.raycast(this.camera.position, direction, 7.5);
    $('#target-label').textContent = this.target ? BLOCK_INFO[this.target.id].name : '';
    if (!this.mining || !this.target) {
      this.mineProgress = 0;
      this.mineTargetKey = '';
      $('#break-meter').classList.remove('active');
      return;
    }

    const targetKey = `${this.target.x},${this.target.y},${this.target.z}`;
    if (targetKey !== this.mineTargetKey) {
      this.mineTargetKey = targetKey;
      this.mineProgress = 0;
    }
    const hardness = Math.max(0.1, BLOCK_INFO[this.target.id].hardness);
    this.mineProgress += dt / hardness;
    $('#break-meter').classList.add('active');
    $('#break-meter span').style.width = `${Math.min(100, this.mineProgress * 100)}%`;
    if (Math.floor(this.mineProgress * 12) !== Math.floor((this.mineProgress - dt / hardness) * 12)) this.soundscape.hit(this.target.id);
    if (this.mineProgress >= 1) {
      const id = this.target.id;
      this.world.set(this.target.x, this.target.y, this.target.z, BLOCKS.AIR);
      this.stats.mined += 1;
      this.soundscape.hit(id);
      this.mineProgress = 0;
      this.mineTargetKey = '';
    }
  }

  place() {
    if (!this.target) return;
    const allVisited = LANDMARKS.every((landmark) => this.visited.has(landmark.id));
    const distanceToAltar = this.player.position.distanceTo(new THREE.Vector3(this.world.altar.x + 0.5, this.world.altar.y, this.world.altar.z + 0.5));
    if (allVisited && !this.questComplete && distanceToAltar < 5) {
      this.completeQuest();
      return;
    }
    const x = this.target.x + this.target.normal.x;
    const y = this.target.y + this.target.normal.y;
    const z = this.target.z + this.target.normal.z;
    if (!this.world.inside(x, y, z) || this.world.get(x, y, z) !== BLOCKS.AIR) return;
    const id = PLACEABLE[this.selected];
    this.world.set(x, y, z, id, false);
    if (this.playerCollides()) {
      this.world.set(x, y, z, BLOCKS.AIR, false);
      this.flash('No puedes colocarlo dentro de ti');
      return;
    }
    this.world.set(x, y, z, id, true);
    this.stats.placed += 1;
    this.soundscape.place(id);
  }

  checkQuest() {
    if (this.questComplete) return;
    let changed = false;
    for (const landmark of LANDMARKS) {
      if (this.visited.has(landmark.id)) continue;
      if (Math.hypot(this.player.position.x - landmark.x, this.player.position.z - landmark.z) < 8) {
        this.visited.add(landmark.id);
        changed = true;
        this.flash(`${landmark.glyph} Has encontrado: ${landmark.name}`);
        this.soundscape.chime();
      }
    }
    if (changed) {
      this.updateQuestUI();
      this.save();
    }
  }

  completeQuest() {
    this.questComplete = true;
    this.world.set(this.world.altar.x, this.world.altar.y, this.world.altar.z, BLOCKS.GLOW);
    this.festival.material.opacity = 0.95;
    this.altarLight.intensity = 7;
    this.flash('La ofrenda está encendida. El pueblo recuerda.');
    this.soundscape.chime();
    setTimeout(() => this.soundscape.chime(), 650);
    this.updateQuestUI();
    this.save();
  }

  updateQuestUI() {
    const done = this.visited.size;
    const allVisited = done === LANDMARKS.length;
    $('#quest-title').textContent = this.questComplete ? 'El canto permanece' : allVisited ? 'Regresa a la ofrenda' : `${done} de ${LANDMARKS.length} rumbos`;
    $('#quest-copy').textContent = this.questComplete
      ? 'Construye libremente: la fiesta seguirá mientras exista este mundo.'
      : allVisited
        ? 'En la plaza, mira la ofrenda y coloca tu última luz.'
        : 'Busca los símbolos del códice y acércate a cada lugar.';
    $('#rumbos').innerHTML = LANDMARKS.map((landmark) => `<span class="rumbo ${this.visited.has(landmark.id) ? 'done' : ''}" title="${landmark.name}">${landmark.glyph}</span>`).join('');
    document.querySelectorAll('.codex-item').forEach((item) => item.classList.toggle('done', this.visited.has(item.dataset.landmark)));
  }

  updateSky(dt, elapsed) {
    this.time += dt / 420;
    if (this.time >= 1) { this.time -= 1; this.day += 1; }
    const angle = this.time * Math.PI * 2;
    const sunHeight = Math.sin(angle - Math.PI / 2);
    const daylight = clamp(sunHeight * 0.72 + 0.45, 0.06, 1);
    const dayColor = new THREE.Color(0x83c7d7);
    const duskColor = new THREE.Color(0xd77e55);
    const nightColor = new THREE.Color(0x11152b);
    const horizon = Math.max(0, 1 - Math.abs(sunHeight) * 4);
    const sky = nightColor.clone().lerp(dayColor, daylight).lerp(duskColor, horizon * 0.45);
    this.scene.background.copy(sky);
    this.scene.fog.color.copy(sky);
    this.hemi.intensity = 0.22 + daylight * 1.45;
    this.sun.intensity = daylight * 2.4;
    this.sun.color.set(daylight > 0.4 ? 0xffe7b2 : 0xff8f61);
    this.sun.position.set(40 + Math.cos(angle) * 72, 24 + sunHeight * 70, 40 + Math.sin(angle) * 40);
    this.sunDisc.position.copy(this.sun.position);
    this.moonDisc.position.set(40 - Math.cos(angle) * 72, 24 - sunHeight * 70, 40 - Math.sin(angle) * 40);
    this.stars.material.opacity = clamp((0.32 - daylight) * 4, 0, 0.92);
    this.fireflies.material.opacity = clamp((0.45 - daylight) * 3, 0, 0.8);
    this.altarLight.intensity = (this.questComplete ? 4 : 1.4) + (1 - daylight) * 2.2;
    this.clouds.children.forEach((cloud) => {
      cloud.position.x += cloud.userData.speed * dt;
      if (cloud.position.x > 105) cloud.position.x = -25;
    });
    this.papel.rotation.y = Math.sin(elapsed * 0.6) * 0.003;
    this.fireflies.rotation.y += dt * 0.015;
    if (this.questComplete) {
      const positions = this.festival.geometry.attributes.position;
      for (let index = 0; index < positions.count; index += 1) {
        let y = positions.getY(index) - dt * (0.35 + (index % 7) * 0.06);
        if (y < 16) y = 38 + (index % 11);
        positions.setY(index, y);
      }
      positions.needsUpdate = true;
      this.festival.rotation.y += dt * 0.04;
    }
    const hours = Math.floor(this.time * 24);
    const minutes = Math.floor((this.time * 24 - hours) * 60);
    $('#clock').textContent = `Día ${this.day} · ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  updateHUD(dt) {
    const p = this.player.position;
    $('#coords').textContent = `X ${p.x.toFixed(0)} · Y ${p.y.toFixed(0)} · Z ${p.z.toFixed(0)}`;
    $('#mode').textContent = this.player.flying ? 'VOLANDO' : this.player.inWater ? 'NADANDO' : 'A PIE';
    $('#map-player').style.left = `${clamp(p.x / WORLD.width * 100, 0, 100)}%`;
    $('#map-player').style.top = `${clamp(p.z / WORLD.depth * 100, 0, 100)}%`;
    this.fpsFrames += 1;
    this.fpsTime += dt;
    if (this.fpsTime > 0.5) {
      this.fpsValue = Math.round(this.fpsFrames / this.fpsTime);
      this.fpsFrames = 0;
      this.fpsTime = 0;
      $('#fps').textContent = `${this.fpsValue} FPS`;
    }
    if (this.messageTimer > 0) {
      this.messageTimer -= dt;
      if (this.messageTimer <= 0) $('#message').classList.remove('show');
    }
  }

  flash(text, duration = 3.2) {
    $('#message').textContent = text;
    $('#message').classList.add('show');
    this.messageTimer = duration;
  }

  respawn() {
    this.player.position.copy(this.world.spawn);
    this.player.velocity.set(0, 0, 0);
    this.flash('Has vuelto a la plaza');
  }

  saveKey() {
    return `${SAVE_PREFIX}${this.seed}`;
  }

  save() {
    if (!this.world) return;
    const payload = {
      version: 3,
      seed: this.seed,
      position: this.player.position.toArray(),
      yaw: this.player.yaw,
      pitch: this.player.pitch,
      flying: this.player.flying,
      time: this.time,
      day: this.day,
      selected: this.selected,
      visited: [...this.visited],
      questComplete: this.questComplete,
      edits: this.world.serializeEdits(),
      stats: this.stats,
    };
    localStorage.setItem(this.saveKey(), JSON.stringify(payload));
    localStorage.setItem('canto-de-barro:last-seed', this.seed);
  }

  load() {
    try {
      const raw = localStorage.getItem(this.saveKey());
      if (!raw) return;
      const save = JSON.parse(raw);
      if (save.version !== 3 || save.seed !== this.seed) return;
      this.world.applyEdits(save.edits);
      if (Array.isArray(save.position) && save.position.length === 3) this.player.position.fromArray(save.position);
      this.player.yaw = Number(save.yaw) || this.player.yaw;
      this.player.pitch = Number(save.pitch) || this.player.pitch;
      this.player.flying = Boolean(save.flying);
      this.time = Number.isFinite(save.time) ? save.time : this.time;
      this.day = Number.isFinite(save.day) ? save.day : this.day;
      this.selected = clamp(Number(save.selected) || 0, 0, PLACEABLE.length - 1);
      this.visited = new Set(Array.isArray(save.visited) ? save.visited : []);
      this.questComplete = Boolean(save.questComplete);
      this.stats = { ...this.stats, ...(save.stats || {}) };
      if (this.playerCollides()) this.player.position.copy(this.world.spawn);
      if (this.questComplete) {
        this.festival.material.opacity = 0.95;
        this.altarLight.intensity = 7;
      }
    } catch (error) {
      console.warn('Save ignored:', error);
    }
  }

  screenshot() {
    this.renderer.render(this.scene, this.camera);
    const link = document.createElement('a');
    link.download = `canto-de-barro-${this.seed}-${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
    this.flash('Captura guardada');
  }

  resize() {
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 700 ? 1.25 : 1.75));
  }

  frame() {
    const dt = Math.min(0.05, this.clock.getDelta());
    const elapsed = this.clock.elapsedTime;
    if (this.started && !this.paused) {
      this.updatePlayer(dt);
      this.updateCamera();
      this.updateTarget(dt);
      this.checkQuest();
      this.updateSky(dt, elapsed);
      this.updateHUD(dt);
      this.soundscape.update(elapsed);
      if (elapsed - this.lastSave > 10) { this.lastSave = elapsed; this.save(); }
    } else {
      this.updateCamera();
      this.updateSky(dt * 0.15, elapsed);
    }
    this.renderer.render(this.scene, this.camera);
  }
}

try {
  const game = new CantoDeBarro();
  window.CantoDeBarro = game;
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('./sw.js').catch(() => {});
} catch (error) {
  console.error(error);
  document.body.innerHTML = `<main style="padding:3rem;color:#ffd6b1;background:#211311;min-height:100vh;font-family:monospace"><h1>Canto de Barro no pudo iniciar</h1><pre style="white-space:pre-wrap">${String(error?.stack || error)}</pre><p>Este juego requiere WebGL 2 y un navegador moderno.</p></main>`;
}

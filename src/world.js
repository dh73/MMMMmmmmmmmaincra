import * as THREE from 'three';

export const WORLD = Object.freeze({ width: 80, height: 40, depth: 80, chunk: 16, sea: 10 });

export const BLOCKS = Object.freeze({
  AIR: 0,
  GRASS: 1,
  DIRT: 2,
  STONE: 3,
  SAND: 4,
  WATER: 5,
  ADOBE: 6,
  TERRACOTTA: 7,
  CANTERA: 8,
  WOOD: 9,
  LEAVES: 10,
  CACTUS: 11,
  MARIGOLD: 12,
  OBSIDIAN: 13,
  GLASS: 14,
  COBBLE: 15,
  CORN: 16,
  GLOW: 17,
  ROOF: 18,
});

export const BLOCK_INFO = Object.freeze([
  { name: 'Aire', color: 0x000000, solid: false, hardness: 0 },
  { name: 'Pasto', color: 0x548b43, solid: true, hardness: 0.55 },
  { name: 'Tierra', color: 0x855438, solid: true, hardness: 0.7 },
  { name: 'Piedra', color: 0x77716b, solid: true, hardness: 1.7 },
  { name: 'Arena', color: 0xd7b36b, solid: true, hardness: 0.55 },
  { name: 'Agua', color: 0x267b9d, solid: false, hardness: 0, transparent: true },
  { name: 'Adobe', color: 0xbd7049, solid: true, hardness: 0.85 },
  { name: 'Terracota', color: 0xb54832, solid: true, hardness: 1.05 },
  { name: 'Cantera', color: 0xd8b78e, solid: true, hardness: 1.35 },
  { name: 'Madera', color: 0x79502e, solid: true, hardness: 1.15 },
  { name: 'Hojas', color: 0x47713f, solid: true, hardness: 0.3, cutout: true },
  { name: 'Nopal', color: 0x39764a, solid: true, hardness: 0.65 },
  { name: 'Cempasúchil', color: 0xf29d24, solid: false, hardness: 0.15, cutout: true },
  { name: 'Obsidiana', color: 0x211c2b, solid: true, hardness: 4.4 },
  { name: 'Vidrio', color: 0x9ed5d4, solid: true, hardness: 0.35, transparent: true },
  { name: 'Adoquín', color: 0x8d8075, solid: true, hardness: 1.5 },
  { name: 'Milpa', color: 0x7d963c, solid: false, hardness: 0.2, cutout: true },
  { name: 'Luz de ofrenda', color: 0xffc34e, solid: true, hardness: 0.3, emissive: true },
  { name: 'Teja', color: 0x973d2e, solid: true, hardness: 1.0 },
]);

export const PLACEABLE = Object.freeze([
  BLOCKS.ADOBE,
  BLOCKS.TERRACOTTA,
  BLOCKS.CANTERA,
  BLOCKS.WOOD,
  BLOCKS.GLASS,
  BLOCKS.COBBLE,
  BLOCKS.MARIGOLD,
  BLOCKS.GLOW,
]);

export const LANDMARKS = Object.freeze([
  { id: 'pyramid', name: 'Pirámide del Viento', x: 14, z: 15, glyph: '△', copy: 'Escalones de cantera que miran al amanecer.' },
  { id: 'volcano', name: 'Cerro de Obsidiana', x: 65, z: 14, glyph: '▲', copy: 'Piedra negra nacida bajo el fuego.' },
  { id: 'cenote', name: 'Cenote Azul', x: 15, z: 65, glyph: '◉', copy: 'Un espejo de agua dentro de la roca.' },
  { id: 'flowers', name: 'Campo de Cempasúchil', x: 65, z: 65, glyph: '✦', copy: 'Flores que guardan el camino a casa.' },
]);

const FACES = Object.freeze([
  { n: [1, 0, 0], shade: 0.84, v: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]] },
  { n: [-1, 0, 0], shade: 0.72, v: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]] },
  { n: [0, 1, 0], shade: 1.0, v: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
  { n: [0, -1, 0], shade: 0.55, v: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
  { n: [0, 0, 1], shade: 0.9, v: [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]] },
  { n: [0, 0, -1], shade: 0.66, v: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]] },
]);

function hash32(value) {
  value |= 0;
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  return (value ^ (value >>> 16)) >>> 0;
}

export function seedHash(text) {
  let result = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    result ^= text.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function random2(seed, x, z) {
  return hash32(seed ^ Math.imul(x, 374761393) ^ Math.imul(z, 668265263)) / 4294967295;
}

function smooth(value) {
  return value * value * (3 - 2 * value);
}

function valueNoise(seed, x, z, scale) {
  const sx = x / scale;
  const sz = z / scale;
  const x0 = Math.floor(sx);
  const z0 = Math.floor(sz);
  const tx = smooth(sx - x0);
  const tz = smooth(sz - z0);
  const a = random2(seed, x0, z0);
  const b = random2(seed, x0 + 1, z0);
  const c = random2(seed, x0, z0 + 1);
  const d = random2(seed, x0 + 1, z0 + 1);
  const top = a + (b - a) * tx;
  const bottom = c + (d - c) * tx;
  return top + (bottom - top) * tz;
}

function colorFor(id, x, y, z, shade) {
  const color = new THREE.Color(BLOCK_INFO[id].color);
  const jitter = ((hash32(id * 8917 + x * 127 + y * 313 + z * 911) & 31) - 15) / 310;
  color.offsetHSL(0, jitter * 0.35, jitter);
  color.multiplyScalar(shade);
  return color;
}

function key(x, y, z) {
  return `${x},${y},${z}`;
}

export class VoxelWorld {
  constructor(seedText = 'Tenochtitlan-1325') {
    this.seedText = seedText;
    this.seed = seedHash(seedText);
    this.data = new Uint8Array(WORLD.width * WORLD.height * WORLD.depth);
    this.base = null;
    this.edits = new Map();
    this.chunks = new Map();
    this.group = new THREE.Group();
    this.group.name = 'voxel-world';
    this.opaqueMaterial = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
    this.transparentMaterial = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.68, depthWrite: false, side: THREE.DoubleSide });
    this.generate();
  }

  index(x, y, z) {
    return x + WORLD.width * (z + WORLD.depth * y);
  }

  inside(x, y, z) {
    return x >= 0 && x < WORLD.width && y >= 0 && y < WORLD.height && z >= 0 && z < WORLD.depth;
  }

  get(x, y, z) {
    x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
    if (!this.inside(x, y, z)) return BLOCKS.AIR;
    return this.data[this.index(x, y, z)];
  }

  setRaw(x, y, z, id) {
    if (this.inside(x, y, z)) this.data[this.index(x, y, z)] = id;
  }

  set(x, y, z, id, track = true) {
    x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
    if (!this.inside(x, y, z)) return false;
    this.data[this.index(x, y, z)] = id;
    if (track) this.edits.set(key(x, y, z), id);
    this.rebuildAround(x, y, z);
    return true;
  }

  highest(x, z) {
    for (let y = WORLD.height - 1; y >= 0; y -= 1) {
      const id = this.get(x, y, z);
      if (id !== BLOCKS.AIR && id !== BLOCKS.WATER && !BLOCK_INFO[id].cutout) return y;
    }
    return 0;
  }

  fill(x0, y0, z0, x1, y1, z1, id) {
    for (let y = y0; y <= y1; y += 1) {
      for (let z = z0; z <= z1; z += 1) {
        for (let x = x0; x <= x1; x += 1) this.setRaw(x, y, z, id);
      }
    }
  }

  generate() {
    this.data.fill(BLOCKS.AIR);
    const terrainSeed = this.seed ^ 0x92d68ca2;
    const detailSeed = this.seed ^ 0x5bd1e995;
    for (let z = 0; z < WORLD.depth; z += 1) {
      for (let x = 0; x < WORLD.width; x += 1) {
        const continental = valueNoise(terrainSeed, x, z, 31);
        const hills = valueNoise(detailSeed, x, z, 12);
        const ridge = Math.abs(valueNoise(detailSeed ^ 0xa511e9b3, x, z, 20) - 0.5) * 2;
        let height = Math.floor(7 + continental * 10 + hills * 5 + ridge * 3);
        const edge = Math.min(x, z, WORLD.width - 1 - x, WORLD.depth - 1 - z);
        if (edge < 5) height -= 5 - edge;
        height = Math.max(4, Math.min(25, height));
        const dry = valueNoise(this.seed ^ 0x34ac, x, z, 22) > 0.56;
        for (let y = 0; y <= height; y += 1) {
          let id = BLOCKS.STONE;
          if (y === height) id = dry ? BLOCKS.SAND : BLOCKS.GRASS;
          else if (y > height - 4) id = dry ? BLOCKS.SAND : BLOCKS.DIRT;
          if (y > 3 && y < height - 3) {
            const cave = valueNoise(this.seed ^ y * 7919, x, z, 8);
            if (cave > 0.77 && random2(this.seed ^ y, x, z) > 0.45) id = BLOCKS.AIR;
          }
          this.setRaw(x, y, z, id);
        }
        for (let y = height + 1; y <= WORLD.sea; y += 1) this.setRaw(x, y, z, BLOCKS.WATER);
      }
    }

    this.buildPueblo();
    this.buildPyramid();
    this.buildVolcano();
    this.buildCenote();
    this.buildFlowerField();
    this.scatterNature();
    this.base = this.data.slice();
  }

  flatten(cx, cz, radius, height, top = BLOCKS.GRASS) {
    for (let z = cz - radius; z <= cz + radius; z += 1) {
      for (let x = cx - radius; x <= cx + radius; x += 1) {
        if (!this.inside(x, height, z)) continue;
        for (let y = height + 1; y < WORLD.height; y += 1) this.setRaw(x, y, z, BLOCKS.AIR);
        for (let y = 0; y < height; y += 1) if (this.get(x, y, z) === BLOCKS.AIR || this.get(x, y, z) === BLOCKS.WATER) this.setRaw(x, y, z, BLOCKS.DIRT);
        this.setRaw(x, height, z, top);
      }
    }
  }

  buildHouse(x, y, z, w, d, accent = BLOCKS.TERRACOTTA) {
    this.fill(x, y, z, x + w - 1, y, z + d - 1, BLOCKS.CANTERA);
    for (let yy = y + 1; yy <= y + 4; yy += 1) {
      for (let zz = z; zz < z + d; zz += 1) {
        for (let xx = x; xx < x + w; xx += 1) {
          const edge = xx === x || xx === x + w - 1 || zz === z || zz === z + d - 1;
          if (edge) this.setRaw(xx, yy, zz, BLOCKS.ADOBE);
        }
      }
    }
    const doorX = x + Math.floor(w / 2);
    this.setRaw(doorX, y + 1, z, BLOCKS.AIR);
    this.setRaw(doorX, y + 2, z, BLOCKS.AIR);
    this.setRaw(x + 1, y + 2, z, BLOCKS.GLASS);
    this.setRaw(x + w - 2, y + 2, z, BLOCKS.GLASS);
    for (let zz = z - 1; zz <= z + d; zz += 1) {
      for (let xx = x - 1; xx <= x + w; xx += 1) this.setRaw(xx, y + 5, zz, BLOCKS.ROOF);
    }
    this.fill(x - 1, y + 4, z - 1, x - 1, y + 4, z + d, accent);
  }

  buildPueblo() {
    const y = 15;
    this.flatten(40, 40, 14, y, BLOCKS.GRASS);
    this.fill(31, y, 31, 49, y, 49, BLOCKS.CANTERA);
    for (let index = 31; index <= 49; index += 1) {
      if (index % 2 === 0) {
        this.setRaw(index, y + 1, 31, BLOCKS.MARIGOLD);
        this.setRaw(index, y + 1, 49, BLOCKS.MARIGOLD);
      }
    }
    this.buildHouse(27, y, 34, 8, 7, BLOCKS.TERRACOTTA);
    this.buildHouse(45, y, 34, 8, 7, BLOCKS.GLOW);
    this.buildHouse(29, y, 46, 7, 7, BLOCKS.TERRACOTTA);
    this.buildHouse(45, y, 46, 7, 7, BLOCKS.TERRACOTTA);

    this.fill(38, y + 1, 39, 42, y + 2, 43, BLOCKS.CANTERA);
    this.fill(39, y + 3, 40, 41, y + 3, 42, BLOCKS.TERRACOTTA);
    this.setRaw(40, y + 4, 41, BLOCKS.GLOW);
    this.altar = { x: 40, y: y + 4, z: 41 };

    this.fill(36, y + 1, 25, 43, y + 8, 29, BLOCKS.ADOBE);
    this.fill(37, y + 2, 25, 42, y + 7, 29, BLOCKS.AIR);
    this.fill(36, y + 9, 25, 43, y + 9, 29, BLOCKS.ROOF);
    this.fill(38, y + 10, 26, 41, y + 13, 28, BLOCKS.CANTERA);
    this.fill(39, y + 11, 26, 40, y + 12, 27, BLOCKS.AIR);
    this.setRaw(39, y + 12, 28, BLOCKS.GLOW);
    this.setRaw(40, y + 12, 28, BLOCKS.GLOW);

    for (let z = 52; z <= 61; z += 2) {
      for (let x = 31; x <= 47; x += 2) this.setRaw(x, y + 1, z, BLOCKS.CORN);
    }
    for (let x = 33; x <= 47; x += 3) {
      this.fill(x, y + 1, 29, x, y + 4, 29, BLOCKS.WOOD);
      this.fill(x, y + 4, 29, x + 1, y + 4, 29, x % 2 ? BLOCKS.TERRACOTTA : BLOCKS.GLOW);
    }
    this.spawn = new THREE.Vector3(40.5, y + 2.2, 36.5);
  }

  buildPyramid() {
    const cx = 14; const cz = 15; const y = 13;
    this.flatten(cx, cz, 9, y, BLOCKS.SAND);
    for (let level = 0; level < 6; level += 1) {
      const radius = 8 - level;
      this.fill(cx - radius, y + level, cz - radius, cx + radius, y + level, cz + radius, level % 2 ? BLOCKS.CANTERA : BLOCKS.COBBLE);
      for (let zz = cz - radius + 1; zz < cz + radius; zz += 1) {
        for (let xx = cx - radius + 1; xx < cx + radius; xx += 1) this.setRaw(xx, y + level, zz, BLOCKS.AIR);
      }
      this.fill(cx - 1, y + level, cz + radius, cx + 1, y + level, cz + radius, BLOCKS.CANTERA);
    }
    this.fill(cx - 2, y + 6, cz - 2, cx + 2, y + 9, cz + 2, BLOCKS.ADOBE);
    this.fill(cx - 1, y + 7, cz + 2, cx + 1, y + 8, cz + 2, BLOCKS.AIR);
    this.setRaw(cx, y + 9, cz, BLOCKS.GLOW);
  }

  buildVolcano() {
    const cx = 65; const cz = 14;
    for (let z = cz - 10; z <= cz + 10; z += 1) {
      for (let x = cx - 10; x <= cx + 10; x += 1) {
        const distance = Math.hypot(x - cx, z - cz);
        if (distance > 10) continue;
        const base = this.highest(x, z);
        const rise = Math.max(0, Math.floor((10 - distance) * 1.15 + random2(this.seed, x, z) * 2));
        for (let y = base + 1; y <= Math.min(WORLD.height - 2, base + rise); y += 1) this.setRaw(x, y, z, distance < 3 ? BLOCKS.OBSIDIAN : BLOCKS.STONE);
      }
    }
    const peak = this.highest(cx, cz);
    this.fill(cx - 1, peak - 2, cz - 1, cx + 1, peak, cz + 1, BLOCKS.OBSIDIAN);
    this.setRaw(cx, peak + 1, cz, BLOCKS.GLOW);
  }

  buildCenote() {
    const cx = 15; const cz = 65; const surface = 13;
    this.flatten(cx, cz, 9, surface, BLOCKS.GRASS);
    for (let z = cz - 8; z <= cz + 8; z += 1) {
      for (let x = cx - 8; x <= cx + 8; x += 1) {
        const distance = Math.hypot(x - cx, z - cz);
        if (distance < 7.3) {
          for (let y = surface - 6; y <= surface + 3; y += 1) this.setRaw(x, y, z, BLOCKS.AIR);
          for (let y = surface - 5; y <= surface - 1; y += 1) this.setRaw(x, y, z, BLOCKS.WATER);
        }
        if (distance >= 7 && distance < 8.5) this.setRaw(x, surface + 1, z, BLOCKS.CANTERA);
      }
    }
    this.setRaw(cx, surface - 4, cz, BLOCKS.GLOW);
  }

  buildFlowerField() {
    const cx = 65; const cz = 65; const y = 14;
    this.flatten(cx, cz, 10, y, BLOCKS.GRASS);
    for (let z = cz - 9; z <= cz + 9; z += 1) {
      for (let x = cx - 9; x <= cx + 9; x += 1) {
        if ((x + z) % 2 === 0 && Math.hypot(x - cx, z - cz) < 9.5) this.setRaw(x, y + 1, z, BLOCKS.MARIGOLD);
      }
    }
    this.fill(cx - 2, y + 1, cz - 2, cx + 2, y + 1, cz + 2, BLOCKS.CANTERA);
    this.setRaw(cx, y + 2, cz, BLOCKS.GLOW);
  }

  scatterNature() {
    for (let z = 3; z < WORLD.depth - 3; z += 1) {
      for (let x = 3; x < WORLD.width - 3; x += 1) {
        if (Math.hypot(x - 40, z - 40) < 18) continue;
        const y = this.highest(x, z);
        const top = this.get(x, y, z);
        const chance = random2(this.seed ^ 0x73a12, x, z);
        if (top === BLOCKS.SAND && chance > 0.975) {
          const height = 2 + (hash32(x * 99 + z * 313 + this.seed) % 3);
          for (let yy = 1; yy <= height; yy += 1) this.setRaw(x, y + yy, z, BLOCKS.CACTUS);
        } else if (top === BLOCKS.GRASS && chance > 0.982) {
          this.fill(x, y + 1, z, x, y + 4, z, BLOCKS.WOOD);
          for (let zz = z - 2; zz <= z + 2; zz += 1) {
            for (let xx = x - 2; xx <= x + 2; xx += 1) {
              for (let yy = y + 3; yy <= y + 5; yy += 1) {
                if (Math.abs(xx - x) + Math.abs(zz - z) + Math.abs(yy - (y + 4)) < 5) this.setRaw(xx, yy, zz, BLOCKS.LEAVES);
              }
            }
          }
        }
      }
    }
  }

  applyEdits(edits = []) {
    this.edits.clear();
    for (const entry of edits) {
      if (!Array.isArray(entry) || entry.length !== 4) continue;
      const [x, y, z, id] = entry.map(Number);
      if (this.inside(x, y, z) && BLOCK_INFO[id]) {
        this.data[this.index(x, y, z)] = id;
        this.edits.set(key(x, y, z), id);
      }
    }
  }

  serializeEdits() {
    const result = [];
    for (const [position, id] of this.edits) {
      const [x, y, z] = position.split(',').map(Number);
      result.push([x, y, z, id]);
    }
    return result;
  }

  buildMeshes() {
    for (const mesh of this.chunks.values()) {
      this.group.remove(mesh.opaque, mesh.transparent);
      mesh.opaque.geometry.dispose();
      mesh.transparent.geometry.dispose();
    }
    this.chunks.clear();
    for (let cz = 0; cz < WORLD.depth; cz += WORLD.chunk) {
      for (let cx = 0; cx < WORLD.width; cx += WORLD.chunk) this.rebuildChunk(cx / WORLD.chunk, cz / WORLD.chunk);
    }
  }

  rebuildAround(x, _y, z) {
    const cx = Math.floor(x / WORLD.chunk);
    const cz = Math.floor(z / WORLD.chunk);
    const targets = new Set([`${cx},${cz}`]);
    if (x % WORLD.chunk === 0) targets.add(`${cx - 1},${cz}`);
    if (x % WORLD.chunk === WORLD.chunk - 1) targets.add(`${cx + 1},${cz}`);
    if (z % WORLD.chunk === 0) targets.add(`${cx},${cz - 1}`);
    if (z % WORLD.chunk === WORLD.chunk - 1) targets.add(`${cx},${cz + 1}`);
    for (const target of targets) {
      const [chunkX, chunkZ] = target.split(',').map(Number);
      if (chunkX >= 0 && chunkZ >= 0 && chunkX * WORLD.chunk < WORLD.width && chunkZ * WORLD.chunk < WORLD.depth) this.rebuildChunk(chunkX, chunkZ);
    }
  }

  rebuildChunk(chunkX, chunkZ) {
    const id = `${chunkX},${chunkZ}`;
    const old = this.chunks.get(id);
    if (old) {
      this.group.remove(old.opaque, old.transparent);
      old.opaque.geometry.dispose();
      old.transparent.geometry.dispose();
    }
    const opaque = this.makeGeometry(chunkX, chunkZ, false);
    const transparent = this.makeGeometry(chunkX, chunkZ, true);
    const opaqueMesh = new THREE.Mesh(opaque, this.opaqueMaterial);
    const transparentMesh = new THREE.Mesh(transparent, this.transparentMaterial);
    opaqueMesh.name = `opaque-${id}`;
    transparentMesh.name = `transparent-${id}`;
    transparentMesh.renderOrder = 2;
    this.group.add(opaqueMesh, transparentMesh);
    this.chunks.set(id, { opaque: opaqueMesh, transparent: transparentMesh });
  }

  makeGeometry(chunkX, chunkZ, transparentPass) {
    const positions = [];
    const normals = [];
    const colors = [];
    const indices = [];
    let vertex = 0;
    const x0 = chunkX * WORLD.chunk;
    const z0 = chunkZ * WORLD.chunk;
    const x1 = Math.min(WORLD.width, x0 + WORLD.chunk);
    const z1 = Math.min(WORLD.depth, z0 + WORLD.chunk);

    for (let y = 0; y < WORLD.height; y += 1) {
      for (let z = z0; z < z1; z += 1) {
        for (let x = x0; x < x1; x += 1) {
          const block = this.get(x, y, z);
          if (block === BLOCKS.AIR) continue;
          const info = BLOCK_INFO[block];
          const isTransparent = Boolean(info.transparent || info.cutout);
          if (isTransparent !== transparentPass) continue;

          for (const face of FACES) {
            const neighbor = this.get(x + face.n[0], y + face.n[1], z + face.n[2]);
            const neighborInfo = BLOCK_INFO[neighbor];
            const hidden = block === BLOCKS.WATER
              ? neighbor === BLOCKS.WATER
              : neighbor !== BLOCKS.AIR && neighborInfo.solid && !neighborInfo.transparent && !neighborInfo.cutout;
            if (hidden) continue;
            const color = colorFor(block, x, y, z, face.shade);
            for (const point of face.v) {
              positions.push(x + point[0], y + point[1], z + point[2]);
              normals.push(...face.n);
              colors.push(color.r, color.g, color.b);
            }
            indices.push(vertex, vertex + 1, vertex + 2, vertex, vertex + 2, vertex + 3);
            vertex += 4;
          }
        }
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeBoundingSphere();
    return geometry;
  }

  raycast(origin, direction, maxDistance = 7) {
    const dir = direction.clone().normalize();
    let x = Math.floor(origin.x);
    let y = Math.floor(origin.y);
    let z = Math.floor(origin.z);
    const stepX = Math.sign(dir.x) || 1;
    const stepY = Math.sign(dir.y) || 1;
    const stepZ = Math.sign(dir.z) || 1;
    const deltaX = dir.x === 0 ? Infinity : Math.abs(1 / dir.x);
    const deltaY = dir.y === 0 ? Infinity : Math.abs(1 / dir.y);
    const deltaZ = dir.z === 0 ? Infinity : Math.abs(1 / dir.z);
    let maxX = dir.x === 0 ? Infinity : ((stepX > 0 ? x + 1 : x) - origin.x) / dir.x;
    let maxY = dir.y === 0 ? Infinity : ((stepY > 0 ? y + 1 : y) - origin.y) / dir.y;
    let maxZ = dir.z === 0 ? Infinity : ((stepZ > 0 ? z + 1 : z) - origin.z) / dir.z;
    let distance = 0;
    const normal = new THREE.Vector3();

    while (distance <= maxDistance) {
      const id = this.get(x, y, z);
      if (id !== BLOCKS.AIR && id !== BLOCKS.WATER && !BLOCK_INFO[id].cutout) {
        return { x, y, z, id, normal: normal.clone(), distance };
      }
      if (maxX < maxY && maxX < maxZ) {
        x += stepX; distance = maxX; maxX += deltaX; normal.set(-stepX, 0, 0);
      } else if (maxY < maxZ) {
        y += stepY; distance = maxY; maxY += deltaY; normal.set(0, -stepY, 0);
      } else {
        z += stepZ; distance = maxZ; maxZ += deltaZ; normal.set(0, 0, -stepZ);
      }
    }
    return null;
  }

  collides(minX, minY, minZ, maxX, maxY, maxZ) {
    for (let y = Math.floor(minY); y <= Math.floor(maxY); y += 1) {
      for (let z = Math.floor(minZ); z <= Math.floor(maxZ); z += 1) {
        for (let x = Math.floor(minX); x <= Math.floor(maxX); x += 1) {
          const id = this.get(x, y, z);
          if (BLOCK_INFO[id]?.solid) return true;
        }
      }
    }
    return false;
  }
}

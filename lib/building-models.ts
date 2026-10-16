import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Original procedural models: metres-like units, Y up, front facing +Z. */
export type BuildingType = 'chale' | 'vila' | 'prefeitura' | 'edificio' | 'metropole';

export const BUILDING_MODELS: { type: BuildingType; name: string; description: string }[] = [
  { type: 'chale', name: 'Chalé', description: 'Casa de reboco creme, telhado coral, chaminé e jardim florido.' },
  { type: 'vila', name: 'Vila', description: 'Duas casas coloridas, árvores e uma pequena praça entre vizinhos.' },
  { type: 'prefeitura', name: 'Prefeitura', description: 'Edifício cívico com colunas, escadaria, relógio dourado e bandeira.' },
  { type: 'edificio', name: 'Edifício', description: 'Prédio de cinco andares com varandas, anexo e jardim na cobertura.' },
  { type: 'metropole', name: 'Metrópole', description: 'Conjunto de três torres com terraços verdes e cúpula dourada central.' },
];

const PALETTE = {
  lawn: '#8fbd8d', leaf: '#57916e', leafLight: '#7fb58b', trunk: '#8b6549',
  path: '#e9dfc8', stone: '#d8cdb8', cream: '#fff3da', white: '#fffaf0',
  yellow: '#f5d995', coral: '#d87958', coralLight: '#e99371', green: '#467663',
  greenDark: '#2c5648', blue: '#789bb7', blueDark: '#54768f', gold: '#dfb85d',
  glass: '#a4c7c4', glassLight: '#f7dca1', brown: '#755443', pink: '#d88a96',
} as const;
type Shade = keyof typeof PALETTE;

/** Geometry is batched by material: each model takes at most one draw per palette colour. */
class ModelBuilder {
  private parts = new Map<Shade, THREE.BufferGeometry[]>();

  add(geometry: THREE.BufferGeometry, shade: Shade, x = 0, y = 0, z = 0, rotation?: THREE.Euler) {
    geometry.applyMatrix4(new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromEuler(rotation ?? new THREE.Euler()),
      new THREE.Vector3(1, 1, 1),
    ));
    // Non-indexed uniform attributes make the hand-built and primitive geometry compatible.
    const normalized = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    geometry.dispose();
    normalized.deleteAttribute('uv');
    normalized.deleteAttribute('uv1');
    if (!normalized.hasAttribute('normal')) normalized.computeVertexNormals();
    const list = this.parts.get(shade) ?? [];
    list.push(normalized);
    this.parts.set(shade, list);
  }

  box(w: number, h: number, d: number, shade: Shade, x: number, y: number, z: number, rotation?: THREE.Euler) {
    this.add(new THREE.BoxGeometry(w, h, d), shade, x, y, z, rotation);
  }

  cylinder(top: number, bottom: number, h: number, shade: Shade, x: number, y: number, z: number, segments = 12) {
    this.add(new THREE.CylinderGeometry(top, bottom, h, segments), shade, x, y, z);
  }

  ball(radius: number, shade: Shade, x: number, y: number, z: number, detail = 1) {
    this.add(new THREE.IcosahedronGeometry(radius, detail), shade, x, y, z);
  }

  roof(w: number, rise: number, d: number, shade: Shade, x: number, y: number, z: number) {
    const section = new THREE.Shape();
    section.moveTo(-w / 2, 0);
    section.lineTo(w / 2, 0);
    section.lineTo(0, rise);
    section.closePath();
    const roof = new THREE.ExtrudeGeometry(section, { depth: d, bevelEnabled: false, steps: 1 });
    roof.translate(0, 0, -d / 2);
    this.add(roof, shade, x, y, z);
    this.box(w + 0.025, 0.07, d + 0.025, shade, x, y + 0.005, z);
    this.box(0.075, 0.055, d + 0.04, shade === 'green' ? 'greenDark' : shade === 'blue' ? 'blueDark' : 'coralLight', x, y + rise + 0.005, z);
  }

  window(x: number, y: number, z: number, w = 0.28, h = 0.34, face: 'front' | 'back' | 'left' | 'right' = 'front', bright = false) {
    const turn = face === 'back' ? Math.PI : face === 'left' ? -Math.PI / 2 : face === 'right' ? Math.PI / 2 : 0;
    const rotation = new THREE.Euler(0, turn, 0);
    const offset = (dx: number, dz: number) => [x + dx * Math.cos(turn) + dz * Math.sin(turn), z - dx * Math.sin(turn) + dz * Math.cos(turn)];
    this.box(w + 0.08, h + 0.08, 0.035, 'white', x, y, z, rotation);
    const [gx, gz] = offset(0, 0.025);
    this.box(w, h, 0.032, bright ? 'glassLight' : 'glass', gx, y, gz, rotation);
    const [mx, mz] = offset(0, 0.045);
    this.box(0.026, h, 0.025, 'white', mx, y, mz, rotation);
    this.box(w, 0.026, 0.025, 'white', mx, y, mz, rotation);
    const [sx, sz] = offset(0, 0.045);
    this.box(w + 0.12, 0.05, 0.12, 'stone', sx, y - h / 2 - 0.035, sz, rotation);
  }

  door(x: number, ground: number, front: number, w = 0.35, h = 0.64, shade: Shade = 'green') {
    const arch = (width: number, height: number) => {
      const radius = width / 2;
      const shape = new THREE.Shape();
      shape.moveTo(-radius, 0);
      shape.lineTo(radius, 0);
      shape.lineTo(radius, height - radius);
      shape.absarc(0, height - radius, radius, 0, Math.PI, false);
      shape.closePath();
      return new THREE.ExtrudeGeometry(shape, { depth: 0.045, bevelEnabled: false, curveSegments: 8 });
    };
    this.add(arch(w + 0.08, h + 0.05), 'white', x, ground, front);
    this.add(arch(w, h), shade, x, ground, front + 0.035);
    this.ball(0.025, 'gold', x + w * 0.25, ground + h * 0.42, front + 0.095, 0);
  }

  tree(x: number, z: number, size = 1, ground = 0.1) {
    this.cylinder(0.045 * size, 0.065 * size, 0.45 * size, 'trunk', x, ground + 0.225 * size, z, 7);
    this.ball(0.27 * size, 'leaf', x, ground + 0.52 * size, z);
    this.ball(0.23 * size, 'leafLight', x - 0.09 * size, ground + 0.7 * size, z + 0.015 * size);
  }

  bush(x: number, z: number, radius = 0.17, flower?: Shade, ground = 0.1) {
    this.ball(radius, 'leafLight', x, ground + radius * 0.65, z);
    if (flower) {
      for (const [dx, dz] of [[-0.06, 0.07], [0.06, 0.01], [0, -0.06]]) {
        this.ball(0.035, flower, x + dx, ground + radius * 1.5, z + dz, 0);
      }
    }
  }

  base(w: number, d: number) {
    this.box(w, 0.09, d, 'stone', 0, 0.045, 0);
    this.box(w - 0.08, 0.03, d - 0.08, 'lawn', 0, 0.105, 0);
  }

  finish(type: BuildingType): THREE.Group {
    const group = new THREE.Group();
    group.name = `imovel_${type}`;
    group.userData = { type, author: 'ComenteMapa', units: 'metres-like', up: 'Y', front: '+Z', procedural: true };
    for (const [shade, parts] of this.parts) {
      const geometry = mergeGeometries(parts, false);
      if (!geometry) throw new Error(`Failed to merge ${type}/${shade}`);
      parts.forEach(part => part.dispose());
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      const material = new THREE.MeshStandardMaterial({ color: PALETTE[shade], roughness: 0.86, metalness: shade === 'gold' ? 0.28 : 0, flatShading: true });
      material.name = `paleta_${shade}`;
      if (shade === 'glassLight') { material.emissive.set(PALETTE.glassLight); material.emissiveIntensity = 0.12; }
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = `${type}_${shade}`;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    return group;
  }
}

function cottage(b: ModelBuilder, x = 0, z = 0, scale = 1, roof: Shade = 'coral', walls: Shade = 'cream') {
  const w = 1.48 * scale, d = 1.26 * scale, h = 1.13 * scale;
  const floor = 0.12;
  b.box(w + 0.08, 0.12 * scale, d + 0.08, 'white', x, floor + 0.06 * scale, z);
  b.box(w, h, d, walls, x, floor + h / 2 + 0.06 * scale, z);
  b.roof(w + 0.3 * scale, 0.6 * scale, d + 0.28 * scale, roof, x, floor + h + 0.06 * scale, z);
  b.box(0.22 * scale, 0.65 * scale, 0.24 * scale, roof, x + 0.4 * scale, floor + h + 0.45 * scale, z - 0.23 * scale);
  b.box(0.28 * scale, 0.07 * scale, 0.3 * scale, 'white', x + 0.4 * scale, floor + h + 0.8 * scale, z - 0.23 * scale);
  b.door(x, floor + 0.07 * scale, z + d / 2 + 0.015, 0.34 * scale, 0.68 * scale);
  for (const dx of [-0.47, 0.47]) b.window(x + dx * scale, floor + 0.73 * scale, z + d / 2 + 0.018, 0.25 * scale, 0.31 * scale, 'front', true);
  for (const dx of [-0.38, 0.38]) b.window(x + dx * scale, floor + 0.73 * scale, z - d / 2 - 0.018, 0.27 * scale, 0.33 * scale, 'back');
  for (const side of [-1, 1]) {
    for (const dz of [-0.3, 0.3]) b.window(x + side * (w / 2 + 0.018), floor + 0.73 * scale, z + dz * scale, 0.25 * scale, 0.33 * scale, side < 0 ? 'left' : 'right');
  }
  b.box(0.48 * scale, 0.045, 0.3 * scale, 'stone', x, floor + 0.022, z + d / 2 + 0.19 * scale);
}

function createChale(b: ModelBuilder) {
  b.base(2.65, 2.35);
  cottage(b, 0, -0.17);
  b.box(0.36, 0.015, 0.5, 'path', 0, 0.128, 0.9);
  b.tree(-1.04, -0.65, 0.8);
  b.bush(-0.97, 0.58, 0.2, 'pink');
  b.bush(0.97, 0.55, 0.21, 'gold');
  b.box(0.06, 0.32, 0.06, 'brown', 0.9, 0.28, 0.96);
  b.box(0.2, 0.15, 0.16, 'coral', 0.9, 0.47, 0.96);
  b.box(0.12, 0.015, 0.015, 'white', 0.9, 0.48, 1.047);
}

function createVila(b: ModelBuilder) {
  b.base(3.35, 2.7);
  cottage(b, -0.88, 0.11, 0.72, 'blue', 'yellow');
  cottage(b, 0.68, -0.26, 1.06, 'coral', 'cream');
  b.box(0.37, 0.015, 1.9, 'path', -0.14, 0.128, 0.1);
  b.box(1.72, 0.015, 0.28, 'path', -0.05, 0.13, 0.82);
  b.tree(-1.31, -0.9, 0.9);
  b.tree(1.22, 0.91, 0.74);
  b.bush(-1.25, 0.75, 0.18, 'pink');
  b.bush(1.27, -0.96, 0.18, 'gold');
  // Park bench, with actual seat, back and legs.
  b.box(0.46, 0.045, 0.15, 'brown', -0.7, 0.29, 1.02);
  b.box(0.46, 0.15, 0.035, 'brown', -0.7, 0.39, 0.96);
  for (const dx of [-0.16, 0.16]) b.box(0.035, 0.15, 0.13, 'greenDark', -0.7 + dx, 0.21, 1.02);
  for (const x of [-1.1, -0.6, -0.1, 0.4, 0.9]) {
    b.box(0.05, 0.28, 0.05, 'white', x, 0.26, -1.2);
  }
  b.box(2.05, 0.045, 0.04, 'white', -0.1, 0.29, -1.2);
}

function createPrefeitura(b: ModelBuilder) {
  b.base(3.05, 2.75);
  b.box(2.35, 0.16, 1.8, 'stone', 0, 0.2, -0.12);
  b.box(2.13, 1.65, 1.53, 'cream', 0, 1.105, -0.12);
  b.box(2.24, 0.12, 1.64, 'white', 0, 1.95, -0.12);
  b.roof(2.48, 0.68, 1.88, 'green', 0, 2, -0.12);
  b.box(2.24, 0.11, 0.58, 'white', 0, 0.4, 0.84);
  b.box(1.84, 0.11, 0.5, 'stone', 0, 0.29, 0.93);
  b.box(1.42, 0.11, 0.42, 'path', 0, 0.18, 1.07);
  b.door(0, 0.45, 0.66, 0.55, 1.05, 'coral');
  b.box(0.025, 0.94, 0.02, 'brown', 0, 0.92, 0.755);
  for (const x of [-0.72, 0.72]) b.window(x, 1.27, 0.663, 0.3, 0.52, 'front', true);
  for (const x of [-0.84, -0.51, 0.51, 0.84]) {
    b.cylinder(0.075, 0.08, 1.4, 'white', x, 1.12, 0.88, 12);
    b.box(0.21, 0.085, 0.21, 'stone', x, 0.46, 0.88);
    b.box(0.21, 0.085, 0.21, 'white', x, 1.81, 0.88);
  }
  b.roof(2.28, 0.51, 0.44, 'green', 0, 1.9, 0.85);
  // The clock face is a real shallow cylinder looking towards +Z.
  b.add(new THREE.CylinderGeometry(0.19, 0.19, 0.045, 24), 'gold', 0, 2.17, 1.09, new THREE.Euler(Math.PI / 2, 0, 0));
  b.add(new THREE.CylinderGeometry(0.156, 0.156, 0.05, 24), 'white', 0, 2.17, 1.115, new THREE.Euler(Math.PI / 2, 0, 0));
  b.box(0.021, 0.12, 0.026, 'greenDark', 0, 2.22, 1.15);
  b.box(0.1, 0.021, 0.026, 'greenDark', 0.04, 2.17, 1.15);
  for (const x of [-0.65, 0, 0.65]) b.window(x, 1.25, -0.901, 0.3, 0.55, 'back', true);
  for (const side of [-1, 1]) for (const z of [-0.57, 0.21]) b.window(side * 1.081, 1.24, z, 0.34, 0.6, side < 0 ? 'left' : 'right', true);
  b.cylinder(0.025, 0.025, 0.74, 'brown', 0, 2.91, -0.12, 8);
  b.box(0.43, 0.24, 0.032, 'gold', 0.22, 3.13, -0.12);
  b.box(0.19, 0.13, 0.039, 'green', 0.22, 3.13, -0.12);
  b.bush(-1.25, 0.8, 0.21, 'pink');
  b.bush(1.25, 0.8, 0.21, 'pink');
  b.tree(-1.24, -0.95, 0.76);
  b.tree(1.24, -0.95, 0.76);
}

function tower(b: ModelBuilder, x: number, z: number, w: number, d: number, floors: number, shade: Shade, floorHeight = 0.55) {
  const start = 0.18, height = floors * floorHeight;
  b.box(w + 0.12, 0.15, d + 0.12, 'white', x, 0.195, z);
  b.box(w, height, d, shade, x, start + height / 2, z);
  for (let floor = 0; floor < floors; floor++) {
    const y = start + floor * floorHeight + floorHeight * 0.55;
    const columns = w > 1.1 ? [-w * 0.29, w * 0.29] : [0];
    for (const dx of columns) {
      if (floor !== 0 || dx !== 0) b.window(x + dx, y, z + d / 2 + 0.018, 0.24, 0.3, 'front', floor % 3 === 1);
      b.window(x + dx, y, z - d / 2 - 0.018, 0.24, 0.3, 'back', floor % 3 === 2);
    }
    for (const side of [-1, 1]) for (const dz of [-d * 0.27, d * 0.27]) b.window(x + side * (w / 2 + 0.018), y, z + dz, 0.23, 0.3, side < 0 ? 'left' : 'right', floor % 2 === 0);
    b.box(w + 0.08, 0.055, d + 0.08, 'white', x, start + (floor + 1) * floorHeight - 0.025, z);
  }
  b.door(x, 0.23, z + d / 2 + 0.035, Math.min(0.36, w * 0.45), 0.45, 'green');
  b.box(w + 0.17, 0.11, d + 0.17, 'coral', x, start + height + 0.04, z);
  return start + height + 0.1;
}

function createEdificio(b: ModelBuilder) {
  b.base(2.9, 2.55);
  const top = tower(b, 0.28, -0.15, 1.5, 1.35, 5, 'cream');
  tower(b, -0.85, -0.17, 0.63, 1.2, 3, 'yellow');
  // Terraces and railings give the front a three-dimensional rhythm.
  for (let floor = 1; floor < 5; floor++) {
    const y = 0.18 + floor * 0.55;
    b.box(1.43, 0.055, 0.28, 'stone', 0.28, y, 0.63);
    b.box(1.43, 0.04, 0.025, 'green', 0.28, y + 0.19, 0.76);
    for (const x of [-0.34, 0.07, 0.49, 0.9]) b.box(0.025, 0.2, 0.025, 'green', x, y + 0.1, 0.76);
  }
  b.box(1.3, 0.05, 1.12, 'lawn', 0.28, top + 0.025, -0.15);
  b.tree(-0.05, -0.4, 0.58, top + 0.05);
  b.bush(0.69, -0.42, 0.18, 'pink', top + 0.05);
  b.bush(0.68, 0.18, 0.15, 'gold', top + 0.05);
  b.box(0.36, 0.015, 0.75, 'path', 0.28, 0.13, 0.94);
  b.tree(-1.16, 0.87, 0.7);
  b.bush(1.15, 0.89, 0.2, 'pink');
}

function createMetropole(b: ModelBuilder) {
  b.base(3.2, 2.85);
  const leftTop = tower(b, -1.01, -0.17, 0.72, 1.08, 6, 'yellow', 0.53);
  const rightTop = tower(b, 1.01, -0.17, 0.72, 1.08, 7, 'cream', 0.53);
  const centralTop = tower(b, 0, 0.1, 1.16, 1.4, 8, 'cream', 0.53);
  b.roof(0.92, 0.44, 1.25, 'green', -1.01, leftTop, -0.17);
  b.roof(0.92, 0.44, 1.25, 'green', 1.01, rightTop, -0.17);
  b.cylinder(0.52, 0.52, 0.13, 'white', 0, centralTop + 0.04, 0.1, 20);
  const dome = new THREE.SphereGeometry(0.52, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  dome.scale(1, 0.8, 1);
  b.add(dome, 'gold', 0, centralTop + 0.1, 0.1);
  b.cylinder(0.012, 0.045, 0.28, 'gold', 0, centralTop + 0.63, 0.1, 8);
  b.ball(0.062, 'gold', 0, centralTop + 0.8, 0.1);
  // Covered links between towers and a welcoming square.
  for (const x of [-0.7, 0.7]) {
    b.box(0.47, 0.27, 0.5, 'glass', x, 2.04, -0.23);
    b.box(0.5, 0.05, 0.53, 'white', x, 2.2, -0.23);
  }
  b.cylinder(0.29, 0.32, 0.055, 'stone', 0, 0.15, 1.1, 20);
  b.cylinder(0.24, 0.24, 0.04, 'blue', 0, 0.19, 1.1, 20);
  b.cylinder(0.045, 0.08, 0.22, 'white', 0, 0.28, 1.1, 12);
  b.ball(0.075, 'glass', 0, 0.41, 1.1);
  b.tree(-1.24, 1.02, 0.67);
  b.tree(1.24, 1.02, 0.67);
  b.bush(-0.7, 1.12, 0.15, 'pink');
  b.bush(0.7, 1.12, 0.15, 'gold');
}

/** Fresh, independently disposable group; no external textures or network required. */
export function createBuilding(type: BuildingType): THREE.Group {
  const b = new ModelBuilder();
  const builders: Record<BuildingType, (builder: ModelBuilder) => void> = {
    chale: createChale, vila: createVila, prefeitura: createPrefeitura, edificio: createEdificio, metropole: createMetropole,
  };
  if (!builders[type]) throw new Error(`Unknown building type: ${String(type)}`);
  builders[type](b);
  return b.finish(type);
}

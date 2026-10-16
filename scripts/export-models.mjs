import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateRawSync } from 'node:zlib';
import { strict as assert } from 'node:assert';
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { createBuilding, BUILDING_MODELS } from '../lib/building-models.ts';

// GLTFExporter only needs FileReader to turn its generated Blob into ArrayBuffer/data URL.
globalThis.FileReader ??= class {
  result = null;
  onloadend = null;
  onerror = null;
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then(result => { this.result = result; this.onloadend?.(); }).catch(error => this.onerror?.(error));
  }
  readAsDataURL(blob) {
    blob.arrayBuffer().then(result => { this.result = `data:${blob.type};base64,${Buffer.from(result).toString('base64')}`; this.onloadend?.(); }).catch(error => this.onerror?.(error));
  }
};

const output = fileURLToPath(new URL('../public/models/', import.meta.url));
await fs.mkdir(output, { recursive: true });
const exporter = new GLTFExporter();
const exported = [];
const manifest = { format: 'glTF 2.0 binary', author: 'ComenteMapa', license: 'Original project artwork; see LICENSE.txt', unit: 'metres-like', up: 'Y', front: '+Z', models: [] };

for (const model of BUILDING_MODELS) {
  const group = createBuilding(model.type);
  const bounds = new THREE.Box3().setFromObject(group);
  const size = bounds.getSize(new THREE.Vector3());
  assert(Math.abs(bounds.min.y) < 1e-6, `${model.type}: base must lie on y=0`);
  let vertices = 0, triangles = 0;
  group.traverse(object => {
    if (!object.isMesh) return;
    const positions = object.geometry.getAttribute('position');
    assert(positions && positions.count > 0, `${model.type}: missing geometry`);
    for (const value of positions.array) assert(Number.isFinite(value), `${model.type}: non-finite coordinate`);
    vertices += positions.count;
    triangles += object.geometry.index ? object.geometry.index.count / 3 : positions.count / 3;
  });
  const result = await exporter.parseAsync(group, { binary: true, onlyVisible: true });
  assert(result instanceof ArrayBuffer);
  const binary = Buffer.from(result);
  const gltf = validateGlb(binary, model.type);
  const filename = `${model.type}.glb`;
  await fs.writeFile(path.join(output, filename), binary);
  exported.push({ name: filename, buffer: binary });
  manifest.models.push({ ...model, file: filename, bytes: binary.length, dimensions: { width: +size.x.toFixed(4), height: +size.y.toFixed(4), depth: +size.z.toFixed(4) }, bounds: { min: bounds.min.toArray().map(n => +n.toFixed(5)), max: bounds.max.toArray().map(n => +n.toFixed(5)) }, meshes: gltf.meshes.length, materials: gltf.materials.length, vertices, triangles });
  console.log(`${filename}: ${gltf.meshes.length} meshes, ${triangles} triangles, ${binary.length} bytes, ${size.toArray().map(n => n.toFixed(2)).join(' × ')}`);
  group.traverse(object => { if (object.isMesh) { object.geometry.dispose(); object.material.dispose(); } });
}

const license = Buffer.from('ComenteMapa — modelos 3D originais\n\nOs cinco modelos foram criados proceduralmente para este projeto, sem assets pagos ou texturas externas.\nArquivos glTF 2.0 binários (.glb); eixo vertical Y, fachada +Z, base y=0.\nA autoria e os direitos destes assets acompanham o projeto ComenteMapa.\nNão são modelos copiados ou extraídos dos sites de referência.\n');
const manifestBytes = Buffer.from(JSON.stringify(manifest, null, 2) + '\n');
await fs.writeFile(path.join(output, 'manifest.json'), manifestBytes);
await fs.writeFile(path.join(output, 'LICENSE.txt'), license);
exported.push({ name: 'manifest.json', buffer: manifestBytes }, { name: 'LICENSE.txt', buffer: license });
const zip = createZip(exported);
await fs.writeFile(path.join(output, 'imoveis-3d.zip'), zip);
assert(zip.readUInt32LE(0) === 0x04034b50);
console.log(`Validated ${manifest.models.length} GLBs; imoveis-3d.zip: ${zip.length} bytes.`);

function validateGlb(binary, label) {
  assert(binary.length >= 28, `${label}: truncated header`);
  assert(binary.readUInt32LE(0) === 0x46546c67, `${label}: magic`);
  assert(binary.readUInt32LE(4) === 2, `${label}: glTF version`);
  assert(binary.readUInt32LE(8) === binary.length, `${label}: declared length`);
  let offset = 12, json, bin;
  while (offset < binary.length) {
    const length = binary.readUInt32LE(offset);
    const type = binary.readUInt32LE(offset + 4);
    assert(length % 4 === 0 && offset + 8 + length <= binary.length, `${label}: chunk bounds`);
    const data = binary.subarray(offset + 8, offset + 8 + length);
    if (type === 0x4e4f534a) json = JSON.parse(data.toString('utf8').trim());
    if (type === 0x004e4942) bin = data;
    offset += 8 + length;
  }
  assert.equal(offset, binary.length);
  assert(json?.asset?.version === '2.0' && json.meshes?.length > 0 && bin?.length > 0, `${label}: scene/buffer`);
  assert(json.buffers[0].byteLength <= bin.length, `${label}: binary buffer`);
  for (const view of json.bufferViews) assert((view.byteOffset ?? 0) + view.byteLength <= bin.length, `${label}: bufferView range`);
  for (const mesh of json.meshes) for (const primitive of mesh.primitives) {
    const accessor = json.accessors[primitive.attributes.POSITION];
    assert(accessor?.type === 'VEC3' && accessor.count > 0 && accessor.componentType === 5126, `${label}: positions accessor`);
    assert(accessor.min?.every(Number.isFinite) && accessor.max?.every(Number.isFinite), `${label}: valid bounds`);
    assert(primitive.material < json.materials.length, `${label}: material reference`);
  }
  return json;
}

// Small deterministic ZIP writer; no package dependency or platform-specific archive tool.
function createZip(files) {
  const records = [], directory = [];
  let offset = 0;
  for (const file of files) {
    const name = Buffer.from(file.name, 'utf8');
    const compressed = deflateRawSync(file.buffer, { level: 9 });
    const checksum = crc32(file.buffer);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x800, 6); local.writeUInt16LE(8, 8);
    local.writeUInt16LE(0x21, 12); local.writeUInt32LE(checksum, 14); local.writeUInt32LE(compressed.length, 18); local.writeUInt32LE(file.buffer.length, 22); local.writeUInt16LE(name.length, 26);
    records.push(local, name, compressed);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(0x800, 8); central.writeUInt16LE(8, 10);
    central.writeUInt16LE(0x21, 14); central.writeUInt32LE(checksum, 16); central.writeUInt32LE(compressed.length, 20); central.writeUInt32LE(file.buffer.length, 24); central.writeUInt16LE(name.length, 28); central.writeUInt32LE(offset, 42);
    directory.push(central, name);
    offset += local.length + name.length + compressed.length;
  }
  const centralBuffer = Buffer.concat(directory);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(centralBuffer.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...records, centralBuffer, end]);
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

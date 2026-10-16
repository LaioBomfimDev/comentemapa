import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import fs from 'node:fs/promises';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createBuilding, BUILDING_MODELS } from '../lib/building-models.ts';

const output = new URL('../public/models/', import.meta.url);
const manifest = JSON.parse(await fs.readFile(new URL('manifest.json', output), 'utf8'));
const loader = new GLTFLoader();

for (const model of BUILDING_MODELS) {
  test(`${model.type}: exported GLB loads with finite 3D geometry at ground level`, async () => {
    const bytes = await fs.readFile(new URL(`${model.type}.glb`, output));
    assert.equal(bytes.readUInt32LE(0), 0x46546c67, 'glTF binary signature');
    assert.equal(bytes.readUInt32LE(4), 2, 'glTF version 2');
    assert.equal(bytes.readUInt32LE(8), bytes.length, 'complete binary');
    const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    const gltf = await loader.parseAsync(arrayBuffer, '');
    const bounds = new THREE.Box3().setFromObject(gltf.scene);
    const size = bounds.getSize(new THREE.Vector3());
    const entry = manifest.models.find(entry => entry.type === model.type);
    assert(Math.abs(bounds.min.y) < 1e-6, 'base y=0');
    assert(Math.abs(size.x - entry.dimensions.width) < 1e-4);
    assert(Math.abs(size.y - entry.dimensions.height) < 1e-4);
    assert(Math.abs(size.z - entry.dimensions.depth) < 1e-4);
    assert(size.x > 2 && size.y > 1 && size.z > 2, 'non-flat volume');
    let meshes = 0;
    gltf.scene.traverse(object => {
      if (!object.isMesh) return;
      meshes++;
      assert(object.material.isMeshStandardMaterial);
      const positions = object.geometry.getAttribute('position');
      const normals = object.geometry.getAttribute('normal');
      assert(positions.count > 0 && normals.count === positions.count);
      for (const value of positions.array) assert(Number.isFinite(value));
      for (const value of normals.array) assert(Number.isFinite(value));
      object.geometry.dispose();
      object.material.dispose();
    });
    assert.equal(meshes, entry.meshes);
    assert(meshes <= 20, 'material batching caps draw calls');
  });
}

test('catalogue has five progressively taller models and each call owns its resources', () => {
  assert.equal(new Set(BUILDING_MODELS.map(model => model.type)).size, 5);
  let previousHeight = 0;
  for (const model of BUILDING_MODELS) {
    const first = createBuilding(model.type), second = createBuilding(model.type);
    const height = new THREE.Box3().setFromObject(first).getSize(new THREE.Vector3()).y;
    assert(height > previousHeight, `${model.type}: progressive height`);
    previousHeight = height;
    assert.notEqual(first.children[0].geometry, second.children[0].geometry);
    assert.notEqual(first.children[0].material, second.children[0].material);
    for (const group of [first, second]) group.traverse(object => {
      if (object.isMesh) { object.geometry.dispose(); object.material.dispose(); }
    });
  }
});

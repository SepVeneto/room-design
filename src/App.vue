<template>
  <div
    id="container"
    ref="threeDomRef"
  />
</template>

<script setup lang="ts">
import * as THREE from 'three';
// @ts-expect-error: no type
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { onMounted, ref } from 'vue';

const threeDomRef = ref();

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);

const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

camera.position.z = 5;
const controls = new OrbitControls(camera, renderer.domElement);

onMounted(() => {
  threeDomRef.value.appendChild(renderer.domElement);
});

function animate () {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();
</script>

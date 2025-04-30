<template>
  <div
    id="container"
    ref="threeDomRef"
  />
</template>

<script setup lang="ts">
import * as THREE from 'three'
// // @ts-expect-error: no type
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { onMounted, ref, shallowRef } from 'vue'
// import Floor from './Body/Floor'

const threeDomRef = ref()
const camera = shallowRef<THREE.PerspectiveCamera>()
let scene: THREE.Scene
let renderer: THREE.WebGLRenderer

let controls: any
onMounted(() => {
  init()

  controls = new OrbitControls(camera.value!, renderer.domElement)
  run()
})
function run() {
  controls.update()
  render()
  window.requestAnimationFrame(run)
}
function initRenderer() {
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(window.innerWidth, window.innerHeight)
  threeDomRef.value.appendChild(renderer.domElement)
}

function initScene() {
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x000)
}
function initCamera() {
  camera.value = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    1,
    10000,
  )
  camera.value.position.set(500, 800, 1300)
  camera.value.lookAt(0, 0, 0)
}
function initLighting() {
  const ambientLight = new THREE.AmbientLight(0x606060)
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xffffff)
  directionalLight.position.set(1, 0.75, 0.5).normalize()
  scene.add(directionalLight)
}

function init() {
  initScene()
  initCamera()
  initLighting()
  // initRollOverBox()
  // initGridHelper()
  initAxesHelper()

  setFloor()

  initRenderer()
  // eventListen()
}

function initAxesHelper() {
  const axesHelper = new THREE.AxesHelper(5)
  axesHelper.position.set(0, 0, 0)
  scene.add(axesHelper)
}
function render() {
  renderer.render(scene, camera.value!)
}
function setFloor() {
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 })
  const geometry = new THREE.PlaneGeometry(1000, 1000, 10, 10)
  // const geometry = new THREE.BufferGeometry()
  // geometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3))
  scene.add(new THREE.LineSegments(new THREE.WireframeGeometry(geometry), lineMaterial))
  const plane = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({
    color: 0x156289,
    emissive: 0x072534,
    side: THREE.DoubleSide,
    flatShading: true,
  }))
  scene.add(plane)
  scene.rotateX(-Math.PI / 2)
  // objects.push(plane)
}
</script>

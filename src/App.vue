<template>
  <div
    id="container"
    ref="threeDomRef"
  />
</template>

<script setup lang="ts">
import * as THREE from 'three'
// @ts-expect-error: no type
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { onMounted, ref, shallowRef } from 'vue'
import { computeHeightField, generateKs } from './utils'
// import Floor from './Body/Floor'

const ks = generateKs()

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
const RESOLUTION = 1000

function render() {
  computeHeightField(ks, performance.now() * 0.001, RESOLUTION, 64, initial, ocean.geometry as THREE.PlaneGeometry)
  ;(ocean.geometry as THREE.PlaneGeometry).attributes.position.needsUpdate = true
  ocean.geometry.computeVertexNormals()

  // for (let i = 0; i < frameHeight.length; i++) {
  //   const height = frameHeight[i]
  //   ;(positions as THREE.BufferAttribute).setY(i, height * 50)
  // }

  // positions.needsUpdate = true

  renderer.render(scene, camera.value!)
}
let ocean: THREE.Mesh
let initial: Float32Array
function setFloor() {
  // const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 })
  const geometry = new THREE.PlaneGeometry(RESOLUTION * 7, RESOLUTION * 7, 63, 63)
  geometry.rotateX(-Math.PI / 2)
  // const geometry = new THREE.BufferGeometry()
  // geometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3))
  // scene.add(new THREE.LineSegments(new THREE.WireframeGeometry(geometry), lineMaterial))
  ocean = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({
    color: 0x1e90ff,
    flatShading: false,
    specular: 0x111111,
    wireframe: false,
    shininess: 80,
    opacity: 0.9,
    transparent: true,
  }))
  initial = new Float32Array((ocean.geometry as THREE.PlaneGeometry).attributes.position.array)
  scene.add(ocean)
  // scene.rotateX(-Math.PI / 2)
  // objects.push(plane)
}
</script>

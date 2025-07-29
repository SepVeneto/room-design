<template>
  <div
    id="container"
    ref="threeDomRef"
  />
</template>

<script setup lang="ts">
import * as THREE from 'three/webgpu'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { onMounted, ref, shallowRef } from 'vue'
// import { generateKs } from './utils'
import { createGeometry, JONSWAPAlpha, JONSWAPPeakAngularFrequency, spectrumShader, vertexShader } from './Materials/Floor'
import { attribute, cameraProjectionMatrix, cameraViewMatrix, color, globalId, modelWorldMatrix, positionLocal, texture, textureStore } from 'three/tsl'
import { Ocean } from './sharders/Ocean'
// import Floor from './Body/Floor'

// const ks = generateKs()

const threeDomRef = ref()
const camera = shallowRef<THREE.PerspectiveCamera>()
let scene: THREE.Scene
let renderer: THREE.WebGPURenderer

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
  renderer = new THREE.WebGPURenderer({ antialias: true })
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(window.innerWidth, window.innerHeight)
  threeDomRef.value.appendChild(renderer.domElement)

  // renderer.computeAsync(computeSpectrum)
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
  camera.value.position.set(5, 8, 13)
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

  initRenderer()

  setFloor()

  // eventListen()
}

function initAxesHelper() {
  const axesHelper = new THREE.AxesHelper(5)
  axesHelper.position.set(0, 0, 0)
  scene.add(axesHelper)
}
const RESOLUTION = 16

function render() {
  // computeHeightField(ks, performance.now() * 0.001, RESOLUTION, 64, initial, ocean.geometry)
  // (ocean.geometry as THREE.PlaneGeometry).attributes.position.needsUpdate = true
  // ocean.geometry.computeVertexNormals()

  // for (let i = 0; i < frameHeight.length; i++) {
  //   const height = frameHeight[i]
  //   ;(positions as THREE.BufferAttribute).setY(i, height * 50)
  // }

  // positions.needsUpdate = true

  renderer.renderAsync(scene, camera.value!)
}

const spectrumTexture = new THREE.StorageTexture(16, 16)
spectrumTexture.type = THREE.FloatType

// let ocean: THREE.Mesh
let computeSpectrum: THREE.ComputeNode
// let initial: Float32Array
function setFloor() {
  const ocean = new Ocean(renderer)
  ocean.init()
  // const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 })
  const geometry = new THREE.PlaneGeometry(RESOLUTION, RESOLUTION, 32, 32)
  geometry.rotateX(-Math.PI / 2)
  // const geometry = new THREE.BufferGeometry()
  // geometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3))
  // scene.add(new THREE.LineSegments(new THREE.WireframeGeometry(geometry), lineMaterial))

  // const computeM = createGeometry()
  // const spectrum = new THREE.MeshBasicNodeMaterial()
  // spectrum.vertexNode = spectrumShader({
  //   storage: spectrumTexture,
  // })
  computeSpectrum = spectrumShader({
    globalId,
    spectrum: textureStore(spectrumTexture),
    alpha: JONSWAPAlpha(),
    peak_frequency: JONSWAPPeakAngularFrequency(),
    tile_length: 50,
  }).compute(1, [16, 16, 1])

  const _material = new THREE.MeshStandardNodeMaterial({
    colorNode: color(0xff0000),
    positionNode: positionLocal.add(texture(spectrumTexture).xyz),
    wireframe: true,
  })

  // const material = new THREE.MeshPhongMaterial({
  //   color: 0x1e90ff,
  //   flatShading: false,
  //   specular: 0x111111,
  //   wireframe: true,
  //   shininess: 80,
  //   opacity: 0.9,
  //   transparent: true,
  // })
  // material.vertexNode = vertexShader({
  //   projectionMatrix: cameraProjectionMatrix,
  //   cameraViewMatrix,
  //   modelWorldMatrix,
  //   position: attribute('position'),
  // })
  // ocean = new THREE.Mesh(geometry, _material)
  // ocean = new THREE.Mesh(geometry, computeM)
  // initial =new Float32Array((ocean.geometry as THREE.PlaneGeometry).attributes.position.array)
  // scene.add(ocean)
  // scene.rotateX(-Math.PI / 2)
  // objects.push(plane)
}
</script>

<template>
  <div
    id="container"
    ref="threeDomRef"
  />
</template>

<script setup lang="ts">
import * as THREE from 'three'
import { Material, Object3D } from 'three';
// // @ts-expect-error: no type
// import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { onMounted, ref, shallowRef } from 'vue'
// import Floor from './Body/Floor'


const threeDomRef = ref()
const camera = shallowRef<THREE.PerspectiveCamera>()
let scene: THREE.Scene
let raycaster = new THREE.Raycaster()
let pointer = new THREE.Vector2()
let rollOverMesh: THREE.Mesh
let objects: Object3D[] = []
let renderer: THREE.WebGLRenderer
let isShift: Boolean

onMounted(() => {
  init()
  render()
})
function initRenderer() {
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(window.innerWidth, window.innerHeight)
  threeDomRef.value.appendChild(renderer.domElement)
}
function initRollOverBox() {
  const rollOverGo = new THREE.BoxGeometry(50, 50, 50)
  const rollOverMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, opacity: 0.5, transparent: true })
  rollOverMesh = new THREE.Mesh(rollOverGo, rollOverMaterial)
  rollOverMesh.name = 'rolloverBox'
  scene.add(rollOverMesh)
}

function initScene() {
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0xf0f0f0)
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

function init() {
  initScene()
  initCamera()
  initRollOverBox()
  initGridHelper()
  initAxesHelper()

  setFloor()

  initRenderer()
  eventListen()
}
function initGridHelper() {
  const helper = new THREE.GridHelper(1000, 20)
  // helper.position.y = -199
  // const material = helper.material as Material
  // material.opacity = 0.25
  // material.transparent = true
  scene.add(helper)
}
function initAxesHelper() {
  const axesHelper = new THREE.AxesHelper(5)
  axesHelper.position.set(0, 0, 0)
  scene.add(axesHelper)
}

function eventListen() {
  document.addEventListener('pointermove', onPointerMove)
  document.addEventListener('pointerdown', onPointerDown)
  document.addEventListener('keydown', onKeydown)
  document.addEventListener('keyup', onKeyup)
}
function onPointerMove(event: PointerEvent) {
  const x = (event.clientX / window.innerWidth) * 2 - 1
  const y = -(event.clientY / window.innerHeight) * 2 + 1
  pointer.set(x, y)
  raycaster.setFromCamera(pointer, camera.value!)

  const intersects = raycaster.intersectObjects(objects, false)
  if (intersects.length > 0) {
    const intersect = intersects[0]
    console.log(intersect.object.name)
    if (intersect.object.name === 'rolloverBox') {
      return;
    } else {
      const mesh = rollOverMesh.clone()
      mesh.name = 'rolloverBox'
      scene.add(mesh)
    }
    rollOverMesh.position.copy(intersect.point).add(intersect.face!.normal)
    rollOverMesh.position.divideScalar(50).floor().multiplyScalar(50).addScalar(25)


    render()
  }
}
function onPointerDown(event: PointerEvent) {
  const x = (event.clientX / window.innerWidth) * 2 - 1
  const y = -(event.clientY / window.innerHeight) * 2 + 1
  pointer.set(x, y)
  raycaster.setFromCamera(pointer, camera.value!)

  const intersects = raycaster.intersectObjects(objects, false)
  if (intersects.length > 0) {
    const intersect = intersects[0]
    console.log(intersect)
  }
}

function render() {
  renderer.render(scene, camera.value!)
}
function setFloor() {
  const geometry = new THREE.PlaneGeometry(1000, 1000)
  geometry.rotateX(-Math.PI / 2)
  const plane = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ visible: false }))
  scene.add(plane)
  objects.push(plane)
}
function onKeydown(event: KeyboardEvent) {
  if (event.shiftKey) {
    isShift = true
  }
}
function onKeyup(event: KeyboardEvent) {
  if (event.shiftKey) {
    isShift = false
  }
}
</script>

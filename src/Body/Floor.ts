import * as THREE from 'three'
import FloorMaterial from '@/Materials/Floor'

export default class Floor {
  public container = new THREE.Object3D()
  public geometry = new THREE.PlaneGeometry(2, 2, 10, 10)
  public material = FloorMaterial()
  public backgroundTexture?: THREE.Texture
  public mesh?: THREE.Mesh
  constructor() {
    this.container.matrixAutoUpdate = false

    this.updateMaterial()

    this.mesh = new THREE.Mesh(this.geometry, this.material)
    this.mesh.frustumCulled = false
    this.mesh.matrixAutoUpdate = false
    this.mesh.updateMatrix()
    this.container.add(this.mesh)
  }

  updateMaterial() {
    const topLeft = new THREE.Color('#f5883c')
    const topRight = new THREE.Color('#ff9043')
    const bottomRight = new THREE.Color('#fccf92')
    const bottomLeft = new THREE.Color('#f5aa58')

    const data = new Uint8Array([
      Math.round(bottomLeft.r * 255),
      Math.round(bottomLeft.g * 255),
      Math.round(bottomLeft.b * 255),
      255,
      Math.round(bottomRight.r * 255),
      Math.round(bottomRight.g * 255),
      Math.round(bottomRight.b * 255),
      255,
      Math.round(topLeft.r * 255),
      Math.round(topLeft.g * 255),
      Math.round(topLeft.b * 255),
      255,
      Math.round(topRight.r * 255),
      Math.round(topRight.g * 255),
      Math.round(topRight.b * 255),
      255,
    ])

    this.backgroundTexture = new THREE.DataTexture(data, 2, 2, THREE.RGBAFormat)
    this.backgroundTexture.magFilter = THREE.LinearFilter
    this.backgroundTexture.needsUpdate = true

    this.material.uniforms.tBackground.value = this.backgroundTexture
  }
}

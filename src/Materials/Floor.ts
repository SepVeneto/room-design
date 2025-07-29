import * as THREE from 'three'

import shaderFragment from '@/sharders/floor/fragment.glsl'
import shaderVertex from '@/sharders/floor/vertex.glsl'
import computeShader from '@/sharders/spectrumCompute.wgsl'
import { wgslFn } from 'three/tsl'
import { StorageTexture } from 'three/webgpu'

export default function () {
  const uniforms = {
    tBackground: { value: null },
  }

  const material = new THREE.ShaderMaterial({
    wireframe: false,
    transparent: false,
    uniforms,
    vertexShader: shaderVertex,
    fragmentShader: shaderFragment,
  })

  return material
}

const G = 9.81
// 距海平面10米高的风速，离背风岸的距离
export function JONSWAPAlpha(windSpeed = 20, fetchLength = 550e3) {
  return 0.076 * Math.pow(windSpeed ** 2 / (fetchLength * G), 0.22)
}

export function JONSWAPPeakAngularFrequency(windSpeed = 20, fetchLength = 550e3) {
  return 22 * Math.pow(G * G / (windSpeed * fetchLength), 1 / 3)
}

const MAP_SIZE = 16
export function createGeometry() {
  const computeMaterial = new THREE.ShaderMaterial({
    uniforms: {
      imageSize: { value: new THREE.Vector2(MAP_SIZE, MAP_SIZE) },
      spectrum: { value: null },
      pushConstants: {
        value: {
          alpha: JONSWAPAlpha(),
          omega: JONSWAPPeakAngularFrequency(),
          tileLength: 50,
        },
      },
    },
    fragmentShader: computeShader,
  })
  return computeMaterial
}
export const spectrumShader = wgslFn(computeShader)
export const spectrumModulateShader = wgslFn()

export const vertexShader = wgslFn(`
  fn main_vertex (
    projectionMatrix: mat4x4<f32>,
    cameraViewMatrix: mat4x4<f32>,
    modelWorldMatrix: mat4x4<f32>,
    position: vec3<f32>,
  ) -> vec4<f32> {
    var outPosition = projectionMatrix * cameraViewMatrix * modelWorldMatrix * vec4(position, 1);
    return outPosition;
  }
`)

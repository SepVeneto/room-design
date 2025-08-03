// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable accessor-pairs */
import type { Float32BufferAttribute } from 'three'

const V = 4.0
const g = 9.81
const L = (V ** 2) / g
const A = 0.1
const numK = 30
const numTheta = 18
const l = 0.004 * L

type KS = { kx: number, kz: number, ampltiude: number, phase: number, omega: number, kmag: number, stepness: number }

export function generateKs() {
  const k_min = 0.1
  const k_max = 2.0
  const ks: KS[] = []

  for (let ki = 0; ki < numK; ki++) {
    const k_mag = k_min + (k_max - k_min) * (ki / (numK - 1))
    for (let ti = 0; ti < numTheta; ++ti) {
      const theta = (-80 + (160 * ti) / (numTheta - 1)) * (Math.PI / 180)
      const kx = k_mag * Math.cos(theta)
      const kz = k_mag * Math.sin(theta)

      if (kx <= 0) continue

      const kmag = Math.sqrt(kx ** 2 + kz ** 2)
      const phillips = Math.exp(-1 / (kmag * L) ** 2) *
                       Math.exp(-((kmag * l) ** 2)) /
                       (kmag ** 4) *
                       (kx / kmag) ** 2
      // const phillips = Math.exp(-1 / (kmag * L) ** 2) / (kmag ** 4) * (kx / kmag) ** 2;

      if (phillips < 1e-6) continue

      const ampltiude = A * Math.sqrt(phillips)
      const phase = Math.random() * 2 * Math.PI
      const omega = Math.sqrt(g * kmag)
      const maxStepness = 1.0 / (kmag * ampltiude * numK * numTheta)

      ks.push({ kx, kz, ampltiude, phase, omega, kmag, stepness: 0.5 * Math.min(maxStepness, 1.0) })
    }
  }

  return ks
}

export function computeHeightField(ks: KS[], time: number, size: number, resolution: number, initial: Float32Array, geometry: THREE.PlaneGeometry) {
  const pos = geometry.attributes.position as Float32BufferAttribute

  for (let i = 0; i < resolution; ++i) {
    for (let j = 0; j < resolution; ++j) {
      const idx = (i * resolution + j) * 3
      const x0 = initial[idx]
      const z0 = initial[idx + 2]

      let x = x0
      let y = 0
      let z = z0

      for (const k of ks) {
        const arg = k.kx * x + k.kz * z + k.phase + k.omega * time

        const sinPhase = Math.sin(arg)
        const cosPhase = Math.cos(arg)

        y += k.ampltiude * cosPhase
        x -= k.stepness * (k.kx / k.kmag) * k.ampltiude * sinPhase
        z -= k.stepness * (k.kz / k.kmag) * k.ampltiude * sinPhase
        // h += k.ampltiude * Math.sin(arg)
      }

      // heights[i * resolution + j] = h
      // pos[idx] = x
      // pos[idx + 1] = y * 30
      // pos[idx + 2] = z
      pos.setX(idx / 3, x)
      pos.setY(idx / 3, y * 30)
      pos.setZ(idx / 3, z)
    }
  }
  return pos
}

export class PushConstants {
  static size = 64
  buffer: ArrayBuffer
  view: DataView
  constructor() {
    this.buffer = new ArrayBuffer(PushConstants.size)
    this.view = new DataView(this.buffer)
  }

  set seed(val: number[]) {
    this.view.setInt32(0, val[0], true)
    this.view.setInt32(4, val[1], true)
  }

  set tile_length(val: number[]) {
    this.view.setFloat32(8, val[0], true)
    this.view.setFloat32(12, val[0], true)
  }

  set depth(val: number) {
    this.view.setFloat32(16, val, true)
  }

  set alpha(val: number) {
    this.view.setFloat32(20, val, true)
  }

  set peak_frequency(val: number) {
    this.view.setFloat32(24, val, true)
  }

  set wind_speed(val: number) {
    this.view.setFloat32(28, val, true)
  }

  set cascade_index(val: number) {
    this.view.setFloat32(32, val, true)
  }
}

const V = 10
const g = 9.81
const L = (V ** 2) / g
const A = 0.0005
const numK = 30
const numTheta = 18
const l = 0.001 * L

type KS = { kx: number, kz: number, ampltiude: number, phase: number, omega: number }

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
      const phillips = A * Math.exp(-1 / (kmag * L) ** 2) *
                       Math.exp(-((kmag * l) ** 2)) /
                       (kmag ** 4) *
                       (kx / kmag) ** 2

      if (phillips < 1e-6) continue

      const ampltiude = Math.sqrt(phillips)
      const phase = Math.random() * 2 * Math.PI
      const omega = Math.sqrt(g * kmag)

      ks.push({ kx, kz, ampltiude, phase, omega })
    }
  }

  return ks
}

export function computeHeightField(ks: KS[], time: number, size: number, resolution: number) {
  const heights = new Float32Array(resolution ** 2)
  const halfSize = size / 2

  for (let i = 0; i < resolution; ++i) {
    for (let j = 0; j < resolution; ++j) {
      const x = (i / resolution) * size - halfSize
      const z = (j / resolution) * size - halfSize
      let h = 0

      for (const k of ks) {
        const arg = k.kx * x + k.kz * z + k.phase + k.omega * time
        h += k.ampltiude * Math.sin(arg)
      }

      heights[i * resolution + j] = h
    }
  }
  return heights
}

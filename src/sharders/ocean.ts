import { JONSWAPAlpha, JONSWAPPeakAngularFrequency, spectrumShader } from '@/Materials/Floor'
import { globalId, textureStore } from 'three/tsl'
import * as THREE from 'three/webgpu'

const MAP_SIZE = 16

export class Ocean {
  renderer: THREE.WebGPURenderer
  spectrum = new THREE.StorageTexture(MAP_SIZE, MAP_SIZE)
  spectrumModulate = new THREE.StorageTexture(MAP_SIZE, MAP_SIZE)
  constructor(renderer: THREE.WebGPURenderer) {
    this.renderer = renderer
    this.spectrum.type = THREE.FloatType
    this.spectrumModulate.type = THREE.FloatType
  }

  genSpectrumCompile() {
    return spectrumShader({
      globalId,
      spectrum: textureStore(this.spectrum),
      alpha: JONSWAPAlpha(),
      peak_frequency: JONSWAPPeakAngularFrequency(),
      tile_length: 50,
    }).compute(1) // TODO: count的意义是什么
  }

  genSpectrumModulateCompile() {
    return spectrumShader({

    })
  }

  init() {
    // this.renderer.compileAsync()
  }
}

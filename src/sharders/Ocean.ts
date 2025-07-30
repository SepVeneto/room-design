import { JONSWAPAlpha, JONSWAPPeakAngularFrequency } from '@/Materials/Floor'
import { globalId, numWorkgroups, storage, struct, texture, textureStore, uniform, vec3, vec4, wgslFn } from 'three/tsl'
import * as THREE from 'three/webgpu'
import spectrumCompute from './spectrumCompute.wgsl'
import spectrumModulate from './spectrumModulate.wgsl'
import fftButterfly from './fftButterfly.wgsl'

const spectrumComputeShader = wgslFn(spectrumCompute)
const spectrumModulateShader = wgslFn(spectrumModulate)
const butterflyShader = wgslFn(fftButterfly)

const MAP_SIZE = 16
const NUM_FFT_STAGE = Math.log(MAP_SIZE) / Math.log(2)

export class Ocean {
  renderer: THREE.WebGPURenderer
  spectrum = new THREE.StorageTexture(MAP_SIZE, MAP_SIZE)
  spectrumModulate = new THREE.StorageTexture(MAP_SIZE, MAP_SIZE)
  butterfly = new THREE.IndirectStorageBufferAttribute(new Float32Array(NUM_FFT_STAGE * MAP_SIZE * 4 * 4), 4)
  fftCompute = new THREE.IndirectStorageBufferAttribute(new Float32Array(MAP_SIZE * MAP_SIZE * 4 * 2 * 2), 4)
  spectrumComputeCompile: THREE.ComputeNode
  spectrumModulateCompile: THREE.ComputeNode
  butterflyCompile: THREE.ComputeNode
  constructor(renderer: THREE.WebGPURenderer) {
    this.renderer = renderer
    this.spectrum.type = THREE.FloatType
    this.spectrumModulate.type = THREE.FloatType

    this.spectrumComputeCompile = this.genSpectrumCompile()
    this.spectrumModulateCompile = this.genSpectrumModulateCompile()
    this.butterflyCompile = this.genButterflyCompile()
  }

  genButterflyCompile() {
    const butterflyStruct = struct({
      values: 'vec4<f32>',
    }, 'ButterflyData')
    return butterflyShader({
      numWorkGroups: numWorkgroups,
      workGroupSize: vec3(64, 1, 1),
      globalId,
      butterfly: storage(this.butterfly, butterflyStruct, this.butterfly.count),
    }).compute(1)
  }

  genSpectrumCompile() {
    return spectrumComputeShader({
      globalId,
      spectrum: textureStore(this.spectrum),
      alpha: JONSWAPAlpha(),
      peak_frequency: JONSWAPPeakAngularFrequency(),
      tile_length: 50,
    }).compute(1) // TODO: count的意义是什么, 另一个是workgroupsize
  }

  genSpectrumModulateCompile() {
    return spectrumModulateShader({
      fft: textureStore(this.spectrumModulate),
      numWorkGroups: numWorkgroups,
      workGroupSize: vec3(16, 16, 1),
      globalId,
      tile_length: 50,
      spectrum: texture(this.spectrum),
      time: Date.now(),
    }).compute(1)
  }

  init() {
    this.renderer.computeAsync(this.spectrumComputeCompile)
    this.renderer.computeAsync(this.butterflyCompile)
    console.log(this.butterfly)
  }

  update() {
    this.renderer.computeAsync(this.spectrumModulateCompile)
  }
}

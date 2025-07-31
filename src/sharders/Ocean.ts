import { JONSWAPAlpha, JONSWAPPeakAngularFrequency } from '@/Materials/Floor'
import { globalId, localId, numWorkgroups, storage, struct, texture, textureLoad, textureStore, vec3, wgslFn, workgroupId } from 'three/tsl'
import * as THREE from 'three/webgpu'
import spectrumCompute from './spectrumCompute.wgsl'
import spectrumModulate from './spectrumModulate.wgsl'
import fftButterfly from './fftButterfly.wgsl'
import fftCompute from './fftCompute.wgsl'
import transpose from './transpose.wgsl'
import fftUnpack from './fftUnpack.wgsl'

const butterflyStruct = struct({
  twiddle_factor: 'vec2<f32>',
  read_indices: 'vec2<f32>',
}, 'ButterflyData')
const fftBufferStruct = struct({
  values: 'vec2<f32>',
}, 'FFTBuffer')

const spectrumComputeShader = wgslFn(spectrumCompute)
const spectrumModulateShader = wgslFn(spectrumModulate)
const butterflyShader = wgslFn(fftButterfly)
const fftComputeShader = wgslFn(fftCompute)
const transposeShader = wgslFn(transpose)
const fftUnpackShader = wgslFn(fftUnpack)

const MAP_SIZE = 16
const NUM_FFT_STAGE = Math.log(MAP_SIZE) / Math.log(2)

export class Ocean {
  renderer: THREE.WebGPURenderer
  spectrum = new THREE.StorageTexture(MAP_SIZE, MAP_SIZE)
  butterfly = new THREE.IndirectStorageBufferAttribute(new Float32Array(NUM_FFT_STAGE * MAP_SIZE * 4 * 4), 4)
  fftBuffer = new THREE.IndirectStorageBufferAttribute(new Float32Array(MAP_SIZE * MAP_SIZE * 4 * 2 * 2), 4)
  displacementMap = new THREE.StorageTexture(MAP_SIZE, MAP_SIZE)
  normalMap = new THREE.StorageTexture(MAP_SIZE, MAP_SIZE)

  spectrumComputeCompile: THREE.ComputeNode
  spectrumModulateCompile: THREE.ComputeNode
  butterflyCompile: THREE.ComputeNode
  fftComputeCompile: THREE.ComputeNode
  transposeCompile: THREE.ComputeNode
  fftUnPackCompile: THREE.ComputeNode
  constructor(renderer: THREE.WebGPURenderer) {
    this.renderer = renderer
    this.spectrum.type = THREE.FloatType

    this.spectrumComputeCompile = this.genSpectrumCompile()
    this.spectrumModulateCompile = this.genSpectrumModulateCompile()
    this.butterflyCompile = this.genButterflyCompile()
    this.fftComputeCompile = this.genFFTComputeCompile()
    this.transposeCompile = this.genTransposeCompile()
    this.fftUnPackCompile = this.genFFTUpackCompile()
  }

  genFFTUpackCompile() {
    return fftUnpackShader({
      displace_map: textureStore(this.displacementMap),
      normal_map: textureStore(this.normalMap),
    }).compute(1)
  }

  genTransposeCompile() {
    return transposeShader({
      numWorkGroups: numWorkgroups,
      workGroupSize: vec3(64, 1, 1),
      workgroupId,
      globalId,
      localId,
      butterfly: storage(this.butterfly, butterflyStruct, this.butterfly.count),
      data: storage(this.fftBuffer, fftBufferStruct, this.fftBuffer.count),
    }).compute(1)
  }

  genFFTComputeCompile() {
    return fftComputeShader({
      numWorkGroups: numWorkgroups,
      workGroupSize: vec3(64, 1, 1),
      workgroupId,
      globalId,
      localId,
      butterfly: storage(this.butterfly, butterflyStruct, this.butterfly.count),
      data: storage(this.fftBuffer, fftBufferStruct, this.fftBuffer.count),
    }).compute(1)
  }

  genButterflyCompile() {
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
      fft: storage(this.fftBuffer, fftBufferStruct, this.fftBuffer.count),
      // butterfly: storage(this.butterfly, butterflyStruct, this.butterfly.count),
      numWorkGroups: numWorkgroups,
      workGroupSize: vec3(16, 16, 1),
      globalId,
      tile_length: 50,
      spectrum: textureLoad(this.spectrum),
      time: performance.now(),
    }).compute(1)
  }

  init() {
    this.renderer.computeAsync(this.spectrumComputeCompile)
    this.renderer.computeAsync(this.butterflyCompile)
  }

  async update() {
    await this.renderer.compute(this.spectrumModulateCompile)
    await this.renderer.compute(this.fftComputeCompile)
    await this.renderer.compute(this.transposeCompile)
    await this.renderer.compute(this.fftComputeCompile)
    await this.renderer.compute(this.fftUnPackCompile)
  }
}

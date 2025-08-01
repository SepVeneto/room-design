import { JONSWAPAlpha, JONSWAPPeakAngularFrequency } from '@/Materials/Floor'
import { attribute, cameraPosition, cameraProjectionMatrix, cameraViewMatrix, cameraWorldMatrix, color, globalId, localId, modelWorldMatrix, numWorkgroups, positionLocal, storage, struct, texture, textureLoad, textureStore, uv, vec3, wgslFn, workgroupId } from 'three/tsl'
import * as THREE from 'three/webgpu'
import spectrumCompute from './spectrumCompute.wgsl'
import spectrumModulate from './spectrumModulate.wgsl'
import fftButterfly from './fftButterfly.wgsl'
import fftCompute from './fftCompute.wgsl'
import transpose from './transpose.wgsl'
import fftUnpack from './fftUnpack.wgsl'
import writeTest from './write.wgsl'

const butterflyStruct = struct({
  twiddle_factor: 'vec2<f32>',
  read_indices: 'vec2<f32>',
}, 'ButterflyData')
const fftBufferStruct = struct({
  values: 'vec2<f32>',
}, 'FFTBuffer')

const writeTestShader = wgslFn(writeTest)
const spectrumComputeShader = wgslFn(spectrumCompute)
const spectrumModulateShader = wgslFn(spectrumModulate)
const butterflyShader = wgslFn(fftButterfly)
const fftComputeShader = wgslFn(fftCompute)
const transposeShader = wgslFn(transpose)
const fftUnpackShader = wgslFn(fftUnpack)

const MAP_SIZE = 16
const NUM_FFT_STAGE = Math.log(MAP_SIZE) / Math.log(2)

export class Ocean {
  ocean: THREE.MeshStandardNodeMaterial | null = null

  renderer: THREE.WebGPURenderer
  spectrum = new THREE.StorageTexture(MAP_SIZE, MAP_SIZE)
  butterfly = new THREE.IndirectStorageBufferAttribute(new Float32Array(NUM_FFT_STAGE * MAP_SIZE * 4 * 4), 4)
  fftBuffer = new THREE.IndirectStorageBufferAttribute(new Float32Array(MAP_SIZE * MAP_SIZE * 4 * 2 * 2), 4)
  displacementMap = new THREE.StorageTexture(MAP_SIZE, MAP_SIZE)
  normalMap = new THREE.StorageTexture(MAP_SIZE, MAP_SIZE)

  writeTestCompile: THREE.ComputeNode
  spectrumComputeCompile: THREE.ComputeNode
  spectrumModulateCompile: THREE.ComputeNode
  butterflyCompile: THREE.ComputeNode
  fftComputeCompile: THREE.ComputeNode
  transposeCompile: THREE.ComputeNode
  fftUnPackCompile: THREE.ComputeNode
  constructor(renderer: THREE.WebGPURenderer) {
    this.renderer = renderer
    this.spectrum.type = THREE.FloatType
    this.displacementMap.type = THREE.FloatType
    this.normalMap.type = THREE.FloatType

    this.spectrumComputeCompile = this.genSpectrumCompile()
    this.spectrumModulateCompile = this.genSpectrumModulateCompile()
    this.butterflyCompile = this.genButterflyCompile()
    this.fftComputeCompile = this.genFFTComputeCompile()
    this.transposeCompile = this.genTransposeCompile()
    this.fftUnPackCompile = this.genFFTUpackCompile()
    this.writeTestCompile = this.genWriteTestCompile()
  }

  genWriteTestCompile() {
    return writeTestShader({
      UV: uv(),
      source: textureLoad(this.spectrum),
      displacement_map: textureStore(this.displacementMap),
    }).compute(1)
  }

  genFFTUpackCompile() {
    return fftUnpackShader({
      displacement_map: textureStore(this.displacementMap),
      normal_map: textureStore(this.normalMap),
      data: storage(this.fftBuffer, fftBufferStruct, this.fftBuffer.count),
      numWorkGroups: numWorkgroups,
      workGroupSize: vec3(16, 16, 2),
      local_id: localId,
      globalId,
    }).compute(1)
  }

  genTransposeCompile() {
    return transposeShader({
      numWorkGroups: numWorkgroups,
      workGroupSize: vec3(64, 1, 1),
      workgroupId,
      globalId,
      local_id: localId,
      butterfly: storage(this.butterfly, butterflyStruct, this.butterfly.count),
      data: storage(this.fftBuffer, fftBufferStruct, this.fftBuffer.count),
    }).compute(1)
  }

  genFFTComputeCompile() {
    return fftComputeShader({
      numWorkGroups: numWorkgroups,
      workGroupSize: vec3(64, 1, 1),
      globalId,
      local_id: localId,
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
    // await this.renderer.compute(this.writeTestCompile)
    await this.renderer.compute(this.fftComputeCompile)
    await this.renderer.compute(this.transposeCompile)
    await this.renderer.compute(this.fftComputeCompile)
    await this.renderer.compute(this.fftUnPackCompile)
    console.log(this.displacementMap)
  }

  createOcean() {
    const vertexShader = wgslFn(`
      fn vertex(
        UV: vec2<u32>,
        projectionMatrix: mat4x4<f32>,
        cameraViewMatrix: mat4x4<f32>,
        modelWorldMatrix: mat4x4<f32>,
        position: vec3<f32>,
        cameraPosition: vec3<f32>,
        displacements: texture_2d<f32>,
      ) -> vec4<f32> {

      var pos = vec4<f32>(position, 1.0);
      let distance_factor = min(exp(-(length(pos.xz - cameraPosition.xz) - 150.0)*0.007), 1.0); // Displacement amonut falls off after 150m.

       var displacement = vec3<f32>(0);
       var coords = vec2<u32>(vec2<f32>(pos.xz) * vec2<f32>(textureDimensions(displacements)));
       displacement += (textureLoad(displacements, coords, 0).xyz);
      //  displacement += (outPosition.xyz);

      // pos.y += f32(coords.y);
      // pos.y += 1.0;
       var outPosition = projectionMatrix * cameraViewMatrix * modelWorldMatrix * pos;
        // outPosition.x += f32(coords.x);
        // outPosition.z += f32(coords.y);
        // vec4<f32>(displacement, 0.0) * distance_factor;
        outPosition += vec4<f32>(displacement, 0.0) * distance_factor;
       return outPosition;
      }
    `)

    const fragmentShader = wgslFn(`
      fn debug(
        workGroupSize: vec3<u32>,
        UV: vec2<f32>,
        fft: ptr<storage, array<FFTBuffer>, read_write>,
        // source: texture_2d<f32>,
      ) -> vec4<f32> {
        // let size = textureDimensions(source);
        // let color = textureLoad(source, vec2<u32>(UV * vec2<f32>(size)), 0);
        // if ((color.x + color.y) > 0) {
        //   return vec4<f32>(0.8, 1.0, 1.0, 1.0);
        // } else {
        //   return vec4<f32>(1.0, 0.5, 0.5, 1.0);
        // }
       }
      `)
    this.ocean = new THREE.MeshStandardNodeMaterial({
      colorNode: color(0x723456),
      fragmentNode: fragmentShader({
        globalId,
        numWorkGroups: numWorkgroups,
        workGroupSize: vec3(16, 16, 1),
        UV: uv(),
        // source: texture(this.displacementMap),
        // source: texture(this.normalMap),
        fft: storage(this.fftBuffer, fftBufferStruct, this.fftBuffer.count),
      // butterfly: storage(this.butterfly, butterflyStruct, this.butterfly.count),
      }),
      // vertexNode: vertexShader({
      //   UV: uv(),
      //   projectionMatrix: cameraProjectionMatrix,
      //   cameraViewMatrix,
      //   modelWorldMatrix,
      //   position: attribute('position'),
      //   cameraPosition,
      //   displacements: textureLoad(this.displacementMap),
      // }),
      wireframe: true,
    })
    this.ocean.needsUpdate = true
    return this.ocean
  }
}

import { JONSWAPAlpha, JONSWAPPeakAngularFrequency } from './Materials/Floor'
import spectrumCompute from './sharders/spectrumCompute.wgsl'
import butterflyFactorShader from './sharders/fftButterfly.wgsl'
import { PushConstants, PushConstants } from './utils'

const RESOLUTION = 128
const NUM_FFT_STAGE = Math.log(RESOLUTION) / Math.log(2)

export class Renderer {
  device: GPUDevice | null = null
  ctx: GPUCanvasContext | null
  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('webgpu')
  }

  async init() {
    if (!navigator.gpu) {
      throw Error('WebGPU not supported.')
    }

    const adapter = await navigator.gpu.requestAdapter()
    if (!adapter) {
      throw Error("Couldn't request WebGPU adapter.")
    }

    this.device = await adapter.requestDevice()
    Computer.device = this.device

    this.ctx?.configure({
      device: this.device,
      format: navigator.gpu.getPreferredCanvasFormat(),
      alphaMode: 'premultiplied',
    })
  }

  async compute() {
    const device = this.device!

    const spectrumComputer = new Computer(
      spectrumCompute,
      'main',
    )

    const pushConstants = new PushConstants()
    pushConstants.seed = [123, 123]
    pushConstants.tile_length = [50, 50]
    pushConstants.alpha = JONSWAPAlpha()
    pushConstants.cascade_index = 0
    pushConstants.peak_frequency = JONSWAPPeakAngularFrequency()
    pushConstants.depth = 20
    pushConstants.wind_speed = 20
    const uniformBuffer = device.createBuffer({
      label: 'Uniform Buffer',
      size: PushConstants.size,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    })
    new Uint8Array(uniformBuffer.getMappedRange()).set(new Uint8Array(pushConstants.buffer))
    uniformBuffer.unmap()
    const bindUniform = spectrumComputer
      .createBindGroup([uniformBuffer], 0, 'buffer')

    const spectrum = device.createTexture({
      label: 'Spectrum Texture',
      size: [RESOLUTION, RESOLUTION],
      format: 'rgba32float',
      usage: GPUTextureUsage.TEXTURE_BINDING |
             GPUTextureUsage.STORAGE_BINDING |
             GPUTextureUsage.COPY_DST |
             GPUTextureUsage.COPY_SRC,
    })
    const bindGroup = spectrumComputer.createBindGroup([spectrum], 1, 'texture')

    spectrumComputer.setBindGroup(0, bindUniform)
    spectrumComputer.setBindGroup(1, bindGroup)

    // fft butterfly
    const fftButterflyComputer = new Computer(
      butterflyFactorShader,
      'main',
      [device.createBindGroupLayout({
        entries: [{
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'storage' },
        }],
      })],
    )
    const butterflyFactor = device.createBuffer({
      label: 'Butterfly Factor',
      size: NUM_FFT_STAGE * RESOLUTION * 4 * 4, // sizeof(vec4<f32>)
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
      mappedAtCreation: false,
    })
    const bfGroup = fftButterflyComputer.createBindGroup([butterflyFactor], 0, 'buffer')
    fftButterflyComputer.setBindGroup(0, bfGroup)

    spectrumComputer.run([RESOLUTION / 16, RESOLUTION / 16, 1])
    fftButterflyComputer.run([RESOLUTION / 2 / 64, NUM_FFT_STAGE, 1])

    device.queue.submit([
      spectrumComputer.commandEncoder.finish(),
      fftButterflyComputer.commandEncoder.finish(),
    ])

    spectrumComputer.debug()
    fftButterflyComputer.debug()
    // debug()
  }

  draw() {
    if (!this.device) return

    const plane = this.createPlaneGeometry(1000, 1000, 32)

    const vertexBuffer = this.device.createBuffer({
      label: 'vertex buffer',
      size: plane.vertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    })
    this.device.queue.writeBuffer(vertexBuffer, 0, plane.vertices)

    const indexBuffer = this.device.createBuffer({
      label: 'index buffer',
      size: plane.indices.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    })
    this.device.queue.writeBuffer(indexBuffer, 0, plane.indices)

    // const pipeline = this.device.createRenderPipeline({
    //   label: 'plane pipeline',
    //   layout: 'auto',
    //   vertex: {
    //     module: this.device.createShaderModule({
    //       // code:
    //     }),
    //   },
    // })
  }

  createPlaneGeometry(width: number, height: number, segments: number) {
    const halfWidth = width / 2
    const halfHeight = height / 2

    const vertices = []
    const indices = []
    const colors = []

    const segmentWidth = width / segments
    const segmentHeight = height / segments

    for (let iy = 0; iy <= segments; ++iy) {
      const y = iy * segmentHeight - halfHeight
      for (let ix = 0; ix <= segments; ++ix) {
        const x = ix * segmentWidth - halfWidth

        vertices.push(x, 0, y)
        colors.push(0.3, 0.3, 0.3)
      }
    }

    for (let iy = 0; iy < segments; ++iy) {
      for (let ix = 0; ix < segments; ++ix) {
        const a = ix + (segments + 1) * iy
        const b = ix + (segments + 1) * (iy + 1)
        const c = (ix + 1) + (segments + 1) * (iy + 1)
        const d = (ix + 1) + (segments + 1) * iy

        indices.push(a, b, d)
        indices.push(b, c, d)
      }
    }

    const vertexData = new Float32Array(vertices.length + colors.length)
    // vertices每3个值表示一个顶点
    for (let i = 0; i < vertices.length / 3; ++i) {
      vertexData[i * 6] = vertices[i * 3]
      vertexData[i * 6 + 1] = vertices[i * 3 + 1]
      vertexData[i * 6 + 2] = vertices[i * 3 + 2]
      vertexData[i * 6 + 3] = colors[i * 3]
      vertexData[i * 6 + 4] = colors[i * 3 + 1]
      vertexData[i * 6 + 5] = colors[i * 3 + 2]
    }

    return {
      vertices: vertexData,
      indices: new Uint32Array(indices),
      vertexCount: vertices.length / 3,
      indexCount: indices.length,
    }
  }
}

// function createButterfactorPipeline(device: GPUDevice, bindGroup: GPUBindGroup[], bindGroupLayout: GPUBindGroupLayout[]) {
//   const computePipline = device.createComputePipeline({
//     layout: device.createPipelineLayout({ bindGroupLayouts: bindGroupLayout }),
//     compute: {
//       module: device.createShaderModule({ code: butterflyFactorShader }),
//       entryPoint: 'main',
//     },
//   })

//   const commandEncoder = device.createCommandEncoder()
//   const computePass = commandEncoder.beginComputePass()
//   computePass.setPipeline(computePipline)
//   bindGroup.forEach((item, index) => {
//     computePass.setBindGroup(index, item)
//   })

//   computePass.dispatchWorkgroups(RESOLUTION / 2 / 64, NUM_FFT_STAGE, 1)
//   computePass.end()

//   return commandEncoder
// }

// function debugBuffer(
//   device: GPUDevice,
//   size: number,
//   encoder: GPUCommandEncoder,
//   source: GPUBuffer,
// ) {
//   const buffer = device.createBuffer({
//     label: 'Debug Buffer',
//     size,
//     usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
//   })
//   encoder.copyBufferToBuffer(source, buffer, size)

//   return async () => {
//     await buffer.mapAsync(GPUMapMode.READ)
//     console.log(new Float32Array(buffer.getMappedRange()))
//   }
// }

class Computer {
  static device: GPUDevice
  commandEncoder: GPUCommandEncoder
  pipeline: GPUComputePipeline
  bindGroups: GPUBindGroup[] = []
  buffers: (GPUBuffer | GPUTexture)[] = []
  groupLayouts: GPUBindGroupLayout[]
  debugs: (() => void)[] = []
  constructor(
    code: string,
    entryPoint: string,
    bindGroupLayouts: GPUBindGroupLayout[] = [],
  ) {
    const device = Computer.device
    this.commandEncoder = device.createCommandEncoder()
    this.groupLayouts = bindGroupLayouts
    this.pipeline = device.createComputePipeline({
      layout: bindGroupLayouts.length === 0 ? 'auto' : device.createPipelineLayout({ bindGroupLayouts }),
      compute: {
        module: device.createShaderModule({ code }),
        entryPoint,
      },
    })
  }

  createBindGroup(buffers: (GPUBuffer | GPUTexture)[], group: number, type: 'texture' | 'buffer') {
    const device = Computer.device
    this.buffers = buffers
    const entries: GPUBindGroupEntry[] = []
    buffers.forEach((buffer, index) => {
      switch (type) {
        case 'texture':
          entries.push({
            binding: index, resource: (buffer as GPUTexture).createView(),
          })
          break
        case 'buffer':
          entries.push({
            binding: index, resource: { buffer: buffer as GPUBuffer },
          })
          break
      }
    })
    return device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(group),
      entries,
    })
  }

  setBindGroup(group: number, bindGroup: GPUBindGroup) {
    this.bindGroups[group] = bindGroup
  }

  run(workgroup: number[]) {
    const computePass = this.commandEncoder.beginComputePass()
    computePass.setPipeline(this.pipeline)
    this.bindGroups.forEach((item, index) => {
      computePass.setBindGroup(index, item)
    })
    const [x, y, z] = workgroup
    computePass.dispatchWorkgroups(x, y, z)
    computePass.end()

    const device = Computer.device
    this.buffers.forEach(buffer => {
      if (buffer.label.includes('Texture')) {
        const debugBuffer = device.createBuffer({
          size: RESOLUTION * RESOLUTION * 4 * 4,
          usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        })
        this.commandEncoder.copyTextureToBuffer({
          texture: buffer as GPUTexture,
        }, { buffer: debugBuffer, bytesPerRow: Math.max(256, RESOLUTION * 4 * 4) }, [RESOLUTION, RESOLUTION, 1])
        this.debugs.push(() => {
          debugBuffer.mapAsync(GPUMapMode.READ).then(() => {
            console.log(new Float32Array(debugBuffer.getMappedRange()))
          })
        })
      } else {
        const debugBuffer = device.createBuffer({
          label: `Debug:${buffer.label}`,
          size: buffer.size,
          usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        })
        this.commandEncoder.copyBufferToBuffer(buffer, debugBuffer, buffer.size)

        this.debugs.push(() => {
          debugBuffer.mapAsync(GPUMapMode.READ).then(() => {
            console.log(new Float32Array(debugBuffer.getMappedRange()))
          })
        })
      }
    })
  }

  debug() {
    this.debugs.forEach(fn => fn())
  }
}

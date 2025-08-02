const spectrumCompute = `
@group(0) @binding(0) var spectrum: texture_storage_2d<rgba32float, write>;

@compute @workgroup_size(16, 16, 1)
fn main(
  @builtin(global_invocation_id) global_id: vec3<u32>,
) {
  let dims: vec2<i32> = vec2<i32>(textureDimensions(spectrum));
  let id: vec3<i32> = vec3<i32>(vec3<i32>(global_id).xy, 0);
  let id0: vec2<i32> = vec2<i32>(id.xy);
  let id1: vec2<i32> = vec2<i32>(-id0) % dims;

  textureStore(spectrum, id.xy, vec4<f32>(1.0, 2.0, 3.0, 4.0));
}
`

const RESOLUTION = 16

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

    this.ctx?.configure({
      device: this.device,
      format: navigator.gpu.getPreferredCanvasFormat(),
      alphaMode: 'premultiplied',
    })
  }

  async compute() {
    const device = this.device!

    const spectrum = device.createTexture({
      size: [RESOLUTION, RESOLUTION],
      format: 'rgba32float',
      usage: GPUTextureUsage.TEXTURE_BINDING |
             GPUTextureUsage.STORAGE_BINDING |
             GPUTextureUsage.COPY_DST |
             GPUTextureUsage.COPY_SRC,
    })

    const computePipline = device.createComputePipeline({
      layout: 'auto',
      compute: {
        module: device.createShaderModule({ code: spectrumCompute }),
        entryPoint: 'main',
      },
    })

    const bindGroup = device.createBindGroup({
      layout: computePipline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: spectrum.createView() },
      ],
    })

    const commandEncoder = device.createCommandEncoder()
    const computePass = commandEncoder.beginComputePass()
    computePass.setPipeline(computePipline)
    computePass.setBindGroup(0, bindGroup)

    computePass.dispatchWorkgroups(RESOLUTION / 16, RESOLUTION / 16, 1)
    computePass.end()

    const buffer = device.createBuffer({
      size: RESOLUTION * RESOLUTION * 16,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    })
    commandEncoder.copyTextureToBuffer({
      texture: spectrum,
    }, { buffer, bytesPerRow: 256 }, [RESOLUTION, RESOLUTION, 1])

    device.queue.submit([commandEncoder.finish()])

    await buffer.mapAsync(GPUMapMode.READ)
    const data = new Float32Array(buffer.getMappedRange())
    // buffer.unmap()
    console.log(data)
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

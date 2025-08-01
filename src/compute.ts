import { color } from 'three/tsl'

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

    const pipeline = this.device.createRenderPipeline({
      label: 'plane pipeline',
      layout: 'auto',
      vertex: {
        module: this.device.createShaderModule({
          // code:
        }),
      },
    })
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

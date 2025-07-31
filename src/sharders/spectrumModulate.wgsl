fn spectrum_modulate(
  fft: ptr<storage, array<FFTBuffer>, read_write>,
  numWorkGroups: vec3<u32>,
  workGroupSize: vec3<u32>,
  globalId: vec2<u32>,
  tile_length: u32,
  spectrum: texture_2d<f32>,
  time: u32,
) -> void {
  let map_size = numWorkGroups.x * workGroupSize.x;
  let num_stages = log2(f32(map_size)); // 等价于log2(map_size)
  let dims = textureDimensions(spectrum).xy;
  let id = vec3<u32>(globalId.xy, 0);

  let dk = 2.0 * PI / f32(tile_length);
  let k_vec = (vec2<f32>(id.xy) - f32(map_size) * 0.5) * dk;
  let k = length(k_vec) + 1e-6;
  let k_unit = k_vec / k;

  let h0: vec4<f32> = textureLoad(spectrum, id.xy, 0);
  let d = sqrt(G * k) * f32(time);
  let modulation = exp_complex(d);
  // TODO: 不理解
  let h = mul_complex(h0.xy, modulation) + mul_complex(h0.zw, conj_complex(modulation));
  let h_inv = vec2<f32>(-h.y, h.x);

  let hx = h_inv * k_unit.y;
  let hy = h;
  let hz = h_inv * k_unit.x;

  let dhy_dx = h_inv * k_vec.y;
  let dhy_dz = h_inv * k_vec.x;
  let dhx_dx = -h * k_vec.y * k_unit.y;
  let dhz_dz = -h * k_vec.x * k_unit.x;
  let dhz_dx = -h * k_vec.y * k_unit.x;

  fft[(id.z)*map_size*map_size*0*2 + 0*map_size*map_size + (id.y)*map_size + (id.x)].values = vec2(    hx.x -     hy.y,     hx.y +     hy.x);
  fft[(id.z)*map_size*map_size*0*2 + 1*map_size*map_size + (id.y)*map_size + (id.x)].values = vec2(    hz.x - dhy_dx.y,     hz.y + dhy_dx.x);
  fft[(id.z)*map_size*map_size*0*2 + 2*map_size*map_size + (id.y)*map_size + (id.x)].values = vec2(dhy_dz.x - dhx_dx.y, dhy_dz.y + dhx_dx.x);
  fft[(id.z)*map_size*map_size*0*2 + 3*map_size*map_size + (id.y)*map_size + (id.x)].values = vec2(dhz_dz.x - dhz_dx.y, dhy_dz.y + dhz_dx.x);
}

const PI = 3.1415926;
const G = 9.81;

fn exp_complex(x: f32) -> vec2<f32> {
  return vec2<f32>(cos(x), sin(x));
}

fn mul_complex(a: vec2<f32>, b: vec2<f32>) -> vec2<f32> {
  return vec2<f32>(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

fn conj_complex(x: vec2<f32>) -> vec2<f32> {
  return vec2(x.x * -1f, x.y);
}

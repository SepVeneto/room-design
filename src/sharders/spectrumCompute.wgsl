const G = 9.81;
const PI = 3.1415926;

const beta = 1.25;
const gamma = 3.3;

struct PushConstants {
  seed: u32,
  tile_length: vec2<f32>,
  depth: f32,
  alpha: f32,
  peak_frequency: f32,
  wind_speed: f32,
  cascade_index: u32,
}

@group(0) @binding(0) var<uniform> pc: PushConstants;
@group(1) @binding(0) var spectrum: texture_storage_2d<rgba32float, write>;

@compute @workgroup_size(16, 16, 1)
fn main(
  @builtin(global_invocation_id) global_id: vec3<u32>,
) {
  let dims: vec2<i32> = vec2<i32>(textureDimensions(spectrum));
  let id: vec3<i32> = vec3<i32>(vec3<i32>(global_id).xy, 0);
  let id0: vec2<i32> = vec2<i32>(id.xy);
  let id1: vec2<i32> = vec2<i32>(-id0) % dims;


  var res = get_spectrum_amplitude(id0, dims, pc.tile_length, pc.peak_frequency, pc.alpha);
  textureStore(spectrum, id.xy, vec4<f32>(res.xy, conj_complex(res)));
}

fn conj_complex(x: vec2<f32>) -> vec2<f32> {
  return vec2<f32>(x.x, -x.y);
}

fn TMA_spectrum(w: f32, w_p: f32, alpha: f32) -> f32 {
  var sigma = select(0.09, 0.07, w <= w_p);
  var r = exp(- (w - w_p) * (w - w_p) / (2.0 * sigma * sigma * w_p * w_p));
  var jonswap_spectrum = alpha * G * G / pow(abs(w), 5.0) * exp(-beta * pow(w_p / w, 4.0)) * pow(gamma, r);
  // TODO: 先不计算线性滤波

  return jonswap_spectrum;
}

fn get_spectrum_amplitude(id: vec2<i32>, map_size: vec2<i32>, tile_length: vec2<f32>, peak_frequency: f32, alpha: f32) -> vec2<f32>{
  var dk = 2.0 * PI / tile_length;
  var k_vec = (vec2<f32>(id) - vec2<f32>(map_size) * 0.5) * dk;
  var k = length(k_vec) + 1e-6;

  // TODO: 先不考虑色散关系
  var w = sqrt(G * k);
  var s = TMA_spectrum(w, peak_frequency, alpha);
  
  return vec2<f32>(id) * sqrt(2.0 * s);
}

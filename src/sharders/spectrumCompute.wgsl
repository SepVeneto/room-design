fn spectrum_compute(
  globalId: vec2<u32>,
  spectrum: texture_storage_2d<rgba32float, write>,
  alpha: f32,
  peak_frequency: f32,
  tile_length: u32,
)-> void {
  var dims = textureDimensions(spectrum);
  var id = vec3<u32>(globalId.xy, 0);
  var id0 = vec2<u32>(id.xy);
  var id1 = -vec2<f32>(id0) % vec2<f32>(dims);

  var res = get_spectrum_amplitude(id0, dims, tile_length, peak_frequency, alpha);
  textureStore(spectrum, vec2(0, 0), vec4<f32>(res.xy, conj_complex(res)));
}

const G = 9.81;
const PI = 3.1415926;

const beta = 1.25;
const gamma = 3.3;

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

fn get_spectrum_amplitude(id: vec2<u32>, map_size: vec2<u32>, tile_length: u32, peak_frequency: f32, alpha: f32) -> vec2<f32>{
  var dk = 2.0 * PI / f32(tile_length);
  var k_vec = (vec2<f32>(id) - vec2<f32>(map_size) * 0.5) * dk;
  var k = length(k_vec) + 1e-6;

  // TODO: 先不考虑色散关系
  var w = sqrt(G * k);
  var s = TMA_spectrum(w, peak_frequency, alpha);
  
  return vec2<f32>(id) * sqrt(2.0 * s);
}

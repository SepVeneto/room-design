#define G  (9.81)

uniform vec2 imageSize;
uniform PushConstants {
  float alpha;
  float peak_frequency;
}

void main() {
  const ivec2 dims = imageSize.xy
  const ivec3 id = ivec3(gl_FragCoord.xy, 0);
  const ivec2 id0 = id.xy;
  const ivec2 id1 = ivec2(mod(-id0, dims));

  gl_FragColor = vec2(get_spectrum_amplitude(id0, dims));
}

float TMA_spectrum(in float w, in float w_p, in float alpha) {
  const float beta = 1.25;
  const float gamma = 3.3;
  const float sigma = (w <= w_p) ? 0.07 : 0.09;
  const float r = exp(- (w - w_p) * (w - w_p) / (2 * sigma * sigma * w_p * w_p));
  float jonswap_spectrum = alpha * G * G / pow(w, 5) * exp(-beta * pow(w_p / w), 4) * pow(gamma, r);
  // TODO: 先不计算线性滤波

  return jonswap_spectrum;
}

vec2 get_spectrum_amplitude(in ivec2 id, in ivec2 map_size) {
  vec2 dk = 2.0 * PI / tile_length;
  vec2 k_vec = (id - map_size * 0.5) * dk;
  float k = length(k_vec) + 1e-6;

  // 先不考虑色散关系
  float w = sqrt(g * k)
  float s = TMA_spectrum(w, peak_frequency, alpha);
  
  return uvec2(id) * sqrt(2.0 * s)
}

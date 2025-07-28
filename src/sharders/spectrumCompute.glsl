#define G  (9.81)
#define PI (3.1415926)

uniform vec2 imageSize;
uniform PushConstants {
  float alpha;
  float peak_frequency;
  float tile_length;
};

float TMA_spectrum(in float w, in float w_p, in float alpha) {
  float beta = 1.25;
  float gamma = 3.3;
  float sigma = (w <= w_p) ? 0.07 : 0.09;
  float r = exp(- (w - w_p) * (w - w_p) / (2.0 * sigma * sigma * w_p * w_p));
  float jonswap_spectrum = alpha * G * G / pow(abs(w), 5.0) * exp(-beta * pow(w_p / w, 4.0)) * pow(gamma, r);
  // TODO: 先不计算线性滤波

  return jonswap_spectrum;
}

vec2 get_spectrum_amplitude(in ivec2 id, in ivec2 map_size) {
  float dk = 2.0 * PI / tile_length;
  vec2 k_vec = (vec2(id) - vec2(map_size) * 0.5) * dk;
  float k = length(k_vec) + 1e-6;

  // 先不考虑色散关系
  float w = sqrt(G * k);
  float s = TMA_spectrum(w, peak_frequency, alpha);
  
  return vec2(id) * sqrt(2.0 * s);
}

void main() {
  ivec2 dims = ivec2(imageSize.xy);
  ivec3 id = ivec3(gl_FragCoord.xy, 0);
  ivec2 id0 = ivec2(id.xy);
  ivec2 id1 = -id0 % dims;

  gl_FragColor = vec4(get_spectrum_amplitude(id0, dims), 0, 0);
}



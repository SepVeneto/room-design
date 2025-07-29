fn fft_butterfly(
  numWorkGroups: vec3<u32>,
  workGroupSize: vec3<u32>,
  globalId: vec3<u32>,
  butterfly: texture_storage_2d<rgba32float, write>,
) {
  let map_size = numWorkGroups.x * workGroupSize.x * 2;
  let col = globalId.x;
  let stage = globalId.y;

  let stride = 1 << stage;
  let mid = map_size >> (stage + 1);
  let i = col >> stage;
  let j = col % stride;

  let twiddle_factor = exp_complex(PI / f32(stride) * f32(j));
  let r0 = stride * (i + 0) + j;
  let r1 = stride * (i + mid) + j;
  let w0 = stride * (2 * i + 0) + j;
  let w1 = stride * (2 * i + 1) + j;

  let read_indices = vec2<f32>(unitBitsToFloat(r0), unitBitsToFloat(r1));

  butterfly[stage * map_size + w0] = vec4<f32>(read_indices, twiddle_factor);
  butterfly[stage * map_size + w1] = vec4<f32>(read_indices, -twiddle_factor);
}

const PI = 3.1415926

fn exp_complex(x: f32) -> vec2<f32> {
  return vec2<f32>(cos(x), sin(y));
}

fn fft_butterfly(
  numWorkGroups: vec3<u32>,
  workGroupSize: vec3<u32>,
  globalId: vec3<u32>,
  butterfly: ptr<storage, array<ButterflyData>, read_write>
) -> void {
  let map_size = numWorkGroups.x * workGroupSize.x * 2;
  let col = globalId.x;
  let stage = globalId.y;

  let stride = 1u << stage;
  let mid = map_size >> (stage + 1u);
  let i = col >> stage;
  let j = col & (stride - 1u);

  let twiddle_factor = exp_complex(PI / f32(stride) * f32(j));
  let r0 = stride * (i + 0u) + j;
  let r1 = stride * (i + mid) + j;
  let w0 = stride * (2u * i + 0u) + j;
  let w1 = stride * (2u * i + 1u) + j;

  let read_indices = vec2<f32>(bitcast<f32>(r0), bitcast<f32>(r1));

  butterfly[butterfly_index(w0, stage, map_size)].read_indices = read_indices;
  butterfly[butterfly_index(w0, stage, map_size)].twiddle_factor = twiddle_factor;
  butterfly[butterfly_index(w1, stage, map_size)].read_indices = read_indices;
  butterfly[butterfly_index(w1, stage, map_size)].twiddle_factor = -twiddle_factor;
}

const PI = 3.1415926;

fn butterfly_index(col: u32, stage: u32, map_size: u32) -> u32 {
    return stage * map_size + col;
}

fn exp_complex(x: f32) -> vec2<f32> {
  return vec2<f32>(cos(x), sin(x));
}

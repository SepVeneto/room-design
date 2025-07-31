fn fft_compute(
  numWorkGroups: vec3<u32>,
  workGroupSize: vec3<u32>,
  globalId: vec3<u32>,
  localId: vec3<u32>,
  butterfly: ptr<storage, array<ButterflyData>, read_write>,
  data: ptr<storage, array<FFTBuffer>, read_write>,
) -> void {
  let map_size = numWorkGroups.y * workGroupSize.y;
  let num_stages = log2(f32(map_size));
  let id = vec3<u32>(globalId.xy, 0);
  let col = id.x;
  let spectrum = globalId.z;

  if (localId.x >= map_size) {
    return;
  }

  row_shared[row_shared_index(col, 0)] = data[data_in_index(id, spectrum, map_size)].values;
  for (let stage = 0u; stage < num_stages; stage++) {
    workgroupBarrier();
    let buf_idx = vec2(stage % 2, (stage + 1) % 2);
    let butterfly_data = butterfly[butterfly_index(col, stage, map_size)];

    let read_indices = bitcast<vec2<u32>>(butterfly_data.xy);
    let twiddle_factor = butterfly_data.zw;

    let upper = row_shared[row_shared_index(read_indices[0], buf_idx[0])];
    let lower = row_shared[row_shared_index(read_indices[1], buf_idx[0])];
    row_shared[row_shared_index(col, buf_idx[1])] = upper + mul_complex(lower, twiddle_factor);
  }
  data[data_out_index(id, spectrum, map_size)] = row_shared[row_shared_index(col, num_stages % 2)];
}

const MAX_MAP_SIZE = 1024u;
const NUM_SPECTRA = 4u;

var<workgroup> row_shared: array<vec2<f32>, 2 * MAX_MAP_SIZE>;

fn row_shared_index(col: u32, pingpong: u32) -> u32 {
  return pingpong * MAX_MAP_SIZE + col;
}

fn butterfly_index(col: u32, stage: u32, map_size: u32) -> u32 {
  return stage * map_size + col;
}

fn data_in_index(id: vec3<u32>, layer: u32, map_size: u32) -> u32 {
  return id.z * map_size * map_size * NUM_SPECTRA * 2 +                                 0 + layer * map_size * map_size + id.y * map_size + id.x;
}

fn data_out_index(id: vec3<u32>, layer: u32, map_size: u32) -> u32 {
  return id.z * map_size * map_size * NUM_SPECTRA * 2 + NUM_SPECTRA * map_size * map_size + layer * map_size * map_size + id.y * map_size + id.x;
}

fn mul_complex(a: vec2<f32>, b: vec2<f32>) -> vec2<f32> {
  return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

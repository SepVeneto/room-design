fn fft_unpack(
  displacement_map: texture_storage_2d<rgba32float, write>,
  normal_map: texture_storage_2d<rgba32float, write>,
  data: ptr<storage, FFTBuffer, read_write>,
  numWorkGroups: vec3<u32>,
  workGroupSize: vec3<u32>,
  localId: vec3<u32>,
  globalId: vec3<u32>,
) -> void {
  let map_size = numWorkGroups.x * workGroupSize.x;
  let id_local = localId;
  let id = vec3<u32>(globalId.xy, 0);
  let sign_shift = -2 * ((id.x & 1) ^ (id.y & 1)) + 1;

  tile[id_local.z * 2][id_local.y][id_local.x] = data[fft_data_index(id, id_local.z * 2, map_size)];
  tile[id_local.z * 2 + 1][id_local.y][id_local.x] = data[fft_data_index(id, id_local.z * 2 + 1, map_size)];
  workgroupBarrier();

  switch (id_local.z) {
    case 0:
      let hx = tile[0][id_local.y][id_local.x].x;
      let hy = tile[0][id_local.y][id_local.x].y;
      let hz = tile[1][id_local.y][id_local.x].x;
      imageStore(displacement_map, id, vec4(hx, hy, hz, 0) * sign_shift);
      break
  }
}

const TILE_SIZE = 16;
const NUM_SPECTRA = 4;
var<workgroup> tile: array<array<array<vec2, TILE_SIZE>, TILE_SIZE>, NUM_SPECTRA>;

fn fft_data_index(id: vec3<u32>, layer: u32, map_size: u32) {
  return
    id.z * map_size * map_size * NUM_SPECTRA * 2
    + NUM_SPECTRA * map_size * map_size
    + layer * map_size * map_size
    + id.y * map_size
    + id.x
}

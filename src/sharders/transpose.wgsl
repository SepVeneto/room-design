fn transpose(
  numWorkGroups: vec3<u32>,
  workGroupSize: vec3<u32>,
  workgroupId: vec3<u32>,
  globalId: vec3<u32>,
  localId: vec3<u32>,
  data: ptr<storage, FFTBuffer, read_write>,
) -> void {
  let map_size = numWorkGroups.x * workGroupSize.x;
  let id_block = workgroupId.xy;
  let id_local = localId.xy;
  let spectrum = localId.z;

  let id = vec3<u32>(localId.xy, 0);
  tile[id_local.y][id_local.x] = data[data_in_index(id, spectrum, map_size)];
  workgroupBarrier();

  id.xy = id_block.yx * TILE_SIZE + id_local.xy;
  data[data_out_index(id, spectrum, map_size)] = tile[id_local.x][id_local.y];
}

const TILE_SIZE = 32;
const NUM_SPECTRA = 4;

var<workgroup> tile: array<array<vec2, TILE_SIZE + 1>, TILE_SIZE>;

fn data_in_index(id: vec3<u32>, layer: u32, map_size: u32) -> u32 {
  return id.z * map_size * map_size * NUM_SPECTRA * 2 + NUM_SPECTRA * map_size * map_size + layer * map_size * map_size + id.y * map_size + id.x
}

fn data_out_index(id: vec3<u32>, layer: u32, map_size: u32) -> u32 {
  return id.z * map_size * map_size * NUM_SPECTRA * 2 +                                 0 + layer * map_size * map_size + id.y * map_size + id.x
}

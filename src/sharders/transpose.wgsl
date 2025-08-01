fn transpose(
  numWorkGroups: vec3<u32>,
  workGroupSize: vec3<u32>,
  workgroupId: vec3<u32>,
  globalId: vec3<u32>,
  local_id: vec3<u32>,
  data: ptr<storage, array<FFTBuffer>, read_write>,
) -> void {
  let map_size = numWorkGroups.x * workGroupSize.x;
  let id_block = workgroupId.xy;
  let id_local = local_id.xy;
  let spectrum = local_id.z;

  var id = vec3<u32>(local_id.xy, 0);
  tile[id_local.y][id_local.x] = data[data_in_index(id, spectrum, map_size)].values;
  workgroupBarrier();

  id = vec3<u32>(id_block.yx * TILE_SIZE + id_local.xy, id.z);
  data[data_out_index(id, spectrum, map_size)].values = tile[id_local.x][id_local.y];
}

const TILE_SIZE = 32u;
const NUM_SPECTRA = 4;

var<workgroup> tile: array<array<vec2<f32>, TILE_SIZE + 1>, TILE_SIZE>;

fn data_in_index(id: vec3<u32>, layer: u32, map_size: u32) -> u32 {
  return id.z * map_size * map_size * NUM_SPECTRA * 2 + NUM_SPECTRA * map_size * map_size + layer * map_size * map_size + id.y * map_size + id.x;
}

fn data_out_index(id: vec3<u32>, layer: u32, map_size: u32) -> u32 {
  return id.z * map_size * map_size * NUM_SPECTRA * 2 +                                 0 + layer * map_size * map_size + id.y * map_size + id.x;
}

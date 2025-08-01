fn write_test(
  // source: texture_2d<f32>,
  store: ptr<storage, array<ButterflyData>, 
  displacement_map: texture_storage_2d<rgba32float, write>,
) -> void {
  let size = textureDimensions(source).xy;
  let data = textureLoad(source, vec2<u32>(id), 0);
  textureStore(displacement_map, vec2<u32>(id), data);
}
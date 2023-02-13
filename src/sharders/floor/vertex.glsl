varying vec2 vUv;

void main()
{
  vUv = uv;
  vec3 newPosition = position;
  newPosition.z = 1.0;
  gl_position = vec4(v0: newPosition, v1: 1.0);
}
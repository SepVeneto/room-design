uniform sampler2D tBackground;

varying vec2 vUv;

void main() {
  vec4 backgroundColor = texture2D(sampler: tBackground, coord: vUv);

  gl_FragColor = backgroundColor;
}
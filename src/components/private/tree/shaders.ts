export const branchVertexShader = `#version 300 es
precision highp float;

layout(location = 0) in vec2 a_vertex;
layout(location = 1) in vec2 a_start;
layout(location = 2) in vec2 a_end;
layout(location = 3) in vec2 a_widths;
layout(location = 4) in float a_color;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_windStrength;
uniform float u_windSpeed;
uniform float u_gustStrength;

flat out int v_color;

vec2 applyWind(vec2 point) {
  float height = clamp((point.y + 0.82) / 1.72, 0.0, 1.0);
  float mainWave = sin(u_time * u_windSpeed + point.y * 2.1 + point.x * 3.7);
  float detail = sin(u_time * u_windSpeed * 1.73 + point.y * 5.4 - point.x * 2.2) * 0.28;
  float gust = sin(u_time * 0.41 + point.y * 1.3) * u_gustStrength * 0.45;
  point.x += (mainWave + detail + gust) * u_windStrength * 0.055 * height * height;
  return point;
}

void main() {
  vec2 start = applyWind(a_start);
  vec2 end = applyWind(a_end);
  vec2 startPixels = (start * 0.5 + 0.5) * u_resolution;
  vec2 endPixels = (end * 0.5 + 0.5) * u_resolution;
  vec2 direction = normalize(endPixels - startPixels + vec2(0.0001));
  vec2 perpendicular = vec2(-direction.y, direction.x);
  float width = mix(a_widths.x, a_widths.y, a_vertex.x);
  vec2 positionPixels = mix(startPixels, endPixels, a_vertex.x);
  positionPixels += perpendicular * a_vertex.y * width * 0.5;
  vec2 position = (positionPixels / u_resolution) * 2.0 - 1.0;
  gl_Position = vec4(position, 0.0, 1.0);
  v_color = int(a_color + 0.5);
}
`;

export const branchFragmentShader = `#version 300 es
precision highp float;

uniform vec3 u_colors[4];
flat in int v_color;
out vec4 outColor;

void main() {
  outColor = vec4(u_colors[clamp(v_color, 0, 3)], 1.0);
}
`;

export const leafVertexShader = `#version 300 es
precision highp float;

layout(location = 0) in vec2 a_vertex;
layout(location = 1) in vec2 a_position;
layout(location = 2) in vec3 a_meta;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_windStrength;
uniform float u_windSpeed;
uniform float u_gustStrength;
uniform float u_leafSize;
uniform int u_attached;

flat out int v_color;

vec2 applyWind(vec2 point) {
  float height = clamp((point.y + 0.82) / 1.72, 0.0, 1.0);
  float mainWave = sin(u_time * u_windSpeed + point.y * 2.1 + point.x * 3.7);
  float detail = sin(u_time * u_windSpeed * 1.73 + point.y * 5.4 - point.x * 2.2) * 0.28;
  float gust = sin(u_time * 0.41 + point.y * 1.3) * u_gustStrength * 0.45;
  point.x += (mainWave + detail + gust) * u_windStrength * 0.055 * height * height;
  return point;
}

void main() {
  vec2 point = u_attached == 1 ? applyWind(a_position) : a_position;
  vec2 centerPixels = floor((point * 0.5 + 0.5) * u_resolution) + 0.5;
  float size = max(1.0, floor(u_leafSize * a_meta.x + 0.5));
  float flip = u_attached == 1
    ? 1.0
    : 0.42 + abs(sin(u_time * 2.4 + a_meta.z)) * 0.58;
  vec2 positionPixels = centerPixels + a_vertex * vec2(max(1.0, size * flip), size);
  vec2 position = (positionPixels / u_resolution) * 2.0 - 1.0;
  gl_Position = vec4(position, 0.0, 1.0);
  v_color = int(a_meta.y + 0.5);
}
`;

export const leafFragmentShader = `#version 300 es
precision highp float;

uniform vec3 u_colors[6];
flat in int v_color;
out vec4 outColor;

void main() {
  outColor = vec4(u_colors[clamp(v_color, 0, 5)], 1.0);
}
`;

export const postVertexShader = `#version 300 es
precision highp float;

layout(location = 0) in vec2 a_position;
out vec2 v_uv;

void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

export const postFragmentShader = `#version 300 es
precision highp float;

uniform sampler2D u_scene;
uniform vec3 u_backgroundTop;
uniform vec3 u_backgroundBottom;

in vec2 v_uv;
out vec4 outColor;

void main() {
  vec4 scene = texture(u_scene, v_uv);
  float horizon = smoothstep(0.0, 1.0, v_uv.y);
  vec3 background = mix(u_backgroundBottom, u_backgroundTop, horizon);
  float vignette = 1.0 - smoothstep(0.42, 0.92, distance(v_uv, vec2(0.54, 0.52))) * 0.18;
  background *= vignette;
  outColor = vec4(mix(background, scene.rgb, scene.a), 1.0);
}
`;

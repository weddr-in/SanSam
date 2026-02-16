export const cylinderVertex = /* glsl */ `
  attribute vec2 uv;
  attribute vec3 position;
  
  uniform mat4 modelViewMatrix;
  uniform mat4 projectionMatrix;
  
  varying vec2 vUv;
  
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const cylinderFragment = /* glsl */ `
  precision highp float;

  uniform sampler2D tMap;
  uniform float uDarkness;
  uniform vec2 uMouse;       // normalized mouse position (0-1)
  uniform vec2 uResolution;  // canvas resolution

  varying vec2 vUv;

  void main() {
    vec4 tex = texture2D(tMap, vUv);

    // Pure black & white
    float luma = dot(tex.rgb, vec3(0.299, 0.587, 0.114));
    vec3 bw = vec3(luma);

    // Slight contrast boost for cinematic B&W
    bw = (bw - 0.5) * 1.2 + 0.5;

    // Mouse hover color reveal
    vec2 fragCoord = gl_FragCoord.xy / uResolution;
    fragCoord.y = 1.0 - fragCoord.y; // flip Y to match mouse coords
    float dist = distance(fragCoord, uMouse);

    // Soft circular reveal: inner radius = sharp color, outer = smooth falloff
    float reveal = 1.0 - smoothstep(0.05, 0.25, dist);

    // Blend between B&W and original color
    vec3 finalColor = mix(bw, tex.rgb, reveal);

    // Apply darkness
    finalColor *= (1.0 - uDarkness);

    gl_FragColor = vec4(finalColor, tex.a);
  }
`;

export const particleVertex = /* glsl */ `
  attribute vec3 position;
  uniform mat4 modelViewMatrix;
  uniform mat4 projectionMatrix;
  
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const particleFragment = /* glsl */ `
  precision highp float;
  uniform vec3 uColor;
  uniform float uOpacity;
  
  void main() {
    gl_FragColor = vec4(uColor, uOpacity);
  }
`;

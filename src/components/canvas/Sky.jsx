'use client'

import { useMemo } from 'react'
import * as THREE from 'three'

// Procedural painterly sky: vertical world-space gradient (deep blue up
// high → pale horizon → warm valley haze far below) + a soft sun glow.
// The camera descends ~125 world units, so altitude itself recolors the sky.
const vertex = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorld = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`

const fragment = /* glsl */ `
  varying vec3 vWorld;
  uniform vec3 uDeep;
  uniform vec3 uMid;
  uniform vec3 uHorizon;
  uniform vec3 uWarm;
  uniform vec3 uLow;
  uniform vec2 uSun;

  void main() {
    float y = vWorld.y;
    vec3 col = mix(uMid, uDeep, smoothstep(10.0, 130.0, y));
    col = mix(uHorizon, col, smoothstep(-40.0, 25.0, y));
    col = mix(uWarm, col, smoothstep(-110.0, -45.0, y));
    col = mix(uLow, col, smoothstep(-220.0, -120.0, y));

    // sun glow, upper right — kept subtle
    float d = distance(vWorld.xy, uSun);
    col += vec3(1.0, 0.95, 0.82) * exp(-d * d / (2.0 * 55.0 * 55.0)) * 0.1;
    col += vec3(1.0, 0.98, 0.9) * exp(-d * d / (2.0 * 16.0 * 16.0)) * 0.18;

    // dither to prevent banding
    float n = fract(sin(dot(vWorld.xy, vec2(12.9898, 78.233))) * 43758.5453);
    col += (n - 0.5) * 0.012;

    gl_FragColor = vec4(col, 1.0);
  }
`

export default function Sky() {
  const uniforms = useMemo(
    () => ({
      uDeep: { value: new THREE.Color('#1d3e7c') },
      uMid: { value: new THREE.Color('#4a78b8') },
      uHorizon: { value: new THREE.Color('#d7e4f0') },
      uWarm: { value: new THREE.Color('#e6dcbd') },
      uLow: { value: new THREE.Color('#c9ad77') },
      uSun: { value: new THREE.Vector2(130, 95) },
    }),
    []
  )

  return (
    <mesh position={[0, -60, -500]} frustumCulled={false}>
      <planeGeometry args={[1600, 900]} />
      <shaderMaterial vertexShader={vertex} fragmentShader={fragment} uniforms={uniforms} depthWrite={false} />
    </mesh>
  )
}

'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { env } from './env'
import { noiseGLSL } from './glsl'

// Procedural sky: horizon-to-zenith gradient, sun disc and halo, and thin
// high-altitude cirrus. Every colour is driven by the Director, so the sky moves
// from clear morning to alpenglow as you descend.
export default function Sky() {
  const mesh = useRef()
  const uniforms = useMemo(
    () => ({
      uZenith: { value: new THREE.Color() },
      uHorizon: { value: new THREE.Color() },
      uGlow: { value: new THREE.Color() },
      uSunDir: { value: new THREE.Vector3() },
      uSunColor: { value: new THREE.Color() },
      uTime: { value: 0 },
      uCirrus: { value: 0.34 },
    }),
    []
  )

  useFrame(({ camera }) => {
    const m = mesh.current
    if (!m) return
    m.visible = env.act === 'mountain'
    m.position.copy(camera.position)
    uniforms.uZenith.value.copy(env.skyZenith)
    uniforms.uHorizon.value.copy(env.skyHorizon)
    uniforms.uGlow.value.copy(env.skyGlow)
    uniforms.uSunDir.value.copy(env.sunDir)
    uniforms.uSunColor.value.copy(env.sunColor)
    uniforms.uTime.value = env.time
  })

  return (
    <mesh ref={mesh} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[8000, 48, 24]} />
      <shaderMaterial
        side={THREE.BackSide}
        depthWrite={false}
        depthTest={false}
        uniforms={uniforms}
        vertexShader={/* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            gl_Position = p.xyww;
          }
        `}
        fragmentShader={/* glsl */ `
          uniform vec3 uZenith;
          uniform vec3 uHorizon;
          uniform vec3 uGlow;
          uniform vec3 uSunDir;
          uniform vec3 uSunColor;
          uniform float uTime;
          uniform float uCirrus;
          varying vec3 vDir;
          ${noiseGLSL}
          void main() {
            vec3 d = normalize(vDir);
            float e = d.y;
            float up = clamp(e, 0.0, 1.0);
            // narrow bright band at the horizon, deep colour for most of the dome.
            // Mixed in a perceptual (gamma) space: a linear mix lets a bright
            // horizon wash the whole upper sky out to grey.
            vec3 gH = pow(uHorizon, vec3(1.0 / 2.2));
            vec3 gZ = pow(uZenith, vec3(1.0 / 2.2));
            vec3 col = pow(mix(gH, gZ, pow(smoothstep(-0.02, 0.42, up), 0.62)), vec3(2.2));
            // warm scattering hugs the horizon around the sun
            float s = max(dot(d, normalize(uSunDir)), 0.0);
            float horizonBand = exp(-abs(e) * 9.0);
            float glow = pow(s, 10.0) * (0.3 + 0.7 * horizonBand) + pow(s, 2.5) * horizonBand * 0.45;
            col = mix(col, uGlow, clamp(glow, 0.0, 1.0));
            col += uSunColor * (pow(s, 900.0) * 6.0 + pow(s, 60.0) * 0.15);
            // thin cirrus streaks projected on a high dome
            vec2 cp = d.xz / (0.18 + up) * 1.6 + vec2(uTime * 0.004, 0.0);
            float c = fbm(cp * vec2(0.6, 2.4));
            c = smoothstep(0.6, 0.9, c) * smoothstep(0.02, 0.25, up) * (1.0 - smoothstep(0.55, 0.9, up));
            vec3 cirrusCol = mix(vec3(1.0), uGlow, 0.35 + 0.4 * pow(s, 2.0));
            col = mix(col, cirrusCol, c * uCirrus);
            // below the horizon: settle into horizon haze
            col = mix(col, uHorizon * 0.92, smoothstep(0.0, -0.2, e));
            gl_FragColor = vec4(col, 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }
        `}
      />
    </mesh>
  )
}

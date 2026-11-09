'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { env } from './env'
import { noiseGLSL } from './glsl'

// Procedural sky: horizon-to-zenith gradient, the sun's disc and halo, thin
// high cirrus, and at night stars, a faint Milky Way and the moon, lit in its
// real phase (the lit side faces wherever the sun actually is). Colours come
// from the live Bangkok sky (skyLight.js).
export default function Sky() {
  const mesh = useRef()
  const uniforms = useMemo(
    () => ({
      uZenith: { value: new THREE.Color() },
      uHorizon: { value: new THREE.Color() },
      uGlow: { value: new THREE.Color() },
      uSunDir: { value: new THREE.Vector3() },
      uSunColor: { value: new THREE.Color() },
      uCloudLight: { value: new THREE.Color() },
      uMoonDir: { value: new THREE.Vector3(0, -1, 0) },
      uMoonGlow: { value: 0 },
      uStars: { value: 0 },
      uDaylight: { value: 1 },
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
    uniforms.uSunDir.value.copy(env.skySunDir)
    uniforms.uSunColor.value.copy(env.sunColor)
    uniforms.uCloudLight.value.copy(env.cloudLight)
    uniforms.uMoonDir.value.copy(env.moonDir)
    uniforms.uMoonGlow.value = env.moonGlow
    uniforms.uStars.value = env.stars
    uniforms.uDaylight.value = env.daylight
    uniforms.uTime.value = env.time
  })

  return (
    <mesh ref={mesh} renderOrder={-10} frustumCulled={false} userData={{ act: 'mountain' }}>
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
          uniform vec3 uCloudLight;
          uniform vec3 uMoonDir;
          uniform float uMoonGlow;
          uniform float uStars;
          uniform float uDaylight;
          uniform float uTime;
          uniform float uCirrus;
          varying vec3 vDir;
          ${noiseGLSL}

          // Stars on a jittered grid over the six faces of a cube: even density
          // everywhere on the dome, and each star a soft point of a pixel or two.
          float starField(vec3 d, float scale, float density, float seed) {
            vec3 a = abs(d);
            vec2 uv;
            float face;
            if (a.x >= a.y && a.x >= a.z) { uv = d.yz / a.x; face = d.x > 0.0 ? 0.0 : 1.0; }
            else if (a.y >= a.z) { uv = d.xz / a.y; face = d.y > 0.0 ? 2.0 : 3.0; }
            else { uv = d.xy / a.z; face = d.z > 0.0 ? 4.0 : 5.0; }
            vec2 g = uv * scale;
            vec2 id = floor(g) + face * 517.0 + seed;
            vec2 f = fract(g) - 0.5;
            float h = hash12(id);
            if (h < 1.0 - density) return 0.0;
            vec2 off = (vec2(hash12(id + 3.7), hash12(id + 9.1)) - 0.5) * 0.6;
            float mag = hash12(id + 21.3);
            float r = length(f - off);
            float twinkle = 0.8 + 0.2 * sin(uTime * (1.3 + mag * 2.6) + h * 61.0);
            return smoothstep(0.22, 0.0, r) * (0.18 + 1.1 * mag * mag * mag) * twinkle;
          }

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

            // warm scattering hugs the horizon around the sun (it lingers after sunset)
            vec3 sd = normalize(uSunDir);
            float s = max(dot(d, sd), 0.0);
            float horizonBand = exp(-abs(e) * 9.0);
            float glow = pow(s, 10.0) * (0.3 + 0.7 * horizonBand) + pow(s, 2.5) * horizonBand * 0.45;
            col = mix(col, uGlow, clamp(glow, 0.0, 1.0));
            // the disc itself, only while the sun is up
            float sunUp = smoothstep(-0.03, 0.01, sd.y);
            col += uSunColor * (pow(s, 900.0) * 6.0 + pow(s, 60.0) * 0.15) * sunUp;

            // night: stars thin out towards the hazy horizon
            if (uStars > 0.001) {
              float horizonFade = smoothstep(-0.01, 0.22, e);
              float st = starField(d, 150.0, 0.045, 0.0) + starField(d, 340.0, 0.03, 7.0) * 0.55;
              // a faint Milky Way: a band of glow and denser stars across the sky
              vec3 mwAxis = normalize(vec3(0.42, 0.55, 0.72));
              float band = exp(-pow(dot(d, mwAxis) / 0.2, 2.0));
              float mw = band * (0.45 + 0.55 * fbm(d.xz * 6.0 + d.y * 3.0));
              st += starField(d, 520.0, 0.07, 13.0) * band * 0.6;
              vec3 starCol = mix(vec3(0.75, 0.82, 1.0), vec3(1.0, 0.92, 0.82), hash12(floor(d.xz * 300.0)));
              col += (starCol * st * 1.4 + vec3(0.32, 0.38, 0.55) * mw * 0.05) * uStars * horizonFade;
            }

            // the moon, in its real phase: shade the disc as a sphere lit from the sun
            if (uMoonGlow > 0.001) {
              vec3 md = normalize(uMoonDir);
              float c = dot(d, md);
              float radius = 0.0105; // a little larger than life, as the eye remembers it
              vec3 tU = normalize(sd - md * dot(sd, md) + vec3(1e-5, 0.0, 0.0));
              vec3 tV = cross(md, tU);
              vec2 q = vec2(dot(d - md * c, tU), dot(d - md * c, tV)) / radius;
              float r2 = dot(q, q);
              if (c > 0.0 && r2 < 1.6) {
                float z = sqrt(max(0.0, 1.0 - r2));
                vec3 n = q.x * tU + q.y * tV - z * md; // the surface normal, facing us
                float lit = smoothstep(-0.04, 0.08, dot(n, sd));
                float maria = 0.82 - 0.22 * fbm(q * 1.7 + 4.0);
                float disc = smoothstep(1.0, 0.92, r2);
                vec3 moonCol = vec3(1.0, 0.97, 0.9) * maria * (lit * 1.35 + 0.035);
                col = mix(col, col + moonCol * 1.6, disc * uMoonGlow);
              }
              // a soft halo in the haze around it
              float halo = pow(max(c, 0.0), 2400.0) * 0.35 + pow(max(c, 0.0), 160.0) * 0.06;
              col += vec3(0.62, 0.7, 0.9) * halo * uMoonGlow * (1.0 - uDaylight * 0.9);
            }

            // thin cirrus streaks projected on a high dome, lit like the clouds below
            vec2 cp = d.xz / (0.18 + up) * 1.6 + vec2(0.0, uTime * 0.004);
            float cc = fbm(cp * vec2(0.6, 2.4));
            cc = smoothstep(0.6, 0.9, cc) * smoothstep(0.02, 0.25, up) * (1.0 - smoothstep(0.55, 0.9, up));
            vec3 cirrusCol = mix(uCloudLight, uGlow, 0.25 + 0.4 * pow(s, 2.0)) * mix(0.55, 1.0, uDaylight);
            col = mix(col, cirrusCol, cc * uCirrus * mix(0.45, 1.0, uDaylight));
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

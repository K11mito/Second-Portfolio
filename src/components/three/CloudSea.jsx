'use client'

import { useMemo, useRef } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { env, TERRAIN } from './env'
import { getNoiseTexture } from './noiseTexture'
import { makeHeightTexture } from './Terrain'

// A sea of clouds filling the valleys below the summits. Three stacked noise
// layers give it parallax and depth; each one parts around terrain that pokes
// through it and fades out as the camera sinks past it.
export const CLOUD_LAYERS = [
  { y: 182, seed: 0.0, bright: 1.0, cover: 0.28 },
  { y: 168, seed: 0.37, bright: 0.95, cover: 0.2 },
  { y: 154, seed: 0.71, bright: 0.9, cover: 0.16 },
]

const vertexShader = /* glsl */ `
  varying vec3 vWPos;
  varying float vDepth;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWPos = wp.xyz;
    vec4 mv = viewMatrix * wp;
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`

const fragmentShader = /* glsl */ `
  uniform sampler2D uNoise;
  uniform sampler2D uHeight;
  uniform float uPeak;
  uniform float uTime;
  uniform float uLayerY;
  uniform float uSeed;
  uniform float uBright;
  uniform float uCover;
  uniform float uOpacity;
  uniform float uCamY;
  uniform vec3 uSunDir;
  uniform vec3 uLight;
  uniform vec3 uShade;
  uniform vec3 uFogColor;
  uniform float uFogDensity;
  varying vec3 vWPos;
  varying float vDepth;

  const mat2 R1 = mat2(0.8, -0.6, 0.6, 0.8);
  const mat2 R2 = mat2(0.28, -0.96, 0.96, 0.28);

  float density(vec2 p) {
    vec2 w = vec2(uTime * 2.2, uTime * 0.9);
    // domain warp turns lattice blobs into rolling, organic billows
    vec2 q = p * 0.0005 + uSeed;
    vec2 warp = vec2(texture2D(uNoise, q).r, texture2D(uNoise, R2 * q + 0.37).a) - 0.5;
    vec2 pw = p + warp * 130.0 + w;
    float big = texture2D(uNoise, (R1 * pw) * 0.00013 + uSeed * 0.3).a;
    float a = texture2D(uNoise, pw * 0.0004 + uSeed).r;
    // billow noise: rounded cauliflower tops with creased valleys, like cumulus
    float b = texture2D(uNoise, (R2 * pw) * 0.00085 + uSeed * 1.7).b;
    float c = texture2D(uNoise, (R1 * pw) * 0.0026 + uSeed * 2.9).b;
    return big * 0.26 + a * 0.24 + b * 0.38 + c * 0.12;
  }

  void main() {
    vec2 p = vWPos.xz;
    float d = density(p);

    // part around terrain that reaches the layer
    vec2 tuv = (p + 500.0) / 1000.0;
    float th = 0.0;
    if (tuv.x > 0.0 && tuv.x < 1.0 && tuv.y > 0.0 && tuv.y < 1.0) th = texture2D(uHeight, tuv).r * uPeak;
    float clear = smoothstep(uLayerY - 60.0, uLayerY + 6.0, th);

    float dens = smoothstep(0.26, 0.66, d + uCover - clear * 0.35) * (1.0 - clear * 0.85);

    // Billowy relief from the density gradient, by finite differences over a
    // broad step (screen-space derivatives were tried: cheaper, but blocky and
    // flat at grazing angles; these fetches all hit one tiny cached texture).
    // Broad and gentle on purpose: high-frequency glints make clouds read as water.
    float e = 18.0;
    float dx = density(p + vec2(e, 0.0)) - d;
    float dz = density(p + vec2(0.0, e)) - d;
    vec3 n = normalize(vec3(-dx * 42.0, 1.0, -dz * 42.0));
    vec3 s = normalize(uSunDir);
    float ndl = dot(n, s);
    float lit = clamp(ndl * 0.5 + 0.5, 0.0, 1.0);
    vec3 col = mix(mix(uShade, uLight, 0.18), uLight, lit) * uBright;
    col += uLight * pow(max(ndl, 0.0), 4.0) * 0.05;
    // troughs between billows sit in soft shadow; thin edges read cooler
    col *= mix(0.86, 1.0, smoothstep(0.3, 0.8, d));
    col = mix(uShade * 0.95, col, smoothstep(0.05, 0.75, dens));

    float fogF = 1.0 - exp(-uFogDensity * uFogDensity * vDepth * vDepth);
    col = mix(col, uFogColor, clamp(fogF * 0.85, 0.0, 1.0));

    // vanish as the camera passes through this layer (the white-out takes over)
    float camFade = smoothstep(6.0, 70.0, abs(uCamY - uLayerY));
    float alpha = dens * uOpacity * camFade;
    if (alpha < 0.003) discard;
    gl_FragColor = vec4(col, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

export default function CloudSea() {
  const buffer = useLoader(THREE.FileLoader, '/terrain/height.bin', (l) => l.setResponseType('arraybuffer'))
  const group = useRef()

  const materials = useMemo(() => {
    const heightTex = makeHeightTexture(new Uint16Array(buffer))
    const shared = {
      uNoise: { value: getNoiseTexture() },
      uHeight: { value: heightTex },
      uPeak: { value: TERRAIN.PEAK_Y },
      uTime: { value: 0 },
      uOpacity: { value: 1 },
      uCamY: { value: 1000 },
      uSunDir: { value: new THREE.Vector3() },
      uLight: { value: new THREE.Color() },
      uShade: { value: new THREE.Color() },
      uFogColor: { value: new THREE.Color() },
      uFogDensity: { value: 0.0005 },
    }
    return CLOUD_LAYERS.map(
      (L) =>
        new THREE.ShaderMaterial({
          uniforms: {
            ...shared,
            uLayerY: { value: L.y },
            uSeed: { value: L.seed },
            uBright: { value: L.bright },
            uCover: { value: L.cover },
          },
          vertexShader,
          fragmentShader,
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide,
        })
    )
  }, [buffer])

  const plane = useMemo(() => new THREE.PlaneGeometry(14000, 14000, 1, 1).rotateX(-Math.PI / 2), [])

  useFrame(({ camera }) => {
    if (!group.current) return
    group.current.visible = env.act === 'mountain'
    const u = materials[0].uniforms
    u.uTime.value = env.time
    u.uCamY.value = camera.position.y
    u.uSunDir.value.copy(env.sunDir)
    u.uLight.value.copy(env.cloudLight)
    u.uShade.value.copy(env.cloudShade)
    u.uFogColor.value.copy(env.fogColor)
    u.uFogDensity.value = env.fogDensity
    u.uOpacity.value = env.cloudOpacity
  })

  return (
    <group ref={group} userData={{ act: 'mountain' }}>
      {CLOUD_LAYERS.map((L, i) => (
        // seen from above, the lowest layer must draw first
        <mesh key={i} geometry={plane} material={materials[i]} position={[0, L.y, 0]} renderOrder={2 + CLOUD_LAYERS.length - i} />
      ))}
    </group>
  )
}

'use client'

import { useMemo, useRef } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { env, TERRAIN } from './env'
import { getNoiseTexture } from './noiseTexture'

// The mountain is rebuilt at runtime from a 16-bit heightmap baked out of the
// original Sketchfab model (21 MB of faceted, unwelded triangles -> 256 KB).
// Welding + smooth normals is what removes the streaky, faceted look.

const { N, SIZE, MIN_H, MAX_H, V_SCALE, CURVE } = TERRAIN
export const SHADOW_LAYER = 1

function buildGeometry(heights, stride = 1) {
  const n = Math.floor((N - 1) / stride) + 1
  const span = ((n - 1) * stride * SIZE) / (N - 1)
  const pos = new Float32Array(n * n * 3)
  const uv = new Float32Array(n * n * 2)
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const gi = i * stride
      const gj = j * stride
      const k = j * n + i
      // Taper heights to zero at the tile border so tiles never end in a cliff.
      const ex = Math.min(gi, N - 1 - gi) / (N - 1)
      const ez = Math.min(gj, N - 1 - gj) / (N - 1)
      const e = Math.min(ex, ez)
      const taper = e >= 0.14 ? 1 : (e / 0.14) * (e / 0.14) * (3 - (2 * e) / 0.14)
      const h = Math.pow(heights[gj * N + gi] / 65535, CURVE) * (MAX_H - MIN_H) * V_SCALE * taper
      pos[k * 3] = -span / 2 + (gi * SIZE) / (N - 1)
      pos[k * 3 + 1] = h
      pos[k * 3 + 2] = -span / 2 + (gj * SIZE) / (N - 1)
      uv[k * 2] = gi / (N - 1)
      uv[k * 2 + 1] = gj / (N - 1)
    }
  }
  const index = new Uint32Array((n - 1) * (n - 1) * 6)
  let o = 0
  for (let j = 0; j < n - 1; j++) {
    for (let i = 0; i < n - 1; i++) {
      const a = j * n + i
      const b = a + 1
      const c = a + n
      const d = c + 1
      index[o++] = a
      index[o++] = c
      index[o++] = b
      index[o++] = b
      index[o++] = c
      index[o++] = d
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  geo.setAttribute('aAO', new THREE.BufferAttribute(bakeOcclusion(pos, n, span / (n - 1)), 1))
  geo.setIndex(new THREE.BufferAttribute(index, 1))
  geo.computeVertexNormals()
  geo.computeBoundingSphere()
  return geo
}

// Horizon-based ambient occlusion baked per vertex from the heightfield:
// gullies and couloirs darken, ridges stay bright. ~40 ms, once, at load.
function bakeOcclusion(pos, n, cell) {
  const ao = new Float32Array(n * n)
  const dirs = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [0.7071, 0.7071], [-0.7071, 0.7071], [0.7071, -0.7071], [-0.7071, -0.7071],
  ]
  const radii = [2, 5, 11, 22]
  const h = (i, j) => {
    i = i < 0 ? 0 : i > n - 1 ? n - 1 : i
    j = j < 0 ? 0 : j > n - 1 ? n - 1 : j
    return pos[(j * n + i) * 3 + 1]
  }
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const h0 = pos[(j * n + i) * 3 + 1]
      let occ = 0
      for (let d = 0; d < 8; d++) {
        let maxSlope = 0
        for (let r = 0; r < radii.length; r++) {
          const R = radii[r]
          const dh = h(Math.round(i + dirs[d][0] * R), Math.round(j + dirs[d][1] * R)) - h0
          const s = dh / (R * cell)
          if (s > maxSlope) maxSlope = s
        }
        occ += maxSlope / Math.sqrt(1 + maxSlope * maxSlope) // sin of horizon angle
      }
      ao[j * n + i] = 1 - Math.min(1, (occ / 8) * 1.35)
    }
  }
  return ao
}

function makeTerrainMaterial(mask, shared) {
  const noise = getNoiseTexture()
  // Fine rock relief via bump mapping: crisp detail without extra geometry.
  const bump = noise.clone()
  bump.repeat.set(48, 48)
  bump.needsUpdate = true
  const mat = new THREE.MeshStandardMaterial({
    roughness: 0.9,
    metalness: 0,
    color: '#ffffff',
    bumpMap: bump,
    bumpScale: 2.2,
  })
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, shared)
    shader.uniforms.uMask = { value: mask }
    shader.uniforms.uNoise = { value: noise }
    shader.uniforms.uPeak = { value: TERRAIN.PEAK_Y }

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        attribute float aAO;
        varying vec3 vWPos;
        varying vec3 vWNormal;
        varying vec2 vTUv;
        varying float vAO;`
      )
      .replace(
        '#include <worldpos_vertex>',
        `#include <worldpos_vertex>
        vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vWNormal = normalize(mat3(modelMatrix) * objectNormal);
        vTUv = uv;
        vAO = aAO;`
      )

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform sampler2D uMask;
        uniform sampler2D uNoise;
        uniform float uPeak;
        uniform vec3 uRockDark;
        uniform vec3 uRockLight;
        uniform vec3 uSnow;
        uniform float uHaze;
        uniform float uHazeTop;
        varying vec3 vWPos;
        varying vec3 vWNormal;
        varying vec2 vTUv;
        varying float vAO;`
      )
      .replace(
        '#include <aomap_fragment>',
        `
        float ambientOcclusion = vAO;
        reflectedLight.indirectDiffuse *= ambientOcclusion;
        reflectedLight.indirectSpecular *= ambientOcclusion;
        `
      )
      .replace(
        '#include <map_fragment>',
        `
        vec3 wn = normalize(vWNormal);
        float slope = 1.0 - wn.y;
        float hN = clamp(vWPos.y / uPeak, 0.0, 1.0);
        float m = texture2D(uMask, vTUv).r;
        float n1 = texture2D(uNoise, vWPos.xz * 0.0021).r;
        float n2 = texture2D(uNoise, vWPos.xz * 0.019).g;
        // Snow settles where the erosion mask is bright, on gentle slopes, and more readily up high.
        float maskSnow = smoothstep(0.36, 0.6, m + (n1 - 0.5) * 0.25);
        float hold = mix(0.4, 0.66, smoothstep(0.3, 0.92, hN));
        float slopeSnow = 1.0 - smoothstep(hold - 0.1, hold + 0.05, slope + (n2 - 0.5) * 0.16);
        float snow = maskSnow * slopeSnow;
        // high up, snow clings to all but the steepest faces
        snow = max(snow, smoothstep(0.62, 0.9, hN) * (1.0 - smoothstep(0.55, 0.78, slope + (n2 - 0.5) * 0.2)));
        snow *= smoothstep(0.05, 0.2, hN + (n1 - 0.5) * 0.1);
        vec3 rock = mix(uRockDark, uRockLight, clamp(m * 0.8 + (n2 - 0.5) * 0.45 + (n1 - 0.5) * 0.35, 0.0, 1.0));
        vec3 albedo = mix(rock, uSnow * (0.94 + 0.06 * n2), snow);
        // cavity darkening keeps gullies readable even in direct light
        diffuseColor.rgb *= albedo * mix(0.62, 1.0, vAO);
        float snowAmt = snow;
        `
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        roughnessFactor = mix(0.96, 0.62, snowAmt);`
      )
      .replace(
        '#include <fog_fragment>',
        `
        #ifdef USE_FOG
          float fogF = 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
          // valley haze: thick near the ground, thinning with altitude
          float hz = (1.0 - exp(-uHaze * vFogDepth)) * exp(-max(vWPos.y, 0.0) / uHazeTop);
          fogF = clamp(fogF + hz * (1.0 - fogF), 0.0, 1.0);
          gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, fogF);
        #endif
        `
      )
  }
  mat.customProgramCacheKey = () => 'terrain-v3'
  return mat
}

// Heights normalised to the summit, as an 8-bit texture (linear filtering on
// float textures is not universally supported on phones) so the cloud sea can
// part around the peaks.
export function makeHeightTexture(heights) {
  const data = new Uint8Array(N * N)
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const ex = Math.min(i, N - 1 - i) / (N - 1)
      const ez = Math.min(j, N - 1 - j) / (N - 1)
      const e = Math.min(ex, ez)
      const taper = e >= 0.14 ? 1 : (e / 0.14) * (e / 0.14) * (3 - (2 * e) / 0.14)
      data[j * N + i] = Math.round(Math.pow(heights[j * N + i] / 65535, CURVE) * taper * 255)
    }
  }
  const tex = new THREE.DataTexture(data, N, N, THREE.RedFormat, THREE.UnsignedByteType)
  tex.unpackAlignment = 1
  tex.magFilter = THREE.LinearFilter
  tex.minFilter = THREE.LinearFilter
  tex.needsUpdate = true
  return tex
}

// Shared uniforms so the Director can retint rock/snow/haze as the light changes.
export const terrainUniforms = {
  uRockDark: { value: new THREE.Color('#3b3029') },
  uRockLight: { value: new THREE.Color('#8a7462') },
  uSnow: { value: new THREE.Color('#f3f5f8') },
  uHaze: { value: 0.0011 },
  uHazeTop: { value: 70 },
}

// Distant ranges reuse a decimated copy of the same heightmap: no extra download.
const RANGES = [
  // mid-distance neighbours: big summits rising out of the cloud sea
  { p: [-1450, -30, -900], s: [1.35, 1.05, 1.35], r: 3 },
  { p: [-1550, -30, 1250], s: [1.3, 0.95, 1.3], r: 1 },
  { p: [1350, -30, -1250], s: [1.4, 1.0, 1.4], r: 2 },
  // far ranges on the horizon
  { p: [-2600, -40, -2300], s: [2.6, 1.15, 2.6], r: 1 },
  { p: [-500, -40, -3300], s: [3.0, 1.3, 3.0], r: 2 },
  { p: [2000, -40, -2700], s: [2.4, 1.0, 2.4], r: 3 },
  { p: [3200, -40, -600], s: [2.2, 0.9, 2.2], r: 0 },
  { p: [-3200, -40, 500], s: [2.4, 0.95, 2.4], r: 2 },
  { p: [1600, -40, 2300], s: [2.0, 0.8, 2.0], r: 1 },
  { p: [-1700, -40, 2900], s: [2.3, 0.9, 2.3], r: 3 },
]

export default function Terrain() {
  const buffer = useLoader(THREE.FileLoader, '/terrain/height.bin', (l) => l.setResponseType('arraybuffer'))
  const mask = useLoader(THREE.TextureLoader, '/terrain/snow-mask.webp')
  const group = useRef()

  const { geo, low, shadowGeo, mat } = useMemo(() => {
    const heights = new Uint16Array(buffer)
    mask.flipY = false
    mask.colorSpace = THREE.NoColorSpace
    mask.anisotropy = 8
    mask.wrapS = mask.wrapT = THREE.ClampToEdgeWrapping
    mask.needsUpdate = true
    return {
      geo: buildGeometry(heights, 1),
      low: buildGeometry(heights, 4),
      // a quarter of the triangles, used only to cast the sun's shadows
      shadowGeo: buildGeometry(heights, 2),
      mat: makeTerrainMaterial(mask, terrainUniforms),
    }
  }, [buffer, mask])

  const ground = useMemo(() => {
    const g = new THREE.CircleGeometry(9000, 48).rotateX(-Math.PI / 2)
    g.setAttribute('aAO', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count).fill(1), 1))
    return g
  }, [])

  useFrame(() => {
    if (group.current) group.current.visible = env.act === 'mountain'
  })

  return (
    <group ref={group} userData={{ act: 'mountain' }}>
      <mesh geometry={geo} material={mat} receiveShadow />
      {/* shadow caster on layer 1: drawn into the shadow map, never by the camera */}
      <mesh geometry={shadowGeo} material={mat} castShadow ref={(m) => m && m.layers.set(SHADOW_LAYER)} />
      {RANGES.map((r, i) => (
        <mesh
          key={i}
          geometry={low}
          material={mat}
          position={r.p}
          scale={r.s}
          rotation={[0, (r.r * Math.PI) / 2, 0]}
        />
      ))}
      <mesh geometry={ground} material={mat} position={[0, -0.5, 0]} />
    </group>
  )
}

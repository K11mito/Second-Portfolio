'use client'

import { useMemo, useRef } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { env } from './env'
import { scrollState } from '@/lib/scroll'

// Strings of lung-ta prayer flags (blue, white, red, green, yellow — om, ma, ni,
// padme, hum) strung across the summit, framing the opening shot. One instanced
// draw call; the wind lives entirely in the vertex shader.

const HERO_CAM = new THREE.Vector3(-560, 360, 620)
const HERO_LOOK = new THREE.Vector3(-190, 384, -110)

// Strings described in the hero camera's frame: [forward, right, up] offsets.
// Kept in the top fifth of the frame so they crown the shot without touching the type.
const STRINGS = [
  { a: [40, -34, 16.5], b: [118, 46, 33], sag: 7, count: 21, size: 2.3 },
  { a: [80, -72, 40], b: [176, 30, 53], sag: 9, count: 17, size: 2.9 },
]

const vertexShader = /* glsl */ `
  attribute float aTile;
  attribute float aPhase;
  uniform float uTime; // integrated wind clock: speeds up with gusts without phase jumps
  varying vec2 vUv;
  varying float vTile;
  varying vec3 vWPos;
  varying float vFogDepth;
  void main() {
    vUv = uv;
    vTile = aTile;
    vec3 p = position;
    float hang = clamp(-p.y / 1.25, 0.0, 1.0);           // 0 at the cord, 1 at the hem
    float t = uTime;
    // the whole flag lifts and swings on the cord...
    float swing = (0.42 + 0.22 * sin(t * 1.3 + aPhase) + 0.12 * sin(t * 2.9 + aPhase * 1.7)) * hang;
    // ...while ripples travel down the cloth and the free edge flutters
    float ripple = sin(p.y * 5.5 - t * 7.0 + aPhase + p.x * 2.0) * 0.07 * hang;
    float flutter = sin(p.x * 7.0 + t * 11.0 + aPhase * 2.3) * 0.045 * hang * hang;
    p.z += swing + ripple + flutter;
    p.y += swing * swing * 0.35;                          // lifting shortens the drop
    p.x += sin(t * 2.1 + aPhase) * 0.04 * hang;
    vec4 wp = modelMatrix * instanceMatrix * vec4(p, 1.0);
    vWPos = wp.xyz;
    vec4 mv = viewMatrix * wp;
    vFogDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`

const fragmentShader = /* glsl */ `
  uniform sampler2D uAtlas;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform vec3 uAmbient;
  uniform vec3 uFogColor;
  uniform float uFogDensity;
  uniform float uOpacity;
  varying vec2 vUv;
  varying float vTile;
  varying vec3 vWPos;
  varying float vFogDepth;
  void main() {
    vec2 uv = vec2((vTile + vUv.x) / 5.0, vUv.y);
    vec4 tex = texture2D(uAtlas, uv);
    if (tex.a < 0.5) discard;
    vec3 n = normalize(cross(dFdx(vWPos), dFdy(vWPos)));
    vec3 v = normalize(cameraPosition - vWPos);
    if (dot(n, v) < 0.0) n = -n;
    vec3 s = normalize(uSunDir);
    float diff = max(dot(n, s), 0.0);
    // cotton is thin: light from behind glows through it
    float through = pow(max(dot(-v, s), 0.0), 2.0) * 0.55 + max(dot(-n, s), 0.0) * 0.35;
    vec3 col = tex.rgb * (uAmbient * 0.85 + uSunColor * (diff * 0.75 + through));
    float fogF = 1.0 - exp(-uFogDensity * uFogDensity * vFogDepth * vFogDepth);
    col = mix(col, uFogColor, fogF);
    gl_FragColor = vec4(col, uOpacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

function frameBasis(cam, look) {
  const f = look.clone().sub(cam).normalize()
  const r = new THREE.Vector3().crossVectors(f, new THREE.Vector3(0, 1, 0)).normalize()
  const u = new THREE.Vector3().crossVectors(r, f).normalize()
  return { f, r, u }
}

function buildStrings() {
  const { f, r, u } = frameBasis(HERO_CAM, HERO_LOOK)
  const toWorld = ([a, b, c]) => HERO_CAM.clone().addScaledVector(f, a).addScaledVector(r, b).addScaledVector(u, c)
  const flags = []
  const cords = []
  STRINGS.forEach((S, si) => {
    const A = toWorld(S.a)
    const B = toWorld(S.b)
    // parabolic sag approximates the catenary of a loaded cord
    const at = (k) => A.clone().lerp(B, k).add(new THREE.Vector3(0, -S.sag * 4 * k * (1 - k), 0))
    const pts = []
    for (let i = 0; i <= 40; i++) pts.push(at(i / 40))
    cords.push(new THREE.CatmullRomCurve3(pts))
    for (let i = 0; i < S.count; i++) {
      const k = (i + 0.5) / S.count
      const p = at(k)
      const tan = at(Math.min(1, k + 0.01)).sub(at(Math.max(0, k - 0.01))).normalize()
      const up = new THREE.Vector3(0, 1, 0)
      const y = up.clone().addScaledVector(tan, -tan.dot(up)).normalize()
      const z = new THREE.Vector3().crossVectors(tan, y).normalize()
      const m = new THREE.Matrix4().makeBasis(tan, y, z)
      m.scale(new THREE.Vector3(S.size, S.size, S.size))
      m.setPosition(p)
      flags.push({ m, tile: (i + si * 2) % 5, phase: i * 0.83 + si * 2.1 })
    }
  })
  return { flags, cords }
}

export default function PrayerFlags() {
  const atlas = useLoader(THREE.TextureLoader, '/textures/prayer-flags.webp')
  const group = useRef()
  const wind = useRef(1)

  const { mesh, cordGeos, material } = useMemo(() => {
    atlas.colorSpace = THREE.SRGBColorSpace
    atlas.anisotropy = 4
    const { flags, cords } = buildStrings()
    // flag hangs from its top edge: x in [-0.5, 0.5], y in [-1.25, 0]
    const geo = new THREE.PlaneGeometry(1, 1.25, 10, 12).translate(0, -0.625, 0)
    const tile = new Float32Array(flags.length)
    const phase = new Float32Array(flags.length)
    flags.forEach((fl, i) => {
      tile[i] = fl.tile
      phase[i] = fl.phase
    })
    geo.setAttribute('aTile', new THREE.InstancedBufferAttribute(tile, 1))
    geo.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phase, 1))
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uAtlas: { value: atlas },
        uTime: { value: 0 },
        uSunDir: { value: new THREE.Vector3() },
        uSunColor: { value: new THREE.Color() },
        uAmbient: { value: new THREE.Color() },
        uFogColor: { value: new THREE.Color() },
        uFogDensity: { value: 0 },
        uOpacity: { value: 1 },
      },
      vertexShader,
      fragmentShader,
      side: THREE.DoubleSide,
    })
    const mesh = new THREE.InstancedMesh(geo, material, flags.length)
    flags.forEach((fl, i) => mesh.setMatrixAt(i, fl.m))
    mesh.instanceMatrix.needsUpdate = true
    mesh.frustumCulled = false
    const cordGeos = cords.map((c) => new THREE.TubeGeometry(c, 80, 0.05, 5, false))
    return { mesh, cordGeos, material }
  }, [atlas])

  useFrame((_, delta) => {
    if (!group.current) return
    // only worth drawing near the summit
    const visible = env.act === 'mountain' && env.t < 1.4
    group.current.visible = visible
    if (!visible) return
    const u = material.uniforms
    // scrolling stirs the wind a little
    const dt = Math.min(delta, 1 / 20)
    wind.current = THREE.MathUtils.damp(wind.current, 1 + Math.min(1.5, Math.abs(scrollState.velocity) * 0.04), 2, dt)
    if (!scrollState.reducedMotion) u.uTime.value += dt * wind.current
    u.uSunDir.value.copy(env.sunDir)
    u.uSunColor.value.copy(env.sunColor).multiplyScalar(env.sunIntensity / 3)
    u.uAmbient.value.copy(env.ambient)
    u.uFogColor.value.copy(env.fogColor)
    u.uFogDensity.value = env.fogDensity
  })

  return (
    <group ref={group} userData={{ act: 'mountain' }}>
      <primitive object={mesh} />
      {cordGeos.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshBasicMaterial color="#2a2420" />
        </mesh>
      ))}
    </group>
  )
}

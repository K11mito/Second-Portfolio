'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { makeFlagPrintTexture } from './proceduralTextures'
import { useScrollStore } from '@/lib/useScrollStore'

// Real wind-simulated prayer flags (lung ta): strings sag on a catenary,
// each flag is a cloth grid pinned along its top edge and displaced in a
// vertex shader by layered sine "wind" with per-flag phase + global gusts.
const COLORS = ['#2f5fa8', '#f2f0e6', '#b8342a', '#2e7d4f', '#e8b53a'].map((c) => new THREE.Color(c))

const FLAG_W = 4
const FLAG_H = 3
const GAP = 1.4
const SEG_X = 6
const SEG_Y = 4

const vertex = /* glsl */ `
  uniform float uTime;
  uniform float uAmp;
  attribute float aPin;   // 1 at the pinned top edge → 0 at the free edge
  attribute float aRand;  // per-flag random
  attribute vec3 aColor;
  attribute vec2 aLocal;  // x: -1..1 across flag, y: 0..1 down
  varying vec2 vUv;
  varying vec3 vColor;
  varying float vShade;
  #include <fog_pars_vertex>
  void main() {
    vUv = uv;
    vColor = aColor;
    float flap = 1.0 - aPin;
    float t = uTime;
    float phase = aRand * 6.2831;
    float sway = sin(t * 1.5 + phase) * 0.6 + sin(t * 0.7 + phase * 2.0) * 0.4;
    float ripple = sin(t * 6.0 + phase + aLocal.x * 2.6 + aLocal.y * 3.0);
    float ripple2 = sin(t * 9.5 + phase * 1.7 + aLocal.x * 4.2);
    float amp = uAmp * (0.4 + 0.6 * aRand);
    vec3 p = position;
    p.z += (sway * 0.85 + ripple * 0.3 + ripple2 * 0.12) * flap * amp;
    p.x += sway * 0.2 * flap * amp;
    p.y += (ripple * 0.12 - abs(sway) * 0.18) * flap * amp;
    vShade = 0.8 + 0.2 * (0.5 + 0.5 * ripple);
    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`

const fragment = /* glsl */ `
  uniform sampler2D uPrint;
  varying vec2 vUv;
  varying vec3 vColor;
  varying float vShade;
  #include <fog_pars_fragment>
  void main() {
    vec4 print = texture2D(uPrint, vUv);
    vec3 col = mix(vColor, vec3(0.97, 0.96, 0.92), print.a * 0.85);
    col *= vShade;
    gl_FragColor = vec4(col, 1.0);
    #include <fog_fragment>
  }
`

function catenary(A, B, sag, t, out) {
  out.lerpVectors(A, B, t)
  out.y -= sag * 4 * t * (1 - t)
  return out
}

function FlagString({ from, to, sag = 6, amp = 1, seed = 1 }) {
  const matRef = useRef()
  const gust = useRef(seed * 17.3)

  const { geometry, lineGeometry } = useMemo(() => {
    const A = new THREE.Vector3(...from)
    const B = new THREE.Vector3(...to)
    const len = A.distanceTo(B)
    const count = Math.max(3, Math.floor((len * 0.84) / (FLAG_W + GAP)))
    const vertsPerFlag = (SEG_X + 1) * (SEG_Y + 1)

    const positions = new Float32Array(count * vertsPerFlag * 3)
    const uvs = new Float32Array(count * vertsPerFlag * 2)
    const pins = new Float32Array(count * vertsPerFlag)
    const rands = new Float32Array(count * vertsPerFlag)
    const colors = new Float32Array(count * vertsPerFlag * 3)
    const locals = new Float32Array(count * vertsPerFlag * 2)
    const indices = []

    const anchor = new THREE.Vector3()
    let rngState = seed * 1000 + 7
    const rng = () => {
      rngState = (rngState * 16807) % 2147483647
      return rngState / 2147483647
    }

    for (let f = 0; f < count; f++) {
      const tCenter = 0.08 + ((f + 0.5) * (FLAG_W + GAP)) / len
      const fRand = rng()
      const color = COLORS[f % COLORS.length]
      const base = f * vertsPerFlag

      for (let row = 0; row <= SEG_Y; row++) {
        for (let col = 0; col <= SEG_X; col++) {
          const vi = base + row * (SEG_X + 1) + col
          const tt = tCenter + (col / SEG_X - 0.5) * (FLAG_W / len)
          catenary(A, B, sag, tt, anchor)
          positions[vi * 3] = anchor.x
          positions[vi * 3 + 1] = anchor.y - (row / SEG_Y) * FLAG_H
          positions[vi * 3 + 2] = anchor.z
          uvs[vi * 2] = col / SEG_X
          uvs[vi * 2 + 1] = 1 - row / SEG_Y
          pins[vi] = 1 - row / SEG_Y
          rands[vi] = fRand
          colors[vi * 3] = color.r
          colors[vi * 3 + 1] = color.g
          colors[vi * 3 + 2] = color.b
          locals[vi * 2] = (col / SEG_X) * 2 - 1
          locals[vi * 2 + 1] = row / SEG_Y
        }
      }
      for (let row = 0; row < SEG_Y; row++) {
        for (let col = 0; col < SEG_X; col++) {
          const a = base + row * (SEG_X + 1) + col
          indices.push(a, a + 1, a + SEG_X + 1, a + 1, a + SEG_X + 2, a + SEG_X + 1)
        }
      }
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
    geometry.setAttribute('aPin', new THREE.BufferAttribute(pins, 1))
    geometry.setAttribute('aRand', new THREE.BufferAttribute(rands, 1))
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('aLocal', new THREE.BufferAttribute(locals, 2))
    geometry.setIndex(indices)
    geometry.computeBoundingSphere()
    geometry.boundingSphere.radius += FLAG_H + 3 // wind slack

    // the string itself
    const pts = []
    for (let i = 0; i <= 48; i++) pts.push(catenary(A, B, sag, i / 48, new THREE.Vector3()).clone())
    const curve = new THREE.CatmullRomCurve3(pts)
    const lineGeometry = new THREE.TubeGeometry(curve, 64, 0.045, 4, false)

    return { geometry, lineGeometry }
  }, [from, to, sag, seed])

  const material = useMemo(() => {
    const uniforms = THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      { uTime: { value: 0 }, uAmp: { value: amp }, uPrint: { value: null } },
    ])
    uniforms.uPrint.value = makeFlagPrintTexture({})
    return new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      uniforms,
      side: THREE.DoubleSide,
      fog: true,
    })
  }, [amp])

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    const { reducedMotion } = useScrollStore.getState()
    material.uniforms.uTime.value = t
    // gusty wind strength
    const gusty = amp * (0.72 + 0.28 * Math.sin(t * 0.4 + gust.current) + 0.12 * Math.sin(t * 1.7 + gust.current * 2))
    const target = reducedMotion ? 0.04 : Math.max(0.25, gusty)
    material.uniforms.uAmp.value += (target - material.uniforms.uAmp.value) * Math.min(1, dt * 3)
  })

  return (
    <group>
      <mesh geometry={geometry} material={material} />
      <mesh geometry={lineGeometry}>
        <meshBasicMaterial color="#3a3128" fog />
      </mesh>
    </group>
  )
}

export default function PrayerFlags() {
  return (
    <group>
      {/* hero — strung across the upper frame */}
      <FlagString from={[-62, 31, -76]} to={[46, 17, -38]} sag={7} amp={1} seed={1} />
      <FlagString from={[-48, 9, -50]} to={[72, 27, -96]} sag={6} amp={0.9} seed={2} />
      {/* valley — above the grassland */}
      <FlagString from={[-72, -105, -72]} to={[62, -109, -30]} sag={5} amp={0.85} seed={3} />
    </group>
  )
}

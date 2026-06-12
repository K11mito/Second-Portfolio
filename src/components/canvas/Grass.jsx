'use client'

import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useScrollStore } from '@/lib/useScrollStore'

// Golden grassland: thousands of instanced blades bending in a wind
// vertex shader (tip-weighted, flow-noise phase per blade, global gusts).
const vertex = /* glsl */ `
  uniform float uTime;
  uniform float uAmp;
  uniform vec2 uWindDir;
  attribute vec3 aOffset;
  attribute float aScale;
  attribute float aRot;
  attribute float aPhase;
  attribute float aTint;
  varying float vY;
  varying float vTint;
  #include <fog_pars_vertex>
  void main() {
    vY = uv.y;
    vTint = aTint;
    vec3 p = position;
    p.x *= (1.0 - pow(uv.y, 1.4) * 0.82);
    p.y *= aScale;
    float c = cos(aRot);
    float s = sin(aRot);
    p = vec3(c * p.x, p.y, s * p.x);
    float t = uTime;
    float sway = sin(t * 1.4 + aPhase + aOffset.x * 0.06 + aOffset.z * 0.05);
    float gust = 0.5 + 0.5 * sin(t * 0.35 + aOffset.x * 0.014 + aPhase * 0.23);
    float k = uv.y * uv.y;
    float bend = (0.2 + 0.8 * (sway * 0.5 + 0.5)) * (0.3 + 0.7 * gust) * uAmp * aScale;
    p.x += k * bend * uWindDir.x;
    p.z += k * bend * uWindDir.y;
    p.y -= k * bend * 0.3;
    vec4 mvPosition = viewMatrix * vec4(p + aOffset, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`

const fragment = /* glsl */ `
  uniform vec3 uRoot;
  uniform vec3 uTip;
  varying float vY;
  varying float vTint;
  #include <fog_pars_fragment>
  void main() {
    vec3 col = mix(uRoot, uTip, vY);
    col *= 0.8 + 0.4 * vTint;
    gl_FragColor = vec4(col, 1.0);
    #include <fog_fragment>
  }
`

function GrassPatch({ x = [-100, 100], z = [-100, 0], y = 0, count = 10000, height = [1.5, 3], amp = 0.55, bladeWidth = 0.16 }) {
  const geometry = useMemo(() => {
    const base = new THREE.PlaneGeometry(bladeWidth, 1, 1, 4)
    base.translate(0, 0.5, 0)
    const geo = new THREE.InstancedBufferGeometry()
    geo.index = base.index
    geo.attributes.position = base.attributes.position
    geo.attributes.uv = base.attributes.uv

    const offsets = new Float32Array(count * 3)
    const scales = new Float32Array(count)
    const rots = new Float32Array(count)
    const phases = new Float32Array(count)
    const tints = new Float32Array(count)
    let s = 1234 + count
    const rng = () => {
      s = (s * 16807) % 2147483647
      return s / 2147483647
    }
    for (let i = 0; i < count; i++) {
      offsets[i * 3] = x[0] + rng() * (x[1] - x[0])
      offsets[i * 3 + 1] = y
      offsets[i * 3 + 2] = z[0] + rng() * (z[1] - z[0])
      scales[i] = height[0] + rng() * (height[1] - height[0])
      rots[i] = rng() * Math.PI
      phases[i] = rng() * Math.PI * 2
      tints[i] = rng()
    }
    geo.setAttribute('aOffset', new THREE.InstancedBufferAttribute(offsets, 3))
    geo.setAttribute('aScale', new THREE.InstancedBufferAttribute(scales, 1))
    geo.setAttribute('aRot', new THREE.InstancedBufferAttribute(rots, 1))
    geo.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phases, 1))
    geo.setAttribute('aTint', new THREE.InstancedBufferAttribute(tints, 1))
    geo.instanceCount = count

    const cx = (x[0] + x[1]) / 2
    const cz = (z[0] + z[1]) / 2
    const r = Math.hypot(x[1] - x[0], z[1] - z[0]) / 2 + height[1] + 1
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(cx, y + height[1] / 2, cz), r)
    return geo
  }, [x, z, y, count, height, bladeWidth])

  const material = useMemo(() => {
    const uniforms = THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uTime: { value: 0 },
        uAmp: { value: amp },
        uWindDir: { value: new THREE.Vector2(0.82, 0.57) },
        uRoot: { value: new THREE.Color('#6e5722') },
        uTip: { value: new THREE.Color('#dcb964') },
      },
    ])
    return new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      uniforms,
      side: THREE.DoubleSide,
      fog: true,
    })
  }, [amp])

  useFrame((state, dt) => {
    const { reducedMotion } = useScrollStore.getState()
    material.uniforms.uTime.value = state.clock.elapsedTime
    const target = reducedMotion ? 0.02 : amp
    material.uniforms.uAmp.value += (target - material.uniforms.uAmp.value) * Math.min(1, dt * 2)
  })

  if (count <= 0) return null
  return <mesh geometry={geometry} material={material} />
}

export default function Grass({ grassCount = 30000, heroGrassCount = 6000 }) {
  return (
    <group>
      {/* hero ledge — sways at the bottom of the first frame */}
      <GrassPatch x={[-48, 48]} z={[7, 19]} y={-7} count={heroGrassCount} height={[1.6, 3.1]} amp={0.5} bladeWidth={0.3} />
      {/* the valley grassland */}
      <GrassPatch x={[-135, 135]} z={[-108, 4]} y={-128} count={grassCount} height={[1.7, 3.4]} amp={0.6} />
    </group>
  )
}

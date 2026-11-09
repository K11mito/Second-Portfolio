'use client'

import { useMemo, useRef } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { env } from './env'

// Soft cumulus sprites clustered along the descent. Seen from above they read as
// billows rising out of the cloud sea; as the camera sinks into them they rush
// past, which sells the volume and speed of the fall before the white-out.

const COUNT = 44
// Start of the interlude descent (matches the Director's t = 3 keyframe) and its heading.
const ORIGIN = new THREE.Vector3(-620, 0, -760)
const HEADING = new THREE.Vector3(500, 0, 600).normalize()
const SIDE = new THREE.Vector3(-HEADING.z, 0, HEADING.x)

function rand(seed) {
  let s = seed
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}

const vertexShader = /* glsl */ `
  attribute vec3 aCenter;
  attribute float aSize;
  attribute float aRot;
  attribute float aTile;
  attribute float aAlpha;
  varying vec2 vUv;
  varying float vTile;
  varying float vAlpha;
  varying float vDepth;
  varying float vHeight;
  void main() {
    vec4 mv = viewMatrix * vec4(aCenter, 1.0);
    float c = cos(aRot), s = sin(aRot);
    mv.xy += mat2(c, -s, s, c) * position.xy * aSize;
    vUv = uv;
    vTile = aTile;
    vAlpha = aAlpha;
    vDepth = -mv.z;
    vHeight = position.y;
    gl_Position = projectionMatrix * mv;
  }
`

const fragmentShader = /* glsl */ `
  uniform sampler2D uAtlas;
  uniform vec3 uLight;
  uniform vec3 uShade;
  uniform vec3 uFogColor;
  uniform float uFogDensity;
  uniform float uOpacity;
  varying vec2 vUv;
  varying float vTile;
  varying float vAlpha;
  varying float vDepth;
  varying float vHeight;
  void main() {
    vec2 cell = vec2(mod(vTile, 2.0), floor(vTile / 2.0));
    vec4 tex = texture2D(uAtlas, (vUv + cell) * 0.5);
    // fade sprites well before they reach the lens: no popping, and no
    // screen-filling overdraw (the white-out takes over up close)
    float near = smoothstep(18.0, 70.0, vDepth);
    float a = tex.a * vAlpha * near * uOpacity;
    if (a < 0.004) discard;
    vec3 col = mix(uShade, uLight, clamp(tex.r * 0.85 + vHeight * 0.35 + 0.15, 0.0, 1.0));
    float fogF = 1.0 - exp(-uFogDensity * uFogDensity * vDepth * vDepth);
    col = mix(col, uFogColor, fogF * 0.7);
    gl_FragColor = vec4(col, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

export default function CloudPuffs() {
  const atlas = useLoader(THREE.TextureLoader, '/textures/cloud-puffs.webp')
  const mesh = useRef()

  const { geometry, material, sprites, order, dist } = useMemo(() => {
    atlas.colorSpace = THREE.SRGBColorSpace
    const r = rand(2024)
    const sprites = []
    for (let i = 0; i < COUNT; i++) {
      const along = -60 + r() * 340
      const across = (r() - 0.5) * 2 * (60 + along * 0.4)
      const c = ORIGIN.clone().addScaledVector(HEADING, along).addScaledVector(SIDE, across)
      c.y = 150 + r() * 58
      sprites.push({ c, size: 30 + r() * 52, rot: r() * Math.PI * 2, tile: Math.floor(r() * 4), alpha: 0.55 + r() * 0.4 })
    }
    const geometry = new THREE.InstancedBufferGeometry()
    const quad = new THREE.PlaneGeometry(1, 1)
    geometry.index = quad.index
    geometry.setAttribute('position', quad.getAttribute('position'))
    geometry.setAttribute('uv', quad.getAttribute('uv'))
    const attr = (n) => new THREE.InstancedBufferAttribute(new Float32Array(COUNT * n), n).setUsage(THREE.DynamicDrawUsage)
    geometry.setAttribute('aCenter', attr(3))
    geometry.setAttribute('aSize', attr(1))
    geometry.setAttribute('aRot', attr(1))
    geometry.setAttribute('aTile', attr(1))
    geometry.setAttribute('aAlpha', attr(1))
    geometry.instanceCount = COUNT
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uAtlas: { value: atlas },
        uLight: { value: new THREE.Color() },
        uShade: { value: new THREE.Color() },
        uFogColor: { value: new THREE.Color() },
        uFogDensity: { value: 0 },
        uOpacity: { value: 0 },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
    })
    return { geometry, material, sprites, order: Array.from({ length: COUNT }, (_, i) => i), dist: new Float32Array(COUNT) }
  }, [atlas])

  useFrame(({ camera }) => {
    const m = mesh.current
    if (!m) return
    // only around the descent, and gone once the white-out covers the screen
    // (anything drawn under an opaque overlay is wasted fill-rate)
    const k = THREE.MathUtils.smoothstep(env.t, 2.55, 2.95) * (1 - THREE.MathUtils.smoothstep(env.whiteout, 0.55, 0.95))
    const visible = env.act === 'mountain' && k > 0.001
    m.visible = visible
    if (!visible) return
    const u = material.uniforms
    u.uOpacity.value = k
    u.uLight.value.copy(env.cloudLight)
    u.uShade.value.copy(env.cloudShade)
    u.uFogColor.value.copy(env.fogColor)
    u.uFogDensity.value = env.fogDensity

    // back-to-front, so soft edges layer correctly; every attribute follows the order
    for (let i = 0; i < COUNT; i++) dist[i] = sprites[i].c.distanceToSquared(camera.position)
    order.sort((a, b) => dist[b] - dist[a])
    const center = geometry.attributes.aCenter
    const size = geometry.attributes.aSize
    const rot = geometry.attributes.aRot
    const tile = geometry.attributes.aTile
    const alpha = geometry.attributes.aAlpha
    for (let j = 0; j < COUNT; j++) {
      const s = sprites[order[j]]
      center.setXYZ(j, s.c.x, s.c.y, s.c.z)
      size.setX(j, s.size)
      rot.setX(j, s.rot)
      tile.setX(j, s.tile)
      alpha.setX(j, s.alpha)
    }
    center.needsUpdate = size.needsUpdate = rot.needsUpdate = tile.needsUpdate = alpha.needsUpdate = true
  })

  return (
    <mesh
      ref={mesh}
      geometry={geometry}
      material={material}
      frustumCulled={false}
      renderOrder={6}
      userData={{ act: 'mountain' }}
    />
  )
}

'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { makeCloudTexture } from './proceduralTextures'
import { useScrollStore } from '@/lib/useScrollStore'
import { whiteoutBell } from './Atmosphere'

// Soft cloud sprites drifting between layers. Three bands:
//  'hero'   — sparse, between mountain layers at altitude
//  'white'  — the dense cluster powering the whiteout crossing
//  'valley' — distant low haze over the grassland
export default function Mist({ count = 16 }) {
  const textures = useMemo(() => [makeCloudTexture({ seed: 31 }), makeCloudTexture({ seed: 37, density: 18 })], [])
  const refs = useRef([])

  const sprites = useMemo(() => {
    const out = []
    const rng = (a, b) => a + Math.random() * (b - a)
    const heroN = Math.max(2, Math.round(count * 0.3))
    const whiteN = Math.max(4, Math.round(count * 0.45))
    const valleyN = Math.max(2, count - heroN - whiteN)
    for (let i = 0; i < heroN; i++)
      out.push({ band: 'hero', x: rng(-220, 220), y: rng(-50, 24), z: rng(-260, -90), sx: rng(70, 150), op: rng(0.2, 0.42), speed: rng(0.4, 1.2), phase: rng(0, 100) })
    for (let i = 0; i < whiteN; i++)
      out.push({ band: 'white', x: rng(-160, 160), y: rng(-104, -64), z: rng(-150, -40), sx: rng(110, 220), op: rng(0.5, 0.8), speed: rng(0.5, 1.4), phase: rng(0, 100) })
    for (let i = 0; i < valleyN; i++)
      out.push({ band: 'valley', x: rng(-260, 260), y: rng(-132, -116), z: rng(-300, -150), sx: rng(90, 180), op: rng(0.16, 0.3), speed: rng(0.3, 0.8), phase: rng(0, 100) })
    return out
  }, [count])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const { progress, marks } = useScrollStore.getState()
    const bell = whiteoutBell(progress, marks.cloudsCenter)
    sprites.forEach((s, i) => {
      const ref = refs.current[i]
      if (!ref) return
      ref.position.x = s.x + Math.sin(t * 0.04 * s.speed + s.phase) * 60
      ref.position.y = s.y + Math.sin(t * 0.03 * s.speed + s.phase * 1.7) * 4
      const boost = s.band === 'white' ? 0.25 + bell * 0.75 : 1
      ref.material.opacity = s.op * boost
    })
  })

  return (
    <group>
      {sprites.map((s, i) => (
        <sprite
          key={i}
          ref={(el) => (refs.current[i] = el)}
          position={[s.x, s.y, s.z]}
          scale={[s.sx, s.sx * 0.46, 1]}
        >
          <spriteMaterial
            map={textures[i % 2]}
            transparent
            depthWrite={false}
            opacity={s.op}
            color={s.band === 'valley' ? '#f2e9d4' : '#f7fafc'}
            fog
          />
        </sprite>
      ))}
    </group>
  )
}

'use client'

import { useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing'
import { useScrollStore } from '@/lib/useScrollStore'

// Scroll-driven fog: light aerial haze at altitude, a dense whiteout at
// the cloud crossing, then a warm golden haze in the valley.
const MIST = new THREE.Color('#cfe0ef')
const WHITE = new THREE.Color('#f3f5f7')
const WARM = new THREE.Color('#e3d6b4')

export function whiteoutBell(progress, center) {
  // narrow bell: fog density compounds with distance², so a wide bell
  // swallows neighbouring sections long before the crossing
  const x = (progress - center) / 0.038
  return Math.exp(-x * x)
}

export default function Atmosphere({ post = true }) {
  const { scene } = useThree()
  const fog = useMemo(() => new THREE.FogExp2('#cfe0ef', 0.0012), [])
  const color = useMemo(() => new THREE.Color(), [])

  useFrame(() => {
    const { progress, marks } = useScrollStore.getState()
    const bell = whiteoutBell(progress, marks.cloudsCenter)
    const valley = Math.min(1, Math.max(0, (progress - marks.experience) / 0.12))

    fog.density = 0.0012 + bell * 0.02 + valley * 0.0008
    color.copy(MIST).lerp(WHITE, bell).lerp(WARM, valley * 0.55)
    fog.color.copy(color)
    if (scene.fog !== fog) scene.fog = fog
  })

  if (!post) return null
  return (
    <EffectComposer>
      <Bloom intensity={0.32} luminanceThreshold={0.85} mipmapBlur />
      <Vignette eskil={false} offset={0.16} darkness={0.55} />
      <Noise premultiply opacity={0.05} />
    </EffectComposer>
  )
}

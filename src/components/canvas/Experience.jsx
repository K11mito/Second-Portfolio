'use client'

import { Suspense, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { detectTier, TIER_SETTINGS } from '@/lib/quality'
import { useScrollStore } from '@/lib/useScrollStore'
import Sky from './Sky'
import World from './World'
import PrayerFlags from './PrayerFlags'
import Grass from './Grass'
import Mist from './Mist'
import CameraRig from './CameraRig'
import Atmosphere from './Atmosphere'

// Fallback for devices without WebGL: a quiet painted gradient. The full
// content remains readable — only the living world is skipped.
function StaticBackdrop() {
  return (
    <div
      className="fixed inset-0 z-0 pointer-events-none"
      aria-hidden
      style={{
        background:
          'linear-gradient(to bottom, #1d3e7c 0%, #4a78b8 22%, #9dbede 42%, #d7e4f0 55%, #e6dcbd 75%, #c9ad77 100%)',
      }}
    />
  )
}

export default function Experience() {
  const [tier, setTier] = useState(null)

  useEffect(() => {
    const t = detectTier()
    setTier(t)
    useScrollStore.getState().setTier(t)
    if (t === 'low') useScrollStore.getState().setReady()
  }, [])

  if (!tier) return null
  if (tier === 'low') return <StaticBackdrop />

  const s = TIER_SETTINGS[tier]
  return (
    <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden>
      <Canvas
        dpr={s.dpr}
        camera={{ fov: 42, near: 0.1, far: 1400, position: [0, 4, 34] }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.setClearColor('#cfe0ef')
          useScrollStore.getState().setReady()
        }}
      >
        <Suspense fallback={null}>
          <Sky />
          <World />
          <PrayerFlags />
          <Grass grassCount={s.grassCount} heroGrassCount={s.heroGrassCount} />
          <Mist count={s.mistCount} />
          <CameraRig />
          <Atmosphere post={s.post} />
        </Suspense>
      </Canvas>
    </div>
  )
}

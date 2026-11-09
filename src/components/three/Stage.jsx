'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { PerformanceMonitor, useProgress } from '@react-three/drei'
import * as THREE from 'three'
import World from './World'
import { env } from './env'
import { setLoading } from '@/lib/loading'

// Signals "ready" once the summit's assets have resolved, the prayer flags have
// settled, and a few frames have been drawn (the first frame compiles the
// shaders, hidden under the poster). The flags never hold the curtain for more
// than a few seconds. The monastery streams in separately and warms itself up.
function Ready() {
  const frames = useRef(0)
  const done = useRef(false)
  const since = useRef(0)

  useFrame(() => {
    if (done.current) return
    frames.current += 1
    if (!since.current) since.current = performance.now()
    const flags = env.flagsReady || performance.now() - since.current > 4000
    if (frames.current > 3 && flags) {
      done.current = true
      setLoading({ ready: true, progress: 1 })
    }
  })
  return null
}

function ProgressBridge() {
  const { progress } = useProgress()
  useEffect(() => {
    setLoading({ progress: Math.min(0.99, progress / 100) })
  }, [progress])
  return null
}

// Resolution budget: phones start lighter; the PerformanceMonitor steps the
// pixel ratio down when frames slip and back up when there is headroom.
function initialDpr() {
  if (typeof window === 'undefined') return 1
  const native = window.devicePixelRatio || 1
  const small = window.matchMedia('(max-width: 767px), (pointer: coarse)').matches
  return Math.min(native, small ? 1.5 : 1.75)
}

export default function Stage() {
  const [dpr, setDpr] = useState(initialDpr)
  const ceiling = useRef(initialDpr())

  return (
    <>
      <ProgressBridge />
      <Canvas
        className="!fixed inset-0"
        shadows
        dpr={dpr}
        gl={{ antialias: true, powerPreference: 'high-performance', alpha: false, stencil: false }}
        camera={{ fov: 36, near: 1, far: 9000, position: [-560, 360, 620] }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = 1.0
          gl.setClearColor('#0b1f3d')
          const q = new URLSearchParams(window.location.search)
          if (q.has('debug')) {
            window.__r3f = { gl }
            if (q.get('tm') === 'agx') gl.toneMapping = THREE.AgXToneMapping
            if (q.get('exp')) gl.toneMappingExposure = Number(q.get('exp'))
          }
        }}
        aria-hidden="true"
        tabIndex={-1}
      >
        <PerformanceMonitor
          flipflops={3}
          onDecline={() => setDpr((d) => Math.max(1, +(d - 0.25).toFixed(2)))}
          onIncline={() => setDpr((d) => Math.min(ceiling.current, +(d + 0.25).toFixed(2)))}
          onFallback={() => setDpr(1)}
        />
        <Suspense fallback={null}>
          <World />
          <Ready />
        </Suspense>
      </Canvas>
    </>
  )
}

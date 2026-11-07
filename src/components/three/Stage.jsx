'use client'

import { Suspense, useEffect, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useProgress } from '@react-three/drei'
import * as THREE from 'three'
import World from './World'
import { setLoading } from '@/lib/loading'

// Signals "ready" once the summit's assets have resolved and a few frames have
// been drawn (the first frame compiles the shaders, hidden under the poster).
// The monastery streams in separately and warms itself up (see Monastery).
function Ready() {
  const frames = useRef(0)
  const done = useRef(false)

  useFrame(() => {
    if (done.current) return
    frames.current += 1
    if (frames.current > 3) {
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

export default function Stage() {
  return (
    <>
      <ProgressBridge />
      <Canvas
        className="!fixed inset-0"
        shadows
        dpr={[1, 1.75]}
        gl={{ antialias: true, powerPreference: 'high-performance', alpha: false, stencil: false }}
        camera={{ fov: 36, near: 1, far: 9000, position: [330, 330, 470] }}
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
        <Suspense fallback={null}>
          <World />
          <Ready />
        </Suspense>
      </Canvas>
    </>
  )
}

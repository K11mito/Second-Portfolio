'use client'

import { Suspense, useEffect, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useProgress } from '@react-three/drei'
import * as THREE from 'three'
import World from './World'
import { setLoading } from '@/lib/loading'

// Signals "ready" once every asset inside the Suspense boundary has resolved,
// all shaders (including hidden acts) are compiled, and a frame has been drawn.
function Ready() {
  const { gl, scene, camera } = useThree()
  const frames = useRef(0)
  const done = useRef(false)

  useEffect(() => {
    const hidden = []
    scene.traverse((o) => {
      if (!o.visible) {
        hidden.push(o)
        o.visible = true
      }
    })
    try {
      gl.compile(scene, camera)
    } catch (e) {
      // compile is an optimisation only
    }
    hidden.forEach((o) => (o.visible = false))
  }, [gl, scene, camera])

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

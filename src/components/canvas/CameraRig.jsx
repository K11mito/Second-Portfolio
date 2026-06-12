'use client'

import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { easing } from 'maath'
import * as THREE from 'three'
import { useScrollStore } from '@/lib/useScrollStore'

// The cinematic descent. Keyframes are expressed against the measured
// section marks (so DOM layout changes — e.g. the taller mobile
// experiences stack — keep the world beats aligned with the content).
const Y = { hero: 4, about: -28, projects: -54, clouds: -86, experience: -108, contact: -118, end: -121 }
const Z = { hero: 34, about: 33, projects: 31, clouds: 30, experience: 29, contact: 28, end: 30 }
const LOOK_AHEAD = -120

function smooth(t) {
  return t * t * (3 - 2 * t)
}

function sample(progress, marks) {
  // piecewise keyframe track over the measured marks
  const keys = [
    { t: 0, y: Y.hero, z: Z.hero, lookY: 12 },
    { t: marks.about, y: Y.about, z: Z.about, lookY: Y.about + 2 },
    { t: marks.projects, y: Y.projects, z: Z.projects, lookY: Y.projects + 1 },
    { t: marks.cloudsCenter, y: Y.clouds, z: Z.clouds, lookY: Y.clouds },
    { t: marks.experience, y: Y.experience, z: Z.experience, lookY: Y.experience - 1 },
    { t: marks.contact, y: Y.contact, z: Z.contact, lookY: Y.contact + 1 },
    { t: 1, y: Y.end, z: Z.end, lookY: Y.end + 3 },
  ]
  let i = 0
  while (i < keys.length - 2 && progress > keys[i + 1].t) i++
  const a = keys[i]
  const b = keys[i + 1]
  const span = Math.max(1e-5, b.t - a.t)
  const t = smooth(Math.min(1, Math.max(0, (progress - a.t) / span)))
  return {
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
    lookY: a.lookY + (b.lookY - a.lookY) * t,
  }
}

export default function CameraRig() {
  const { camera } = useThree()
  const look = useRef(new THREE.Vector3(0, 10, LOOK_AHEAD))
  const mouse = useRef({ x: 0, y: 0 })
  const target = useRef(new THREE.Vector3())
  const lookTarget = useRef(new THREE.Vector3())

  useEffect(() => {
    const onMove = (e) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1
      mouse.current.y = (e.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  useFrame((state, dt) => {
    const { progress, marks, reducedMotion } = useScrollStore.getState()
    const k = sample(progress, marks)

    const mx = reducedMotion ? 0 : mouse.current.x
    const my = reducedMotion ? 0 : mouse.current.y
    target.current.set(mx * 1.4, k.y - my * 0.8, k.z)
    lookTarget.current.set(mx * 2.2, k.lookY - my * 1.2, LOOK_AHEAD)

    if (reducedMotion) {
      camera.position.copy(target.current)
      look.current.copy(lookTarget.current)
    } else {
      easing.damp3(camera.position, target.current, 0.28, dt)
      easing.damp3(look.current, lookTarget.current, 0.32, dt)
    }
    camera.lookAt(look.current)
  })

  return null
}

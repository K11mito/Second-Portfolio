'use client'

import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { env } from './env'
import { SHADOW_LAYER } from './Terrain'

// light thrown back up from the ground: warm rock by day, almost nothing at night
const GROUND_DAY = new THREE.Color('#4a3a30')
const GROUND_NIGHT = new THREE.Color('#14161d')

// Sun + sky light for the mountain act, retinted every frame by the Director.
// The shadow map is only re-rendered when the sun actually moves, so a page
// that is sitting still costs nothing extra.
export default function Lights() {
  const sunLight = useRef()
  const hemi = useRef()
  const { gl } = useThree()
  const lastDir = useRef(new THREE.Vector3())

  useEffect(() => {
    gl.shadowMap.autoUpdate = false
    gl.shadowMap.needsUpdate = true
    const l = sunLight.current
    if (!l) return
    const small = window.matchMedia('(max-width: 767px), (pointer: coarse)').matches
    l.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048)
    const cam = l.shadow.camera
    cam.left = -620
    cam.right = 620
    cam.top = 620
    cam.bottom = -620
    cam.near = 10
    cam.far = 3200
    cam.layers.set(SHADOW_LAYER) // only the decimated caster renders into the shadow map
    cam.updateProjectionMatrix()
    l.shadow.bias = -0.0004
    l.shadow.normalBias = 2.4
    l.target.position.set(-40, 150, 0)
    l.target.updateMatrixWorld()
  }, [gl])

  useFrame(() => {
    const on = env.act === 'mountain'
    const l = sunLight.current
    if (l) {
      l.visible = on
      l.position.copy(env.sunDir).multiplyScalar(1500).add(l.target.position)
      l.color.copy(env.sunColor)
      l.intensity = env.sunIntensity
      if (on && lastDir.current.distanceToSquared(env.sunDir) > 1e-7) {
        lastDir.current.copy(env.sunDir)
        gl.shadowMap.needsUpdate = true
      }
    }
    if (hemi.current) {
      hemi.current.visible = on
      hemi.current.color.copy(env.ambient)
      hemi.current.groundColor.lerpColors(GROUND_NIGHT, GROUND_DAY, env.daylight)
      hemi.current.intensity = env.ambientIntensity
    }
  })

  return (
    <>
      <directionalLight ref={sunLight} castShadow userData={{ act: 'mountain' }} />
      <hemisphereLight ref={hemi} userData={{ act: 'mountain' }} />
    </>
  )
}

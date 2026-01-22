'use client'

import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useScroll, useGLTF, useTexture } from '@react-three/drei'
import * as THREE from 'three'

// Preload the mountain model
useGLTF.preload('/models/snowy_mountain.glb')

// Hemisphere backdrop covering the entire scene
function HemisphereBackdrop() {
  const texture = useTexture('/images/backgrounds/background6.png')

  // Configure texture
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.ClampToEdgeWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping

  // Create hemisphere geometry
  const geometry = useMemo(() => {
    const radius = 1500
    const widthSegments = 64
    const heightSegments = 32
    // Create a sphere but only render the top hemisphere
    // phiStart: 0, phiLength: 2*PI (full circle horizontally)
    // thetaStart: 0, thetaLength: PI/2 (only top half)
    const geo = new THREE.SphereGeometry(
      radius,
      widthSegments,
      heightSegments,
      0,              // phiStart
      Math.PI * 2,    // phiLength (full 360)
      0,              // thetaStart (from top)
      Math.PI * 0.6   // thetaLength (60% down from top for dome effect)
    )

    return geo
  }, [])

  return (
    <mesh
      geometry={geometry}
      position={[200, -400, -500]}
      rotation={[0, Math.PI, 0]}  // Rotate to face correctly
    >
      <meshBasicMaterial
        map={texture}
        side={THREE.BackSide}
        fog={false}
        toneMapped={false}
      />
    </mesh>
  )
}

function Mountain() {
  const { scene } = useGLTF('/models/snowy_mountain.glb')
  const mountainRef = useRef()

  // Clone the scene to avoid issues with reusing geometry
  const clonedScene = useMemo(() => {
    const clone = scene.clone()
    clone.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
        // Ensure materials are properly set
        if (child.material) {
          child.material.needsUpdate = true
        }
      }
    })
    return clone
  }, [scene])

  return (
    <primitive
      ref={mountainRef}
      object={clonedScene}
      position={[200, -450, -500]}
      scale={[2, 2, 2]}
      rotation={[0, 0, 0]}
    />
  )
}

function CameraRig() {
  const { camera } = useThree()
  const scroll = useScroll()

  // Camera starts EYE-TO-EYE with mountain peak, then descends
  // Start looking straight at the peak (same Y level), then gradually descend
  const startPosition = useMemo(() => new THREE.Vector3(80, -75, 30), [])    // Eye level with peak
  const midPosition = useMemo(() => new THREE.Vector3(50, -180, 180), [])     // Descending
  const endPosition = useMemo(() => new THREE.Vector3(20, -290, 550), [])      // Near the base

  // Target look-at positions - start looking straight at peak, then follow down
  const startLookAt = useMemo(() => new THREE.Vector3(200, -150, -500), [])   // Looking straight at peak
  const midLookAt = useMemo(() => new THREE.Vector3(200, -280, -500), [])     // Looking at mid mountain
  const endLookAt = useMemo(() => new THREE.Vector3(200, -300, -500), [])     // Looking at mountain base

  useFrame(() => {
    // Get scroll progress (0 to 1)
    const scrollOffset = scroll.offset

    // Camera continuously descends through 80% of scroll
    const mountainScrollEnd = 0.80
    const normalizedProgress = Math.min(scrollOffset / mountainScrollEnd, 1)

    // Always update camera while in range
    if (scrollOffset <= mountainScrollEnd) {
      let targetPosition
      let targetLookAt

      if (normalizedProgress < 0.4) {
        // First 40%: eye-level at peak, gradual movement
        const t = normalizedProgress / 0.4
        const easedT = t * t
        targetPosition = new THREE.Vector3().lerpVectors(startPosition, midPosition, easedT)
        targetLookAt = new THREE.Vector3().lerpVectors(startLookAt, midLookAt, easedT)
      } else {
        // Remaining 60%: continue descent through clouds
        const t = (normalizedProgress - 0.4) / 0.6
        const easedT = 1 - Math.pow(1 - t, 2)
        targetPosition = new THREE.Vector3().lerpVectors(midPosition, endPosition, easedT)
        targetLookAt = new THREE.Vector3().lerpVectors(midLookAt, endLookAt, easedT)
      }

      camera.position.lerp(targetPosition, 0.06)
      camera.lookAt(targetLookAt)
    }
  })

  return null
}

export default function MountainExperience() {
  const scroll = useScroll()
  const groupRef = useRef()

  useFrame(() => {
    if (groupRef.current) {
      // Fade out mountain as clouds fully converge
      const scrollOffset = scroll.offset
      const fadeStart = 0.60  // Start fading mid-way through cloud transition
      const fadeEnd = 0.75    // Fully hidden when clouds cover

      if (scrollOffset > fadeStart && scrollOffset < fadeEnd) {
        const fadeProgress = (scrollOffset - fadeStart) / (fadeEnd - fadeStart)
        groupRef.current.visible = fadeProgress < 0.95
      } else if (scrollOffset >= fadeEnd) {
        groupRef.current.visible = false
      } else {
        groupRef.current.visible = true
      }
    }
  })

  return (
    <group ref={groupRef}>
      {/* Hemisphere backdrop covering the scene */}
      <HemisphereBackdrop />

      {/* Camera movement controller */}
      <CameraRig />

      {/* Mountain model */}
      <Mountain />

      {/* Ground fog for atmosphere - extended range for zoomed out view */}
      <fog attach="fog" args={['#C9D6DF', 500, 2500]} />
    </group>
  )
}

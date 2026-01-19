'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useScroll, useTexture } from '@react-three/drei'
import * as THREE from 'three'

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function easeOutQuad(t) {
  return 1 - (1 - t) * (1 - t)
}

// Individual cloud sprite that slides in from the side
function CloudSprite({ texture, startX, y, z, scale, targetX, opacity, delay }) {
  const meshRef = useRef()
  const materialRef = useRef()

  const initialX = useMemo(() => startX, [startX])

  return (
    <mesh
      ref={meshRef}
      position={[initialX, y, z]}
      scale={scale}
    >
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        ref={materialRef}
        map={texture}
        transparent
        opacity={0}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

export default function CloudTransition() {
  const groupRef = useRef()
  const overlayRef = useRef()
  const scroll = useScroll()

  // Load cloud textures
  const cloud1Texture = useTexture('/images/cloud1.png')
  const cloud2Texture = useTexture('/images/cloud2.png')

  // Configure textures
  cloud1Texture.colorSpace = THREE.SRGBColorSpace
  cloud2Texture.colorSpace = THREE.SRGBColorSpace

  // Define cloud layers - mix of both textures, coming from left and right
  const cloudLayers = useMemo(() => [
    // Back layer - larger, more transparent
    { texture: 'cloud1', side: 'left', x: -180, y: 10, z: -20, scale: 120, opacity: 0.4, delay: 0 },
    { texture: 'cloud2', side: 'right', x: 180, y: -15, z: -15, scale: 130, opacity: 0.35, delay: 0.05 },

    // Mid-back layer
    { texture: 'cloud2', side: 'left', x: -160, y: -20, z: 0, scale: 100, opacity: 0.5, delay: 0.1 },
    { texture: 'cloud1', side: 'right', x: 170, y: 25, z: 5, scale: 110, opacity: 0.45, delay: 0.08 },

    // Middle layer - main coverage
    { texture: 'cloud1', side: 'left', x: -150, y: 5, z: 20, scale: 90, opacity: 0.65, delay: 0.15 },
    { texture: 'cloud2', side: 'right', x: 155, y: -10, z: 25, scale: 95, opacity: 0.6, delay: 0.12 },
    { texture: 'cloud2', side: 'left', x: -145, y: -25, z: 30, scale: 85, opacity: 0.55, delay: 0.18 },
    { texture: 'cloud1', side: 'right', x: 150, y: 20, z: 35, scale: 88, opacity: 0.58, delay: 0.2 },

    // Front layer - closest, most opaque
    { texture: 'cloud1', side: 'left', x: -130, y: 0, z: 50, scale: 80, opacity: 0.8, delay: 0.22 },
    { texture: 'cloud2', side: 'right', x: 135, y: -5, z: 55, scale: 82, opacity: 0.75, delay: 0.25 },
    { texture: 'cloud2', side: 'left', x: -125, y: 15, z: 60, scale: 75, opacity: 0.85, delay: 0.28 },
    { texture: 'cloud1', side: 'right', x: 130, y: -15, z: 65, scale: 78, opacity: 0.82, delay: 0.3 },

    // Foremost layer - for full coverage
    { texture: 'cloud1', side: 'left', x: -110, y: -8, z: 75, scale: 70, opacity: 0.9, delay: 0.32 },
    { texture: 'cloud2', side: 'right', x: 115, y: 8, z: 80, scale: 72, opacity: 0.88, delay: 0.35 },
  ], [])

  // Refs for each cloud mesh
  const cloudRefs = useRef([])

  useFrame(() => {
    const scrollOffset = scroll.offset

    // Cloud transition timing
    const transitionStart = 0.40
    const transitionEnd = 0.75
    const transitionDuration = transitionEnd - transitionStart

    if (groupRef.current) {
      if (scrollOffset >= transitionStart && scrollOffset <= transitionEnd + 0.12) {
        groupRef.current.visible = true

        const rawProgress = Math.min((scrollOffset - transitionStart) / transitionDuration, 1)

        // Update each cloud
        cloudRefs.current.forEach((mesh, i) => {
          if (mesh) {
            const layer = cloudLayers[i]

            // Apply delay to each cloud's progress
            const delayedProgress = Math.max(0, Math.min((rawProgress - layer.delay) / (1 - layer.delay), 1))
            const easedProgress = easeOutQuad(delayedProgress)

            // Calculate position - slide from starting X toward center (and past)
            const direction = layer.side === 'left' ? 1 : -1
            const travelDistance = Math.abs(layer.x) + 40 // Travel past center
            const newX = layer.x + (travelDistance * easedProgress * direction)
            mesh.position.x = newX

            // Fade in opacity
            if (mesh.material) {
              const fadeInProgress = Math.min(delayedProgress * 2, 1)
              mesh.material.opacity = layer.opacity * fadeInProgress
            }
          }
        })
      } else if (scrollOffset > transitionEnd + 0.12) {
        groupRef.current.visible = false
      } else {
        groupRef.current.visible = false
        // Reset positions when not visible
        cloudRefs.current.forEach((mesh, i) => {
          if (mesh) {
            mesh.position.x = cloudLayers[i].x
            if (mesh.material) mesh.material.opacity = 0
          }
        })
      }
    }

    // White overlay for clean transition
    if (overlayRef.current) {
      const overlayStart = 0.70
      const overlayPeak = 0.78
      const overlayEnd = 0.88

      if (scrollOffset >= overlayStart && scrollOffset <= overlayPeak) {
        overlayRef.current.visible = true
        const overlayProgress = (scrollOffset - overlayStart) / (overlayPeak - overlayStart)
        overlayRef.current.material.opacity = easeInOutCubic(Math.min(overlayProgress, 1))
      } else if (scrollOffset > overlayPeak && scrollOffset <= overlayEnd) {
        const fadeOutProgress = (scrollOffset - overlayPeak) / (overlayEnd - overlayPeak)
        overlayRef.current.material.opacity = Math.max(1 - easeInOutCubic(fadeOutProgress), 0)
        overlayRef.current.visible = overlayRef.current.material.opacity > 0
      } else {
        overlayRef.current.visible = false
        overlayRef.current.material.opacity = 0
      }
    }
  })

  return (
    <>
      <group ref={groupRef} visible={false}>
        {cloudLayers.map((layer, i) => (
          <mesh
            key={i}
            ref={(el) => (cloudRefs.current[i] = el)}
            position={[layer.x, layer.y, layer.z]}
            scale={[layer.scale, layer.scale * 0.6, 1]}
          >
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial
              map={layer.texture === 'cloud1' ? cloud1Texture : cloud2Texture}
              transparent
              opacity={0}
              depthWrite={false}
              side={THREE.DoubleSide}
              fog={false}
            />
          </mesh>
        ))}
      </group>

      {/* Full screen white overlay */}
      <mesh ref={overlayRef} position={[0, 0, 100]} visible={false}>
        <planeGeometry args={[600, 600]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0}
          depthTest={false}
          fog={false}
        />
      </mesh>
    </>
  )
}

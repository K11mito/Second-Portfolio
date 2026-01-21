'use client'

import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useScroll, useTexture } from '@react-three/drei'
import * as THREE from 'three'

function easeOutQuad(t) {
  return 1 - (1 - t) * (1 - t)
}

function easeInQuad(t) {
  return t * t
}

export default function CloudTransition() {
  const groupRef = useRef()
  const scroll = useScroll()
  const { camera } = useThree()

  // Load cloud textures
  const cloud1Texture = useTexture('/images/cloud1.png')
  const cloud2Texture = useTexture('/images/cloud2.png')

  // Configure textures
  cloud1Texture.colorSpace = THREE.SRGBColorSpace
  cloud2Texture.colorSpace = THREE.SRGBColorSpace

  // Define cloud layers - CLOSER to camera (higher Z values)
  // Removed back layers, kept only front/close layers with MUCH bigger scales
  // All clouds are now very close to camera for full screen coverage
  const cloudLayers = useMemo(() => [
    // Close layer - large clouds that fill the screen
    { texture: 'cloud1', side: 'left', startX: -600, y: -280, z: 400, scale: 500, opacity: 0.9, delay: 0 },
    { texture: 'cloud2', side: 'right', startX: 600, y: -300, z: 420, scale: 520, opacity: 0.85, delay: 0.02 },

    // Main coverage layer - biggest clouds
    { texture: 'cloud2', side: 'left', startX: -550, y: -320, z: 450, scale: 550, opacity: 0.95, delay: 0.04 },
    { texture: 'cloud1', side: 'right', startX: 560, y: -290, z: 460, scale: 540, opacity: 0.9, delay: 0.03 },

    // Foreground layer - closest, for complete coverage
    { texture: 'cloud1', side: 'left', startX: -500, y: -350, z: 500, scale: 600, opacity: 1.0, delay: 0.06 },
    { texture: 'cloud2', side: 'right', startX: 520, y: -330, z: 520, scale: 580, opacity: 0.95, delay: 0.05 },

    // Extra coverage clouds
    { texture: 'cloud2', side: 'left', startX: -480, y: -380, z: 540, scale: 620, opacity: 1.0, delay: 0.08 },
    { texture: 'cloud1', side: 'right', startX: 490, y: -360, z: 550, scale: 600, opacity: 0.98, delay: 0.07 },
  ], [])

  // Refs for each cloud mesh
  const cloudRefs = useRef([])

  useFrame(() => {
    const scrollOffset = scroll.offset

    // Cloud transition timing - slowed down as requested
    // Phase 1: Clouds converge (0.35 - 0.75) - smoother, slower entry
    // Phase 2: Clouds fully cover (0.75 - 0.82)
    // Phase 3: Clouds part to reveal prayer wheel (0.82 - 0.98)
    const convergeStart = 0.4
    const convergeEnd = 0.75
    const holdEnd = 0.82
    const partEnd = 0.98

    if (groupRef.current) {
      // Show clouds during the entire transition
      if (scrollOffset >= convergeStart && scrollOffset <= partEnd) {
        groupRef.current.visible = true

        cloudRefs.current.forEach((mesh, i) => {
          if (mesh && mesh.material) {
            const layer = cloudLayers[i]
            const direction = layer.side === 'left' ? 1 : -1

            let xPosition = layer.startX
            let opacity = 0

            // Converge point shifted to the right by 100
            const convergeOffset = 100

            if (scrollOffset < convergeEnd) {
              // Phase 1: Converge - clouds slide from sides toward center
              const convergeProgress = (scrollOffset - convergeStart) / (convergeEnd - convergeStart)
              const delayedProgress = Math.max(0, Math.min((convergeProgress - layer.delay) / (1 - layer.delay), 1))
              const easedProgress = easeOutQuad(delayedProgress)

              // Move toward center (shifted right by convergeOffset)
              // Clouds meet closer together (direction * 30 instead of 50)
              const targetX = convergeOffset + (direction * 30)
              xPosition = THREE.MathUtils.lerp(layer.startX, targetX, easedProgress)

              // Fade in
              opacity = layer.opacity * Math.min(delayedProgress * 1.5, 1)

            } else if (scrollOffset < holdEnd) {
              // Phase 2: Hold at center - clouds fully visible
              xPosition = convergeOffset + (direction * 30)
              opacity = layer.opacity

            } else {
              // Phase 3: Part - clouds slide back out to sides
              const partProgress = (scrollOffset - holdEnd) / (partEnd - holdEnd)
              const easedProgress = easeInQuad(partProgress)

              // Move from center back to starting position (and beyond)
              const centerX = convergeOffset + (direction * 30)
              const exitX = layer.startX * 1.3 // Go further out than start
              xPosition = THREE.MathUtils.lerp(centerX, exitX, easedProgress)

              // Fade out
              opacity = layer.opacity * (1 - easedProgress)
            }

            mesh.position.x = xPosition
            mesh.material.opacity = opacity
          }
        })
      } else {
        groupRef.current.visible = false
        // Reset positions when not visible
        cloudRefs.current.forEach((mesh, i) => {
          if (mesh) {
            mesh.position.x = cloudLayers[i].startX
            if (mesh.material) mesh.material.opacity = 0
          }
        })
      }
    }
  })

  return (
    <group ref={groupRef} visible={false}>
      {cloudLayers.map((layer, i) => (
        <mesh
          key={i}
          ref={(el) => (cloudRefs.current[i] = el)}
          position={[layer.startX, layer.y, layer.z]}
          scale={[layer.scale, layer.scale * 0.7, 1]}
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
  )
}
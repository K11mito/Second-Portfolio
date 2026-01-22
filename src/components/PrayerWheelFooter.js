'use client'

import { useRef, useMemo, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useScroll, useGLTF, useTexture, Html } from '@react-three/drei'
import * as THREE from 'three'

// Preload the prayer wheel model
useGLTF.preload('/models/prayer_wheel.glb')

// Individual 3D Project Card with glass effect
function ProjectCard3D({ project, index, cardWidth, cardHeight, cardGap, cardSpacing }) {
  const meshRef = useRef()
  const [hovered, setHovered] = useState(false)

  // Load project image as texture
  const texture = useTexture(project.image)
  texture.colorSpace = THREE.SRGBColorSpace

  // Card position: each card is spaced by cardSpacing (cardWidth + gap)
  const xPos = index * cardSpacing

  return (
    <group position={[xPos, 0, 2]}>
      {/* Card background - dark grey with low opacity */}
      <mesh
        ref={meshRef}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <planeGeometry args={[cardWidth, cardHeight]} />
        <meshBasicMaterial
          color={hovered ? "#3a3a3a" : "#1a1a1a"}
          transparent
          opacity={0.6}
        />
      </mesh>

      {/* Project image frame - slightly in front of glass */}
      <mesh position={[0, cardHeight * 0.15, 0.1]}>
        <planeGeometry args={[cardWidth * 0.8, cardHeight * 0.4]} />
        <meshBasicMaterial map={texture} transparent opacity={0.9} />
      </mesh>

      {/* HTML content overlay - positioned on the card */}
      <Html
        center
        position={[0, -cardHeight * 0.22, 0.15]}
        distanceFactor={1.2}
        style={{
          width: `${cardWidth * 100}px`,
          pointerEvents: 'none',
        }}
      >
        <div className="text-center px-2">
          {/* Project title */}
          <h3 className="text-base font-bold text-white font-tibetan mb-1 drop-shadow-lg">
            {project.title}
          </h3>

          {/* Project description */}
          <p className="text-xs text-white mb-2 drop-shadow">
            {project.description}
          </p>

          {/* Tags */}
          <div className="flex flex-wrap justify-center gap-1">
            {project.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-1.5 py-0.5 text-[9px] bg-amber-500/40 rounded-full text-white/90"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </Html>
    </group>
  )
}

// The main carousel rig that handles horizontal scrolling
function CarouselRig({ projects }) {
  const groupRef = useRef()
  const { viewport } = useThree()
  const scroll = useScroll()

  const totalCards = projects.length
  const cardGap = 0.3 // Gap between cards
  const cardWidth = Math.min(viewport.width * 0.3, 2.5) // Smaller card width
  const cardHeight = cardWidth * 1.3 // Card aspect ratio
  const cardSpacing = cardWidth + cardGap // Tighter spacing based on card width

  useFrame(() => {
    if (groupRef.current) {
      // Only activate carousel in prayer wheel section (after 82% scroll)
      const sectionStart = 0.82
      const sectionEnd = 1.0

      if (scroll.offset > sectionStart) {
        // Normalize scroll within the prayer wheel section
        const localProgress = (scroll.offset - sectionStart) / (sectionEnd - sectionStart)

        // Calculate target X: scroll down = slide left
        const totalWidth = cardSpacing * (totalCards - 1)
        const targetX = -localProgress * totalWidth

        // Smooth lerp to target position
        groupRef.current.position.x = THREE.MathUtils.lerp(
          groupRef.current.position.x,
          targetX,
          0.1
        )
      }
    }
  })

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {projects.map((project, index) => (
        <ProjectCard3D
          key={project.title}
          project={project}
          index={index}
          cardWidth={cardWidth}
          cardHeight={cardHeight}
          cardGap={cardGap}
          cardSpacing={cardSpacing}
        />
      ))}
    </group>
  )
}

// Prayer wheel that stays centered in background
function PrayerWheel() {
  const { scene } = useGLTF('/models/prayer_wheel.glb')
  const wheelRef = useRef()
  const scroll = useScroll()
  const rotationRef = useRef(0)
  const lastScrollOffset = useRef(0)

  const clonedScene = useMemo(() => {
    const clone = scene.clone()
    clone.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })
    return clone
  }, [scene])

  useFrame((state, delta) => {
    if (wheelRef.current) {
      const scrollOffset = scroll.offset
      const scrollDelta = scrollOffset - lastScrollOffset.current
      lastScrollOffset.current = scrollOffset

      // Only spin when in the prayer wheel section (after 80% scroll)
      if (scrollOffset > 0.8) {
        // Scroll-based rotation only (reversed direction)
        rotationRef.current -= scrollDelta * 15

        // Apply rotation to wheel
        wheelRef.current.rotation.y = rotationRef.current
      }
    }
  })

  return (
    <primitive
      ref={wheelRef}
      object={clonedScene}
      position={[0, -6, -5]} // Behind the cards (z = -5)
      scale={[0.012, 0.012, 0.012]}
      rotation={[0, 0, 0]}
    />
  )
}

// Dark monastery environment
function MonasteryEnvironment() {
  const scroll = useScroll()
  const floorRef = useRef()
  const backWallRef = useRef()

  useFrame(() => {
    const scrollOffset = scroll.offset
    const visible = scrollOffset > 0.75

    if (floorRef.current) floorRef.current.visible = visible
    if (backWallRef.current) backWallRef.current.visible = visible
  })

  return (
    <group>
      {/* Floor */}
      <mesh ref={floorRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -8, 0]} receiveShadow visible={false}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial
          color="#1a0f0a"
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>

      {/* Back wall */}
      <mesh ref={backWallRef} position={[0, 0, -15]} visible={false}>
        <planeGeometry args={[100, 50]} />
        <meshStandardMaterial
          color="#0d0805"
          roughness={1}
          metalness={0}
        />
      </mesh>
    </group>
  )
}

// Flickering candle lights
function CandleLight({ position, intensity = 1 }) {
  const lightRef = useRef()
  const baseIntensity = intensity

  useFrame((state) => {
    if (lightRef.current) {
      const flicker = Math.sin(state.clock.elapsedTime * 10) * 0.1 +
        Math.sin(state.clock.elapsedTime * 15) * 0.05 +
        Math.random() * 0.05
      lightRef.current.intensity = baseIntensity + flicker
    }
  })

  return (
    <pointLight
      ref={lightRef}
      position={position}
      intensity={intensity}
      color="#ff6b35"
      distance={30}
      decay={2}
    />
  )
}

// Projects data
const projectsData = [
  {
    title: 'Mountain Explorer',
    description: 'An immersive 3D experience showcasing the beauty of mountain landscapes with realistic terrain.',
    image: '/images/knott.png',
    tags: ['Three.js', 'React', 'WebGL'],
    link: '#'
  },
  {
    title: 'Prayer Wheel App',
    description: 'A meditative mobile application featuring traditional Tibetan prayer wheels and mantras.',
    image: '/images/prayerflags.png',
    tags: ['React Native', 'Expo'],
    link: '#'
  },
  {
    title: 'Stupa Gallery',
    description: 'Virtual tour of ancient Buddhist stupas and monuments from around the world.',
    image: '/images/stupa.png',
    tags: ['Next.js', 'Framer'],
    link: '#'
  },
  {
    title: 'Himalayan Trails',
    description: 'Interactive map and guide for trekking routes in the Himalayas with elevation data.',
    image: '/images/prayerflag2.png',
    tags: ['Mapbox', 'Node.js'],
    link: '#'
  },
]

export default function PrayerWheelFooter() {
  const groupRef = useRef()
  const { camera, scene } = useThree()
  const scroll = useScroll()

  useFrame(() => {
    const scrollOffset = scroll.offset

    if (groupRef.current) {
      // Show prayer wheel section after cloud transition (starts entering at 75%)
      if (scrollOffset > 0.75) {
        groupRef.current.visible = true

        // Calculate entrance progress (0 to 1) between 75% and 82%
        // This creates a "rising" animation when scrolling down, and "sinking" when scrolling up
        const entranceStart = 0.75
        const entranceEnd = 0.82
        const progress = Math.min(1, Math.max(0, (scrollOffset - entranceStart) / (entranceEnd - entranceStart)))

        // Animate scale and position based on progress
        // Starts smaller and lower, moves to full size and position
        const targetScale = THREE.MathUtils.lerp(0.8, 1, progress)
        const targetY = THREE.MathUtils.lerp(-5, 0, progress)

        groupRef.current.scale.setScalar(targetScale)
        groupRef.current.position.y = targetY

        // Set dark background color for monastery feel
        if (progress > 0.5) {
          scene.background = new THREE.Color('#030201')
        }

        // Position camera for the carousel view
        if (scrollOffset > 0.84) {
          const targetPos = new THREE.Vector3(0, 0, 10)
          camera.position.lerp(targetPos, 0.05)
          camera.lookAt(0, 0, 0)
        }
      } else {
        groupRef.current.visible = false
      }
    }
  })

  return (
    <group ref={groupRef} visible={false}>
      {/* Dark monastery environment */}
      <MonasteryEnvironment />

      {/* Dim ambient light */}
      <ambientLight intensity={0.3} color="#2a1810" />

      {/* Main spotlight on prayer wheel */}
      <spotLight
        position={[0, 10, 5]}
        angle={0.6}
        penumbra={0.8}
        intensity={3}
        color="#ffb366"
        castShadow
      />

      {/* Candle lights */}
      <CandleLight position={[-8, -4, 5]} intensity={1.5} />
      <CandleLight position={[8, -4, 5]} intensity={1.5} />
      <CandleLight position={[0, -4, -8]} intensity={1} />

      {/* Section header */}
      <Html
        center
        position={[0, 4, 5]}
        distanceFactor={1}
        style={{ pointerEvents: 'none' }}
      >
        <h2 className="text-4xl md:text-6xl font-bold text-white text-center font-tibetan drop-shadow-lg whitespace-nowrap">
          Experiences
        </h2>
      </Html>

      {/* Prayer wheel - stays centered in background at z = -5 */}
      <PrayerWheel />

      {/* 3D Carousel - cards at z = 2, in front of prayer wheel */}
      <CarouselRig projects={projectsData} />
    </group>
  )
}

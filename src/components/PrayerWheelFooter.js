'use client'

import { useRef, useMemo, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useScroll, useGLTF, Html } from '@react-three/drei'
import * as THREE from 'three'

// Preload the prayer wheel model
useGLTF.preload('/models/prayer_wheel.glb')

function PrayerWheel({ rotationRef }) {
  const { scene } = useGLTF('/models/prayer_wheel.glb')
  const wheelRef = useRef()
  const scroll = useScroll()
  const lastScrollOffset = useRef(0)

  // Clone the scene
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
        // Scroll-based rotation synced with projects carousel
        rotationRef.current += scrollDelta * 15

        // Apply rotation to wheel
        wheelRef.current.rotation.y = rotationRef.current

        // Add gentle continuous rotation
        rotationRef.current += delta * 0.1
      }
    }
  })

  return (
    <primitive
      ref={wheelRef}
      object={clonedScene}
      position={[0, -80, 0]}
      scale={[0.14, 0.14, 0.14]}
      rotation={[0, 0, 0]}
    />
  )
}

// Project card that orbits the prayer wheel
function ProjectCard({ project, index, total, radius, yOffset, rotation, visible }) {
  const [hovered, setHovered] = useState(false)

  // Calculate angle based on index and current rotation
  const baseAngle = (index / total) * Math.PI * 2
  const currentAngle = baseAngle + rotation

  // Calculate position on the carousel
  const x = Math.cos(currentAngle) * radius
  const z = Math.sin(currentAngle) * radius

  // Calculate opacity based on position (front is more visible)
  const frontness = (Math.cos(currentAngle) + 1) / 2  // 0 to 1, 1 = front

  // Don't render if not visible
  if (!visible) return null

  return (
    <Html
      center
      position={[x, yOffset, z]}
      distanceFactor={12}
      style={{
        pointerEvents: frontness > 0.3 ? 'auto' : 'none',
        opacity: 0.4 + frontness * 0.6,
        transform: `scale(${0.7 + frontness * 0.3})`,
        transition: 'opacity 0.3s, transform 0.3s',
      }}
    >
      <div
        className={`
          w-64 p-4 rounded-xl
          bg-gradient-to-br from-amber-900/80 to-amber-950/90
          backdrop-blur-md border border-amber-600/40
          transition-all duration-300
          ${hovered ? 'scale-105 border-amber-400/60 shadow-xl shadow-amber-500/20' : ''}
        `}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Project Image */}
        <div className="w-full h-32 rounded-lg overflow-hidden mb-3 bg-amber-800/30">
          <img
            src={project.image}
            alt={project.title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Project Title */}
        <h3 className="text-amber-100 font-tibetan text-lg mb-2">
          {project.title}
        </h3>

        {/* Project Description */}
        <p className="text-amber-200/70 text-sm mb-3 line-clamp-2">
          {project.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1">
          {project.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 text-xs bg-amber-700/50 rounded-full text-amber-200/80"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* View Project Link */}
        {project.link && (
          <a
            href={project.link}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-amber-400 text-sm hover:text-amber-300 transition-colors"
          >
            View Project →
          </a>
        )}
      </div>
    </Html>
  )
}

function ProjectsCarousel({ wheelY, rotationRef }) {
  const [rotation, setRotation] = useState(0)
  const [visible, setVisible] = useState(false)
  const scroll = useScroll()

  const projects = useMemo(() => [
    {
      title: 'Mountain Explorer',
      description: 'An immersive 3D experience showcasing the beauty of mountain landscapes.',
      image: '/images/knott.png',
      tags: ['Three.js', 'React', 'WebGL'],
      link: '#'
    },
    {
      title: 'Prayer Wheel App',
      description: 'A meditative mobile application featuring traditional Tibetan prayer wheels.',
      image: '/images/prayerflags.png',
      tags: ['React Native', 'Expo'],
      link: '#'
    },
    {
      title: 'Stupa Gallery',
      description: 'Virtual tour of ancient Buddhist stupas and monuments.',
      image: '/images/stupa.png',
      tags: ['Next.js', 'Framer'],
      link: '#'
    },
    {
      title: 'Himalayan Trails',
      description: 'Interactive map and guide for trekking routes in the Himalayas.',
      image: '/images/prayerflag2.png',
      tags: ['Mapbox', 'Node.js'],
      link: '#'
    },
  ], [])

  const radius = 60  // Radius around the prayer wheel

  useFrame(() => {
    // Sync rotation with prayer wheel
    setRotation(rotationRef.current)

    // Only show when in prayer wheel section (after 85% scroll)
    setVisible(scroll.offset > 0.85)
  })

  return (
    <group position={[0, wheelY, 0]}>
      {projects.map((project, index) => (
        <ProjectCard
          key={project.title}
          project={project}
          index={index}
          total={projects.length}
          radius={radius}
          yOffset={0}
          rotation={rotation}
          visible={visible}
        />
      ))}
    </group>
  )
}

// Dark monastery environment
function MonasteryEnvironment() {
  const scroll = useScroll()
  const floorRef = useRef()
  const backWallRef = useRef()
  const ceilingRef = useRef()
  const leftWallRef = useRef()
  const rightWallRef = useRef()

  useFrame(() => {
    const scrollOffset = scroll.offset
    const visible = scrollOffset > 0.75

    if (floorRef.current) floorRef.current.visible = visible
    if (backWallRef.current) backWallRef.current.visible = visible
    if (ceilingRef.current) ceilingRef.current.visible = visible
    if (leftWallRef.current) leftWallRef.current.visible = visible
    if (rightWallRef.current) rightWallRef.current.visible = visible
  })

  return (
    <group>
      {/* Floor */}
      <mesh ref={floorRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -5, 0]} receiveShadow visible={false}>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial
          color="#1a0f0a"
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>

      {/* Back wall */}
      <mesh ref={backWallRef} position={[0, 30, -60]} visible={false}>
        <planeGeometry args={[200, 100]} />
        <meshStandardMaterial
          color="#0d0805"
          roughness={1}
          metalness={0}
        />
      </mesh>

      {/* Ceiling */}
      <mesh ref={ceilingRef} rotation={[Math.PI / 2, 0, 0]} position={[0, 70, 0]} visible={false}>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial
          color="#050302"
          roughness={1}
          metalness={0}
        />
      </mesh>

      {/* Left wall */}
      <mesh ref={leftWallRef} rotation={[0, Math.PI / 2, 0]} position={[-80, 30, 0]} visible={false}>
        <planeGeometry args={[200, 100]} />
        <meshStandardMaterial
          color="#0a0604"
          roughness={1}
          metalness={0}
        />
      </mesh>

      {/* Right wall */}
      <mesh ref={rightWallRef} rotation={[0, -Math.PI / 2, 0]} position={[80, 30, 0]} visible={false}>
        <planeGeometry args={[200, 100]} />
        <meshStandardMaterial
          color="#0a0604"
          roughness={1}
          metalness={0}
        />
      </mesh>
    </group>
  )
}

// Footer text with scroll visibility
function FooterText() {
  const [visible, setVisible] = useState(false)
  const scroll = useScroll()

  useFrame(() => {
    setVisible(scroll.offset > 0.85)
  })

  if (!visible) return null

  return (
    <Html
      center
      position={[0, -110, 50]}
      distanceFactor={18}
      style={{ pointerEvents: 'none' }}
    >
      <div className="text-center text-amber-200/80 text-xl whitespace-nowrap font-tibetan">
        <p>Scroll to explore projects</p>
      </div>
    </Html>
  )
}

// Flickering candle lights
function CandleLight({ position, intensity = 1 }) {
  const lightRef = useRef()
  const baseIntensity = intensity

  useFrame((state) => {
    if (lightRef.current) {
      // Flickering effect
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
      distance={50}
      decay={2}
    />
  )
}

export default function PrayerWheelFooter() {
  const groupRef = useRef()
  const rotationRef = useRef(0)  // Shared rotation between wheel and carousel
  const { camera, scene } = useThree()
  const scroll = useScroll()

  useFrame(() => {
    const scrollOffset = scroll.offset

    if (groupRef.current) {
      // Show prayer wheel section after cloud transition (after 85%)
      if (scrollOffset > 0.85) {
        groupRef.current.visible = true

        // Set dark background color for monastery feel
        scene.background = new THREE.Color('#030201')

        // Move camera to face the prayer wheel - zoomed out to see projects
        if (scrollOffset > 0.87) {
          const targetPos = new THREE.Vector3(0, -60, 220)
          camera.position.lerp(targetPos, 0.05)
          camera.lookAt(0, -70, 0)
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

      {/* Dim ambient light - like a dark monastery */}
      <ambientLight intensity={0.2} color="#2a1810" />

      {/* Main spotlight on prayer wheel - like light from above */}
      <spotLight
        position={[0, 40, 20]}
        angle={0.5}
        penumbra={0.8}
        intensity={3}
        color="#ffb366"
        castShadow
        target-position={[0, 5, 0]}
      />

      {/* Candle lights around the room */}
      <CandleLight position={[-40, -60, 40]} intensity={2} />
      <CandleLight position={[40, -60, 40]} intensity={2} />
      <CandleLight position={[-50, -60, -20]} intensity={1.5} />
      <CandleLight position={[50, -60, -20]} intensity={1.5} />
      <CandleLight position={[0, -60, -50]} intensity={1} />

      {/* Subtle rim light */}
      <pointLight position={[0, 30, -20]} intensity={0.5} color="#4a3020" />

      {/* Prayer wheel model - centered */}
      <PrayerWheel rotationRef={rotationRef} />

      {/* Projects carousel around the prayer wheel */}
      <ProjectsCarousel wheelY={-80} rotationRef={rotationRef} />

      {/* Footer text */}
      <FooterText />
    </group>
  )
}

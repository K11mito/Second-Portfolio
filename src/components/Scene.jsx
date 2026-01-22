'use client'

import { Canvas } from '@react-three/fiber'
import { ScrollControls, Scroll, Preload } from '@react-three/drei'
import { Suspense, useState } from 'react'
import { motion, useScroll, useTransform, useMotionValueEvent } from 'framer-motion'
import Image from 'next/image'
import MountainExperience from './MountainExperience'
import PrayerWheelFooter from './PrayerWheelFooter'
import UIOverlay from './UIOverlay'
import CloudTransition from './CloudTransition'
import LoadingScreen from './LoadingScreen'

// Prayer flag curtains - rendered outside Canvas for proper fixed positioning
function PrayerFlagCurtains() {
  const { scrollYProgress } = useScroll()

  // Transform scroll progress to movement - flags move outward as you scroll
  const leftX = useTransform(scrollYProgress, [0, 0.15], ['0%', '-100%'])
  const rightX = useTransform(scrollYProgress, [0, 0.15], ['0%', '100%'])
  const flagsOpacity = useTransform(scrollYProgress, [0, 0.12], [1, 0])

  return (
    <>
      {/* Left prayer flag curtain */}
      <motion.div
        className="fixed top-0 left-0 h-screen w-[35%] md:w-[28%] z-[100] pointer-events-none"
        style={{ x: leftX, opacity: flagsOpacity }}
      >
        <div className="relative w-full h-full">
          <Image
            src="/images/decorations/prayerflags.png"
            alt="Prayer Flags"
            fill
            className="object-cover object-right-top"
            priority
          />
        </div>
      </motion.div>

      {/* Right prayer flag curtain */}
      <motion.div
        className="fixed top-0 right-0 h-screen w-[35%] md:w-[28%] z-[100] pointer-events-none"
        style={{ x: rightX, opacity: flagsOpacity }}
      >
        <div className="relative w-full h-full scale-x-[-1]">
          <Image
            src="/images/decorations/prayerflags.png"
            alt="Prayer Flags"
            fill
            className="object-cover object-right-top"
            priority
          />
        </div>
      </motion.div>
    </>
  )
}

// Projects data for the carousel cards
const carouselProjects = [
  {
    title: 'Mountain Explorer',
    description: 'An immersive 3D experience showcasing mountain landscapes with realistic terrain.',
    tags: ['Three.js', 'React', 'WebGL'],
  },
  {
    title: 'Prayer Wheel App',
    description: 'A meditative mobile app featuring traditional Tibetan prayer wheels and mantras.',
    tags: ['React Native', 'Expo'],
  },
  {
    title: 'Stupa Gallery',
    description: 'Virtual tour of ancient Buddhist stupas and monuments from around the world.',
    tags: ['Next.js', 'Framer'],
  },
  {
    title: 'Himalayan Trails',
    description: 'Interactive map and guide for trekking routes in the Himalayas.',
    tags: ['Mapbox', 'Node.js'],
  },
]

// Single card info display component
function CardInfo({ project, isActive }) {
  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: isActive ? 1 : 0 }}
      transition={{ duration: 0.3 }}
    >
      <h3 className="text-2xl font-bold text-white mb-2">{project.title}</h3>
      <p className="text-white/80 text-sm mb-3 text-center">{project.description}</p>
      <div className="flex gap-2 flex-wrap justify-center">
        {project.tags.map((tag) => (
          <span key={tag} className="px-3 py-1 text-xs bg-amber-500/60 rounded-full text-white">
            {tag}
          </span>
        ))}
      </div>
    </motion.div>
  )
}

// Prayer wheel section text and card info - rendered outside Canvas
function PrayerWheelText() {
  const { scrollYProgress } = useScroll()
  const [activeCard, setActiveCard] = useState(0)

  // Show text only in prayer wheel section (80% - 100% scroll)
  const opacity = useTransform(scrollYProgress, [0.78, 0.82, 0.95, 1.0], [0, 1, 1, 0])
  const y = useTransform(scrollYProgress, [0.78, 0.85], [50, 0])
  const bottomY = useTransform(scrollYProgress, [0.82, 0.88], [30, 0])

  // Update active card based on scroll
  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (latest >= 0.82 && latest <= 1.0) {
      const progress = (latest - 0.82) / (1.0 - 0.82)
      const cardIndex = Math.min(Math.floor(progress * carouselProjects.length), carouselProjects.length - 1)
      setActiveCard(cardIndex)
    }
  })

  return (
    <motion.div
      className="fixed top-0 left-0 w-full h-screen z-[50] pointer-events-none flex flex-col items-center justify-between py-16"
      style={{ opacity }}
    >
      {/* Header */}
      <motion.div style={{ y }} className="text-center">
        <h2 className="text-4xl md:text-6xl font-bold text-white font-tibetan drop-shadow-lg">
          Experiences
        </h2>
        <p className="text-white/70 mt-2 px-4">
          Scroll through some of my favorite projects
        </p>
      </motion.div>

      {/* Card info at bottom */}
      <motion.div
        className="relative text-center px-8 py-6 bg-black/40 backdrop-blur-sm rounded-2xl mx-4 max-w-md min-h-[150px]"
        style={{ y: bottomY }}
      >
        {carouselProjects.map((project, index) => (
          <CardInfo key={project.title} project={project} isActive={activeCard === index} />
        ))}
      </motion.div>
    </motion.div>
  )
}

export default function Scene() {
  const [isLoaded, setIsLoaded] = useState(false)

  return (
    <>
      {!isLoaded && <LoadingScreen />}

      {/* Prayer flag curtains - outside Canvas for proper fixed positioning */}
      {isLoaded && <PrayerFlagCurtains />}

      {/* Prayer wheel section text - outside Canvas */}
      {isLoaded && <PrayerWheelText />}

      <div className="canvas-container">
        <Canvas
          shadows
          camera={{ position: [80, -80, 280], fov: 50, near: 0.1, far: 3000 }}
          gl={{ antialias: true, alpha: false }}
          onCreated={() => setIsLoaded(true)}
        >
          <Suspense fallback={null}>
            {/* Ambient lighting */}
            <ambientLight intensity={0.4} />
            <directionalLight
              position={[10, 20, 10]}
              intensity={1.5}
              castShadow
              shadow-mapSize={[2048, 2048]}
              shadow-camera-far={50}
              shadow-camera-left={-20}
              shadow-camera-right={20}
              shadow-camera-top={20}
              shadow-camera-bottom={-20}
            />

            {/* Hemisphere light for natural outdoor feel */}
            <hemisphereLight
              skyColor="#87CEEB"
              groundColor="#8B4513"
              intensity={0.6}
            />

            {/* ScrollControls wraps everything - 5 pages of scroll */}
            <ScrollControls pages={5} damping={0.25}>
              {/* 3D Content that responds to scroll */}
              <MountainExperience />
              <CloudTransition />
              <PrayerWheelFooter />

              {/* HTML UI Overlay - floats in foreground */}
              <Scroll html style={{ width: '100%' }}>
                <UIOverlay />
              </Scroll>
            </ScrollControls>

            <Preload all />
          </Suspense>
        </Canvas>
      </div>
    </>
  )
}

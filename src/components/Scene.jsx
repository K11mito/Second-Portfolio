'use client'

import { Canvas } from '@react-three/fiber'
import { ScrollControls, Scroll, Preload } from '@react-three/drei'
import { Suspense, useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
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

export default function Scene() {
  const [isLoaded, setIsLoaded] = useState(false)

  return (
    <>
      {!isLoaded && <LoadingScreen />}

      {/* Prayer flag curtains - outside Canvas for proper fixed positioning */}
      {isLoaded && <PrayerFlagCurtains />}

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

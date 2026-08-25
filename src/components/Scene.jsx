'use client'

import { Canvas } from '@react-three/fiber'
import { ScrollControls, Scroll, AdaptiveDpr } from '@react-three/drei'
import { Suspense, useCallback, useEffect, useState } from 'react'
import { motion, useScroll, useTransform, useMotionValueEvent } from 'framer-motion'
import Image from 'next/image'
import MountainExperience from './MountainExperience'
import UIOverlay from './UIOverlay'
import LoadingScreen from './LoadingScreen'
import ProgressGate from './ProgressGate'
import DeferredSections from './DeferredSections'
import { experiences } from '@/data/site'

function PrayerFlagCurtains() {
  const { scrollYProgress } = useScroll()
  const leftX = useTransform(scrollYProgress, [0, 0.15], ['0%', '-100%'])
  const rightX = useTransform(scrollYProgress, [0, 0.15], ['0%', '100%'])
  const flagsOpacity = useTransform(scrollYProgress, [0, 0.12], [1, 0])

  return (
    <>
      <motion.div
        className="fixed top-0 left-0 h-screen w-[35%] md:w-[28%] z-[100] pointer-events-none"
        style={{ x: leftX, opacity: flagsOpacity }}
      >
        <div className="relative w-full h-full">
          <Image
            src="/images/decorations/prayerflags.png"
            alt=""
            fill
            sizes="35vw"
            quality={60}
            className="object-cover object-right-top"
            priority
          />
        </div>
      </motion.div>

      <motion.div
        className="fixed top-0 right-0 h-screen w-[35%] md:w-[28%] z-[100] pointer-events-none"
        style={{ x: rightX, opacity: flagsOpacity }}
      >
        <div className="relative w-full h-full scale-x-[-1]">
          <Image
            src="/images/decorations/prayerflags.png"
            alt=""
            fill
            sizes="35vw"
            quality={60}
            className="object-cover object-right-top"
            priority
          />
        </div>
      </motion.div>
    </>
  )
}

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

function PrayerWheelText() {
  const { scrollYProgress } = useScroll()
  const [activeCard, setActiveCard] = useState(0)

  const opacity = useTransform(scrollYProgress, [0.78, 0.82, 0.95, 1.0], [0, 1, 1, 0])
  const y = useTransform(scrollYProgress, [0.78, 0.85], [50, 0])
  const bottomY = useTransform(scrollYProgress, [0.82, 0.88], [30, 0])

  useMotionValueEvent(scrollYProgress, 'change', (latest) => {
    if (latest >= 0.82 && latest <= 1.0) {
      const progress = (latest - 0.82) / (1.0 - 0.82)
      const cardIndex = Math.min(
        Math.floor(progress * experiences.length),
        experiences.length - 1
      )
      setActiveCard(cardIndex)
    }
  })

  return (
    <motion.div
      className="fixed top-0 left-0 w-full h-screen z-[50] pointer-events-none flex flex-col items-center justify-between py-16"
      style={{ opacity }}
    >
      <motion.div style={{ y }} className="text-center">
        <h2 className="text-4xl md:text-6xl font-bold text-white font-tibetan drop-shadow-lg">
          Experiences
        </h2>
        <p className="text-white/70 mt-2 px-4">
          Scroll through some of my favorite projects
        </p>
      </motion.div>

      <motion.div
        className="relative text-center px-8 py-6 bg-black/40 backdrop-blur-sm rounded-2xl mx-4 max-w-md min-h-[150px]"
        style={{ y: bottomY }}
      >
        {experiences.map((project, index) => (
          <CardInfo key={project.title} project={project} isActive={activeCard === index} />
        ))}
      </motion.div>
    </motion.div>
  )
}

function usePreferLowPower() {
  const [lowPower, setLowPower] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const update = () => {
      const cores = navigator.hardwareConcurrency || 8
      setLowPower(mq.matches || cores <= 4)
    }
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  return lowPower
}

export default function Scene() {
  const [isLoaded, setIsLoaded] = useState(false)
  const [progress, setProgress] = useState(0)
  const [webglError, setWebglError] = useState(false)
  const lowPower = usePreferLowPower()

  const handleProgress = useCallback((value) => {
    setProgress(value)
  }, [])

  const handleReady = useCallback(() => {
    setIsLoaded(true)
  }, [])

  useEffect(() => {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
    if (!gl) setWebglError(true)

    const timeout = setTimeout(() => setIsLoaded(true), 10000)
    return () => clearTimeout(timeout)
  }, [])

  if (webglError) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
        <div className="max-w-lg text-center">
          <h1 className="text-3xl font-tibetan mb-4">Aryendra Shrestha</h1>
          <p className="text-white/70 mb-6">
            This page needs WebGL for the 3D experience. Try another browser, or visit the projects directly.
          </p>
          <a
            href="https://github.com/K11mito"
            className="underline text-white/90"
            target="_blank"
            rel="noopener noreferrer"
          >
            github.com/K11mito
          </a>
        </div>
      </div>
    )
  }

  return (
    <>
      {!isLoaded && <LoadingScreen progress={progress} />}
      {isLoaded && <PrayerFlagCurtains />}
      {isLoaded && <PrayerWheelText />}

      <div className="canvas-container">
        <Canvas
          dpr={lowPower ? [1, 1.25] : [1, 1.5]}
          gl={{
            antialias: !lowPower,
            alpha: false,
            powerPreference: 'high-performance',
            stencil: false,
            depth: true,
          }}
          onCreated={({ gl }) => {
            gl.setClearColor('#0a0a1e')
          }}
        >
          <AdaptiveDpr pixelated />
          <ProgressGate onProgress={handleProgress} onReady={handleReady} />
          <Suspense fallback={null}>
            <ambientLight intensity={0.4} />
            <directionalLight position={[10, 20, 10]} intensity={1.5} />
            <hemisphereLight skyColor="#87CEEB" groundColor="#8B4513" intensity={0.6} />

            <ScrollControls pages={5} damping={0.25}>
              <MountainExperience />
              <DeferredSections />
              <Scroll html style={{ width: '100%' }}>
                <UIOverlay />
              </Scroll>
            </ScrollControls>
          </Suspense>
        </Canvas>
      </div>
    </>
  )
}

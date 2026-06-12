'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import Image from 'next/image'
import { HERO } from '@/data/content'

export default function Hero() {
  const { scrollYProgress } = useScroll()
  // hero content drifts up & fades as the descent begins
  const opacity = useTransform(scrollYProgress, [0, 0.07], [1, 0])
  const y = useTransform(scrollYProgress, [0, 0.1], [0, -90])

  return (
    <section id="hero" className="h-screen w-full flex flex-col items-center justify-center px-4">
      <motion.div style={{ opacity, y }} className="text-center -mt-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
        >
          <motion.div
            className="relative w-28 h-28 md:w-36 md:h-36 mx-auto mb-7 drop-shadow-[0_4px_24px_rgba(0,0,0,0.35)]"
            animate={{ rotate: 360 }}
            transition={{ duration: 90, repeat: Infinity, ease: 'linear' }}
          >
            <Image src={HERO.knot} alt="Endless Knot" fill className="object-contain" priority />
          </motion.div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.35 }}
          className="font-tibetan text-6xl md:text-8xl text-white text-shadow-strong mb-5"
        >
          {HERO.title}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.55 }}
          className="text-lg md:text-2xl text-white/85 text-shadow tracking-wide"
        >
          {HERO.subtitle}
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 1 }}
          className="mt-12 text-white/70"
        >
          <motion.svg
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            className="w-7 h-7 mx-auto"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </motion.svg>
        </motion.div>
      </motion.div>
    </section>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { CLOUDS_LINE } from '@/data/content'
import { useScrollStore } from '@/lib/useScrollStore'

// The DOM half of the whiteout: a soft white veil that peaks exactly at
// the measured center of the clouds section, synchronized with the 3D fog
// spike and converging mist sprites.
export function WhiteoutOverlay() {
  const { scrollYProgress } = useScroll()
  const [center, setCenter] = useState(0.6)

  useEffect(() => {
    setCenter(useScrollStore.getState().marks.cloudsCenter)
    return useScrollStore.subscribe((s) => setCenter(s.marks.cloudsCenter))
  }, [])

  const opacity = useTransform(
    scrollYProgress,
    [center - 0.05, center, center + 0.05],
    [0, 0.95, 0]
  )

  return (
    <motion.div
      className="fixed inset-0 z-[5] pointer-events-none"
      style={{
        opacity,
        background: 'radial-gradient(ellipse at 50% 55%, #ffffff 0%, #f2f5f8 55%, #e3e9ef 100%)',
      }}
      aria-hidden
    />
  )
}

export default function CloudsInterlude() {
  return (
    <section id="clouds" className="h-[90vh] w-full flex items-center justify-center px-4">
      <motion.h2
        initial={{ opacity: 0, scale: 0.94 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: false, margin: '-20%' }}
        transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        className="font-tibetan text-4xl md:text-7xl text-center text-slate-700/90"
        style={{ textShadow: '0 0 30px rgba(255,255,255,0.9), 0 0 60px rgba(255,255,255,0.6)' }}
      >
        {CLOUDS_LINE}
      </motion.h2>
    </section>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { useScrollStore } from '@/lib/useScrollStore'
import { HERO, SITE } from '@/data/content'

// Brief, event-driven loader: fades the moment the canvas has its first
// frame (with a short minimum so it never flashes), 4s failsafe.
export default function Loader() {
  const ready = useScrollStore((s) => s.ready)
  const [minElapsed, setMinElapsed] = useState(false)
  const [failsafe, setFailsafe] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setMinElapsed(true), 700)
    const t2 = setTimeout(() => setFailsafe(true), 4000)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [])

  const done = (ready && minElapsed) || failsafe

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center"
          style={{ background: 'linear-gradient(to bottom, #0e1626, #1d3e7c)' }}
          exit={{ opacity: 0, transition: { duration: 0.9, ease: 'easeInOut' } }}
        >
          <motion.div
            className="relative w-20 h-20 mb-6"
            animate={{ scale: [1, 1.07, 1], opacity: [0.75, 1, 0.75] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Image src={HERO.knot} alt="" fill className="object-contain" priority />
          </motion.div>
          <p className="font-tibetan text-white/90 text-xl tracking-wide">{SITE.name}</p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

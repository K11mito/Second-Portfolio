'use client'

import { motion } from 'framer-motion'

export default function LoadingScreen({ progress = 0 }) {
  const clamped = Math.max(0, Math.min(100, progress))

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="mb-8"
      >
        <svg
          width="120"
          height="80"
          viewBox="0 0 120 80"
          fill="none"
          className="text-white/20"
        >
          <path
            d="M0 80 L40 20 L60 40 L80 10 L120 80 Z"
            fill="currentColor"
          />
          <motion.path
            d="M0 80 L40 20 L60 40 L80 10 L120 80 Z"
            fill="none"
            stroke="white"
            strokeWidth="2"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2, ease: 'easeInOut' }}
          />
        </svg>
      </motion.div>

      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-2xl font-light text-white mb-4"
      >
        Ascending to the peak
      </motion.h2>

      <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-white/40 via-white to-white/40"
          initial={{ width: '0%' }}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        />
      </div>
      <p className="mt-3 text-sm text-white/50 tabular-nums">{clamped}%</p>
    </div>
  )
}

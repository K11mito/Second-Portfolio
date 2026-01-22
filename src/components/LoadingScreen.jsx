'use client'

import { motion } from 'framer-motion'

export default function LoadingScreen() {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 1, delay: 2 }}
      onAnimationComplete={(definition) => {
        // The component will be unmounted by parent after loading
      }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800"
      style={{ pointerEvents: 'none' }}
    >
      {/* Mountain silhouette animation */}
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

      {/* Loading text */}
      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-2xl font-light text-white mb-4"
      >
        Ascending to the peak
      </motion.h2>

      {/* Loading bar */}
      <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          initial={{ x: '-100%' }}
          animate={{ x: '100%' }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="w-full h-full bg-gradient-to-r from-transparent via-white to-transparent"
        />
      </div>

      {/* Loading dots */}
      <div className="flex gap-2 mt-6">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0.3 }}
            animate={{ opacity: 1 }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              repeatType: 'reverse',
              delay: i * 0.2,
            }}
            className="w-2 h-2 bg-white rounded-full"
          />
        ))}
      </div>
    </motion.div>
  )
}

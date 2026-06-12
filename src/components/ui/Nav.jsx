'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import { NAV_LINKS } from '@/data/content'
import { scrollToSection } from '@/lib/SmoothScroll'

// Minimal jump-nav: hidden over the hero, fades in once the journey starts.
export default function Nav() {
  const { scrollYProgress } = useScroll()
  const opacity = useTransform(scrollYProgress, [0.04, 0.09], [0, 1])
  const y = useTransform(scrollYProgress, [0.04, 0.09], [-24, 0])
  const pointerEvents = useTransform(scrollYProgress, (v) => (v > 0.05 ? 'auto' : 'none'))

  return (
    <motion.header
      className="fixed top-0 inset-x-0 z-40 flex justify-center pt-4 md:pt-5"
      style={{ opacity, y, pointerEvents }}
    >
      <nav className="glass-strong rounded-full pl-5 pr-2 py-2 flex items-center gap-1 md:gap-2">
        <button
          onClick={() => window.__lenis ? window.__lenis.scrollTo(0, { duration: 1.8 }) : window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="font-tibetan text-gold text-lg leading-none mr-2 hover:text-amber-300 transition-colors"
          aria-label="Back to top"
        >
          Aryendra
        </button>
        {NAV_LINKS.map((link) => (
          <button
            key={link.id}
            onClick={() => scrollToSection(link.id)}
            className="px-3 md:px-4 py-2 rounded-full text-sm text-white/75 hover:text-white hover:bg-white/10 transition-colors"
          >
            {link.label}
          </button>
        ))}
      </nav>
    </motion.header>
  )
}

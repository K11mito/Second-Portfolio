'use client'

import { useEffect } from 'react'
import Lenis from 'lenis'
import { useScrollStore } from './useScrollStore'

// Wraps the page in a Lenis smooth-scroll loop. Lenis animates the real
// window scroll, so framer-motion's useScroll and CSS sticky keep working.
export default function SmoothScroll({ children }) {
  useEffect(() => {
    const { setScroll, setReducedMotion } = useScrollStore.getState()

    const updateFromNative = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      setScroll(max > 0 ? window.scrollY / max : 0, 0)
    }

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    setReducedMotion(prefersReduced)

    if (prefersReduced) {
      window.addEventListener('scroll', updateFromNative, { passive: true })
      updateFromNative()
      return () => window.removeEventListener('scroll', updateFromNative)
    }

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.4,
    })
    window.__lenis = lenis

    lenis.on('scroll', (e) => setScroll(e.progress ?? 0, e.velocity ?? 0))

    let rafId
    const raf = (time) => {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }
    rafId = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(rafId)
      lenis.destroy()
      window.__lenis = undefined
    }
  }, [])

  return children
}

// Smooth-anchor helper used by the nav and footer. Falls back to the
// mobile variant of a section when the desktop one is display:none.
export function scrollToSection(id) {
  let el = document.getElementById(id)
  if (el && el.offsetHeight === 0) el = document.getElementById(`${id}-m`) || el
  if (!el) return
  if (window.__lenis) {
    window.__lenis.scrollTo(el, { offset: 0, duration: 1.6 })
  } else {
    el.scrollIntoView({ behavior: 'smooth' })
  }
}

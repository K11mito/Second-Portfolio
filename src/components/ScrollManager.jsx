'use client'

import { useEffect } from 'react'
import Lenis from 'lenis'
import { scrollState, measureSections } from '@/lib/scroll'

// Owns scrolling for the whole page: smooth wheel scrolling (Lenis) for mouse
// users, native behaviour for touch and for anyone who prefers reduced motion,
// plus section measurement for the 3D timeline.
export default function ScrollManager() {
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    scrollState.reducedMotion = reduce

    let lenis = null
    if (!reduce) {
      lenis = new Lenis({
        autoRaf: true,
        lerp: 0.11,
        smoothWheel: true,
        anchors: { offset: 0, duration: 1.6 },
        stopInertiaOnNavigate: true,
      })
      lenis.on('scroll', (e) => {
        scrollState.velocity = e.velocity
      })
      window.__lenis = lenis
    }

    const onScroll = () => {
      scrollState.y = window.scrollY
    }
    const remeasure = () => {
      measureSections()
      onScroll()
    }

    remeasure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', remeasure)
    // Fonts, images and the pinned sections can change the page height after load.
    const ro = new ResizeObserver(remeasure)
    ro.observe(document.body)
    document.fonts?.ready.then(remeasure)

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', remeasure)
      ro.disconnect()
      lenis?.destroy()
      delete window.__lenis
    }
  }, [])

  return null
}

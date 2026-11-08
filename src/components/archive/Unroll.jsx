'use client'

import { useEffect } from 'react'
import Lenis from 'lenis'

const pad = (n) => String(n).padStart(2, '0')

// Behaviour for the archive scroll (the markup is server-rendered):
//  - on arrival the bottom rod drops from under the veil and the cloth unrolls
//    behind it, settling with the smallest bounce of a heavy rod;
//  - from then on the rod rides the bottom of the screen (CSS sticky) and the
//    rolled-up cloth around it thins as there is less left to unroll;
//  - the bar keeps count of the project you're reading.
export default function Unroll() {
  useEffect(() => {
    const root = document.querySelector('[data-thangka]')
    const cloth = root?.querySelector('[data-cloth]')
    const rod = root?.querySelector('[data-rod]')
    if (!root || !cloth || !rod) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // smooth wheel scrolling, as on the rest of the site
    const lenis = reduce ? null : new Lenis({ autoRaf: true, lerp: 0.11, smoothWheel: true })

    // ---- the roll thins as the cloth comes off it
    let measuring = 0
    const measure = () => {
      measuring = 0
      const c = cloth.getBoundingClientRect()
      const r = rod.getBoundingClientRect()
      const left = Math.min(1, Math.max(0, (c.bottom - r.bottom) / Math.max(1, c.height)))
      rod.style.setProperty('--left', (0.36 + 0.64 * Math.sqrt(left)).toFixed(3))
    }
    const onScroll = () => {
      if (intro) finish() // scrolling during the unrolling: skip to the end of it
      if (!measuring) measuring = requestAnimationFrame(measure)
    }

    // ---- which project is crossing the middle of the screen
    const counter = document.querySelector('[data-current]')
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting && counter) counter.textContent = pad(e.target.dataset.entry)
      },
      { rootMargin: '-45% 0px -50% 0px' }
    )
    root.querySelectorAll('[data-entry]').forEach((el) => io.observe(el))

    // ---- the first unrolling
    let intro = 0
    const finish = () => {
      cancelAnimationFrame(intro)
      intro = 0
      root.dataset.unrolled = ''
      cloth.style.clipPath = ''
      rod.style.transform = ''
      measure()
    }
    const start = () => {
      if (reduce || window.scrollY > 40) return finish()
      const c = cloth.getBoundingClientRect()
      const r = rod.getBoundingClientRect()
      // from the top of the cloth down to the middle of the rod at rest
      const span = r.top + r.height / 2 - c.top
      if (span <= 0) return finish()
      // a heavy rod let down: it gathers speed, overshoots by a few pixels and
      // settles (an underdamped spring from rest, about a second and a half)
      const w = 4.4
      const z = 0.74
      const wd = w * Math.sqrt(1 - z * z)
      const ease = (t) => 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + ((z * w) / wd) * Math.sin(wd * t))
      const pose = (u) => {
        const y = (1 - u) * span
        rod.style.transform = `translate3d(0, ${(-y).toFixed(2)}px, 0)`
        const shown = Math.min(c.height, Math.max(0, span - y))
        cloth.style.clipPath = `inset(0 0 ${(c.height - shown).toFixed(1)}px 0)`
        rod.style.setProperty('--left', (0.36 + 0.64 * Math.sqrt(1 - shown / c.height)).toFixed(3))
      }
      // pose the rolled-up state before the pre-JS hiding is lifted, so nothing flashes
      pose(0)
      root.dataset.unrolled = ''
      const t0 = performance.now()
      const frame = (now) => {
        const t = (now - t0) / 1000
        if (t > 2.2) return finish()
        pose(ease(t))
        intro = requestAnimationFrame(frame)
      }
      intro = requestAnimationFrame(frame)
    }
    // a beat for fonts and the first paint, so the drop is seen whole
    const kick = window.setTimeout(start, 380)

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)

    return () => {
      window.clearTimeout(kick)
      cancelAnimationFrame(intro)
      cancelAnimationFrame(measuring)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      io.disconnect()
      lenis?.destroy()
    }
  }, [])

  return null
}

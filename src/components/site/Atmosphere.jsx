'use client'

import { useEffect, useRef } from 'react'
import { scrollState } from '@/lib/scroll'
import { sky } from '@/lib/sky'
import { journey, timeline } from '@/lib/journey'

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

// the dark at each destination's door: the library's lamplit brown, the hall's near-black
const DARK = { library: [10, 5, 4], temple: [7, 6, 9] }

// Screen-space layers between the 3D scene and the content:
//  - a cinematic vignette,
//  - the reading light: the scene dims a little behind the About text,
//  - the veil of a journey: as the camera reaches a destination it closes over
//    the screen, through a drift of cloud (white by day, a dim blue-grey at
//    night: the colour of the inside of a cloud right now) on the way to the
//    temple, then the dark of the door; it lifts again on the way back out.
//    It reads the same journey timeline as the 3D Director, so the switch from
//    the mountain to a destination always happens behind it.
export default function Atmosphere() {
  const veil = useRef()
  const dim = useRef()

  useEffect(() => {
    let raf
    let lastVeil = ''
    let lastDim = -1
    let lastShade = -1
    const shade = document.querySelector('[data-hero-shade]')
    const tick = () => {
      raf = requestAnimationFrame(tick)
      if (!veil.current) return
      const { sections, y, vh, measured } = scrollState

      if (measured) {
        // The hero's legibility shade is fixed to the screen and dissolves as the
        // hero leaves, handing over to the reading dim below: no edge to see.
        if (shade) {
          const s = 1 - smooth(0, 0.85 * vh, y)
          if (Math.abs(s - lastShade) > 1e-3) {
            lastShade = s
            shade.style.opacity = s.toFixed(3)
            shade.style.visibility = s > 0.001 ? 'visible' : 'hidden'
          }
        }
        // Reading light: dim the scene behind About, and lift it again for the
        // view of the destinations (the monasteries want to be seen).
        if (sections.about && sections.destinations && dim.current) {
          const a = sections.about.top
          const d0 = sections.destinations.top
          const d = smooth(a - 0.8 * vh, a - 0.05 * vh, y) * (1 - smooth(d0 - 0.95 * vh, d0 - 0.2 * vh, y)) * 0.4
          if (Math.abs(d - lastDim) > 1e-3) {
            lastDim = d
            dim.current.style.opacity = d.toFixed(3)
          }
        }
      }

      const tl = timeline()
      const [vr, vg, vb] = sky.veil
      const [dr, dg, db] = DARK[journey.to] || DARK.temple
      const m = tl.veil.mist
      const mix = (a, b) => Math.round(a * m + b * (1 - m))
      const color = `rgb(${mix(vr, dr)}, ${mix(vg, dg)}, ${mix(vb, db)})`
      const a = tl.veil.a
      const key = `${a.toFixed(4)}|${color}`
      if (key === lastVeil) return
      lastVeil = key
      veil.current.style.opacity = a.toFixed(4)
      veil.current.style.backgroundColor = color
      veil.current.style.visibility = a > 0.001 ? 'visible' : 'hidden'
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div id="atmosphere" className="pointer-events-none fixed inset-0 z-[1]" aria-hidden="true">
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(130% 95% at 50% 40%, transparent 55%, rgb(3 5 12 / 0.38) 100%)',
        }}
      />
      <div ref={dim} className="absolute inset-0 bg-[rgb(4_9_22)]" style={{ opacity: 0 }} />
      <div ref={veil} className="absolute inset-0" style={{ opacity: 0, visibility: 'hidden' }} />
    </div>
  )
}

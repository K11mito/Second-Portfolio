'use client'

import { useEffect, useRef } from 'react'
import { scrollState, pinProgress } from '@/lib/scroll'
import { sky } from '@/lib/sky'

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

// Screen-space layers between the 3D scene and the content:
//  - a cinematic vignette,
//  - the white-out when the camera sinks into the cloud sea (white by day, a
//    dim blue-grey at night: the colour of the inside of a cloud right now),
//    which then dips to black before the monastery is revealed. It reads the
//    same scroll value as the 3D Director, so the act switch always happens
//    behind the veil.
export default function Atmosphere() {
  const veil = useRef()
  const dim = useRef()

  useEffect(() => {
    let raf
    let last = -1
    let lastDim = -1
    const line = document.querySelector('[data-interlude]')
    const tick = () => {
      raf = requestAnimationFrame(tick)
      if (!scrollState.measured || !veil.current) return
      const { sections, y, vh } = scrollState

      // Reading light: dim the scene behind the text-heavy sections, and lift it
      // again for the cinematic moments (the summit and the descent).
      if (sections.about && sections.interlude && dim.current) {
        const a = sections.about.top
        const i = sections.interlude.top
        const d = smooth(a - 0.8 * vh, a - 0.05 * vh, y) * (1 - smooth(i - 1.05 * vh, i - 0.3 * vh, y)) * 0.4
        if (Math.abs(d - lastDim) > 1e-3) {
          lastDim = d
          dim.current.style.opacity = d.toFixed(3)
        }
      }

      const sec = sections.interlude
      if (sec && line) {
        // q: viewport-heights scrolled past the section top (negative while it enters)
        const q = (y - sec.top) / vh
        const vis = smooth(-0.55, -0.05, q) * (1 - smooth(0.25, 0.5, q))
        line.style.opacity = vis.toFixed(3)
        line.style.transform = `translate3d(0, ${((1 - smooth(-0.55, -0.05, q)) * 24 - smooth(0.25, 0.5, q) * 24).toFixed(2)}px, 0) scale(${(1 + smooth(0.25, 0.5, q) * 0.04).toFixed(4)})`
      }
      const p = pinProgress('interlude')
      const [vr, vg, vb] = sky.veil
      const key = p + vr * 1e-3 + vg * 1e-6 + vb * 1e-9
      if (Math.abs(key - last) < 1e-10) return
      last = key
      const opacity = smooth(0.24, 0.44, p) * (1 - smooth(0.84, 1.0, p))
      const dark = smooth(0.6, 0.8, p)
      const mix = (a, b) => Math.round(a * (1 - dark) + b * dark)
      veil.current.style.opacity = opacity.toFixed(4)
      veil.current.style.backgroundColor = `rgb(${mix(vr, 7)}, ${mix(vg, 6)}, ${mix(vb, 9)})`
      veil.current.style.visibility = opacity > 0.001 ? 'visible' : 'hidden'
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

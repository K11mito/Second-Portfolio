'use client'

import dynamic from 'next/dynamic'
import { getImageProps } from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { setLoading, useLoading } from '@/lib/loading'
import { timeline } from '@/lib/journey'
import SceneBoundary from './SceneBoundary'

const Stage = dynamic(() => import('./three/Stage'), { ssr: false })

function supportsWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

// Painted frames of the live scene. The summit has one per time of day (dawn,
// day, sunset, night), picked in <head> for the hour the live sky will show, so
// the poster and the scene that replaces it agree (see .scene-poster in
// globals.css). Landscape is rendered ultra-wide so any landscape screen crops
// it exactly like the live camera does; portrait has its own render.
const hall = getImageProps({ alt: '', sizes: '100vw', quality: 80, src: '/images/poster-hall.webp', width: 2400, height: 1000 }).props

// The fixed background layer: the live WebGL scene, over a poster that paints
// instantly and remains as the fallback when WebGL is unavailable. `start`:
// the page opens at a destination (the prayer-wheel temple), so its hall is
// the poster to load behind. <html data-webgl> tells the page whether the
// mountain is live (its destinations' signs ride the scene) or a still.
export default function SceneLayer({ start = null }) {
  const [canRender, setCanRender] = useState(false)
  const [fallback, setFallback] = useState(false)
  const { ready } = useLoading()
  const hallRef = useRef(null)
  const liveRef = useRef(false)

  useEffect(() => {
    if (supportsWebGL()) {
      setCanRender(true)
      document.documentElement.dataset.webgl = 'yes'
    } else {
      setFallback(true)
      document.documentElement.dataset.webgl = 'no'
      setLoading({ unsupported: true, ready: true, progress: 1 })
    }
  }, [])

  const live = ready && canRender && !fallback
  liveRef.current = live

  // The hall's still: the poster while a page that opens at the temple loads,
  // and, without WebGL, the stand-in for the hall whenever you are inside it.
  const hallStill = fallback || start === 'temple'
  useEffect(() => {
    if (!hallStill) return
    let raf
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const el = hallRef.current
      if (!el) return
      const o = fallback ? (timeline().act === 'monastery' ? '1' : '0') : liveRef.current ? '0' : '1'
      if (el.style.opacity !== o) el.style.opacity = o
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [hallStill, fallback])

  return (
    <div className="pointer-events-none fixed inset-0 z-0 bg-[#0b1f3d]" aria-hidden="true">
      <div className="scene-poster absolute inset-0 transition-opacity duration-[1400ms] ease-out" style={{ opacity: live ? 0 : 1 }} />
      {hallStill && (
        // eslint-disable-next-line @next/next/no-img-element -- optimised srcset from getImageProps
        <img
          ref={hallRef}
          {...hall}
          alt=""
          loading={start === 'temple' ? 'eager' : 'lazy'}
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-out"
          style={{ opacity: start === 'temple' ? 1 : 0 }}
        />
      )}
      {canRender && (
        <div className="absolute inset-0 transition-opacity duration-[1400ms] ease-out" style={{ opacity: ready ? 1 : 0 }}>
          <SceneBoundary
            onError={() => {
              setCanRender(false)
              setFallback(true)
              document.documentElement.dataset.webgl = 'no'
              setLoading({ unsupported: true, ready: true, progress: 1 })
            }}
          >
            <Stage />
          </SceneBoundary>
        </div>
      )}
    </div>
  )
}

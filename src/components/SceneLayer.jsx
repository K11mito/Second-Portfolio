'use client'

import dynamic from 'next/dynamic'
import { getImageProps } from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { setLoading, useLoading } from '@/lib/loading'
import { pinProgress, scrollState } from '@/lib/scroll'
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

// Painted frames of the live scene. Landscape is rendered ultra-wide so any
// landscape screen crops it exactly like the live camera does (the vertical
// field of view is fixed); portrait has its own render.
const common = { alt: '', sizes: '100vw', quality: 80 }
const wide = getImageProps({ ...common, src: '/images/poster-wide.webp', width: 2400, height: 1000 }).props
const tall = getImageProps({ ...common, src: '/images/poster-tall.webp', width: 900, height: 1950 }).props
const hall = getImageProps({ ...common, src: '/images/poster-hall.webp', width: 2400, height: 1000 }).props

// The fixed background layer: the live WebGL scene, over a poster that paints
// instantly and remains as the fallback when WebGL is unavailable.
export default function SceneLayer() {
  const [canRender, setCanRender] = useState(false)
  const [fallback, setFallback] = useState(false)
  const { ready } = useLoading()
  const hallRef = useRef(null)

  useEffect(() => {
    if (supportsWebGL()) setCanRender(true)
    else {
      setFallback(true)
      setLoading({ unsupported: true, ready: true, progress: 1 })
    }
  }, [])

  // Without WebGL, swap to the monastery still at the same moment the live
  // scene would: behind the white-out of the cloud descent.
  useEffect(() => {
    if (!fallback) return
    let raf
    const tick = () => {
      raf = requestAnimationFrame(tick)
      if (hallRef.current && scrollState.measured) hallRef.current.style.opacity = pinProgress('interlude') >= 0.55 ? 1 : 0
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [fallback])

  const live = ready && canRender && !fallback

  return (
    <div className="pointer-events-none fixed inset-0 z-0 bg-[#0b1f3d]" aria-hidden="true">
      <picture>
        <source media="(max-aspect-ratio: 1/1)" srcSet={tall.srcSet} sizes="100vw" />
        {/* eslint-disable-next-line @next/next/no-img-element -- art-directed <picture> fed by getImageProps (optimised srcset) */}
        <img
          {...wide}
          alt=""
          fetchPriority="high"
          loading="eager"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-[1400ms] ease-out"
          style={{ opacity: live ? 0 : 1 }}
        />
      </picture>
      {fallback && (
        // eslint-disable-next-line @next/next/no-img-element -- optimised srcset from getImageProps
        <img
          ref={hallRef}
          {...hall}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover opacity-0"
        />
      )}
      {canRender && (
        <div className="absolute inset-0 transition-opacity duration-[1400ms] ease-out" style={{ opacity: ready ? 1 : 0 }}>
          <SceneBoundary
            onError={() => {
              setCanRender(false)
              setFallback(true)
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

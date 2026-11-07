'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { setLoading, useLoading } from '@/lib/loading'

const Stage = dynamic(() => import('./three/Stage'), { ssr: false })

function supportsWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

// The fixed background layer: the live WebGL scene, with a painted poster
// underneath that shows instantly and remains as the fallback when WebGL is
// unavailable.
export default function SceneLayer() {
  const [canRender, setCanRender] = useState(false)
  const { ready } = useLoading()

  useEffect(() => {
    if (supportsWebGL()) setCanRender(true)
    else setLoading({ unsupported: true, ready: true, progress: 1 })
  }, [])

  return (
    <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
      <div
        className="absolute inset-0 bg-[#0b1f3d] bg-cover bg-center transition-opacity duration-[1400ms] ease-out"
        style={{ backgroundImage: 'url(/images/poster.webp)', opacity: ready && canRender ? 0 : 1 }}
      />
      {canRender && (
        <div className="absolute inset-0 transition-opacity duration-[1400ms] ease-out" style={{ opacity: ready ? 1 : 0 }}>
          <Stage />
        </div>
      )}
    </div>
  )
}

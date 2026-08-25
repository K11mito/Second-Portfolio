'use client'

import { Suspense, lazy, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useScroll } from '@react-three/drei'

const CloudTransition = lazy(() => import('./CloudTransition'))
const PrayerWheelFooter = lazy(() => import('./PrayerWheelFooter'))

export default function DeferredSections() {
  const scroll = useScroll()
  const [showClouds, setShowClouds] = useState(false)
  const [showWheel, setShowWheel] = useState(false)

  useFrame(() => {
    const offset = scroll.offset
    if (!showClouds && offset > 0.28) setShowClouds(true)
    if (!showWheel && offset > 0.58) setShowWheel(true)
  })

  return (
    <>
      {showClouds && (
        <Suspense fallback={null}>
          <CloudTransition />
        </Suspense>
      )}
      {showWheel && (
        <Suspense fallback={null}>
          <PrayerWheelFooter />
        </Suspense>
      )}
    </>
  )
}

'use client'

import { useEffect } from 'react'
import { useProgress } from '@react-three/drei'

export default function ProgressGate({ onProgress, onReady }) {
  const { active, progress, loaded } = useProgress()

  useEffect(() => {
    onProgress(Math.min(100, Math.round(progress)))
    if (!active && loaded > 0) {
      onReady()
    }
  }, [active, progress, loaded, onProgress, onReady])

  return null
}

'use client'

import { useLoading } from '@/lib/loading'

// A quiet progress readout while the 3D scene streams in. The page is fully
// usable meanwhile: a painted poster of the same scene sits underneath.
export default function SceneStatus() {
  const { progress, ready, unsupported } = useLoading()
  if (unsupported) return null
  const pct = Math.round(progress * 100)
  return (
    <p
      className="eyebrow flex items-center gap-3 text-snow/55 transition-opacity duration-1000"
      style={{ opacity: ready ? 0 : 1 }}
      aria-live="polite"
      aria-hidden={ready}
    >
      <span className="relative block h-px w-16 overflow-hidden bg-snow/15" aria-hidden="true">
        <span
          className="absolute inset-y-0 left-0 bg-snow/70 transition-[width] duration-500 ease-out"
          style={{ width: `${Math.max(4, pct)}%` }}
        />
      </span>
      {ready ? 'Ready' : `Loading the mountain · ${pct}%`}
    </p>
  )
}

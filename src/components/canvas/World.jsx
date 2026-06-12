'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  makeRidgeTexture,
  makeValleyTexture,
  makeCliffTexture,
  makeMonasteryTexture,
  makeGroundTexture,
} from './proceduralTextures'
import { useScrollStore, rangeProgress } from '@/lib/useScrollStore'

// Depth-sorted painterly layers. The camera dollies down past them;
// z-depth differences produce the parallax. Alpha layers don't write
// depth — three sorts transparent objects back-to-front by distance.
function Layer({ texture, position, size, opacity = 1 }) {
  return (
    <mesh position={position}>
      <planeGeometry args={size} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} opacity={opacity} fog />
    </mesh>
  )
}

// The close hero ridge melts away as the descent begins, so it never
// veils the About backdrop.
function FadingLayer({ texture, position, size }) {
  const mat = useRef()
  useFrame(() => {
    const { progress, marks } = useScrollStore.getState()
    if (mat.current) mat.current.opacity = 1 - rangeProgress(progress, marks.about * 0.35, marks.about * 0.85)
  })
  return (
    <mesh position={position}>
      <planeGeometry args={size} />
      <meshBasicMaterial ref={mat} map={texture} transparent depthWrite={false} fog />
    </mesh>
  )
}

export default function World() {
  const tex = useMemo(
    () => ({
      farPeaks: makeRidgeTexture({
        seed: 3,
        peakMin: 0.55,
        peakMax: 0.12,
        colorTop: '#93a9c6',
        colorBottom: '#6e84a3',
        snowColor: '#eef3f9',
        snowDepth: 0.3,
        roughness: 0.5,
        smoothing: 3,
        backRidge: { colorTop: '#aabdd6', colorBottom: '#8ba0bd', peakMin: 0.68, peakMax: 0.22, smooth: 3 },
      }),
      midMountains: makeRidgeTexture({
        seed: 9,
        peakMin: 0.62,
        peakMax: 0.04,
        colorTop: '#5d7396',
        colorBottom: '#3c4f6b',
        snowColor: '#f4f7fb',
        snowDepth: 0.34,
        roughness: 0.52,
        smoothing: 2,
      }),
      monastery: makeMonasteryTexture({}),
      cliffL: makeCliffTexture({ seed: 13, side: 'left' }),
      cliffR: makeCliffTexture({ seed: 17, side: 'right' }),
      foreground: makeRidgeTexture({
        seed: 23,
        peakMin: 0.42,
        peakMax: 0.06,
        colorTop: '#9c7e45',
        colorBottom: '#6b5530',
        snow: false,
        roughness: 0.48,
        smoothing: 3,
        strata: true,
        fadeBottom: 0.45,
      }),
      valley: makeValleyTexture({ seed: 7 }),
      valleyNear: makeValleyTexture({ seed: 29 }),
      ground: makeGroundTexture({ seed: 41 }),
      heroLedge: makeGroundTexture({ seed: 43 }),
    }),
    []
  )

  // ground texture tiling
  useMemo(() => {
    tex.ground.repeat.set(6, 3)
    tex.heroLedge.repeat.set(3, 1)
  }, [tex])

  return (
    <group>
      {/* ── upper world: hero & descent ── */}
      <Layer texture={tex.farPeaks} position={[0, 16, -300]} size={[760, 200]} />
      <Layer texture={tex.midMountains} position={[18, -20, -190]} size={[560, 200]} />
      <Layer texture={tex.monastery} position={[-52, -7, -150]} size={[64, 64]} />
      <Layer texture={tex.cliffL} position={[-105, -100, -78]} size={[80, 180]} />
      <Layer texture={tex.cliffR} position={[105, -104, -88]} size={[80, 185]} />
      <FadingLayer texture={tex.foreground} position={[0, -30, -48]} size={[380, 50]} />

      {/* ── valley world (revealed after the whiteout) ── */}
      <Layer texture={tex.valley} position={[0, -132, -330]} size={[820, 210]} />
      <Layer texture={tex.valleyNear} position={[-30, -148, -210]} size={[520, 130]} />

      {/* valley floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -128, -60]}>
        <planeGeometry args={[560, 240]} />
        <meshBasicMaterial map={tex.ground} fog />
      </mesh>

      {/* small ledge under the hero grass — muted so it doesn't pull focus */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -8.2, 13]}>
        <planeGeometry args={[100, 28]} />
        <meshBasicMaterial map={tex.heroLedge} color="#8f7f5c" fog />
      </mesh>
    </group>
  )
}

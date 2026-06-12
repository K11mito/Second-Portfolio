// Lightweight synchronous quality-tier heuristic.
// 'high'   — desktop with WebGL: full grass, postprocessing, DPR ≤ 2
// 'medium' — mobile/tablet with WebGL: reduced grass, no post, DPR ≤ 1.5
// 'low'    — no WebGL: canvas skipped entirely, static CSS backdrop
export function detectTier() {
  if (typeof window === 'undefined') return 'high'
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
    if (!gl) return 'low'
  } catch {
    return 'low'
  }
  const coarse = window.matchMedia?.('(pointer: coarse)').matches
  const mobileUA = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
  if (coarse || mobileUA) return 'medium'
  if ((navigator.deviceMemory || 8) <= 2) return 'medium'
  return 'high'
}

export const TIER_SETTINGS = {
  high: { dpr: [1, 2], grassCount: 32000, heroGrassCount: 7000, mistCount: 16, post: true },
  medium: { dpr: [1, 1.5], grassCount: 9000, heroGrassCount: 2500, mistCount: 9, post: false },
  low: { dpr: [1, 1], grassCount: 0, heroGrassCount: 0, mistCount: 0, post: false },
}

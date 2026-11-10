// The way to a destination on the mountain, and back again. One store shared
// by the page (the markers, the overlays, the browser's history) and the 3D
// Director (the camera's flight), read every frame, so they always agree.
//
//   idle ─ go(to) ─▶ going ─(flight ends)─▶ inside ─ leave() ─▶ leaving ─▶ idle
//
// Each state's timeline is a pure function of the time since it began: a slow
// frame never slows a flight down, and every reader sees the same moment.

import { useSyncExternalStore } from 'react'
import { scrollState } from './scroll'

export const DESTINATIONS = ['library', 'temple']
// where each destination lives in the address bar
export const PATHS = { library: '/projects', temple: '/experience' }
export const destinationAt = (pathname) => DESTINATIONS.find((d) => PATHS[d] === pathname) || null

// seconds
const GOING = { library: 2.6, temple: 3.1 }
const LEAVING = 2.5
const QUICK = 0.55 // reduced motion, or a jump with the browser's back/forward buttons
const CLOSE = 0.45 // the destination closing behind the dark, before the camera pulls back

export const journey = { state: 'idle', to: null, since: 0, quick: false, version: 0 }

const listeners = new Set()
export function onJourney(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
function set(patch) {
  Object.assign(journey, patch)
  journey.since = performance.now()
  journey.version += 1
  listeners.forEach((fn) => fn(journey))
}

/** Set off for a destination. Returns false if already on the way somewhere. */
export function go(to, { quick = false } = {}) {
  if (!DESTINATIONS.includes(to) || journey.state === 'going' || journey.state === 'inside') return false
  set({ state: 'going', to, quick: quick || scrollState.reducedMotion })
  return true
}
/** Head back out to the mountain. */
export function leave({ quick = false } = {}) {
  if (journey.state !== 'going' && journey.state !== 'inside') return false
  set({ state: 'leaving', quick: quick || scrollState.reducedMotion })
  return true
}
/** Called by the page's ticker when a state's timeline has run its course. */
export function advance() {
  if (journey.state === 'going') set({ state: 'inside' })
  else if (journey.state === 'leaving') set({ state: 'idle', to: null, quick: false })
}

/**
 * Set off for a destination from the page: the address bar follows, so the
 * browser's back button brings you out again and a reload lands you there.
 */
export function openDestination(to, { quick = false } = {}) {
  if (!go(to, { quick })) return false
  try {
    window.history.pushState({ journey: to }, '', PATHS[to])
  } catch {}
  return true
}
/** Come back out to the mountain (by the browser's own back step, if we made one). */
export function closeDestination() {
  if (journey.state !== 'going' && journey.state !== 'inside') return
  if (window.history.state?.journey === journey.to) {
    window.history.back() // the page's popstate listener takes it from there
    return
  }
  try {
    window.history.replaceState(null, '', '/')
  } catch {}
  leave()
}

const snapshot = () => journey.version
/** Re-renders a component whenever the journey changes state. */
export function useJourney() {
  useSyncExternalStore(onJourney, snapshot, () => 0)
  return journey
}

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)
const smooth = (a, b, x) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}

const IDLE = { act: 'mountain', fly: null, veil: { a: 0, mist: 0 }, overlay: null, reveal: 0, done: false }

/**
 * Where the journey stands at a moment.
 *  act      which world is drawn: 'mountain', 'monastery' (the prayer-wheel hall), or 'none'
 *  fly      the camera's place on its flight: { out: false, p } going in (0 at the
 *           start, 1 at the door), { out: true, p } coming back (1 at the door, 0 home),
 *           or null when the camera follows the scroll
 *  veil     the screen between the scene and the page: a = opacity, mist = how
 *           much of its colour is cloud (else dusk-dark)
 *  overlay  whose page is up: 'library', 'temple' or null
 *  reveal   0 → 1 as the prayer-wheel hall comes up
 *  done     the current state has run its course
 */
export function timeline(now = performance.now()) {
  const { state, to, quick } = journey
  if (state === 'idle') return IDLE
  const q = Math.max(0, (now - journey.since) / 1000)

  if (state === 'going') {
    const d = quick ? QUICK : GOING[to]
    const p = clamp01(q / d)
    let veil
    if (quick) veil = { a: smooth(0, 1, p), mist: 0 }
    // the library: through its door into the dark of the hall
    else if (to === 'library') veil = { a: smooth(0.58, 0.97, p), mist: 0 }
    // the temple: through a drift of cloud, then the dark before the hall
    else veil = { a: smooth(0.45, 0.72, p), mist: 1 - smooth(0.74, 0.96, p) }
    return { act: 'mountain', fly: { out: false, p: quick ? 0 : p }, veil, overlay: null, reveal: 0, done: p >= 1 }
  }

  if (state === 'inside') {
    if (to === 'library') return { act: 'none', fly: { out: false, p: 1 }, veil: { a: 1, mist: 0 }, overlay: 'library', reveal: 1, done: false }
    // the hall's lamps come up as the dark lifts
    const r = quick ? smooth(0, 0.45, q) : smooth(0.1, 1.2, q)
    return { act: 'monastery', fly: { out: false, p: 1 }, veil: { a: 1 - r, mist: 0 }, overlay: 'temple', reveal: r, done: false }
  }

  // leaving: the destination closes behind the dark, then the camera pulls back out
  const d = quick ? QUICK : LEAVING
  const close = quick ? 0.2 : CLOSE
  const closing = q < close
  const back = clamp01((q - close) / (d - close))
  let a
  if (closing) a = to === 'library' ? 1 : smooth(0, close, q)
  else a = 1 - smooth(0, quick ? 0.7 : 0.5, back)
  return {
    act: closing ? (to === 'temple' ? 'monastery' : 'none') : 'mountain',
    fly: { out: true, p: quick ? 0 : 1 - back },
    veil: { a, mist: 0 },
    overlay: closing ? to : null,
    reveal: closing ? 1 : 0,
    done: back >= 1,
  }
}

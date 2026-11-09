'use client'

import { useSyncExternalStore } from 'react'

// Loading state shared between the WebGL stage and the HTML intro/poster.
let state = { progress: 0, ready: false, unsupported: false }
const listeners = new Set()

export function setLoading(patch) {
  const next = { ...state, ...patch }
  if (next.progress === state.progress && next.ready === state.ready && next.unsupported === state.unsupported) return
  state = next
  if (next.ready && typeof document !== 'undefined') document.documentElement.dataset.sceneReady = 'true'
  listeners.forEach((l) => l())
}

function subscribe(l) {
  listeners.add(l)
  return () => listeners.delete(l)
}

const getSnapshot = () => state
const getServerSnapshot = () => state

export function useLoading() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

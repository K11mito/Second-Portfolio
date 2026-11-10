'use client'

// The summit register as the page and the scene see it: the count, this
// visitor's own number once they have pulled the lever, and the board's notes.
// One small store, read by the counter in 3D (which rolls to the count and
// swings its lever) and by the page around it.

import { useSyncExternalStore } from 'react'

export const register = {
  status: 'idle', // idle → loading → ready (open or closed)
  open: false, // a store is connected
  count: null,
  number: null, // this visitor's place, once counted
  notes: [],
  lever: 0, // 0 at rest, 1 pulled all the way (the 3D lever follows it)
  els: {}, // page elements the scene positions (the lever's handle)
  version: 0,
}

const listeners = new Set()
const emit = (patch) => {
  Object.assign(register, patch)
  register.version += 1
  listeners.forEach((fn) => fn())
}
const subscribe = (fn) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
export function useRegister() {
  useSyncExternalStore(subscribe, () => register.version, () => 0)
  return register
}

let loading = null
/** Fetch the register (once; again with `fresh`). */
export function loadRegister(fresh = false) {
  if (loading && !fresh) return loading
  if (register.status === 'idle') emit({ status: 'loading' })
  loading = fetch('/api/summit', { cache: 'no-store' })
    .then((r) => r.json())
    .then((s) => emit({ status: 'ready', open: !!s.open, count: s.count, number: s.number, notes: s.notes || [] }))
    .catch(() => emit({ status: 'ready', open: false }))
  return loading
}

/** Pull the lever: the count goes up by one, once per visitor. */
export async function pullLever() {
  if (!register.open || register.number) return { already: !!register.number }
  const r = await fetch('/api/summit/pull', { method: 'POST' })
  const out = await r.json().catch(() => ({}))
  if (!r.ok) return { error: out.error || 'failed' }
  emit({ count: out.count, number: out.number })
  return out
}

/** Pin a note to the board. */
export async function pinNote({ text, name, from, website }) {
  const r = await fetch('/api/summit/notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, name, from, website }),
  })
  const out = await r.json().catch(() => ({}))
  if (!r.ok) return { error: out.error || 'failed' }
  emit({ notes: [out.note, ...register.notes.filter((n) => n.id !== out.note.id)] })
  return out
}

// read by the scene every frame, so it needn't re-render the page
export const setLever = (p) => {
  register.lever = p
}

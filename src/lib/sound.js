'use client'

// Optional ambient sound, synthesised with the Web Audio API (nothing to
// download). Off by default; started only by an explicit click.
//  - on the mountain: gusting wind that eases as you descend, swells as you sink
//    into the cloud sea, and hushes in the white-out
//  - in the monastery: a low drone, a singing bowl each time the prayer wheel
//    comes to rest on a new card, and the little bell on its frame, struck
//    once per revolution, as on a real wheel

import { pinProgress, scrollState, timelinePosition } from './scroll'
import { onWheel } from './wheel'

const listeners = new Set()
let ctx = null
let nodes = null
let on = false
let raf = 0
let lastRest = 0
let lastBell = 0
let restCard = 0

// A minor pentatonic, one bowl per card: consonant with the drone on A.
const BOWLS = [220, 261.63, 293.66, 329.63, 392]

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

function pinkNoise(context, seconds) {
  const len = Math.floor(context.sampleRate * seconds)
  const buffer = context.createBuffer(1, len, context.sampleRate)
  const data = buffer.getChannelData(0)
  // Paul Kellet's economy pink filter
  let b0 = 0
  let b1 = 0
  let b2 = 0
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1
    b0 = 0.99765 * b0 + white * 0.099046
    b1 = 0.963 * b1 + white * 0.2965164
    b2 = 0.57 * b2 + white * 1.0526913
    data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.11
  }
  return buffer
}

function build() {
  ctx = new (window.AudioContext || window.webkitAudioContext)()
  const master = ctx.createGain()
  master.gain.value = 0
  const comp = ctx.createDynamicsCompressor()
  master.connect(comp).connect(ctx.destination)

  const noise = ctx.createBufferSource()
  noise.buffer = pinkNoise(ctx, 6)
  noise.loop = true
  const windBand = ctx.createBiquadFilter()
  windBand.type = 'bandpass'
  windBand.frequency.value = 520
  windBand.Q.value = 0.7
  const wind = ctx.createGain()
  wind.gain.value = 0
  noise.connect(windBand).connect(wind).connect(master)
  const rumbleFilter = ctx.createBiquadFilter()
  rumbleFilter.type = 'lowpass'
  rumbleFilter.frequency.value = 160
  const rumble = ctx.createGain()
  rumble.gain.value = 0
  noise.connect(rumbleFilter).connect(rumble).connect(master)
  noise.start()

  const droneFilter = ctx.createBiquadFilter()
  droneFilter.type = 'lowpass'
  droneFilter.frequency.value = 520
  const drone = ctx.createGain()
  drone.gain.value = 0
  for (const [f, a] of [
    [55, 0.5],
    [82.41, 0.28],
    [110, 0.2],
    [110.6, 0.12],
    [164.81, 0.06],
  ]) {
    const o = ctx.createOscillator()
    o.frequency.value = f
    const g = ctx.createGain()
    g.gain.value = a
    o.connect(g).connect(droneFilter)
    o.start()
  }
  droneFilter.connect(drone).connect(master)

  nodes = { master, wind, windBand, rumble, drone }
}

// A struck bowl: inharmonic partials, each a slightly detuned pair (the slow
// beating is what makes a bowl "sing"), decaying at different rates.
function bowl(f0, level = 0.16) {
  if (!ctx) return
  const t = ctx.currentTime
  for (const [mult, amp, decay] of [
    [1, 1, 7.5],
    [2.71, 0.42, 4.8],
    [5.12, 0.2, 3.2],
    [8.21, 0.09, 2.1],
  ]) {
    for (const beat of [-0.9, 0.9]) {
      const o = ctx.createOscillator()
      o.frequency.value = f0 * mult + beat * mult * 0.6
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(amp * level * 0.5, t + 0.015)
      g.gain.exponentialRampToValueAtTime(0.0001, t + decay)
      o.connect(g).connect(nodes.master)
      o.start(t)
      o.stop(t + decay + 0.05)
    }
  }
}

function tick() {
  raf = requestAnimationFrame(tick)
  if (!ctx || !scrollState.measured) return
  const now = ctx.currentTime
  const t = timelinePosition()
  const p = pinProgress('interlude')
  const inHall = t >= 3 && p >= 0.55

  // wind: strongest at the summit, gusting; swells into the cloud, hushes in the white
  const gust = 0.62 + 0.38 * Math.sin(now * 0.41) * Math.sin(now * 0.17 + 1.3)
  let w = inHall ? 0 : (1 - 0.4 * Math.min(t, 3) / 3) * 0.2 * gust
  if (!inHall && t >= 3) w *= (1 + smooth(0, 0.35, p) * 1.3) * (1 - smooth(0.38, 0.52, p))
  nodes.wind.gain.setTargetAtTime(w, now, 0.25)
  nodes.rumble.gain.setTargetAtTime(w * 0.9, now, 0.4)
  nodes.windBand.frequency.setTargetAtTime(360 + gust * 460, now, 0.6)

  // the hall: a low drone under everything
  const hall = t >= 4 ? 1 : inHall ? smooth(0.78, 1, p) : 0
  nodes.drone.gain.setTargetAtTime(hall * 0.07, now, 0.9)
}

// A small brass bell: bright, short, with a quick shimmer.
function bell(level = 0.06) {
  if (!ctx) return
  const t = ctx.currentTime
  for (const [f, amp, decay] of [
    [1318.5, 1, 1.6],
    [3164, 0.35, 0.7],
    [5933, 0.12, 0.35],
  ]) {
    const o = ctx.createOscillator()
    o.frequency.value = f
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(amp * level, t + 0.004)
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay)
    o.connect(g).connect(nodes.master)
    o.start(t)
    o.stop(t + decay + 0.05)
  }
}

onWheel((type, value) => {
  const now = performance.now()
  if (type === 'rest') {
    // only when it settles on a different card, not when it swings back
    const changed = value !== restCard
    restCard = value
    if (!on || !ctx || !changed || now - lastRest < 250) return
    lastRest = now
    bowl(BOWLS[value % BOWLS.length])
  } else if (type === 'revolution') {
    if (!on || !ctx || now - lastBell < 300) return
    lastBell = now
    bell()
  }
})

export function isSoundOn() {
  return on
}

export function onSoundChange(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export async function setSound(next) {
  if (next === on) return
  on = next
  listeners.forEach((l) => l(on))
  if (on) {
    if (!ctx) build()
    await ctx.resume()
    nodes.master.gain.setTargetAtTime(0.9, ctx.currentTime, 0.5)
    bowl(220, 0.1) // a soft strike to say "sound is on"
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(tick)
  } else if (ctx) {
    nodes.master.gain.setTargetAtTime(0, ctx.currentTime, 0.25)
    cancelAnimationFrame(raf)
    setTimeout(() => !on && ctx.suspend(), 900)
  }
}

// The prayer wheel, turned by hand. One store is shared by the card ring
// (HTML), the brass drum (3D) and the sound, so all three always agree.
//
// `turn` is measured in cards and never wraps: 0 faces the first card, 1 the
// second, and `count` comes back round to the first. Forward is clockwise seen
// from above, the way prayer wheels are turned: the near side of the drum moves
// right to left, exactly like swiping a carousel on to the next item.

export const wheel = {
  count: 1,
  turn: 0,
  velocity: 0, // cards per second
  held: false, // a hand (pointer, finger or trackpad) is on it
  glide: null, // the motion after letting go
  touched: false, // the visitor has turned it at least once
  // While the cards come out of the drum (scrolling in), the drum turns a
  // little extra to unspool them: an offset in cards, back to 0 once they're out.
  spin: 0,
  // Where the 3D drum sits on screen (CSS px), reported by the scene each frame
  // so the HTML cards can come out of it: { x, y, h } or null.
  drum: null,
}

// A flick projects the drum this far ahead (seconds of travel at release speed)
// before friction stops it; the fastest flick spins it about two full turns.
const COAST = 0.55
const MAX_SPEED = 18

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)
export const mod = (n, m) => ((n % m) + m) % m

const listeners = new Set()
/** fn(type, value): 'rest' (card index), 'pass' (card index), 'revolution' */
export function onWheel(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
const emit = (type, value) => listeners.forEach((fn) => fn(type, value))

let lastFront = 0
let lastRev = 0
function moved() {
  const f = Math.round(wheel.turn)
  if (f !== lastFront) {
    lastFront = f
    emit('pass', mod(f, wheel.count))
  }
  // a bell on the frame rings once per revolution
  const r = Math.floor(wheel.turn / wheel.count + 0.5)
  if (r !== lastRev) {
    lastRev = r
    emit('revolution', r)
  }
}

export const frontCard = () => mod(Math.round(wheel.turn), wheel.count)
/** Where the drum will come to rest (the current card if it is already still). */
export const restingTurn = () => (wheel.glide ? wheel.glide.T : Math.round(wheel.turn))

export function setCount(n) {
  wheel.count = Math.max(1, n)
}

/** A hand takes hold: the drum stops under it, even mid-spin. */
export function hold() {
  wheel.held = true
  wheel.glide = null
  wheel.touched = true
}

/** While held: the drum follows the hand. */
export function turnBy(cards) {
  wheel.turn += cards
  moved()
}

/** Let go: a flick keeps it spinning like a heavy drum, and it settles facing a card. */
export function letGo(velocity = 0) {
  wheel.held = false
  const v = Math.abs(velocity) < 0.35 ? 0 : clamp(velocity, -MAX_SPEED, MAX_SPEED)
  glideTo(Math.round(wheel.turn + v * COAST), v)
}

/** Turn by whole cards from wherever it is heading (repeated presses add up). */
export function stepBy(n) {
  wheel.touched = true
  glideTo(restingTurn() + n, wheel.velocity)
}

/** Bring card `index` to the front, the short way round. */
export function bringToFront(index) {
  wheel.touched = true
  const from = restingTurn()
  let k = mod(index - mod(from, wheel.count), wheel.count)
  if (k > wheel.count / 2) k -= wheel.count
  glideTo(from + k, wheel.velocity)
}

/** A small push that swings back into the same detent: "this turns". */
export function nudge(strength = 1) {
  if (wheel.held || wheel.glide) return
  const T = Math.round(wheel.turn)
  const w = 4.6
  wheel.glide = { kind: 'spring', T, A: wheel.turn - T, B: 2.6 * strength, w, t: 0 }
}

export function glideTo(T, v = 0) {
  const x0 = wheel.turn
  const ahead = T - x0
  if (Math.abs(ahead) < 1e-4 && Math.abs(v) < 1e-3) {
    wheel.turn = T
    wheel.velocity = 0
    wheel.glide = null
    return
  }
  const tau = v ? ahead / v : -1
  if (tau > 0.12 && tau < 1.8) {
    // friction: speed decays exponentially from the release speed and the
    // drum lands exactly on the card
    wheel.glide = { kind: 'coast', x0, T, tau, t: 0 }
  } else {
    // from (near) standstill, or a flick too slow to reach the next card:
    // a critically damped swing into the detent
    const w = Math.abs(ahead) > 0.6 ? 7.5 : 10
    wheel.glide = { kind: 'spring', T, A: x0 - T, B: v + w * (x0 - T), w, t: 0 }
  }
}

/** Advance the glide. Called once per frame by the ring's animation loop. */
export function update(dt) {
  const g = wheel.glide
  if (!g || wheel.held) return
  g.t += dt
  if (g.kind === 'coast') {
    const e = Math.exp(-g.t / g.tau)
    wheel.turn = g.T - (g.T - g.x0) * e
    wheel.velocity = ((g.T - g.x0) / g.tau) * e
  } else {
    const e = Math.exp(-g.w * g.t)
    wheel.turn = g.T + (g.A + g.B * g.t) * e
    wheel.velocity = (g.B - g.w * (g.A + g.B * g.t)) * e
  }
  moved()
  if (Math.abs(wheel.turn - g.T) < 3e-4 && Math.abs(wheel.velocity) < 0.02) {
    wheel.turn = g.T
    wheel.velocity = 0
    wheel.glide = null
    emit('rest', mod(g.T, wheel.count))
  }
}

/** Scroll-driven mode (for comparison): the page sets the turn directly. */
export function setTurn(turn) {
  const before = Math.round(wheel.turn)
  wheel.turn = turn
  wheel.velocity = 0
  moved()
  if (Math.round(turn) !== before) emit('rest', mod(Math.round(turn), wheel.count))
}

// Shared by the HTML card ring and the 3D prayer wheel so they always turn
// together. Maps the experience section's scroll progress (0..1) to a turn
// measured in cards (0..count-1), with a gentle detent: each card dwells,
// facing you, before the wheel moves on to the next.

const DWELL = 0.22 // share of each step spent resting on a card

const smootherstep = (x) => x * x * x * (x * (x * 6 - 15) + 10)

export function ringTurn(progress, count) {
  const steps = count - 1
  if (steps <= 0) return 0
  // a short hold on the first card, and the last card settles before the pin ends
  const k = Math.min(1, Math.max(0, (progress - 0.03) / 0.9)) * steps
  const i = Math.min(steps - 1, Math.floor(k))
  const f = k - i
  const moving = Math.min(1, Math.max(0, (f - DWELL / 2) / (1 - DWELL)))
  return i + smootherstep(moving)
}

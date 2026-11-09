import { TERRAIN } from './env'

// The mountain's heights, shared by everything that needs them: the terrain
// mesh, the cloud sea (which parts around the rock), and the monasteries (whose
// walls must reach the ground). The heightmap is the baked one, plus a small
// peak of rock raised beside the mountain for the prayer-wheel temple.

const { N, SIZE, MIN_H, MAX_H, V_SCALE, CURVE } = TERRAIN
const K = (MAX_H - MIN_H) * V_SCALE
const CELL = SIZE / (N - 1)

// Heights fall to zero at the tile's border so it never ends in a cliff.
export function taper(i, j) {
  const ex = Math.min(i, N - 1 - i) / (N - 1)
  const ez = Math.min(j, N - 1 - j) / (N - 1)
  const e = Math.min(ex, ez)
  return e >= 0.14 ? 1 : (e / 0.14) * (e / 0.14) * (3 - (2 * e) / 0.14)
}
const toWorld = (raw, t) => Math.pow(raw / 65535, CURVE) * K * t
const toRaw = (h, t) => Math.round(65535 * Math.pow(Math.min(1, Math.max(0, h / (K * Math.max(t, 1e-3)))), 1 / CURVE))

// A tower of rock rising out of the cloud sea south-east of the summit, with a
// small domed top for the temple: steep crags under the rim easing into scree.
export const PINNACLE = { x: 212, z: 322, top: 254, plateau: 21 }

const hash = (x, z) => {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453
  return s - Math.floor(s)
}
function noise(x, z) {
  const xi = Math.floor(x)
  const zi = Math.floor(z)
  const u = x - xi
  const v = z - zi
  const a = hash(xi, zi)
  const b = hash(xi + 1, zi)
  const c = hash(xi, zi + 1)
  const d = hash(xi + 1, zi + 1)
  const su = u * u * (3 - 2 * u)
  const sv = v * v * (3 - 2 * v)
  return a + (b - a) * su + (c - a) * sv + (a - b - c + d) * su * sv
}

// ridged noise: sharp crests and creases, like weathered rock
const ridged = (x, z) => 1 - Math.abs(noise(x, z) * 2 - 1)

// a lesser tooth of rock on the peak's east shoulder breaks up its cone
const TOOTH = { x: PINNACLE.x + 40, z: PINNACLE.z - 22, top: 214, plateau: 5 }

export function pinnacleHeight(x, z) {
  return Math.max(spire(x, z, PINNACLE), spire(x, z, TOOTH) - 2)
}

function spire(x, z, P) {
  const dx = x - P.x
  const dz = z - P.z
  const r = Math.hypot(dx, dz)
  const a = Math.atan2(dz, dx)
  // buttresses and gullies: how far out it falls away varies around the peak
  const lobes = 1 + 0.2 * Math.sin(a * 3 + 0.7) + 0.11 * Math.sin(a * 5 + 2.1) + 0.06 * Math.sin(a * 9 + 4) + 0.035 * Math.sin(a * 15 + 1.3)
  const rr = r / lobes
  if (rr < P.plateau) return P.top - 0.009 * rr * rr
  const s = rr - P.plateau
  // a sheer band of cliffs under the rim, then ever gentler scree
  const fall = s < 110 ? 3 * s - 0.0105 * s * s : 202.9 + 0.69 * (s - 110)
  // ledges: the fall pauses every so often, where strata outcrop
  const ledge = Math.sin(s * 0.16 + a * 2) * 3.2
  const crag = (ridged(x * 0.045, z * 0.045) - 0.55) * 12 + (noise(x * 0.14 + 9, z * 0.14) - 0.5) * 6
  // couloirs: creases that run straight down the faces, as on the big mountain.
  // Sampled on a ring (so they depend on the bearing, with no seam), drifting slowly with depth.
  const ux = (dx / Math.max(r, 1e-3)) * 30
  const uz = (dz / Math.max(r, 1e-3)) * 30
  const couloir = (ridged(ux * 0.13 + s * 0.018, uz * 0.13 - s * 0.015) - 0.62) * 17
  const k = Math.min(1, s / 12)
  return P.top - 0.009 * P.plateau * P.plateau - fall + (crag + ledge) * k + couloir * Math.min(1, s / 22)
}

// a smooth maximum: the peak's foot blends into the slopes it meets
const smax = (a, b, k) => (a + b + Math.sqrt((a - b) * (a - b) + k * k)) / 2

const cache = new WeakMap()
/** The heightmap with the temple's peak raised in it (computed once per buffer). */
export function getHeights(buffer) {
  let h = cache.get(buffer)
  if (h) return h
  h = new Uint16Array(buffer.slice(0))
  const reach = 150
  const i0 = Math.max(0, Math.floor((PINNACLE.x - reach + SIZE / 2) / CELL))
  const i1 = Math.min(N - 1, Math.ceil((PINNACLE.x + reach + SIZE / 2) / CELL))
  const j0 = Math.max(0, Math.floor((PINNACLE.z - reach + SIZE / 2) / CELL))
  const j1 = Math.min(N - 1, Math.ceil((PINNACLE.z + reach + SIZE / 2) / CELL))
  for (let j = j0; j <= j1; j++) {
    for (let i = i0; i <= i1; i++) {
      const t = taper(i, j)
      if (t < 0.3) continue
      const x = -SIZE / 2 + i * CELL
      const z = -SIZE / 2 + j * CELL
      const old = toWorld(h[j * N + i], t)
      const p = pinnacleHeight(x, z)
      if (p < old - 12) continue
      h[j * N + i] = toRaw(smax(old, p, 14), t)
    }
  }
  cache.set(buffer, h)
  return h
}

/**
 * The height of the ground at a world (x, z), interpolated across the same
 * triangles the terrain mesh is built from.
 */
export function heightAt(heights, x, z) {
  const fi = Math.min(N - 1.001, Math.max(0, (x + SIZE / 2) / CELL))
  const fj = Math.min(N - 1.001, Math.max(0, (z + SIZE / 2) / CELL))
  const i = Math.floor(fi)
  const j = Math.floor(fj)
  const a = fi - i
  const b = fj - j
  const H = (ii, jj) => toWorld(heights[jj * N + ii], taper(ii, jj))
  const h00 = H(i, j)
  const h10 = H(i + 1, j)
  const h01 = H(i, j + 1)
  const h11 = H(i + 1, j + 1)
  // each grid square is split along its (i+1, j)–(i, j+1) diagonal
  if (a + b <= 1) return h00 + a * (h10 - h00) + b * (h01 - h00)
  return h11 + (1 - a) * (h01 - h11) + (1 - b) * (h10 - h11)
}

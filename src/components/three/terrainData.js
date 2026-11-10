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

// a smooth maximum: where two forms meet, the rock fills in between them
const smax = (a, b, k) => (a + b + Math.sqrt((a - b) * (a - b) + k * k)) / 2
const sstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

// The temple's peak is a small massif, not a cone: the summit block with its
// domed top, a lower shoulder stepping down to the west, a spur reaching east
// to a tooth of rock, and a ridge falling away north-west toward the big
// mountain until it sinks into the cloud. Each form is stretched along its own
// line; where they meet the rock fills in, so the sides read as buttresses,
// steps and saddles rather than one slope all the way round.
//   dir: the bearing it is stretched along; stretch: how much longer than wide;
//   rate: how sheer its cliffs are under the rim
const FORMS = [
  { x: PINNACLE.x, z: PINNACLE.z, top: PINNACLE.top, plateau: PINNACLE.plateau, dir: 0.5, stretch: 1.15, rate: 2.7 },
  { x: PINNACLE.x - 36, z: PINNACLE.z + 12, top: 212, plateau: 7, dir: 2.6, stretch: 1.5, rate: 2.4 },
  { x: PINNACLE.x + 34, z: PINNACLE.z - 16, top: 218, plateau: 4, dir: -0.6, stretch: 1.3, rate: 2.8 },
  { x: PINNACLE.x + 12, z: PINNACLE.z + 32, top: 192, plateau: 6, dir: 1.3, stretch: 1.7, rate: 2.2 },
]
// the ridge toward the big mountain, sinking into the cloud between them: [x, z, height] at each end
const RIDGE = { a: [PINNACLE.x - 24, PINNACLE.z - 24, 198], b: [PINNACLE.x - 110, PINNACLE.z - 96, 104] }

function form(x, z, F) {
  const dx = x - F.x
  const dz = z - F.z
  const c = Math.cos(F.dir)
  const s = Math.sin(F.dir)
  const along = (dx * c + dz * s) / F.stretch
  const across = -dx * s + dz * c
  const rr = Math.hypot(along, across)
  if (rr < F.plateau) return F.top - 0.009 * rr * rr
  const t = rr - F.plateau
  // a rounded shoulder over a band of cliffs, easing into a skirt of scree:
  // convex at the top and concave below, the way weathered peaks are
  const fall = t < 100 ? F.rate * ((t * t) / (t + 9) - (t * t) / 260) : F.rate * (1e4 / 109 - 1e4 / 260) + 0.6 * (t - 100)
  return F.top - 0.009 * F.plateau * F.plateau - fall
}

function ridge(x, z) {
  const [ax, az, ah] = RIDGE.a
  const [bx, bz, bh] = RIDGE.b
  const vx = bx - ax
  const vz = bz - az
  const t = Math.min(1, Math.max(0, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz)))
  const d = Math.hypot(x - (ax + vx * t), z - (az + vz * t))
  // the crest sags and steps as it falls, its flanks steeper near the top
  const crest = ah + (bh - ah) * t - Math.sin(t * 9.5) * 6 * (1 - t)
  return crest - d * (1.9 - 0.7 * t) - d * d * 0.004
}

export function pinnacleHeight(x, z) {
  // the outline wanders: warp the ground plan before shaping it
  const wx = x + (noise(x * 0.018 + 3.1, z * 0.018) - 0.5) * 22
  const wz = z + (noise(x * 0.018, z * 0.018 + 7.7) - 0.5) * 22
  let h = form(wx, wz, FORMS[0])
  for (let i = 1; i < FORMS.length; i++) h = smax(h, form(wx, wz, FORMS[i]), 16)
  h = smax(h, ridge(wx, wz), 18)

  // the top stays smooth for the temple; below it, the rock is broken up
  const dTop = Math.hypot(x - PINNACLE.x, z - PINNACLE.z)
  const rough = sstep(PINNACLE.plateau - 1, PINNACLE.plateau + 7, dTop)
  // bands of cliff: the slope breaks into ledges joined by steep risers, the
  // way bedded rock weathers (the bands wander, so they never read as contours)
  const step = 11
  const tt = (h + (noise(x * 0.05 + 4, z * 0.05) - 0.5) * 9) / step
  const fl = Math.floor(tt)
  const terraced = (fl + sstep(0.3, 0.7, tt - fl)) * step - (noise(x * 0.05 + 4, z * 0.05) - 0.5) * 9
  h += (terraced - h) * 0.6 * rough * sstep(150, 175, h)
  const crag = (ridged(x * 0.045, z * 0.045) - 0.55) * 16 + (noise(x * 0.13 + 9, z * 0.13) - 0.5) * 9
  // ledges where strata outcrop, at heights rather than distances
  const ledge = Math.sin(h * 0.21 + noise(x * 0.03, z * 0.03) * 4) * 2.8
  // gullies that run down the fall line, sampled on the bearing from the top
  // (so they have no seam) and drifting slowly with depth
  const r = Math.max(dTop, 1e-3)
  const ux = ((x - PINNACLE.x) / r) * 30
  const uz = ((z - PINNACLE.z) / r) * 30
  const below = PINNACLE.top - h
  const gully = (ridged(ux * 0.13 + below * 0.02, uz * 0.13 - below * 0.017) - 0.62) * 15
  return h + (crag + ledge) * rough + gully * sstep(4, 30, below) * rough
}

const cache = new WeakMap()
/** The heightmap with the temple's peak raised in it (computed once per buffer). */
export function getHeights(buffer) {
  let h = cache.get(buffer)
  if (h) return h
  h = new Uint16Array(buffer.slice(0))
  const reach = 150
  // the raised rock fades out before the edge of the patch it is drawn into
  const fade = (x, z) => 1 - sstep(0.72, 0.98, Math.max(Math.abs(x - PINNACLE.x), Math.abs(z - PINNACLE.z)) / reach)
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
      const w = fade(x, z)
      if (w <= 0) continue
      h[j * N + i] = toRaw(old + (smax(old, p, 14) - old) * w, t)
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

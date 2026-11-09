// Verlet cloth for strings of lung-ta, ported from the "Wind Horse Flags"
// study. One particle pool; a flag's top row *is* a run of rope particles, so
// the coupling is two-way for free: heavy flags sag the line and the line whips
// the flags. Everything is in "flag space" (a flag is ~1.05 x 1.21 units and
// gravity is 9.1 units/s²); the renderer places it in the world.
//
// Pure data and math: runs in a worker or on the main thread alike.

export const FIXED = 1 / 120

const GRAV = -9.1
const DAMP = 0.9885
const ROPE_IM = 0.07 // inverse mass: the rope is ~14x heavier than the cloth
// A long rope needs tension carried along its length: one Gauss-Seidel pass
// moves a correction about one link, so sweeping alternately from each end
// keeps the line taut without pinning intermediate points.
const ROPE_SWEEPS = 7
// Steps owed beyond this are dropped: a slow device slows the wind down, it
// never spirals into ever-longer frames.
const MAX_STEPS = 4

/** Length of a line's rope, as laid out by createCloth (chord pushed into a sag). */
export function ropeLength(a, b, sag) {
  let len = 0
  let px = a[0]
  let py = a[1]
  let pz = a[2]
  for (let i = 1; i <= 64; i++) {
    const t = i / 64
    const x = a[0] + (b[0] - a[0]) * t
    const y = a[1] + (b[1] - a[1]) * t - Math.sin(Math.PI * t) * sag
    const z = a[2] + (b[2] - a[2]) * t
    len += Math.hypot(x - px, y - py, z - pz)
    px = x
    py = y
    pz = z
  }
  return len
}

/** How many flags of natural width fit on a line (the rope spacing sets their width). */
export function flagsThatFit({ a, b, sag, gw, gap, fw }) {
  const s = fw / (gw - 1)
  return Math.max(1, Math.round((ropeLength(a, b, sag) + (gap + 1) * s) / ((gw + gap) * s)))
}

function seeded(seed) {
  let s = seed % 2147483647 || 1
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}

/**
 * lines: [{ count, gw, gh, fw, fh, gap, a:[x,y,z], b:[x,y,z], sag }]
 */
export function createCloth(lines, { seed = 7 } = {}) {
  const random = seeded(seed)

  // ---- size everything up front
  let np = 0
  let nVerts = 0
  let nTris = 0
  let nRopeP = 0
  for (const L of lines) {
    const ropeN = L.count * L.gw + (L.count - 1) * L.gap
    np += ropeN + L.count * L.gw * (L.gh - 1)
    nRopeP += ropeN
    nVerts += L.count * L.gw * L.gh
    nTris += L.count * (L.gw - 1) * (L.gh - 1) * 2
  }

  const P = new Float32Array(np * 3) // position
  const Q = new Float32Array(np * 3) // previous position
  const F = new Float32Array(np * 3) // acceleration: gravity, wind, the cursor
  const IM = new Float32Array(np) // inverse mass (0 = pinned)
  let count = 0
  const add = (x, y, z, inv) => {
    const i = count++
    const k = i * 3
    P[k] = Q[k] = x
    P[k + 1] = Q[k + 1] = y
    P[k + 2] = Q[k + 2] = z
    IM[i] = inv
    return i
  }

  // constraints are collected as plain arrays, then packed (see pack())
  const groups = {
    rope: { k: 1.0, list: [] },
    struct: { k: 0.92, list: [] },
    shear: { k: 0.34, list: [] },
    bend: { k: 0.14, list: [] },
  }
  const link = (g, i, j) => g.list.push(i, j)

  // ---- mesh data shared with the renderer
  const vertParticle = new Int32Array(nVerts) // vertex -> particle
  const normals = new Float32Array(nVerts * 3) // also feeds the wind's face term
  const index = new Uint32Array(nTris * 3)
  const flags = [] // { line, i, v0, gw, gh, area }
  const ropes = [] // { particles: Int32Array, offset } offset into the rope section of a frame

  let v0 = 0
  let t0 = 0
  let ropeOffset = 0
  lines.forEach((L, li) => {
    const { count: n, gw, gh, fh, fw, gap, a, b, sag } = L
    const ropeN = n * gw + (n - 1) * gap
    const span = ropeN - 1
    // rope particles laid along the chord, pushed down into a sag
    const rope = new Int32Array(ropeN)
    for (let i = 0; i < ropeN; i++) {
      const t = i / span
      const x = a[0] + (b[0] - a[0]) * t
      const y = a[1] + (b[1] - a[1]) * t - Math.sin(Math.PI * t) * sag
      const z = a[2] + (b[2] - a[2]) * t
      rope[i] = add(x, y, z, i === 0 || i === ropeN - 1 ? 0 : ROPE_IM)
    }
    for (let i = 0; i < ropeN - 1; i++) link(groups.rope, rope[i], rope[i + 1])
    // light bending stiffness so the rope doesn't kink
    for (let i = 0; i < ropeN - 2; i++) link(groups.bend, rope[i], rope[i + 2])
    ropes.push({ particles: rope, offset: ropeOffset })
    ropeOffset += ropeN

    for (let f = 0; f < n; f++) {
      const start = f * (gw + gap)
      const map = vertParticle.subarray(v0, v0 + gw * gh)
      for (let c = 0; c < gw; c++) map[c] = rope[start + c]
      for (let r = 1; r < gh; r++) {
        for (let c = 0; c < gw; c++) {
          const top = rope[start + c] * 3
          // hang straight down from the rope, with a touch of scatter
          map[r * gw + c] = add(
            P[top] + (random() - 0.5) * 0.004,
            P[top + 1] - r * (fh / (gh - 1)),
            P[top + 2] + (random() - 0.5) * 0.004,
            1
          )
        }
      }
      const at = (c, r) => map[r * gw + c]
      for (let r = 0; r < gh; r++) {
        for (let c = 0; c < gw; c++) {
          if (c < gw - 1 && r > 0) link(groups.struct, at(c, r), at(c + 1, r)) // row 0 is the rope
          if (r < gh - 1) link(groups.struct, at(c, r), at(c, r + 1))
          if (c < gw - 1 && r < gh - 1) {
            link(groups.shear, at(c, r), at(c + 1, r + 1))
            link(groups.shear, at(c + 1, r), at(c, r + 1))
          }
          if (c < gw - 2) link(groups.bend, at(c, r), at(c + 2, r))
          if (r < gh - 2) link(groups.bend, at(c, r), at(c, r + 2))
        }
      }
      for (let r = 0; r < gh - 1; r++) {
        for (let c = 0; c < gw - 1; c++) {
          const a0 = v0 + r * gw + c
          const b0 = a0 + 1
          const c0 = a0 + gw
          const d0 = c0 + 1
          index[t0++] = a0
          index[t0++] = c0
          index[t0++] = b0
          index[t0++] = b0
          index[t0++] = c0
          index[t0++] = d0
        }
      }
      // wind is applied per unit of cloth: each vertex speaks for one cell
      flags.push({ line: li, i: f, v0, gw, gh, area: (fw / (gw - 1)) * (fh / (gh - 1)) })
      v0 += gw * gh
    }
  })

  // Pack each group with everything the solver can know in advance: indices
  // pre-scaled to the xyz stride and each end's share of the correction
  // (stiffness x inverse-mass ratio). Pinned-to-pinned pairs are dropped.
  const pack = ({ k, list }) => {
    const n0 = list.length / 2
    const ka = new Int32Array(n0)
    const kb = new Int32Array(n0)
    const r = new Float32Array(n0)
    const wa = new Float32Array(n0)
    const wb = new Float32Array(n0)
    let n = 0
    for (let c = 0; c < n0; c++) {
      const i = list[c * 2]
      const j = list[c * 2 + 1]
      const w = IM[i] + IM[j]
      if (w === 0) continue
      ka[n] = i * 3
      kb[n] = j * 3
      r[n] = Math.hypot(P[i * 3] - P[j * 3], P[i * 3 + 1] - P[j * 3 + 1], P[i * 3 + 2] - P[j * 3 + 2])
      wa[n] = (k * IM[i]) / w
      wb[n] = (k * IM[j]) / w
      n++
    }
    return { ka, kb, r, wa, wb, n }
  }
  const gRope = pack(groups.rope)
  const gStruct = pack(groups.struct)
  const gShear = pack(groups.shear)
  const gBend = pack(groups.bend)

  // Long-range attachments (Kim et al. 2012): no rope particle may be farther,
  // in a straight line, from either knot than its length along the rope. Local
  // passes alone let a long line under twenty flags stretch a few percent, and
  // on a long span that reads as a deep belly; this caps the sag near its rest
  // shape at the price of two distance checks per particle.
  const lra = ropes.map(({ particles }) => {
    const n = particles.length
    const along = new Float32Array(n)
    for (let i = 1; i < n; i++) {
      const a = particles[i - 1] * 3
      const b = particles[i] * 3
      along[i] = along[i - 1] + Math.hypot(P[b] - P[a], P[b + 1] - P[a + 1], P[b + 2] - P[a + 2])
    }
    const total = along[n - 1]
    const toA = new Float32Array(n)
    const toB = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      toA[i] = along[i]
      toB[i] = total - along[i]
    }
    return { particles, toA, toB, ka: particles[0] * 3, kb: particles[n - 1] * 3 }
  })

  function solveAttachments() {
    for (const { particles, toA, toB, ka, kb } of lra) {
      for (let i = 1; i < particles.length - 1; i++) {
        const k = particles[i] * 3
        for (let e = 0; e < 2; e++) {
          const ke = e ? kb : ka
          const max = e ? toB[i] : toA[i]
          const dx = P[k] - P[ke]
          const dy = P[k + 1] - P[ke + 1]
          const dz = P[k + 2] - P[ke + 2]
          const d = Math.sqrt(dx * dx + dy * dy + dz * dz)
          if (d > max) {
            const s = (max - d) / d
            P[k] += dx * s
            P[k + 1] += dy * s
            P[k + 2] += dz * s
          }
        }
      }
    }
  }

  // ---- wind: layered trig turbulence under a slow gust envelope. The force
  // on a vertex scales with |n·ŵ| — that single term is what makes a flag
  // swing broadside and then flutter when it goes edge-on.
  const wind = { dir: [-0.45, 0.06, -0.89], now: 0.38, target: 0.38, gust: 0, t: 0 }
  // cursor-stirred air: a point in flag space, how it moved, and which way is "toward the viewer"
  const stir = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, px: 0, py: 0, pz: 1, power: 0, r2: 5 }

  let wdx = 0
  let wdy = 0
  let wdz = 0
  const setDir = (d) => {
    const l = Math.hypot(d[0], d[1], d[2]) || 1
    wdx = d[0] / l
    wdy = d[1] / l
    wdz = d[2] / l
  }
  setDir(wind.dir)

  let wx = 0
  let wy = 0
  let wz = 0
  function windAt(x, y, z, t) {
    const g = 0.68 + 0.32 * Math.sin(t * 0.37 + x * 0.08) * Math.sin(t * 0.19 - z * 0.11)
    const s = wind.now * wind.now * 95 * g + wind.gust
    const tx = Math.sin(y * 4.6 + t * 3.1 + x * 1.3) * 0.34 + Math.sin(z * 5.1 - t * 2.1) * 0.22
    const ty = Math.sin(x * 5.4 - t * 2.7) * 0.38 + Math.cos(y * 3.9 + t * 1.9) * 0.26
    const tz = Math.cos(x * 4.2 + t * 2.4) * 0.3 + Math.sin(y * 3.1 - t * 3.6) * 0.2
    wx = wdx * s + tx * s * 0.5
    wy = wdy * s + ty * s * 0.52
    wz = wdz * s + tz * s * 0.42
  }

  // Forces are gathered once per frame: the wind clock only advances per frame
  // and the field is smooth, so re-evaluating it every substep buys nothing.
  function gatherForces() {
    const t = wind.t
    F.fill(0)
    for (let i = 0; i < np; i++) if (IM[i]) F[i * 3 + 1] = GRAV
    const stirOn = stir.power > 0.001
    for (const fl of flags) {
      const n = fl.gw * fl.gh
      const area = fl.area * 72
      for (let v = 0; v < n; v++) {
        const p = vertParticle[fl.v0 + v]
        if (!IM[p]) continue
        const k = p * 3
        windAt(P[k], P[k + 1], P[k + 2], t)
        const len = Math.sqrt(wx * wx + wy * wy + wz * wz) || 1e-5
        const o = (fl.v0 + v) * 3
        const face = Math.abs((normals[o] * wx + normals[o + 1] * wy + normals[o + 2] * wz) / len)
        const g = area * (0.26 + 0.74 * face)
        F[k] += wx * g
        F[k + 1] += wy * g
        F[k + 2] += wz * g
        if (stirOn) {
          const dx = P[k] - stir.x
          const dy = P[k + 1] - stir.y
          const dz = P[k + 2] - stir.z
          const d2 = dx * dx + dy * dy + dz * dz
          if (d2 < stir.r2) {
            const w = stir.power * (1 - d2 / stir.r2)
            F[k] += stir.vx * w * 110 + dx * w * 22 + stir.px * w * 34
            F[k + 1] += stir.vy * w * 110 + dy * w * 22 + stir.py * w * 34
            F[k + 2] += stir.vz * w * 110 + dz * w * 22 + stir.pz * w * 34
          }
        }
      }
    }
    // rope-only stretches feel the wind too, weakly
    for (const { particles } of ropes) {
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        if (!IM[p]) continue
        const k = p * 3
        windAt(P[k], P[k + 1], P[k + 2], t)
        F[k] += wx * 0.9
        F[k + 1] += wy * 0.9
        F[k + 2] += wz * 0.9
      }
    }
  }

  function integrate(dt) {
    const d2 = dt * dt
    for (let i = 0; i < np; i++) {
      const k = i * 3
      if (!IM[i]) {
        Q[k] = P[k]
        Q[k + 1] = P[k + 1]
        Q[k + 2] = P[k + 2]
        continue
      }
      for (let j = k; j < k + 3; j++) {
        const v = (P[j] - Q[j]) * DAMP
        Q[j] = P[j]
        P[j] += v + F[j] * d2
      }
    }
  }

  function solveGroup(g, rev) {
    const { ka, kb, r, wa, wb, n } = g
    if (!rev) {
      for (let c = 0; c < n; c++) {
        const ki = ka[c]
        const kj = kb[c]
        const dx = P[kj] - P[ki]
        const dy = P[kj + 1] - P[ki + 1]
        const dz = P[kj + 2] - P[ki + 2]
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz) + 1e-9
        const diff = (d - r[c]) / d
        const si = diff * wa[c]
        const sj = diff * wb[c]
        P[ki] += dx * si
        P[ki + 1] += dy * si
        P[ki + 2] += dz * si
        P[kj] -= dx * sj
        P[kj + 1] -= dy * sj
        P[kj + 2] -= dz * sj
      }
    } else {
      for (let c = n - 1; c >= 0; c--) {
        const ki = ka[c]
        const kj = kb[c]
        const dx = P[kj] - P[ki]
        const dy = P[kj + 1] - P[ki + 1]
        const dz = P[kj + 2] - P[ki + 2]
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz) + 1e-9
        const diff = (d - r[c]) / d
        const si = diff * wa[c]
        const sj = diff * wb[c]
        P[ki] += dx * si
        P[ki + 1] += dy * si
        P[ki + 2] += dz * si
        P[kj] -= dx * sj
        P[kj + 1] -= dy * sj
        P[kj + 2] -= dz * sj
      }
    }
  }

  function solve(iters) {
    for (let it = 0; it < iters; it++) {
      for (let s = 0; s < ROPE_SWEEPS; s++) solveGroup(gRope, (s & 1) === 1)
      solveAttachments()
      solveGroup(gStruct, (it & 1) === 1)
      solveGroup(gShear, false)
      solveGroup(gBend, false)
    }
  }

  // flag positions, then their normals, then rope positions
  const frameSize = nVerts * 6 + nRopeP * 3

  function updateNormals(pos) {
    normals.fill(0)
    for (let t = 0; t < index.length; t += 3) {
      const i0 = index[t] * 3
      const i1 = index[t + 1] * 3
      const i2 = index[t + 2] * 3
      const ax = pos[i1] - pos[i0]
      const ay = pos[i1 + 1] - pos[i0 + 1]
      const az = pos[i1 + 2] - pos[i0 + 2]
      const bx = pos[i2] - pos[i0]
      const by = pos[i2 + 1] - pos[i0 + 1]
      const bz = pos[i2 + 2] - pos[i0 + 2]
      const nx = ay * bz - az * by
      const ny = az * bx - ax * bz
      const nz = ax * by - ay * bx
      normals[i0] += nx
      normals[i0 + 1] += ny
      normals[i0 + 2] += nz
      normals[i1] += nx
      normals[i1 + 1] += ny
      normals[i1 + 2] += nz
      normals[i2] += nx
      normals[i2 + 1] += ny
      normals[i2 + 2] += nz
    }
    for (let o = 0; o < nVerts * 3; o += 3) {
      const l = Math.sqrt(normals[o] * normals[o] + normals[o + 1] * normals[o + 1] + normals[o + 2] * normals[o + 2]) || 1
      normals[o] /= l
      normals[o + 1] /= l
      normals[o + 2] /= l
    }
  }

  const scratch = new Float32Array(nVerts * 3)

  const sim = {
    np,
    nVerts,
    frameSize,
    wind,
    stir,
    substeps: 2,
    iters: 4,
    acc: 0,
    setWindDir: setDir,

    /** Advance by a frame of `dt` seconds in fixed 1/120 s steps (substepped); returns the steps taken. */
    step(dt) {
      wind.t += dt
      wind.now += (wind.target - wind.now) * Math.min(1, dt * 2.2)
      wind.gust *= Math.pow(0.22, dt)
      stir.power *= Math.pow(0.02, dt)
      sim.acc = Math.min(sim.acc + dt, MAX_STEPS * FIXED)
      if (sim.acc < FIXED) return 0
      gatherForces()
      const sub = sim.substeps
      let steps = 0
      while (sim.acc >= FIXED) {
        for (let s = 0; s < sub; s++) {
          integrate(FIXED / sub)
          solve(sim.iters)
        }
        sim.acc -= FIXED
        steps++
      }
      return steps
    },

    /** Run the cloth forward before anyone sees it, so the first frame is a line in the wind. */
    settle(steps) {
      for (let i = 0; i < steps; i++) {
        wind.t += FIXED
        gatherForces()
        integrate(FIXED)
        solve(4)
        if (i % 8 === 7) sim.writeFrame(null)
      }
    },

    /** Positions, normals and rope into `out` (or just refresh the normals the wind reads). */
    writeFrame(out) {
      const pos = out || scratch
      for (let v = 0; v < nVerts; v++) {
        const k = vertParticle[v] * 3
        const o = v * 3
        pos[o] = P[k]
        pos[o + 1] = P[k + 1]
        pos[o + 2] = P[k + 2]
      }
      updateNormals(pos)
      if (!out) return
      out.set(normals, nVerts * 3)
      let o = nVerts * 6
      for (const { particles } of ropes) {
        for (let i = 0; i < particles.length; i++) {
          const k = particles[i] * 3
          out[o++] = P[k]
          out[o++] = P[k + 1]
          out[o++] = P[k + 2]
        }
      }
    },

    /** Static description of the meshes, for building geometry once. */
    meta() {
      return {
        nVerts,
        frameSize,
        index,
        flags: flags.map(({ line, i, v0, gw, gh }) => ({ line, i, v0, gw, gh })),
        ropes: ropes.map(({ particles, offset }) => ({ length: particles.length, offset })),
      }
    },
  }
  return sim
}

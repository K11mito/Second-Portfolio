// Tibetan monasteries (gompa), built in code: nothing to download.
//
// The vocabulary is the real one: whitewashed walls that lean inward as they
// rise (battered), standing on tall whitewashed foundations that step down the
// mountainside; a band of dark maroon pembé (stacked tamarisk twigs) under the
// roofline with gilded discs set into it; trapezoid black window surrounds,
// wider at the foot, with a red valance over each; flat earth roofs behind low
// parapets; gilded roofs with curling eaves and a finial (sertog) on the
// chapels, victory banners (gyaltsen) at the corners, and the Dharma wheel
// between two deer over the assembly hall; white chortens; and strings of
// five-colour prayer flags. Each monastery merges into one mesh per material,
// so a whole complex costs about a dozen draw calls.
//
// Local frame: +z faces down the slope (toward the viewer), x runs along the
// contour, y is up and 0 is the main terrace. `ground(x, z)` gives the height
// of the mountain under any local point, so every wall reaches the rock.

import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

// ---------------------------------------------------------------- helpers
const rnd = (seed) => {
  let s = (Math.floor(seed * 2654435761) >>> 0) || 1
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296
}

const M4 = new THREE.Matrix4()
const Q = new THREE.Quaternion()
const E = new THREE.Euler()
const P = new THREE.Vector3()
const S = new THREE.Vector3()
function place(x, y, z, ry = 0, sx = 1, sy = 1, sz = 1, rx = 0, rz = 0) {
  return M4.clone().compose(P.set(x, y, z), Q.setFromEuler(E.set(rx, ry, rz)), S.set(sx, sy, sz))
}

// a box with its base at y = 0 whose top is smaller by `batter` (0.06 = 6 %)
function battered(w, h, d, batter = 0.06) {
  const g = new THREE.BoxGeometry(w, h, d)
  const p = g.attributes.position
  for (let i = 0; i < p.count; i++) {
    if (p.getY(i) > 0) {
      p.setX(i, p.getX(i) * (1 - batter))
      p.setZ(i, p.getZ(i) * (1 - batter))
    }
  }
  g.translate(0, h / 2, 0)
  g.computeVertexNormals()
  return g
}

// soot and rain darken whitewash toward the foot of a wall: shade by height
const grime = (h, low = 0.72, reach = 0.5) => (g) => {
  const p = g.attributes.position
  const c = g.attributes.color
  for (let i = 0; i < p.count; i++) {
    const t = Math.min(1, Math.max(0, p.getY(i) / Math.max(1, h * reach)))
    const k = low + (1 - low) * (t * t * (3 - 2 * t))
    c.setXYZ(i, k, k * 0.985, k * 0.96)
  }
}

// A hipped roof with a concave pitch and eaves that curl up at the corners,
// gilded, as on the chapels. Base centred at y = 0.
function hipRoof(w, d, h, curl = 0.22) {
  const n = 12
  const pos = []
  const idx = []
  for (let j = 0; j <= n; j++) {
    for (let i = 0; i <= n; i++) {
      const u = (i / n) * 2 - 1
      const v = (j / n) * 2 - 1
      const m = Math.max(Math.abs(u), Math.abs(v))
      const s = 1 - m // 0 at the eave, 1 at the crown
      let y = h * (0.22 * s + 0.78 * s * s)
      // corners rise: strongest right at the eave tips
      const corner = Math.pow(Math.abs(u * v), 5)
      y += h * curl * corner * Math.max(0, 1 - s * 3)
      // the crown is cut flat where the drum or finial sits
      y = Math.min(y, h * 0.86)
      pos.push((u * w) / 2, y, (v * d) / 2)
    }
  }
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const a = j * (n + 1) + i
      const b = a + 1
      const c = a + n + 1
      const e = c + 1
      idx.push(a, c, b, b, c, e)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

// ---------------------------------------------------------------- painted textures
function canvasTexture(w, h, paint) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  paint(c.getContext('2d'), w, h)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.anisotropy = 4
  return t
}
// lime plaster: blotchy, with whitewash poured from the roof in long runs
function plasterTexture() {
  return canvasTexture(256, 256, (x, w, h) => {
    const r = rnd(7)
    x.fillStyle = '#f3eee3'
    x.fillRect(0, 0, w, h)
    for (let i = 0; i < 240; i++) {
      x.fillStyle = r() < 0.6 ? `rgba(150,130,105,${0.03 + r() * 0.05})` : `rgba(255,255,250,${0.05 + r() * 0.08})`
      x.beginPath()
      x.ellipse(r() * w, r() * h, 4 + r() * 26, 3 + r() * 14, r() * 3, 0, 6.3)
      x.fill()
    }
    for (let i = 0; i < 80; i++) {
      x.strokeStyle = `rgba(125,105,85,${0.03 + r() * 0.06})`
      x.lineWidth = 1 + r() * 3
      const sx = r() * w
      x.beginPath()
      x.moveTo(sx, r() * h * 0.4)
      x.lineTo(sx + (r() - 0.5) * 5, h * (0.55 + r() * 0.45))
      x.stroke()
    }
  })
}
// the pembé frieze: the cut ends of tamarisk bundles, painted maroon
function pembeTexture() {
  return canvasTexture(256, 64, (x, w, h) => {
    const r = rnd(11)
    x.fillStyle = '#5c1812'
    x.fillRect(0, 0, w, h)
    for (let i = 0; i < 900; i++) {
      x.fillStyle = r() < 0.5 ? `rgba(28,6,4,${0.2 + r() * 0.3})` : `rgba(140,50,36,${0.15 + r() * 0.25})`
      x.beginPath()
      x.arc(r() * w, r() * h, 0.8 + r() * 1.8, 0, 6.3)
      x.fill()
    }
  })
}

// ---------------------------------------------------------------- materials
let shared = null
export function gompaMaterials() {
  if (shared) return shared
  const plaster = plasterTexture()
  const pembe = pembeTexture()
  const std = (o) => new THREE.MeshStandardMaterial({ vertexColors: true, ...o })
  shared = {
    white: std({ color: '#f2ede2', roughness: 0.94, map: plaster, emissive: '#ff9a4a', emissiveIntensity: 0 }),
    red: std({ color: '#8e2b1e', roughness: 0.9, map: plaster }),
    ochre: std({ color: '#d1973f', roughness: 0.9, map: plaster }),
    pembe: std({ color: '#ffffff', roughness: 0.97, map: pembe }),
    earth: std({ color: '#8f7d68', roughness: 1 }),
    dark: std({ color: '#171211', roughness: 0.8 }),
    wood: std({ color: '#5a2a17', roughness: 0.8 }),
    gold: std({ color: '#e2ae4a', roughness: 0.32, metalness: 0.5, emissive: '#6a420c', emissiveIntensity: 0.3, side: THREE.DoubleSide }),
    stone: std({ color: '#8f8376', roughness: 0.97 }),
    // window panes: dark by day, lamplit at night (see updateGompas)
    glass: std({ color: '#1a120d', roughness: 0.5, emissive: '#ffa24a', emissiveIntensity: 0 }),
    flag: new THREE.MeshStandardMaterial({ roughness: 0.85, side: THREE.DoubleSide }),
  }
  return shared
}

// ---------------------------------------------------------------- the kit
// Parts are collected per material and merged at the end.
class Kit {
  constructor(ground) {
    this.m = gompaMaterials()
    this.ground = ground || (() => -60)
    this.parts = new Map()
    this.windows = [] // window centres, for the night glow
    this.flagLines = []
  }

  add(mat, geo, matrix, shade) {
    const g = geo.index ? geo.toNonIndexed() : geo
    const n = g.attributes.position.count
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(n * 2), 2))
    g.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(n * 3).fill(1), 3))
    if (shade) shade(g) // in the part's own frame, before it is placed
    if (matrix) g.applyMatrix4(matrix)
    if (!this.parts.has(mat)) this.parts.set(mat, [])
    this.parts.get(mat).push(g)
    return g
  }

  // the highest ground under a footprint (rotated by ry)
  high(x, z, w, d, ry = 0) {
    return -this.low(x, z, w, d, ry, -1)
  }

  // the lowest ground under a footprint (rotated by ry), sampled on a grid
  low(x, z, w, d, ry = 0, sign = 1) {
    let lo = Infinity
    const c = Math.cos(ry)
    const s = Math.sin(ry)
    for (let j = 0; j <= 4; j++) {
      for (let i = 0; i <= 4; i++) {
        const lx = (i / 4 - 0.5) * w
        const lz = (j / 4 - 0.5) * d
        lo = Math.min(lo, sign * this.ground(x + lx * c + lz * s, z - lx * s + lz * c))
      }
    }
    return lo
  }

  // A battered plinth from the rock up to `top`, under a footprint w × d:
  // whitewashed, darkening toward the ground, with a stone course at its foot.
  foundation(x, z, w, d, top, ry = 0, mat = 'white') {
    const lo = this.low(x, z, w * 1.1, d * 1.1, ry) - 3
    const h = top - lo
    if (h < 0.4) return
    // the wall leans in about 6° as it rises, so its base is wider than the building
    const grow = 2 * 0.1 * h
    const bw = w + grow
    const bd = d + grow
    this.add(this.m[mat], battered(bw, h, bd, 1 - w / bw), place(x, lo, z, ry), grime(h, 0.6, 0.85))
    this.add(this.m.stone, battered(bw + 0.8, Math.min(3, h * 0.3), bd + 0.8, 0.02), place(x, lo, z, ry))
  }

  /**
   * One building: battered walls on a foundation that reaches the rock, the
   * maroon frieze and dark cornice, an earth roof behind a parapet, and windows.
   * windows: { front: [rows, cols], back, left, right, from: share of height }
   */
  block({ x = 0, y = 0, z = 0, ry = 0, w, h, d, batter = 0.07, walls = 'white', band = 0.11, parapet = true, windows = {}, door = null, discs = 0, rabsel = false }) {
    const mats = this.m
    // 'auto': stand on the highest ground under the footprint; the foundation takes up the fall
    if (y === 'auto') y = this.high(x, z, w, d, ry) - 0.5
    const c = Math.cos(ry)
    const s = Math.sin(ry)
    const at = (lx, ly, lz) => [x + lx * c + lz * s, y + ly, z - lx * s + lz * c]
    this.foundation(x, z, w, d, y + 0.01, ry, walls === 'red' ? 'white' : walls)
    this.add(mats[walls], battered(w, h, d, batter), place(x, y, z, ry), walls === 'white' ? grime(h, 0.82, 0.4) : null)
    const topW = w * (1 - batter)
    const topD = d * (1 - batter)
    const bandH = band ? Math.max(0.9, h * band) : 0
    if (band) {
      // a white string course, the pembé frieze standing just proud, and the cornice
      this.add(mats.white, battered(topW + 0.7, 0.3, topD + 0.7, 0), place(...at(0, h - bandH - 0.45, 0), ry))
      this.add(mats.pembe, battered(topW + 0.5, bandH, topD + 0.5, 0), place(...at(0, h - bandH - 0.15, 0), ry))
      for (let i = 0; i < discs; i++) {
        const fx = -topW / 2 + ((i + 0.5) * topW) / discs
        for (const side of [1, -1]) {
          const g = new THREE.CylinderGeometry(bandH * 0.27, bandH * 0.27, 0.2, 12).rotateX(Math.PI / 2)
          this.add(mats.gold, g, place(...at(fx, h - bandH / 2 - 0.15, side * (topD / 2 + 0.35)), ry))
        }
      }
    }
    this.add(mats.dark, battered(topW + 1.0, 0.42, topD + 1.0, 0), place(...at(0, h - 0.15, 0), ry))
    this.add(mats.earth, battered(topW + 0.3, 0.2, topD + 0.3, 0), place(...at(0, h + 0.25, 0), ry))
    if (parapet) {
      const ph = 0.8
      const t = 0.42
      const py = h + 0.27
      const pm = walls === 'red' ? mats.red : mats.white
      this.add(pm, battered(topW + 0.9, ph, t, 0), place(...at(0, py, topD / 2 + 0.25), ry))
      this.add(pm, battered(topW + 0.9, ph, t, 0), place(...at(0, py, -topD / 2 - 0.25), ry))
      this.add(pm, battered(t, ph, topD + 0.9, 0), place(...at(topW / 2 + 0.25, py, 0), ry))
      this.add(pm, battered(t, ph, topD + 0.9, 0), place(...at(-topW / 2 - 0.25, py, 0), ry))
    }

    // windows: a black trapezoid surround, the pane, and a red valance above
    const from = windows.from ?? 0.38
    const size = windows.size ?? Math.min(2.1, h * 0.12)
    const faces = [
      ['front', 0, w, d],
      ['back', Math.PI, w, d],
      ['right', Math.PI / 2, d, w],
      ['left', -Math.PI / 2, d, w],
    ]
    for (const [face, rot, faceW, depth] of faces) {
      const spec = windows[face]
      if (!spec) continue
      const [rows, cols] = spec
      const span = h - bandH - 1.6 - h * from
      for (let ri = 0; ri < rows; ri++) {
        const wy = h * from + (rows === 1 ? span * 0.5 : (span * ri) / (rows - 1))
        const lean = 1 - (batter * wy) / h
        const half = (depth / 2) * lean + 0.02
        const wide = faceW * lean
        // upper floors have the larger windows, as in the real buildings
        const sz = size * (0.78 + 0.4 * (ri / Math.max(1, rows - 1)))
        for (let ci = 0; ci < cols; ci++) {
          const lx = -wide / 2 + ((ci + 0.5) * wide) / cols
          const cr = Math.cos(rot)
          const sr = Math.sin(rot)
          const [wx, wy2, wz] = at(lx * cr + half * sr, wy, -lx * sr + half * cr)
          const yaw = ry + rot
          this.add(mats.dark, battered(sz * 1.4, sz * 1.5, 0.3, 0.24), place(wx, wy2 - sz * 0.74, wz, yaw))
          this.add(mats.glass, battered(sz * 0.7, sz * 0.92, 0.38, 0.04), place(wx, wy2 - sz * 0.46, wz, yaw))
          this.add(mats.red, battered(sz * 1.15, sz * 0.2, 0.55, 0), place(wx, wy2 + sz * 0.5, wz, yaw))
          this.windows.push(new THREE.Vector3(wx, wy2 - sz * 0.05, wz))
        }
      }
    }
    // a rabsel: the red wooden balcony window on the top floor of the front
    if (rabsel) {
      const rw = Math.min(topW * 0.42, 7)
      const rh = Math.min(3.4, h * 0.16)
      const ry0 = h - bandH - rh - 1.1
      const face = (d / 2) * (1 - (batter * ry0) / h)
      const [bx, by, bz] = at(0, ry0, face + 0.4)
      this.add(mats.wood, battered(rw, rh, 1.4, 0), place(bx, by, bz, ry))
      this.add(mats.dark, battered(rw + 0.5, 0.35, 1.8, 0), place(bx, by + rh, bz, ry))
      for (let i = 0; i < 3; i++) {
        const px = -rw / 2 + ((i + 0.5) * rw) / 3
        const [gx, gy, gz] = at(px, ry0 + rh * 0.2, face + 1.12)
        this.add(mats.glass, battered(rw / 3 - 0.55, rh * 0.62, 0.1, 0), place(gx, gy, gz, ry))
        this.windows.push(new THREE.Vector3(gx, gy + rh * 0.3, gz))
      }
    }
    if (door) {
      const dh = door.h ?? Math.min(4.2, h * 0.38)
      const dw = door.w ?? dh * 0.6
      const [dx, dy, dz] = at(door.x ?? 0, 0, d / 2 + 0.05)
      this.add(mats.dark, battered(dw + 1.3, dh + 0.9, 0.5, 0.18), place(dx, dy, dz, ry))
      this.add(mats.red, battered(dw, dh, 0.62, 0.03), place(dx, dy, dz, ry))
      this.add(mats.gold, battered(dw * 0.12, dh * 0.7, 0.7, 0), place(dx, dy + dh * 0.12, dz, ry))
      // a pleated white awning, and the steps
      this.add(mats.white, battered(dw + 2, 0.45, 1.3, 0), place(dx, dy + dh + 0.6, dz + 0.45, ry))
      for (let k = 0; k < 3; k++) this.add(mats.stone, battered(dw + 2.2 - k * 0.3, 0.42, 1.2, 0), place(...at(door.x ?? 0, -0.42 * (k + 1), d / 2 + 0.6 + k * 1.1), ry))
      this.door = new THREE.Vector3(dx, dy + dh * 0.45, dz + 0.5)
    }
    return { at, top: y + h + 0.45, topW, topD }
  }

  // ---- a gilded roof in tiers, with a red drum between them and the sertog on top
  goldRoof({ x, y, z, ry = 0, w, d, tiers = 2, lower = 'gold' }) {
    const mats = this.m
    let cy = y
    let ww = w
    let dd = d
    for (let t = 0; t < tiers; t++) {
      const mat = mats[t === 0 ? lower : 'gold']
      const rh = Math.max(1.6, ww * 0.3)
      // posts and a dark beam under the eaves, then the roof
      this.add(mats.red, battered(ww * 0.92, 0.6, dd * 0.92, 0), place(x, cy, z, ry))
      this.add(mats.dark, battered(ww * 1.02, 0.25, dd * 1.02, 0), place(x, cy + 0.6, z, ry))
      this.add(mat, hipRoof(ww * 1.32, dd * 1.32, rh), place(x, cy + 0.82, z, ry))
      cy += 0.82 + rh * 0.84
      if (t < tiers - 1) {
        const dw = ww * 0.46
        const dh = Math.max(1.4, ww * 0.2)
        this.add(mats.red, battered(dw, dh, dd * 0.46, 0), place(x, cy - 0.3, z, ry))
        this.add(mats.pembe, battered(dw + 0.2, dh * 0.3, dd * 0.46 + 0.2, 0), place(x, cy - 0.3 + dh * 0.62, z, ry))
        cy += dh - 0.3
        ww *= 0.56
        dd *= 0.56
      }
    }
    // the sertog: stacked bells under a flame-tipped finial
    const f = Math.max(0.85, w * 0.075)
    const prof = [
      [0, 0], [f * 0.9, 0], [f * 0.9, f * 0.35], [f * 0.45, f * 0.55], [f * 0.78, f * 1.25], [f * 0.55, f * 1.85],
      [f * 0.28, f * 2.05], [f * 0.52, f * 2.55], [f * 0.24, f * 3.25], [f * 0.3, f * 3.55], [0.05, f * 4.6], [0, f * 4.6],
    ].map(([a, b]) => new THREE.Vector2(a, b))
    this.add(mats.gold, new THREE.LatheGeometry(prof, 10), place(x, cy - 0.3, z, ry))
    return cy + f * 4.3
  }

  // ---- victory banner (gyaltsen): a gilded drum with a domed crown
  gyaltsen(x, y, z, h = 2.6) {
    const r = h * 0.2
    const prof = [
      [0, 0], [r * 0.35, 0], [r * 0.35, h * 0.15], [r, h * 0.2], [r * 1.05, h * 0.7], [r * 0.7, h * 0.78],
      [r * 0.75, h * 0.86], [r * 0.3, h * 0.94], [0.04, h], [0, h],
    ].map(([a, b]) => new THREE.Vector2(a, b))
    this.add(this.m.gold, new THREE.LatheGeometry(prof, 10), place(x, y, z))
  }

  // ---- the Dharma wheel between two kneeling deer, over the assembly hall's front
  dharmaWheel(x, y, z, s = 3, ry = 0) {
    const mats = this.m
    this.add(mats.gold, new THREE.TorusGeometry(s * 0.42, s * 0.07, 6, 20), place(x, y + s * 0.62, z, ry))
    this.add(mats.gold, new THREE.CylinderGeometry(s * 0.36, s * 0.36, s * 0.08, 16).rotateX(Math.PI / 2), place(x, y + s * 0.62, z, ry))
    this.add(mats.gold, new THREE.CylinderGeometry(s * 0.12, s * 0.2, s * 0.22, 8), place(x, y, z, ry))
    const c = Math.cos(ry)
    const sn = Math.sin(ry)
    for (const side of [-1, 1]) {
      const dx = side * s * 0.75
      const px = x + dx * c
      const pz = z - dx * sn
      // a kneeling deer, gazing at the wheel
      this.add(mats.gold, new THREE.SphereGeometry(s * 0.2, 8, 6), place(px, y + s * 0.16, pz, ry, 1.3, 0.8, 0.9))
      this.add(mats.gold, new THREE.SphereGeometry(s * 0.1, 6, 5), place(px - side * s * 0.16 * c, y + s * 0.42, pz + side * s * 0.16 * sn, ry))
    }
  }

  // ---- a chorten (stupa): steps, the dome, the thirteen rings, parasol, moon and sun
  chorten(x, y, z, s = 5, ry = 0) {
    const mats = this.m
    if (y === 'auto') y = this.high(x, z, s * 1.3, s * 1.3, ry) - 0.3
    this.foundation(x, z, s * 1.3, s * 1.3, y, ry, 'stone')
    let cy = y
    const tier = (w, h, mat = mats.white) => {
      this.add(mat, battered(w, h, w, 0.02), place(x, cy, z, ry))
      cy += h
    }
    tier(s * 1.3, s * 0.2, mats.stone)
    tier(s * 1.1, s * 0.3)
    tier(s * 1.0, s * 0.11, mats.pembe)
    tier(s * 0.9, s * 0.11)
    tier(s * 0.78, s * 0.1)
    tier(s * 0.66, s * 0.1)
    const b = s * 0.42
    const dome = [
      [0, 0], [b * 0.92, 0], [b * 1.0, b * 0.25], [b * 0.98, b * 0.65], [b * 0.82, b * 1.0], [b * 0.55, b * 1.2], [0, b * 1.24],
    ].map(([a, c]) => new THREE.Vector2(a, c))
    this.add(mats.white, new THREE.LatheGeometry(dome, 18), place(x, cy, z, ry))
    cy += b * 1.15
    tier(s * 0.34, s * 0.15, mats.white)
    const ring = []
    const rh = s * 0.72
    for (let i = 0; i <= 13; i++) {
      const t = i / 13
      const rr = s * 0.16 * (1 - t * 0.55)
      ring.push(new THREE.Vector2(rr, t * rh), new THREE.Vector2(rr * 0.8, t * rh + (rh / 13) * 0.5))
    }
    ring.push(new THREE.Vector2(0.02, rh))
    this.add(mats.gold, new THREE.LatheGeometry(ring, 10), place(x, cy, z, ry))
    cy += rh
    this.add(mats.gold, new THREE.CylinderGeometry(s * 0.16, s * 0.24, s * 0.09, 10), place(x, cy, z))
    this.add(mats.gold, new THREE.SphereGeometry(s * 0.08, 8, 6), place(x, cy + s * 0.18, z))
    this.add(mats.gold, new THREE.ConeGeometry(s * 0.045, s * 0.2, 6), place(x, cy + s * 0.33, z))
    return cy + s * 0.43
  }

  // ---- a flag pole (darchen): its foot on the ground, a gilded tip
  pole(x, z, h = 14) {
    const y0 = this.ground(x, z) - 1
    this.add(this.m.wood, new THREE.CylinderGeometry(0.16, 0.24, h + 1, 6).translate(0, (h + 1) / 2, 0), place(x, y0, z))
    this.add(this.m.gold, new THREE.ConeGeometry(0.3, 0.9, 6).translate(0, 0.45, 0), place(x, y0 + h + 1, z))
    return new THREE.Vector3(x, y0 + h + 0.6, z)
  }

  // ---- a string of prayer flags along a sagging rope, from a to b
  flags(a, b, { sag = 0.1, gap = 1.15, size = 1, seed = 1 } = {}) {
    this.flagLines.push({ a: a.clone(), b: b.clone(), sag, gap, size, seed })
  }

  build(name) {
    const group = new THREE.Group()
    group.name = name
    for (const [mat, list] of this.parts) {
      const mesh = new THREE.Mesh(mergeGeometries(list, false), mat)
      mesh.castShadow = true
      mesh.receiveShadow = true
      group.add(mesh)
    }
    return group
  }
}

// ---------------------------------------------------------------- prayer flags (one instanced mesh per monastery)
const FLAG_COLORS = ['#2f63b6', '#f1ede2', '#c03428', '#3c8c4c', '#e8b53a'] // sky, wind, fire, water, earth
function buildFlags(lines) {
  const items = []
  for (const L of lines) {
    const len = L.a.distanceTo(L.b)
    const n = Math.max(2, Math.floor(len / L.gap))
    const r = rnd(L.seed * 97 + n)
    const at = (t, out) => {
      out.lerpVectors(L.a, L.b, t)
      out.y -= Math.sin(Math.PI * t) * len * L.sag
      return out
    }
    for (let i = 1; i < n; i++) {
      const t = i / n
      const p = at(t, new THREE.Vector3())
      const dir = at(Math.min(1, t + 0.01), new THREE.Vector3()).sub(p).normalize()
      items.push({ p, dir, color: FLAG_COLORS[i % 5], size: L.size * (0.85 + r() * 0.3), phase: r() * 6.28 })
    }
  }
  const geo = new THREE.PlaneGeometry(1, 1.25)
  geo.translate(0.5, -0.625, 0) // hangs from its top edge, on the rope
  const mesh = new THREE.InstancedMesh(geo, gompaMaterials().flag, Math.max(1, items.length))
  const col = new THREE.Color()
  items.forEach((it, i) => mesh.setColorAt(i, col.set(it.color)))
  mesh.count = items.length
  mesh.userData.items = items
  mesh.frustumCulled = false
  return mesh
}
/** One string of prayer flags from a to b (an instanced mesh; animate it with flutterFlags). */
export function buildFlagLine(a, b, { sag = 0.1, gap = 1.15, size = 1, seed = 1 } = {}) {
  return buildFlags([{ a: a.clone(), b: b.clone(), sag, gap, size, seed }])
}
export const flutterFlags = (mesh, time) => flutter(mesh, time)

const FX = new THREE.Matrix4()
const FB = new THREE.Matrix4()
const FQ = new THREE.Quaternion()
const FUP = new THREE.Vector3(0, 1, 0)
const FY = new THREE.Vector3()
const FZ = new THREE.Vector3()
const FS = new THREE.Vector3()
function flutter(mesh, time) {
  const items = mesh.userData.items
  for (let i = 0; i < items.length; i++) {
    const it = items[i]
    // the wind lifts each flag about its rope, never quite in step with the next
    const swing = 0.3 + Math.sin(time * 2.1 + it.phase) * 0.28 + Math.sin(time * 5.3 + it.phase * 2.7) * 0.07
    FZ.crossVectors(it.dir, FUP).normalize()
    FY.crossVectors(FZ, it.dir).normalize()
    FY.applyAxisAngle(it.dir, swing)
    FZ.crossVectors(it.dir, FY)
    FB.makeBasis(it.dir, FY, FZ)
    FQ.setFromRotationMatrix(FB)
    FS.set(it.size * 0.85, it.size, 1)
    FX.compose(it.p, FQ, FS)
    mesh.setMatrixAt(i, FX)
  }
  mesh.instanceMatrix.needsUpdate = true
}

// ---------------------------------------------------------------- lamplight
let glowTex = null
export function glowTexture() {
  if (glowTex) return glowTex
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const x = c.getContext('2d')
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,226,170,1)')
  g.addColorStop(0.22, 'rgba(255,176,96,0.6)')
  g.addColorStop(0.6, 'rgba(255,130,50,0.12)')
  g.addColorStop(1, 'rgba(255,110,40,0)')
  x.fillStyle = g
  x.fillRect(0, 0, 64, 64)
  glowTex = new THREE.CanvasTexture(c)
  glowTex.colorSpace = THREE.SRGBColorSpace
  return glowTex
}
// every lit window gets a soft bloom: one draw call for all of them
function buildGlows(points, size) {
  const geo = new THREE.BufferGeometry().setFromPoints(points)
  const mat = new THREE.PointsMaterial({
    map: glowTexture(),
    color: '#ffb36a',
    size,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
  })
  const pts = new THREE.Points(geo, mat)
  pts.frustumCulled = false
  return pts
}

// ---------------------------------------------------------------- the library: a great monastery on the flank
/**
 * The library's monastery: a dzong-like complex stepping down the slope, the
 * tall white utse with its two-tier golden roof at the centre.
 * @param {(x: number, z: number) => number} ground local terrain height
 */
export function buildLibraryGompa(ground) {
  const k = new Kit(ground)
  // On the crest of the spur: the utse, tall and white, a rabsel on its face
  // and a two-tier golden roof, with the gate range below it on the nose.
  const utse = k.block({ x: 4, y: 'auto', z: -5, w: 16, h: 25, d: 14, batter: 0.08, windows: { front: [4, 3], left: [3, 2], right: [3, 2] }, discs: 4, rabsel: true })
  const finial = k.goldRoof({ x: 4, y: utse.top, z: -5, w: 10.5, d: 9, tiers: 2 })
  for (const [gx, gz] of [[-2.8, 1.3], [10.8, 1.3], [-2.8, -11.3], [10.8, -11.3]]) k.gyaltsen(gx, utse.top + 0.6, gz, 2.3)
  const front = k.block({ x: 4, y: 'auto', z: 13.5, w: 24, h: 8, d: 8, windows: { front: [2, 6], left: [1, 2], right: [1, 2], from: 0.3 }, door: { x: 0, h: 4.4 }, band: 0.14, discs: 5 })
  // the red assembly hall steps down the west side, the Dharma wheel over its front
  const hall = k.block({ x: -16, y: 'auto', z: 1, w: 17, h: 13, d: 15, walls: 'red', windows: { front: [2, 4], left: [2, 3] }, discs: 4 })
  k.dharmaWheel(-16, hall.top + 0.6, 7.6, 3.2)
  // the east wing, three floors, a small gilded pavilion on its roof
  const wing = k.block({ x: 23, y: 'auto', z: -1, w: 13, h: 15, d: 13, windows: { front: [3, 3], right: [3, 3] }, discs: 3 })
  k.goldRoof({ x: 23, y: wing.top, z: -1, w: 5.5, d: 5.5, tiers: 1 })
  // up the ridge behind: an ochre chapel and a narrow white tower
  const chapel = k.block({ x: -3, y: 'auto', z: -23, w: 14, h: 13, d: 10, walls: 'ochre', windows: { front: [2, 3], left: [2, 2] }, discs: 3 })
  k.gyaltsen(-8.5, chapel.top + 0.6, -18.8)
  k.gyaltsen(2.5, chapel.top + 0.6, -18.8)
  const back = k.block({ x: 17, y: 'auto', z: -20, w: 9.5, h: 15, d: 9, windows: { front: [3, 2], right: [2, 2] }, discs: 2 })
  // monks' quarters, low and plain, down both flanks
  const qL = k.block({ x: -32, y: 'auto', z: 8, w: 11, h: 6.5, d: 9, windows: { front: [1, 3], left: [1, 2] }, band: 0.16, parapet: false })
  const qR = k.block({ x: 37, y: 'auto', z: 9, w: 10, h: 6, d: 8, windows: { front: [1, 2], right: [1, 2] }, band: 0.16, parapet: false })
  k.block({ x: -29, y: 'auto', z: -14, w: 9, h: 7, d: 9, windows: { left: [1, 2], front: [1, 2] }, band: 0.15, parapet: false })
  // a great chorten in front of the hall, and two small ones on the east side
  const bigTop = k.chorten(-13, 'auto', 21, 6)
  const smallTop = k.chorten(22, 'auto', 17, 3.6)
  k.chorten(33, 'auto', -9, 3)

  // prayer flags: from the utse's finial down to the chortens and the corners,
  // between the front roofs, and off two tall poles on the flanks
  const top = new THREE.Vector3(4, finial - 1.6, -5)
  const left = k.pole(-42, 18, 12)
  const right = k.pole(45, 16, 11)
  k.flags(top, new THREE.Vector3(-13, bigTop - 0.6, 21), { sag: 0.06, seed: 1 })
  k.flags(top, new THREE.Vector3(22, smallTop - 0.4, 17), { sag: 0.06, seed: 2 })
  k.flags(top, left, { sag: 0.06, seed: 3 })
  k.flags(top, right, { sag: 0.06, seed: 4 })
  k.flags(top, new THREE.Vector3(-29, chapel.top - 6, -14), { sag: 0.07, seed: 5 })
  k.flags(top, new THREE.Vector3(17, back.top + 1.2, -20), { sag: 0.1, seed: 6 })
  k.flags(new THREE.Vector3(-16, hall.top + 3.4, 8), new THREE.Vector3(23, wing.top + 1.5, 5.5), { sag: 0.08, seed: 7 })
  k.flags(new THREE.Vector3(-13, bigTop - 0.6, 21), new THREE.Vector3(-32, qL.top + 1, 12.5), { sag: 0.12, seed: 8 })
  k.flags(new THREE.Vector3(-6, front.top + 1, 17.6), new THREE.Vector3(14, front.top + 1, 17.6), { sag: 0.05, seed: 9, size: 0.85 })
  k.flags(new THREE.Vector3(22, smallTop - 0.4, 17), new THREE.Vector3(37, qR.top + 1, 13), { sag: 0.12, seed: 10 })

  return assemble(k, 'library', {
    marker: new THREE.Vector3(4, finial + 7, -5),
    door: k.door,
    span: 86,
  })
}

// ---------------------------------------------------------------- the prayer wheel: a small temple on its own peak
/** A small lhakhang with the great prayer wheel in its own pavilion. */
export function buildWheelTemple(ground) {
  const k = new Kit(ground)
  // the chapel: two floors of white under a maroon frieze, a gilded roof on top
  const chapel = k.block({ x: 3, y: 'auto', z: -4, w: 13, h: 12, d: 12, windows: { front: [2, 2], left: [2, 2], right: [2, 2], from: 0.42 }, door: { x: 0, h: 4.4 }, discs: 3 })
  const finial = k.goldRoof({ x: 3, y: chapel.top, z: -4, w: 8.5, d: 8, tiers: 2 })
  for (const [gx, gz] of [[-2.6, 1.6], [8.6, 1.6], [-2.6, -9.6], [8.6, -9.6]]) k.gyaltsen(gx, chapel.top + 0.6, gz, 1.9)
  // the wheel house: an open pavilion on red posts, the great golden wheel inside
  const px = -9.5
  const pz = 5.5
  const py = k.high(px, pz, 8, 8) - 0.4
  k.foundation(px, pz, 8, 8, py)
  k.add(k.m.white, battered(8, 0.8, 8, 0), place(px, py, pz))
  for (const [cx, cz] of [[-2.9, -2.9], [2.9, -2.9], [-2.9, 2.9], [2.9, 2.9]]) k.add(k.m.red, battered(0.75, 6, 0.75, 0), place(px + cx, py + 0.8, pz + cz))
  k.add(k.m.pembe, battered(7.6, 0.9, 7.6, 0), place(px, py + 6.6, pz))
  k.goldRoof({ x: px, y: py + 7.5, z: pz, w: 6.6, d: 6.6, tiers: 1 })
  const drum = new THREE.CylinderGeometry(1.9, 1.9, 4.2, 24)
  drum.translate(0, 2.1, 0)
  k.add(k.m.gold, drum, place(px, py + 1.3, pz))
  for (const yy of [1.55, 3.4, 5.25]) k.add(k.m.red, new THREE.CylinderGeometry(2.0, 2.0, 0.32, 24), place(px, py + yy, pz))
  // a row of small prayer wheels under a lean-to along the front
  const ly = k.high(5.5, 7, 13, 2.6) - 0.3
  k.foundation(5.5, 7, 13, 2.6, ly)
  k.add(k.m.red, battered(13, 1.3, 2, 0), place(5.5, ly, 7))
  for (let i = 0; i < 9; i++) k.add(k.m.gold, new THREE.CylinderGeometry(0.42, 0.42, 1.3, 10).translate(0, 0.65, 0), place(0.1 + i * 1.35, ly + 1.3, 7.4))
  k.add(k.m.red, battered(14.4, 0.3, 3.4, 0), place(5.5, ly + 3.2, 7.2, 0, 1, 1, 1, 0.24))
  // the white chorten beside it
  const ct = k.chorten(14.5, 'auto', -7, 4.2, 0.2)
  // flags radiating from the chapel's finial like a tent, and from two poles
  const top = new THREE.Vector3(3, finial - 1, -4)
  const p1 = k.pole(-18, -9, 10)
  const p2 = k.pole(18, 12, 9)
  const ends = [[-19, -2, 13], [19, -4, -17], [-7, -3, -20], [10, -5, 18], [-19, -4, 2]]
  ends.forEach((p, i) => {
    const e = new THREE.Vector3(p[0], k.ground(p[0], p[2]) + 0.8, p[2])
    k.flags(top, e, { sag: 0.05, gap: 1, size: 0.85, seed: 20 + i })
  })
  k.flags(top, p1, { sag: 0.06, gap: 1, size: 0.85, seed: 31 })
  k.flags(top, p2, { sag: 0.06, gap: 1, size: 0.85, seed: 32 })
  k.flags(new THREE.Vector3(14.5, ct - 0.4, -7), p2, { sag: 0.12, gap: 1, size: 0.8, seed: 33 })

  return assemble(k, 'wheel', {
    marker: new THREE.Vector3(3, finial + 6, -4),
    door: k.door,
    wheel: new THREE.Vector3(px, py + 3.4, pz),
    span: 42,
  })
}

function assemble(k, name, info) {
  const group = k.build(name)
  const flags = buildFlags(k.flagLines)
  group.add(flags)
  const glows = buildGlows(k.windows, name === 'library' ? 4.2 : 3.4)
  group.add(glows)
  group.userData = { ...info, flags, glows }
  return group
}

/**
 * Per frame: the flags flutter, and as night falls the windows light up, the
 * whitewash takes the lamplight and every window blooms.
 * @param {THREE.Group[]} gompas
 * @param {number} time seconds
 * @param {number} night 0 by day, 1 at full night
 */
export function updateGompas(gompas, time, night) {
  const mats = gompaMaterials()
  // butter lamps flicker a little, never in step
  const flick = 1 + Math.sin(time * 7.3) * 0.04 + Math.sin(time * 13.1) * 0.03
  mats.glass.emissiveIntensity = (0.12 + night * 3.2) * flick
  mats.white.emissiveIntensity = night * 0.035
  for (const g of gompas) {
    const u = g.userData
    if (u.flags) flutter(u.flags, time)
    if (u.glows) {
      u.glows.material.opacity = night * 0.9 * flick
      u.glows.visible = night > 0.01
    }
  }
}

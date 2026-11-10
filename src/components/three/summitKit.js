// The summit's furniture, built in code: the register (a brushed-steel counter
// on a post, its number wheels rolling like an odometer, a red-gripped lever on
// its side), a cairn of weathered stones with a pole for the prayer flags,
// stakes the lines are tied off to, a butter lamp, and a finer cap of snow so
// the top holds up close. Units are metres; the summit is a small snowfield.

import * as THREE from 'three'
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { glowTexture } from './gompa'

const DIGITS = 6
const PI = Math.PI
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)
const smooth = (a, b, x) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}
function rng(seed) {
  let s = seed % 2147483647 || 1
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}

// ---------------------------------------------------------------- noise
// A small deterministic value noise: the lumps, facets and grain of the stones,
// and the wind's ridges in the snow.
function hash3(x, y, z, s) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1274126177) ^ Math.imul(s, 461845907)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}
function vnoise(x, y, z, s) {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const zi = Math.floor(z)
  const fx = x - xi
  const fy = y - yi
  const fz = z - zi
  const u = fx * fx * (3 - 2 * fx)
  const v = fy * fy * (3 - 2 * fy)
  const w = fz * fz * (3 - 2 * fz)
  const c = (a, b, d) => hash3(xi + a, yi + b, zi + d, s)
  const l = (a, b, t) => a + (b - a) * t
  return l(l(l(c(0, 0, 0), c(1, 0, 0), u), l(c(0, 1, 0), c(1, 1, 0), u), v), l(l(c(0, 0, 1), c(1, 0, 1), u), l(c(0, 1, 1), c(1, 1, 1), u), v), w)
}
function fbm(x, y, z, s, octaves = 4) {
  let sum = 0
  let amp = 0.5
  let f = 1
  let norm = 0
  for (let i = 0; i < octaves; i++) {
    sum += amp * vnoise(x * f, y * f, z * f, s + i * 17)
    norm += amp
    amp *= 0.5
    f *= 2.07
  }
  return sum / norm
}

// A tiling height field (periodic value noise: `cx` by `cy` cells), and the
// normal map made from it.
function tileHeight(size, cx, cy, seed, octaves, warp = 0) {
  const h = new Float32Array(size * size)
  const lattice = (x, y, px, py, s) => hash3(((x % px) + px) % px, ((y % py) + py) % py, 0, s)
  const noise = (x, y, px, py, s) => {
    const xi = Math.floor(x)
    const yi = Math.floor(y)
    const fx = x - xi
    const fy = y - yi
    const u = fx * fx * (3 - 2 * fx)
    const v = fy * fy * (3 - 2 * fy)
    const a = lattice(xi, yi, px, py, s)
    const b = lattice(xi + 1, yi, px, py, s)
    const c = lattice(xi, yi + 1, px, py, s)
    const d = lattice(xi + 1, yi + 1, px, py, s)
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
  }
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      let x = (i / size) * cx
      let y = (j / size) * cy
      if (warp) {
        x += Math.sin((j / size) * PI * 2 * 2) * warp
        y += Math.sin((i / size) * PI * 2 * 3) * warp * 0.4
      }
      let sum = 0
      let amp = 1
      let norm = 0
      for (let o = 0; o < octaves; o++) {
        const f = 1 << o
        sum += amp * noise(x * f, y * f, cx * f, cy * f, seed + o * 31)
        norm += amp
        amp *= 0.5
      }
      h[j * size + i] = sum / norm
    }
  }
  return h
}
function normalTexture(h, size, strength, repeat) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const x = c.getContext('2d')
  const img = x.createImageData(size, size)
  const at = (i, j) => h[((j + size) % size) * size + ((i + size) % size)]
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const dx = (at(i + 1, j) - at(i - 1, j)) * strength
      const dy = (at(i, j + 1) - at(i, j - 1)) * strength
      const l = Math.hypot(dx, dy, 1)
      const o = (j * size + i) * 4
      img.data[o] = (-dx / l) * 127.5 + 127.5
      img.data[o + 1] = (dy / l) * 127.5 + 127.5
      img.data[o + 2] = (1 / l) * 127.5 + 127.5
      img.data[o + 3] = 255
    }
  }
  x.putImageData(img, 0, 0)
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(repeat, repeat)
  t.anisotropy = 8
  return t
}

function canvas(w, h, paint) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  paint(c.getContext('2d'), w, h)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

// brushed steel: fine horizontal streaks
function brushed(w = 512, h = 256, base = '#c9ced2') {
  return canvas(w, h, (x) => {
    x.fillStyle = base
    x.fillRect(0, 0, w, h)
    for (let i = 0; i < 2600; i++) {
      const y = Math.random() * h
      const len = 40 + Math.random() * 260
      const sx = Math.random() * w
      const l = Math.random() < 0.5 ? 255 : 120
      x.strokeStyle = `rgba(${l},${l},${l},${0.03 + Math.random() * 0.07})`
      x.lineWidth = 0.6 + Math.random() * 0.8
      x.beginPath()
      x.moveTo(sx, y)
      x.lineTo(sx + len, y + (Math.random() - 0.5) * 0.6)
      x.stroke()
    }
  })
}

// The plate: engraved like the real ones, the name and height of the place,
// a line of the mountain, and the window the number wheels show through.
function plateTexture(fonts) {
  const W = 1024
  const H = 560
  const t = canvas(W, H, (x) => {
    const g = x.createLinearGradient(0, 0, W, H)
    g.addColorStop(0, '#d9dde0')
    g.addColorStop(0.55, '#c3c8cc')
    g.addColorStop(1, '#d4d8db')
    x.fillStyle = g
    x.fillRect(0, 0, W, H)
    for (let i = 0; i < 2200; i++) {
      const y = Math.random() * H
      const l = Math.random() < 0.5 ? 255 : 110
      x.strokeStyle = `rgba(${l},${l},${l},${0.03 + Math.random() * 0.06})`
      x.lineWidth = 0.8
      x.beginPath()
      const sx = Math.random() * W
      x.moveTo(sx, y)
      x.lineTo(sx + 60 + Math.random() * 300, y)
      x.stroke()
    }
    const engrave = (draw) => {
      // a cut: a dark stroke with a light lip under it
      x.save()
      x.translate(0, 2)
      x.globalAlpha = 0.55
      draw('#f4f6f7')
      x.restore()
      draw('#2f3438')
    }
    // the window for the six wheels, framed
    x.fillStyle = '#16191b'
    x.fillRect(150, 70, 724, 168)
    x.strokeStyle = '#8e959a'
    x.lineWidth = 6
    x.strokeRect(147, 67, 730, 174)
    // small engraved labels over the window
    x.textBaseline = 'alphabetic'
    engrave((c) => {
      x.fillStyle = c
      x.font = `500 26px ${fonts.mono}`
      x.textAlign = 'left'
      x.fillText('REGISTER', 150, 52)
      x.textAlign = 'right'
      x.fillText('PULL ONCE  →', 874, 52)
    })
    // a line of the mountain, and its name and height
    engrave((c) => {
      x.strokeStyle = c
      x.lineWidth = 5
      x.lineJoin = 'round'
      x.beginPath()
      const pts = [[150, 470], [205, 420], [228, 432], [270, 360], [300, 382], [330, 330], [362, 372], [392, 352], [440, 420], [470, 408], [520, 470]]
      pts.forEach(([px, py], i) => (i ? x.lineTo(px, py) : x.moveTo(px, py)))
      x.stroke()
    })
    engrave((c) => {
      x.fillStyle = c
      x.textAlign = 'left'
      x.font = `700 70px ${fonts.mono}`
      x.fillText('6190 M', 150, 535)
      x.textAlign = 'right'
      x.font = `400 64px ${fonts.serif}`
      x.fillText('The Summit', 874, 340)
      x.font = `500 30px ${fonts.mono}`
      x.fillText('ARYENDRA.COM', 874, 410)
      x.fillText('2026', 874, 458)
    })
  })
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

// A strip of digits, white on black, for one wheel: 9, then 0 to 9, then 0
// and 1, so a drum always shows the digits either side of its own, and the
// roll from 9 to 0 is seamless.
const CELLS = 13
function digitStrip(fonts) {
  const cell = 128
  return canvas(cell, cell * CELLS, (x) => {
    x.fillStyle = '#121416'
    x.fillRect(0, 0, cell, cell * CELLS)
    x.fillStyle = '#f2f2ef'
    x.font = `500 104px ${fonts.mono}`
    x.textAlign = 'center'
    x.textBaseline = 'middle'
    for (let i = 0; i < CELLS; i++) x.fillText(String((i + 9) % 10), cell / 2, cell * i + cell / 2 + 4)
  })
}
// a drum's face: a band of `arc` radians round a drum of radius r, its front at z = 0
function drumGeometry(r, w, arc) {
  const g = new THREE.PlaneGeometry(w, 1, 1, 24)
  const p = g.attributes.position
  for (let i = 0; i < p.count; i++) {
    const a = p.getY(i) * arc
    p.setY(i, Math.sin(a) * r)
    p.setZ(i, Math.cos(a) * r - r)
  }
  g.computeVertexNormals()
  return g
}

// ---------------------------------------------------------------- reflections
/**
 * What the metal on the top reflects: the sky over you (zenith to horizon, the
 * sun in it), and below the horizon the sea of cloud. A small scene, filtered
 * into an environment map, redrawn as the light changes.
 */
export function skyReflections(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer)
  const uniforms = {
    uZenith: { value: new THREE.Color() },
    uHorizon: { value: new THREE.Color() },
    uBelow: { value: new THREE.Color() },
    uSunDir: { value: new THREE.Vector3(0, 1, 0) },
    uSun: { value: new THREE.Color() },
  }
  const scene = new THREE.Scene()
  scene.add(
    new THREE.Mesh(
      new THREE.SphereGeometry(10, 48, 24),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms,
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uZenith;
          uniform vec3 uHorizon;
          uniform vec3 uBelow;
          uniform vec3 uSunDir;
          uniform vec3 uSun;
          varying vec3 vDir;
          void main() {
            vec3 d = normalize(vDir);
            vec3 col = d.y > 0.0 ? mix(uHorizon, uZenith, pow(d.y, 0.55)) : mix(uHorizon, uBelow, smoothstep(0.0, 0.12, -d.y));
            float s = max(dot(d, normalize(uSunDir)), 0.0);
            col += uSun * (pow(s, 900.0) * 30.0 + pow(s, 12.0) * 0.35);
            gl_FragColor = vec4(col, 1.0);
          }
        `,
      })
    )
  )
  let target = null
  const sig = new THREE.Vector4(-1, -1, -1, -1)
  const now = new THREE.Vector4()
  return {
    get texture() {
      return target?.texture ?? null
    },
    /** Redraw from the sky of the moment, if it has moved on. Returns the texture. */
    update(env) {
      now.set(env.skyZenith.r + env.skyZenith.g + env.skyZenith.b, env.skyHorizon.r + env.skyHorizon.g, env.daylight, env.skySunDir.y)
      if (target && Math.abs(now.x - sig.x) + Math.abs(now.y - sig.y) + Math.abs(now.z - sig.z) + Math.abs(now.w - sig.w) < 0.02) return target.texture
      sig.copy(now)
      uniforms.uZenith.value.copy(env.skyZenith)
      uniforms.uHorizon.value.copy(env.skyHorizon)
      uniforms.uBelow.value.copy(env.cloudLight).multiplyScalar(0.25 + 0.75 * env.daylight)
      uniforms.uSunDir.value.copy(env.skySunDir)
      uniforms.uSun.value.copy(env.sunColor).multiplyScalar(smooth(-0.04, 0.08, env.skySunDir.y))
      const next = pmrem.fromScene(scene, 0)
      target?.dispose()
      target = next
      return target.texture
    },
    dispose() {
      target?.dispose()
      pmrem.dispose()
    },
  }
}

// ---------------------------------------------------------------- stones
const GRANITE = new THREE.Color('#5d5c5a')
const UMBER = new THREE.Color('#665749')
const LICHEN = new THREE.Color('#8a8760')
const SNOW = new THREE.Color('#f1f4f8')
let stoneMat = null
let rockNormal = null
/** Weathered stone: vertex-coloured granite with a fine grain to catch the light. */
export function stoneMaterial() {
  if (!stoneMat) {
    rockNormal = normalTexture(tileHeight(128, 8, 8, 5, 4), 128, 6, 4)
    stoneMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0, normalMap: rockNormal, normalScale: new THREE.Vector2(1.2, 1.2) })
  }
  return stoneMat
}

/**
 * A stone: a lumpy, squashed boulder with flat faces split off it, dark in its
 * hollows, a little lichen, and snow lying on whatever faces up.
 */
export function stoneGeometry(radius, seed, { squash = 0.6, detail = 3, lump = 0.26, cuts = 7, snowy = 0.7 } = {}) {
  const ico = new THREE.IcosahedronGeometry(1, detail)
  ico.deleteAttribute('normal')
  ico.deleteAttribute('uv')
  const g = mergeVertices(ico)
  ico.dispose()
  const p = g.attributes.position
  const r = rng(seed * 7919 + 13)
  const planes = []
  for (let i = 0; i < cuts; i++) {
    planes.push({ n: new THREE.Vector3(r() * 2 - 1, r() * 1.6 - 0.6, r() * 2 - 1).normalize(), d: 0.56 + r() * 0.26 })
  }
  // no two stones the same shape: longer one way than the other
  const sx = 0.8 + r() * 0.5
  const sz = 0.8 + r() * 0.5
  const v = new THREE.Vector3()
  const hollow = new Float32Array(p.count)
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).normalize()
    let d = 1 + (fbm(v.x * 1.3 + seed, v.y * 1.3, v.z * 1.3, seed) - 0.5) * lump * 2
    d += (fbm(v.x * 4.6, v.y * 4.6 + seed, v.z * 4.6, seed + 5) - 0.5) * lump * 0.5
    for (const pl of planes) {
      const k = v.dot(pl.n)
      if (k > 0 && d * k > pl.d) d = pl.d / k
    }
    hollow[i] = d
    p.setXYZ(i, v.x * d * radius * sx, v.y * d * radius * squash, v.z * d * radius * sz)
  }
  g.computeVertexNormals()
  const n = g.attributes.normal
  const uv = new Float32Array(p.count * 2)
  const col = new Float32Array(p.count * 3)
  const base = new THREE.Color().lerpColors(GRANITE, UMBER, r() * 0.8)
  const c = new THREE.Color()
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i)
    const len = v.length() || 1
    uv[i * 2] = Math.atan2(v.z, v.x) / (2 * PI) + 0.5
    uv[i * 2 + 1] = Math.acos(Math.max(-1, Math.min(1, v.y / len))) / PI
    const q = 6 / radius
    const grain = fbm(v.x * q, v.y * q, v.z * q, seed + 9, 3)
    c.copy(base).multiplyScalar(0.78 + grain * 0.44)
    // the hollows stay dark
    c.multiplyScalar(0.62 + 0.38 * smooth(0.8, 1.04, hollow[i]))
    // lichen, in patches
    const li = smooth(0.7, 0.8, vnoise(v.x * q * 0.6, v.y * q * 0.6, v.z * q * 0.6, seed + 21))
    c.lerp(LICHEN, li * 0.3)
    // snow lies in patches on what faces the sky
    const patch = smooth(0.42, 0.62, vnoise(v.x * q * 0.35 + 7, v.y * q * 0.35, v.z * q * 0.35, seed + 33))
    const sn = smooth(0.84, 0.97, n.getY(i) + (grain - 0.5) * 0.12) * patch * snowy
    c.lerp(SNOW, sn * 0.92)
    col[i * 3] = c.r
    col[i * 3 + 1] = c.g
    col[i * 3 + 2] = c.b
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  g.setAttribute('color', new THREE.BufferAttribute(col, 3))
  return g
}

// ---------------------------------------------------------------- wood
let woodMat = null
function wood() {
  if (!woodMat) {
    const t = canvas(64, 256, (x, w, h) => {
      x.fillStyle = '#5a3d27'
      x.fillRect(0, 0, w, h)
      const r = rng(41)
      for (let i = 0; i < 70; i++) {
        const l = r() < 0.5 ? '30,18,10' : '120,90,60'
        x.strokeStyle = `rgba(${l},${(0.08 + r() * 0.16).toFixed(2)})`
        x.lineWidth = 0.6 + r() * 1.6
        const px = r() * w
        x.beginPath()
        x.moveTo(px, 0)
        x.bezierCurveTo(px + (r() - 0.5) * 6, h * 0.3, px + (r() - 0.5) * 6, h * 0.6, px + (r() - 0.5) * 4, h)
        x.stroke()
      }
    })
    woodMat = new THREE.MeshStandardMaterial({ map: t, roughness: 0.82, metalness: 0 })
  }
  return woodMat
}

// the colours the butter lamp lends the register's parts (see light())
const WARM = { plate: new THREE.Color('#ffd2a0'), wheel: new THREE.Color('#fff1dc'), steel: new THREE.Color('#ffb27a'), dark: new THREE.Color('#c99a78') }
const SKY = new THREE.Color()

/**
 * The register: post, box, plate, wheels and lever. Its base is at y = 0, its
 * face toward +z. Returns the group with methods to show a number, to set the
 * lever (0 at rest, 1 pulled all the way), and to light it.
 */
export function buildCounter(fonts) {
  const group = new THREE.Group()
  group.name = 'register'
  // (each takes the butter lamp's light at night, and the sky's, as emissive: see light())
  const brush = brushed()
  const steel = new THREE.MeshStandardMaterial({ color: '#d7dbde', map: brush, metalness: 0.62, roughness: 0.34, emissive: '#000000', emissiveMap: brush, envMapIntensity: 0.9 })
  const darkSteel = new THREE.MeshStandardMaterial({ color: '#79818a', metalness: 0.66, roughness: 0.4, emissive: '#000000', envMapIntensity: 0.8 })

  // the post, set in a collar in the snow, with a band and bolts where the box sits
  const postH = 1.18
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, postH, 40).translate(0, postH / 2, 0), darkSteel)
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.112, 0.12, 40).translate(0, 0.06, 0), darkSteel)
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.053, 0.053, 0.05, 40).translate(0, postH - 0.06, 0), darkSteel)
  const bracket = new THREE.Mesh(new RoundedBoxGeometry(0.26, 0.05, 0.16, 3, 0.008).translate(0, postH, 0), darkSteel)
  group.add(post, collar, band, bracket)

  // the box
  const bw = 0.66
  const bh = 0.36
  const bd = 0.22
  const by = postH + 0.025 + bh / 2
  const box = new THREE.Mesh(new RoundedBoxGeometry(bw, bh, bd, 6, 0.028), steel)
  box.position.y = by
  group.add(box)

  // the plate on its face, held by a bolt at each corner
  const plateTex = plateTexture(fonts)
  const plateMat = new THREE.MeshStandardMaterial({ map: plateTex, metalness: 0.55, roughness: 0.36, emissive: '#000000', emissiveMap: plateTex, envMapIntensity: 0.7 })
  const pw = bw - 0.03
  const ph = pw * (560 / 1024)
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), plateMat)
  plate.position.set(0, by - 0.005, bd / 2 + 0.002)
  group.add(plate)
  const bolt = new THREE.CylinderGeometry(0.0085, 0.0095, 0.006, 6).rotateX(PI / 2)
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const b = new THREE.Mesh(bolt, darkSteel)
    b.position.set(sx * (pw / 2 - 0.016), by - 0.005 + sy * (ph / 2 - 0.016), bd / 2 + 0.004)
    b.rotation.z = sx * sy * 0.3
    group.add(b)
  }
  // map a point on the 1024×560 plate texture to the plate's local position
  const onPlate = (u, v) => [-pw / 2 + (u / 1024) * pw, by - 0.005 + ph / 2 - (v / 560) * ph]

  // the six wheels, behind the window: each a strip of digits that rolls
  const strip = digitStrip(fonts)
  strip.wrapT = THREE.RepeatWrapping
  const wheels = []
  const wheelMats = []
  const [wx0] = onPlate(160, 0)
  const [wx1] = onPlate(864, 0)
  const [, wy] = onPlate(0, 154)
  const cw = (wx1 - wx0) / DIGITS
  const wh = (168 / 560) * ph * 0.86
  // a drum, not a card: its face curves away at the top and bottom of the
  // window, where the next digits are half in view
  const DR = wh * 0.6
  const ARC = 2 * Math.asin(Math.min(0.99, (wh * 0.62) / DR))
  const SHOWN = (ARC * DR) / (wh * 0.86)
  for (let i = 0; i < DIGITS; i++) {
    const tex = strip.clone()
    tex.needsUpdate = true
    tex.repeat.set(1, SHOWN / CELLS)
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5, metalness: 0.1, emissive: '#000000', emissiveMap: tex })
    const m = new THREE.Mesh(drumGeometry(DR, cw * 0.8, ARC), mat)
    m.position.set(wx0 + cw * (i + 0.5), wy, bd / 2 + 0.006)
    group.add(m)
    wheels.push(tex)
    wheelMats.push(mat)
  }
  // a raised bezel round the window, and the glass in it
  const bez = new THREE.Shape()
  const ow = wx1 - wx0 + 0.03
  const oh = wh + 0.03
  bez.moveTo(-ow / 2, -oh / 2)
  bez.lineTo(ow / 2, -oh / 2)
  bez.lineTo(ow / 2, oh / 2)
  bez.lineTo(-ow / 2, oh / 2)
  bez.lineTo(-ow / 2, -oh / 2)
  const hole = new THREE.Path()
  hole.moveTo(-ow / 2 + 0.012, -oh / 2 + 0.012)
  hole.lineTo(-ow / 2 + 0.012, oh / 2 - 0.012)
  hole.lineTo(ow / 2 - 0.012, oh / 2 - 0.012)
  hole.lineTo(ow / 2 - 0.012, -oh / 2 + 0.012)
  hole.lineTo(-ow / 2 + 0.012, -oh / 2 + 0.012)
  bez.holes.push(hole)
  const bezel = new THREE.Mesh(new THREE.ExtrudeGeometry(bez, { depth: 0.004, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002, bevelSegments: 3 }), darkSteel)
  bezel.position.set((wx0 + wx1) / 2, wy, bd / 2 + 0.002)
  group.add(bezel)
  const glassMat = new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.12, roughness: 0.04, metalness: 1, envMapIntensity: 1.2 })
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(ow - 0.02, oh - 0.02), glassMat)
  glass.position.set((wx0 + wx1) / 2, wy, bd / 2 + 0.0075)
  group.add(glass)

  // the lever on the right side: a hub, a steel arm, a ridged red grip, a knob
  const lever = new THREE.Group()
  lever.position.set(bw / 2 + 0.035, by, 0)
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.04, 0.05, 40).rotateZ(PI / 2), darkSteel)
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.02, 24, 12, 0, PI * 2, 0, PI / 2).rotateZ(-PI / 2).translate(0.025, 0, 0), steel)
  lever.add(hub, cap)
  const armLen = 0.42
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, armLen, 20).translate(0, armLen / 2, 0), steel)
  arm.position.x = 0.03
  const gripProfile = []
  for (let i = 0; i <= 24; i++) {
    const t = i / 24
    // swelling in the middle, ridged for a gloved hand
    gripProfile.push(new THREE.Vector2(0.021 + 0.005 * Math.sin(t * PI) + 0.0012 * Math.cos(t * PI * 16), t * 0.15))
  }
  const grip = new THREE.Mesh(
    new THREE.LatheGeometry(gripProfile, 32).translate(0, armLen - 0.175, 0),
    new THREE.MeshStandardMaterial({ color: '#c42219', roughness: 0.48, metalness: 0 })
  )
  grip.position.x = 0.03
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.02, 24, 16).translate(0, armLen + 0.005, 0), darkSteel)
  knob.position.x = 0.03
  // a crossbar on top, as on the real one
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.11, 16).rotateZ(PI / 2).translate(0.03, armLen + 0.02, 0), darkSteel)
  lever.add(arm, grip, knob, bar)
  group.add(lever)

  group.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true
      o.receiveShadow = true
    }
  })

  // ---- the number, rolling like an odometer
  let shown = 0
  const setWheels = (v) => {
    for (let i = 0; i < DIGITS; i++) {
      const p = Math.pow(10, i)
      const digit = Math.floor(v / p) % 10
      // a wheel turns only while every wheel to its right rolls from 9 to 0
      const rest = v % p
      const turning = i === 0 ? v - Math.floor(v) : Math.max(0, rest - (p - 1))
      const pos = digit + Math.min(1, turning)
      // the strip runs 9, 0 … 9, 0, 1 from the top: centre the drum on its cell for `pos`
      const tex = wheels[DIGITS - 1 - i]
      tex.offset.y = 1 - (pos + 1.5) / CELLS - tex.repeat.y / 2
    }
  }
  setWheels(0)

  return {
    group,
    // what reflects the sky
    metals: [steel, darkSteel, plateMat, glassMat],
    // the lever's grip, for pointing at it from the page
    grip: new THREE.Vector3(bw / 2 + 0.065, by + armLen - 0.1, 0),
    face: new THREE.Vector3(0, by, bd / 2),
    /** Show a number: at once, or rolled up to over `seconds`. Returns a stepper for the frame loop. */
    show(n, seconds = 0) {
      const from = shown
      shown = n
      if (!seconds || n === from) {
        setWheels(n)
        return null
      }
      let t = 0
      return (dt) => {
        t = Math.min(1, t + dt / seconds)
        const e = 1 - Math.pow(1 - t, 3)
        setWheels(from + (n - from) * e)
        return t < 1
      }
    },
    /** 0 at rest, 1 pulled: the arm swings down toward you. */
    setLever(p) {
      lever.rotation.x = p * 1.75
    },
    /**
     * The light on it besides the sun's: the butter lamp's (0 by day, 1 at full
     * night), and the sky's, which steel (being metal) hardly takes from an
     * ambient light, so it is added here.
     */
    light(lamp, sky) {
      const glow = (m, warm, k, s) => m.emissive.copy(warm).multiplyScalar(lamp * k).add(SKY.copy(sky).multiplyScalar(s))
      glow(plateMat, WARM.plate, 0.42, 1)
      for (const m of wheelMats) glow(m, WARM.wheel, 0.5, 0.6)
      glow(steel, WARM.steel, 0.2, 1)
      glow(darkSteel, WARM.dark, 0.045, 0.5)
    },
  }
}

// a butter lamp's flame: a soft, tall glow, white at the wick
let flameTex = null
function flameTexture() {
  if (!flameTex) {
    flameTex = canvas(64, 160, (x) => {
      x.translate(32, 96)
      x.scale(1, 2.2)
      const g = x.createRadialGradient(0, 0, 0, 0, 0, 24)
      g.addColorStop(0, 'rgba(255,250,232,1)')
      g.addColorStop(0.3, 'rgba(255,212,128,0.95)')
      g.addColorStop(0.64, 'rgba(255,126,30,0.4)')
      g.addColorStop(1, 'rgba(255,80,0,0)')
      x.fillStyle = g
      x.fillRect(-32, -44, 64, 88)
    })
  }
  return flameTex
}

/**
 * A butter lamp in a glass chimney, left on a flat stone at the register's
 * foot: a small flame by day, and by night the light the count is read by.
 */
export function buildButterLamp() {
  const g = new THREE.Group()
  g.name = 'butter-lamp'
  const brass = new THREE.MeshStandardMaterial({ color: '#b98a3e', metalness: 0.8, roughness: 0.3, emissive: '#ff9a40', emissiveIntensity: 0, envMapIntensity: 1 })
  // its stone takes the flame's light at night
  const rock = stoneMaterial().clone()
  rock.emissive = new THREE.Color('#ffae6a')
  rock.emissiveIntensity = 0
  const stone = new THREE.Mesh(stoneGeometry(0.17, 77, { squash: 0.28, detail: 3, lump: 0.14, cuts: 3, snowy: 0.25 }), rock)
  stone.position.y = 0.025
  // the lamp: a footed brass cup, turned
  const cupTop = 0.165
  const cup = new THREE.Mesh(
    new THREE.LatheGeometry(
      [
        [0, 0.065],
        [0.045, 0.065],
        [0.046, 0.071],
        [0.02, 0.082],
        [0.013, 0.105],
        [0.017, 0.118],
        [0.042, 0.142],
        [0.052, 0.158],
        [0.054, cupTop],
        [0.049, cupTop],
        [0.0, cupTop - 0.008],
      ].map(([r, y]) => new THREE.Vector2(r, y)),
      40
    ),
    brass
  )
  // the butter, and a glass chimney against the wind
  const butter = new THREE.Mesh(new THREE.CircleGeometry(0.048, 32).rotateX(-PI / 2).translate(0, cupTop - 0.006, 0), new THREE.MeshStandardMaterial({ color: '#e9d39a', roughness: 0.6, emissive: '#ffb040', emissiveIntensity: 0 }))
  const glassMat = new THREE.MeshStandardMaterial({ color: '#fff6e8', transparent: true, opacity: 0.14, roughness: 0.05, metalness: 0.3, side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 1.4 })
  const chimney = new THREE.Mesh(
    new THREE.LatheGeometry(
      [0, 0.25, 0.5, 0.75, 1].map((t) => new THREE.Vector2(0.06 + Math.sin(t * PI) * 0.012, cupTop - 0.004 + t * 0.17)),
      40
    ),
    glassMat
  )
  chimney.renderOrder = 2
  // the flame stands on the wick and flickers from its foot
  const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false }))
  flame.center.set(0.5, 0.1)
  flame.position.y = cupTop - 0.004
  flame.scale.set(0.022, 0.052, 1)
  flame.renderOrder = 3
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#ffb36a', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }))
  glow.position.y = cupTop + 0.025
  glow.scale.setScalar(0.75)
  glow.renderOrder = 3
  stone.castShadow = stone.receiveShadow = true
  cup.castShadow = true
  g.add(stone, cup, butter, chimney, flame, glow)
  return {
    group: g,
    metals: [brass, glassMat],
    /** Per frame: the flame flickers; by night its glow blooms and the brass takes it. */
    update(time, night) {
      const flick = 1 + Math.sin(time * 7.3) * 0.06 + Math.sin(time * 13.1 + 1.7) * 0.04
      flame.scale.set(0.022 * (1 + Math.sin(time * 5.1) * 0.05), 0.052 * flick, 1)
      glow.visible = night > 0.01
      glow.material.opacity = night * 0.85 * flick
      brass.emissiveIntensity = night * 0.45 * flick
      butter.material.emissiveIntensity = night * 0.6 * flick
      rock.emissiveIntensity = night * 0.14 * flick
      return flick
    },
  }
}

// ---------------------------------------------------------------- the cairn and its flags
/**
 * A cairn of stones built up by the people who came before, snow lying on
 * them, with a pole for the flags, a gilt knob at its top.
 */
export function buildCairn() {
  const r = rng(3)
  const parts = []
  let y = 0
  let seed = 11
  const layers = [[8, 0.47], [7, 0.39], [6, 0.31], [5, 0.24], [3, 0.18], [2, 0.13], [1, 0.1]]
  for (const [n, rad] of layers) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * PI * 2 + r() * 0.5
      const d = n === 1 ? 0 : rad * (0.74 + r() * 0.22)
      const s = rad * (0.48 + r() * 0.3)
      const g = stoneGeometry(s, seed++, { squash: 0.38 + r() * 0.24, detail: s > 0.14 ? 3 : 2, lump: 0.18 + r() * 0.08 })
      g.rotateY(r() * PI * 2)
      g.rotateZ((r() - 0.5) * 0.35)
      g.translate(Math.cos(a) * d, y + s * 0.38, Math.sin(a) * d)
      parts.push(g)
    }
    y += rad * 0.58
  }
  const cairn = new THREE.Mesh(mergeGeometries(parts, false), stoneMaterial())
  parts.forEach((p) => p.dispose())
  cairn.castShadow = true
  cairn.receiveShadow = true
  const poleH = 2.6
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.034, poleH, 20).translate(0, poleH / 2, 0), wood())
  pole.castShadow = true
  const gilt = new THREE.MeshStandardMaterial({ color: '#d6a64a', metalness: 0.9, roughness: 0.28, envMapIntensity: 1.2 })
  const finial = new THREE.Mesh(new THREE.SphereGeometry(0.036, 28, 18).scale(1, 1.25, 1).translate(0, poleH + 0.03, 0), gilt)
  const g = new THREE.Group()
  g.name = 'cairn'
  g.add(cairn, pole, finial)
  return { group: g, top: new THREE.Vector3(0, poleH - 0.07, 0), metals: [gilt] }
}

/** A stake a line of flags is tied off to, wedged upright in a few stones. */
export function buildStake(seed) {
  const r = rng(seed * 31 + 7)
  const h = 0.62
  const g = new THREE.Group()
  const stake = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.019, h, 12).translate(0, h / 2, 0), wood())
  stake.rotation.set((r() - 0.5) * 0.18, 0, (r() - 0.5) * 0.18)
  stake.castShadow = true
  const parts = []
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * PI * 2 + r()
    const s = 0.07 + r() * 0.05
    const sg = stoneGeometry(s, seed * 10 + i, { squash: 0.6, detail: 2, lump: 0.25 })
    sg.translate(Math.cos(a) * 0.08, s * 0.3, Math.sin(a) * 0.08)
    parts.push(sg)
  }
  const stones = new THREE.Mesh(mergeGeometries(parts, false), stoneMaterial())
  parts.forEach((p) => p.dispose())
  stones.castShadow = stones.receiveShadow = true
  g.add(stake, stones)
  // where the line is tied: near the top of the stake, as it leans
  stake.updateMatrix()
  const top = new THREE.Vector3(0, h - 0.05, 0).applyMatrix4(stake.matrix)
  return { group: g, top }
}

/**
 * The snow's surface on the summit, from the rock under it: wind-smoothed (the
 * rock's creases soften under the snow, but never poke through it), with drifts.
 */
export function snowSurface(heightAt) {
  // the rock blurred over a few metres: two rings of samples round the point
  const ring = []
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * PI * 2
    ring.push([Math.cos(a) * 1.4, Math.sin(a) * 1.4, 0.06], [Math.cos(a + 0.4) * 2.9, Math.sin(a + 0.4) * 2.9, 0.03])
  }
  // (the weights: 0.28 at the point, 8 × 0.06 and 8 × 0.03 round it: one in all)
  // a soft maximum: the snow rides over the rock without a crease where they meet
  const smax = (a, b, k) => (a + b + Math.sqrt((a - b) * (a - b) + k * k)) / 2
  return (x, z) => {
    const h = heightAt(x, z)
    let soft = h * 0.28
    for (const [dx, dz, w] of ring) soft += heightAt(x + dx, z + dz) * w
    const drift = Math.sin(x * 0.9 + Math.cos(z * 0.7) * 1.3) * 0.06 + Math.sin(z * 1.7 - x * 0.4) * 0.04
    return smax(soft + 0.24, h + 0.1, 0.3) + drift
  }
}

/** A square of something (a shadow, a pool of lamplight) laid on the snow, following it. */
export function laidOnSnow(surface, cx, cz, size, material, lift = 0.015, seg = 10) {
  const g = new THREE.PlaneGeometry(size, size, seg, seg).rotateX(-Math.PI / 2)
  const p = g.attributes.position
  for (let i = 0; i < p.count; i++) {
    const x = cx + p.getX(i)
    const z = cz + p.getZ(i)
    p.setXYZ(i, x, surface(x, z) + lift, z)
  }
  const m = new THREE.Mesh(g, material)
  m.renderOrder = 1
  return m
}

/**
 * A finer cap of snow over the summit, following the mountain within `size`
 * metres of its top, and sinking under the rock at its edge. Its surface is
 * carved by the wind into faint ridges (a normal map, across it).
 */
export function buildSnowCap(surface, cx, cz, size = 40, seg = 80) {
  const g = new THREE.PlaneGeometry(size, size, seg, seg).rotateX(-Math.PI / 2)
  const p = g.attributes.position
  for (let i = 0; i < p.count; i++) {
    const lx = p.getX(i)
    const lz = p.getZ(i)
    const x = cx + lx
    const z = cz + lz
    const edge = Math.max(Math.abs(lx), Math.abs(lz)) / (size / 2)
    const sink = edge > 0.7 ? ((edge - 0.7) / 0.3) * 1.6 : 0
    p.setXYZ(i, x, surface(x, z) - sink, z)
  }
  g.computeVertexNormals()
  // the wind's ridges (sastrugi): long in one direction, short across
  const ridges = normalTexture(tileHeight(256, 3, 14, 61, 4, 0.6), 256, 9, size / 2.2)
  // (no shadows: the mountain's shadow caster is coarser than this cap and would shade it from inside)
  // fresh snow glows with the light it scatters: a little emissive, raised by day (see Summit.jsx)
  const m = new THREE.Mesh(
    g,
    new THREE.MeshStandardMaterial({ color: '#f3f6fa', roughness: 0.78, metalness: 0, normalMap: ridges, normalScale: new THREE.Vector2(0.55, 0.55), emissive: '#d6e2f0', emissiveIntensity: 0 })
  )
  m.name = 'snowcap'
  return m
}

// The summit's furniture, built in code: the register (a brushed-steel counter
// on a post, its number wheels rolling like an odometer, a red-gripped lever on
// its side), a cairn with a pole of prayer flags, and a finer cap of snow so
// the top holds up close. Units are metres; the summit is a small snowfield.

import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { buildFlagLine, glowTexture } from './gompa'

const DIGITS = 6

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

// A strip of the ten digits, white on black, for one wheel: 0 to 9 and 0
// again, so the roll from 9 to 0 is seamless.
function digitStrip(fonts) {
  const cell = 128
  return canvas(cell, cell * 11, (x) => {
    x.fillStyle = '#121416'
    x.fillRect(0, 0, cell, cell * 11)
    x.fillStyle = '#f2f2ef'
    x.font = `500 104px ${fonts.mono}`
    x.textAlign = 'center'
    x.textBaseline = 'middle'
    for (let i = 0; i < 11; i++) x.fillText(String(i % 10), cell / 2, cell * i + cell / 2 + 4)
    // the drum's curve: darker toward the top and bottom of each window
    for (let i = 0; i < 11; i++) {
      const g = x.createLinearGradient(0, cell * i, 0, cell * (i + 1))
      g.addColorStop(0, 'rgba(0,0,0,0.55)')
      g.addColorStop(0.28, 'rgba(0,0,0,0)')
      g.addColorStop(0.72, 'rgba(0,0,0,0)')
      g.addColorStop(1, 'rgba(0,0,0,0.55)')
      x.fillStyle = g
      x.fillRect(0, cell * i, cell, cell)
    }
  })
}

/**
 * The register: post, box, plate, wheels and lever. Its base is at y = 0, its
 * face toward +z. Returns the group with methods to show a number and to set
 * the lever (0 at rest, 1 pulled all the way).
 */
export function buildCounter(fonts) {
  const group = new THREE.Group()
  group.name = 'register'
  // (each takes a little warm emissive at night: the butter lamp at its foot, see light())
  const brush = brushed()
  const steel = new THREE.MeshStandardMaterial({ color: '#d7dbde', map: brush, metalness: 0.55, roughness: 0.38, emissive: '#ffb27a', emissiveMap: brush, emissiveIntensity: 0 })
  const darkSteel = new THREE.MeshStandardMaterial({ color: '#7d858b', metalness: 0.6, roughness: 0.42, emissive: '#c99a78', emissiveIntensity: 0 })

  // the post, set in a collar in the snow, with a strap and a bolt or two
  const postH = 1.18
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, postH, 18).translate(0, postH / 2, 0), darkSteel)
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.12, 18).translate(0, 0.06, 0), darkSteel)
  const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.05, 0.16).translate(0, postH, 0), darkSteel)
  group.add(post, collar, bracket)

  // the box
  const bw = 0.66
  const bh = 0.36
  const bd = 0.22
  const by = postH + 0.025 + bh / 2
  const box = new THREE.Mesh(new RoundedBoxGeometry(bw, bh, bd, 4, 0.025), steel)
  box.position.y = by
  group.add(box)

  // the plate on its face
  const plateTex = plateTexture(fonts)
  const plateMat = new THREE.MeshStandardMaterial({ map: plateTex, metalness: 0.5, roughness: 0.4, emissive: '#ffd2a0', emissiveMap: plateTex, emissiveIntensity: 0 })
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(bw - 0.03, (bw - 0.03) * (560 / 1024)), plateMat)
  plate.position.set(0, by - 0.005, bd / 2 + 0.002)
  group.add(plate)
  const pw = bw - 0.03
  const ph = pw * (560 / 1024)
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
  for (let i = 0; i < DIGITS; i++) {
    const tex = strip.clone()
    tex.needsUpdate = true
    tex.repeat.set(1, 1 / 11)
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, metalness: 0.1, emissive: '#fff1dc', emissiveMap: tex, emissiveIntensity: 0 })
    const m = new THREE.Mesh(new THREE.PlaneGeometry(cw * 0.8, wh), mat)
    m.position.set(wx0 + cw * (i + 0.5), wy, bd / 2 + 0.004)
    group.add(m)
    wheels.push(tex)
    wheelMats.push(mat)
  }
  // glass over the window
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(wx1 - wx0 + 0.01, wh + 0.012),
    new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.08, roughness: 0.05, metalness: 0.9 })
  )
  glass.position.set((wx0 + wx1) / 2, wy, bd / 2 + 0.008)
  group.add(glass)

  // the lever on the right side: a hub, a steel arm, a red grip, a knob
  const lever = new THREE.Group()
  lever.position.set(bw / 2 + 0.035, by, 0)
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.05, 20).rotateZ(Math.PI / 2), darkSteel)
  lever.add(hub)
  const armLen = 0.42
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, armLen, 12).translate(0, armLen / 2, 0), steel)
  arm.position.x = 0.03
  const grip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.024, 0.024, 0.15, 16).translate(0, armLen - 0.1, 0),
    new THREE.MeshStandardMaterial({ color: '#c8231c', roughness: 0.55 })
  )
  grip.position.x = 0.03
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.02, 12, 8).translate(0, armLen + 0.005, 0), darkSteel)
  knob.position.x = 0.03
  // a crossbar on top, as on the real one
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.11, 8).rotateZ(Math.PI / 2).translate(0.03, armLen + 0.02, 0), darkSteel)
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
      // the strip runs 0 at the top to 0 again at the bottom: show cell `pos`
      wheels[DIGITS - 1 - i].offset.y = 1 - (pos + 1) / 11
    }
  }
  setWheels(0)

  return {
    group,
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
    /** The lamp's light on it: 0 by day, 1 at full night. */
    light(k) {
      plateMat.emissiveIntensity = k * 0.42
      for (const m of wheelMats) m.emissiveIntensity = k * 0.5
      steel.emissiveIntensity = k * 0.2
      darkSteel.emissiveIntensity = k * 0.045
    },
  }
}

/**
 * A butter lamp in a glass chimney, left on a flat stone at the register's
 * foot: a small flame by day, and by night the light the count is read by.
 */
export function buildButterLamp() {
  const g = new THREE.Group()
  g.name = 'butter-lamp'
  const brass = new THREE.MeshStandardMaterial({ color: '#b98a3e', metalness: 0.75, roughness: 0.32, emissive: '#ff9a40', emissiveIntensity: 0 })
  const rock = new THREE.MeshStandardMaterial({ color: '#7a6f64', roughness: 0.95, flatShading: true, emissive: '#ffae6a', emissiveIntensity: 0 })
  const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.16, 0).scale(1.35, 0.32, 1.1), rock)
  stone.position.y = 0.02
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.046, 0.02, 16).translate(0, 0.07, 0), brass)
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.05, 10).translate(0, 0.105, 0), brass)
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.03, 0.045, 18).translate(0, 0.15, 0), brass)
  const glass = new THREE.Mesh(
    new THREE.CylinderGeometry(0.064, 0.072, 0.17, 20, 1, true).translate(0, 0.205, 0),
    new THREE.MeshStandardMaterial({ color: '#fff4e2', transparent: true, opacity: 0.16, roughness: 0.08, metalness: 0.1, side: THREE.DoubleSide, depthWrite: false })
  )
  // the flame stands on the wick: it flickers from its foot
  const flame = new THREE.Mesh(new THREE.SphereGeometry(0.011, 10, 8).scale(1, 2.4, 1).translate(0, 0.024, 0), new THREE.MeshBasicMaterial({ color: '#ffd38a' }))
  flame.position.y = 0.17
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#ffb36a', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }))
  glow.position.y = 0.2
  glow.scale.setScalar(0.75)
  glow.renderOrder = 3
  stone.castShadow = stone.receiveShadow = true
  g.add(stone, foot, stem, cup, glass, flame, glow)
  return {
    group: g,
    /** Per frame: the flame flickers; by night its glow blooms and the brass takes it. */
    update(time, night) {
      const flick = 1 + Math.sin(time * 7.3) * 0.06 + Math.sin(time * 13.1 + 1.7) * 0.04
      flame.scale.set(1, flick, 1)
      glow.visible = night > 0.01
      glow.material.opacity = night * 0.85 * flick
      brass.emissiveIntensity = night * 0.45 * flick
      rock.emissiveIntensity = night * 0.16 * flick
      return flick
    },
  }
}

// ---------------------------------------------------------------- the cairn and its flags
export function buildCairn() {
  const stone = new THREE.MeshStandardMaterial({ color: '#77695c', roughness: 0.96, flatShading: true })
  const parts = []
  let seed = 3
  const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  let y = 0
  const layers = [[6, 0.42], [5, 0.34], [4, 0.27], [3, 0.2], [2, 0.15], [1, 0.12]]
  for (const [n, rad] of layers) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + r()
      const d = n === 1 ? 0 : rad * 0.9
      const s = rad * (0.55 + r() * 0.35)
      const g = new THREE.DodecahedronGeometry(s, 0)
      g.scale(1.2, 0.7, 1)
      g.rotateY(r() * 6)
      g.translate(Math.cos(a) * d, y + s * 0.6, Math.sin(a) * d)
      parts.push(g)
    }
    y += rad * 0.62
  }
  const cairn = new THREE.Mesh(mergeGeometries(parts.map((g) => g.toNonIndexed()), false), stone)
  cairn.castShadow = true
  cairn.receiveShadow = true
  const poleH = 2.6
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.035, poleH, 8).translate(0, poleH / 2, 0),
    new THREE.MeshStandardMaterial({ color: '#5a3b24', roughness: 0.85 })
  )
  pole.castShadow = true
  const g = new THREE.Group()
  g.name = 'cairn'
  g.add(cairn, pole)
  return { group: g, top: new THREE.Vector3(0, poleH - 0.05, 0) }
}

/** A string of prayer flags between two points (world space), scaled for people. */
export function summitFlags(a, b, seed = 1) {
  return buildFlagLine(a, b, { sag: 0.08, gap: 0.26, size: 0.22, seed })
}

/**
 * The snow's surface on the summit, from the rock under it: wind-smoothed (the
 * rock's creases soften under the snow, but never poke through it), with drifts.
 */
export function snowSurface(heightAt) {
  return (x, z) => {
    const h = heightAt(x, z)
    const soft = (4 * h + heightAt(x + 1.6, z) + heightAt(x - 1.6, z) + heightAt(x, z + 1.6) + heightAt(x, z - 1.6)) / 8
    const drift = Math.sin(x * 0.9 + Math.cos(z * 0.7) * 1.3) * 0.06 + Math.sin(z * 1.7 - x * 0.4) * 0.04
    return Math.max(soft + 0.22, h + 0.08) + drift
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
 * metres of its top, and sinking under the rock at its edge.
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
  // (no shadows: the mountain's shadow caster is coarser than this cap and would shade it from inside)
  // fresh snow glows with the light it scatters: a little emissive, raised by day (see Summit.jsx)
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: '#f3f6fa', roughness: 0.82, metalness: 0, emissive: '#d6e2f0', emissiveIntensity: 0 }))
  m.name = 'snowcap'
  return m
}

// The board at the summit, built in code: weathered planks between two posts,
// under a little gabled roof with snow on it, a carved header, and a brass
// lantern hung from the eave for the night. People's notes are pinned to it
// as slips of paper, each in its own hand, on tacks in the five flag colours,
// their lower edges lifting in the wind. Units are metres; board-local x is to
// the right, y up, z out of its face.

import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { glowTexture } from './gompa'
import { canvas, wood } from './summitKit'

const PI = Math.PI
export const BOARD = { w: 1.72, y0: 0.78, y1: 1.8, cols: 4, rows: 3 }
const NOTE = { w: 0.34, h: 0.26 }
const TACKS = ['#2f5ea6', '#ebe5d5', '#b9352b', '#2e7d52', '#e3b233']
const PAPER = ['#f3ead6', '#f8f6ef', '#f2df98', '#dcc5a0']
const hex = (id, a, b) => parseInt(String(id).slice(a, b), 16) || 0
function rng(seed) {
  let s = seed % 2147483647 || 1
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}

// weathered planks: sun-greyed, the grain running along them, a knot or two
function plankTexture(seed) {
  const r = rng(seed)
  const t = canvas(512, 96, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h)
    const base = [96 + r() * 18, 78 + r() * 14, 62 + r() * 10]
    g.addColorStop(0, `rgb(${base.map((c) => c + 10).join(',')})`)
    g.addColorStop(1, `rgb(${base.map((c) => c - 14).join(',')})`)
    x.fillStyle = g
    x.fillRect(0, 0, w, h)
    for (let i = 0; i < 140; i++) {
      const y = r() * h
      const l = r() < 0.5 ? '40,26,16' : '190,170,150'
      x.strokeStyle = `rgba(${l},${(0.05 + r() * 0.14).toFixed(2)})`
      x.lineWidth = 0.6 + r() * 1.4
      x.beginPath()
      x.moveTo(0, y)
      for (let px = 0; px <= w; px += 32) x.lineTo(px, y + Math.sin(px * 0.01 + i) * 2.2)
      x.stroke()
    }
    for (let k = 0; k < (r() < 0.5 ? 1 : 0); k++) {
      const kx = 60 + r() * (w - 120)
      const ky = 20 + r() * (h - 40)
      const kg = x.createRadialGradient(kx, ky, 1, kx, ky, 11)
      kg.addColorStop(0, 'rgba(40,26,16,0.5)')
      kg.addColorStop(1, 'rgba(40,26,16,0)')
      x.fillStyle = kg
      x.beginPath()
      x.ellipse(kx, ky, 9, 5, 0, 0, PI * 2)
      x.fill()
    }
    // the weather has silvered it in patches
    for (let i = 0; i < 30; i++) {
      x.fillStyle = `rgba(200,200,195,${(0.02 + r() * 0.05).toFixed(3)})`
      x.fillRect(r() * w, r() * h, 20 + r() * 90, 2 + r() * 8)
    }
  })
  t.wrapS = THREE.RepeatWrapping
  return t
}

// the header, carved and painted: the board's name in saffron on dark wood
function headerTexture(fonts) {
  return canvas(1024, 112, (x, w, h) => {
    x.fillStyle = '#3a2a1e'
    x.fillRect(0, 0, w, h)
    const r = rng(77)
    for (let i = 0; i < 90; i++) {
      x.strokeStyle = `rgba(0,0,0,${(0.08 + r() * 0.12).toFixed(2)})`
      x.lineWidth = 1
      const y = r() * h
      x.beginPath()
      x.moveTo(0, y)
      x.lineTo(w, y + (r() - 0.5) * 3)
      x.stroke()
    }
    x.font = `500 40px ${fonts.mono}`
    x.textAlign = 'center'
    x.textBaseline = 'middle'
    if ('letterSpacing' in x) x.letterSpacing = '14px'
    // the cut, then the paint in it
    x.fillStyle = 'rgba(0,0,0,0.55)'
    x.fillText('NOTES FROM THE TOP', w / 2 + 2, h / 2 + 3)
    x.fillStyle = '#e7a43c'
    x.fillText('NOTES FROM THE TOP', w / 2, h / 2)
  })
}

// a slip of paper with a note on it, in the writer's hand
function noteTexture(note, fonts) {
  const W = 512
  const H = Math.round((W * NOTE.h) / NOTE.w)
  const paper = note.paper ?? 0
  return canvas(W, H, (x) => {
    x.fillStyle = PAPER[paper % 4]
    x.fillRect(0, 0, W, H)
    if (paper === 1) {
      x.strokeStyle = 'rgba(70,110,170,0.22)'
      x.lineWidth = 2
      for (let y = 70; y < H; y += 46) {
        x.beginPath()
        x.moveTo(0, y)
        x.lineTo(W, y)
        x.stroke()
      }
    }
    // handled paper: a little darker toward the edges
    const v = x.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.7)
    v.addColorStop(0, 'rgba(80,60,30,0)')
    v.addColorStop(1, 'rgba(80,60,30,0.16)')
    x.fillStyle = v
    x.fillRect(0, 0, W, H)
    // the words: as large as they fit
    const pad = 34
    const maxW = W - pad * 2
    const maxH = H - 170
    let size = 74
    let lines = []
    for (; size >= 26; size -= 2) {
      x.font = `600 ${size}px ${fonts.hand}`
      lines = []
      let line = ''
      for (const word of String(note.text).split(' ')) {
        const tryLine = line ? `${line} ${word}` : word
        if (x.measureText(tryLine).width > maxW && line) {
          lines.push(line)
          line = word
        } else line = tryLine
      }
      if (line) lines.push(line)
      if (lines.length * size * 1.02 <= maxH && lines.every((l) => x.measureText(l).width <= maxW)) break
    }
    x.fillStyle = '#2b241d'
    x.textBaseline = 'top'
    const top = 40 + Math.max(0, (maxH - lines.length * size * 1.02) * 0.4)
    lines.forEach((l, i) => x.fillText(l, pad, top + i * size * 1.02))
    const sign = `— ${note.name || 'a climber'}${note.from ? `, ${note.from}` : ''}`
    x.font = `600 34px ${fonts.hand}`
    x.fillStyle = '#5d4d3d'
    x.fillText(sign.length > 34 ? `${sign.slice(0, 33)}…` : sign, pad, H - 88)
    const d = new Date(note.at)
    if (!Number.isNaN(d.getTime())) {
      x.font = `500 18px ${fonts.mono}`
      if ('letterSpacing' in x) x.letterSpacing = '3px'
      x.fillStyle = '#8a7a68'
      x.fillText(d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase(), pad, H - 42)
    }
  })
}

// a slip curls a little off the board at its lower corners, and bows
function noteGeometry() {
  const g = new THREE.PlaneGeometry(NOTE.w, NOTE.h, 10, 8).translate(0, -NOTE.h / 2, 0)
  const p = g.attributes.position
  for (let i = 0; i < p.count; i++) {
    const u = p.getX(i) / (NOTE.w / 2)
    const down = -p.getY(i) / NOTE.h
    p.setZ(i, 0.004 + 0.016 * Math.pow(down, 2.2) * Math.pow(Math.abs(u), 1.6) + 0.004 * (1 - u * u) * Math.sin(down * PI))
  }
  g.computeVertexNormals()
  return g
}

// the soft shadow a slip throws on the planks
let shadowTex = null
function shadowTexture() {
  if (!shadowTex) {
    shadowTex = canvas(128, 100, (x, w, h) => {
      x.filter = 'blur(9px)'
      x.fillStyle = 'rgba(10,6,3,0.9)'
      x.fillRect(16, 14, w - 32, h - 28)
    })
  }
  return shadowTex
}

/**
 * The board. `setNotes(notes, fresh)` pins the newest of them up (bringing
 * `fresh` in by hand); `update(time, dt, night)` moves them in the wind and
 * lights the lantern. `corners` gives a pinned note's corners, for the page
 * to lay its hit areas over them.
 */
export function buildNoticeBoard(fonts, { legs = 0 } = {}) {
  const group = new THREE.Group()
  group.name = 'notice-board'
  const { w, y0, y1 } = BOARD
  const span = y1 - y0

  // By night the lantern is the light on it: the wood takes a warm glow (as
  // emissive, scaled in update(), so lighting it adds no light to the scene)
  const warm = (m, k) => {
    m.emissive = new THREE.Color('#ffa860')
    m.emissiveMap = m.map
    m.emissiveIntensity = 0
    lit.push([m, k])
    return m
  }
  const lit = []

  // two posts, set in the snow (longer where it stands on a slope: `legs` more)
  const postMat = warm(wood().clone(), 0.16)
  const tall = y1 + 0.42 + legs + 0.3
  for (const sx of [-1, 1]) {
    const post = new THREE.Mesh(new RoundedBoxGeometry(0.09, tall, 0.09, 3, 0.012), postMat)
    post.position.set(sx * (w / 2 + 0.07), y1 + 0.42 - tall / 2, -0.05)
    post.castShadow = true
    group.add(post)
  }
  // the planks
  const n = 4
  const ph = (span - 0.012 * (n - 1)) / n
  for (let i = 0; i < n; i++) {
    const tex = plankTexture(31 + i * 7)
    tex.offset.x = i * 0.37
    const plank = new THREE.Mesh(new RoundedBoxGeometry(w + 0.24, ph, 0.032, 2, 0.006), warm(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92 }), 0.2))
    plank.position.set((i % 2 ? 1 : -1) * 0.006, y0 + ph / 2 + i * (ph + 0.012), 0)
    plank.rotation.z = (i % 2 ? 1 : -1) * 0.004
    plank.receiveShadow = true
    plank.castShadow = true
    group.add(plank)
  }
  // a batten behind the gaps, so the sky doesn't show through them
  const back = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.2, span), new THREE.MeshStandardMaterial({ color: '#2a1d14', roughness: 1 }))
  back.position.set(0, y0 + span / 2, -0.02)
  group.add(back)

  // the header, carved
  const header = new THREE.Mesh(
    new RoundedBoxGeometry(w + 0.3, 0.15, 0.04, 2, 0.008),
    warm(new THREE.MeshStandardMaterial({ map: headerTexture(fonts), roughness: 0.85 }), 0.55)
  )
  header.position.set(0, y1 + 0.1, 0.01)
  header.castShadow = true
  group.add(header)

  // the roof: two boards meeting at a ridge, snow lying on them
  // (its underside lit a little by the snow below, rather than black)
  const roofMat = new THREE.MeshStandardMaterial({ map: plankTexture(97), color: '#8a7a6c', roughness: 0.95, emissive: '#5a4636', emissiveMap: null, emissiveIntensity: 0.35 })
  const snowMat = new THREE.MeshStandardMaterial({ color: '#f3f6fa', roughness: 0.8, emissive: '#d6e2f0', emissiveIntensity: 0 })
  const ridge = y1 + 0.42
  const slope = 0.5
  const depth = 0.5
  for (const side of [1, -1]) {
    const pitch = new THREE.Group()
    pitch.position.set(0, ridge, 0)
    // each pitch falls away from the ridge, to the front and to the back
    pitch.rotation.x = side * slope
    const board = new THREE.Mesh(new RoundedBoxGeometry(w + 0.5, 0.03, depth, 2, 0.008), roofMat)
    board.position.set(0, 0, side * depth / 2)
    board.castShadow = true
    const snow = new THREE.Mesh(new RoundedBoxGeometry(w + 0.46, 0.05, depth - 0.04, 3, 0.022), snowMat)
    snow.position.set(0, 0.035, side * (depth / 2 - 0.01))
    pitch.add(board, snow)
    group.add(pitch)
  }
  // a ridge beam along the top, where the two pitches meet
  const beam = new THREE.Mesh(new RoundedBoxGeometry(w + 0.56, 0.06, 0.06, 2, 0.01), postMat)
  beam.position.set(0, ridge - 0.01, 0)
  group.add(beam)

  // a brass lantern hung from the eave at the right, for the night
  const brass = new THREE.MeshStandardMaterial({ color: '#b98a3e', metalness: 0.8, roughness: 0.32, emissive: '#ff9a40', emissiveIntensity: 0 })
  const lantern = new THREE.Group()
  const hookY = ridge - Math.sin(slope) * 0.36
  lantern.position.set(w / 2 - 0.02, hookY, Math.cos(slope) * 0.36)
  const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.14, 6).translate(0, -0.07, 0), brass)
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.05, 6).translate(0, -0.165, 0), brass)
  const glassMat = new THREE.MeshStandardMaterial({ color: '#ffe2b0', emissive: '#ffb050', emissiveIntensity: 0.15, roughness: 0.2, transparent: true, opacity: 0.85 })
  const pane = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.1, 6).translate(0, -0.24, 0), glassMat)
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.044, 0.02, 6).translate(0, -0.3, 0), brass)
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#ffb36a', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }))
  glow.position.y = -0.24
  glow.scale.setScalar(0.7)
  glow.renderOrder = 3
  // its frame: six thin brass uprights around the glass
  const bar = new THREE.CylinderGeometry(0.0035, 0.0035, 0.1, 5)
  for (let k = 0; k < 6; k++) {
    const b = new THREE.Mesh(bar, brass)
    b.position.set(Math.cos((k * PI) / 3) * 0.041, -0.24, Math.sin((k * PI) / 3) * 0.041)
    lantern.add(b)
  }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.003, 6, 16).translate(0, 0.012, 0), brass)
  ring.position.y = -0.14
  lantern.add(chain, ring, cap, pane, base, glow)
  group.add(lantern)

  // a khata, the white silk scarf left at high places, knotted round the left
  // post: two tails of it hanging, lifting in the wind
  const silk = canvas(64, 512, (x, cw, ch) => {
    x.fillStyle = '#f6f2e8'
    x.fillRect(0, 0, cw, ch)
    // woven: faint lengthwise threads, a band of pattern near the ends, a fringe
    for (let i = 0; i < cw; i += 3) {
      x.fillStyle = `rgba(190,180,160,${i % 2 ? 0.12 : 0.06})`
      x.fillRect(i, 0, 1, ch)
    }
    x.strokeStyle = 'rgba(200,188,160,0.55)'
    x.lineWidth = 2
    for (let y = ch - 120; y < ch - 40; y += 16) {
      x.beginPath()
      for (let px = 6; px <= cw - 6; px += 8) x.lineTo(px, y + (px % 16 ? 5 : -5))
      x.stroke()
    }
    x.clearRect(0, ch - 18, cw, 18)
    for (let px = 2; px < cw; px += 4) {
      x.fillStyle = '#efe9db'
      x.fillRect(px, ch - 18, 2, 18)
    }
  })
  const silkMat = new THREE.MeshStandardMaterial({ map: silk, side: THREE.DoubleSide, roughness: 0.45, alphaTest: 0.3, emissive: '#fff4e0', emissiveIntensity: 0.06 })
  const khata = new THREE.Group()
  khata.position.set(-(w / 2 + 0.07), y0 - 0.16, -0.05)
  const knot = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.014, 8, 24), silkMat)
  knot.rotation.x = PI / 2
  knot.scale.set(1, 1, 0.8)
  khata.add(knot)
  const tails = [
    { len: 0.82, x: -0.035, z: 0.055, phase: 0 },
    { len: 0.64, x: -0.06, z: 0.03, phase: 1.7 },
  ].map((t) => {
    const g = new THREE.PlaneGeometry(0.07, t.len, 2, 24).translate(0, -t.len / 2, 0)
    const m = new THREE.Mesh(g, silkMat)
    m.position.set(t.x, -0.01, t.z)
    m.castShadow = true
    khata.add(m)
    return { ...t, mesh: m, rest: Float32Array.from(g.attributes.position.array) }
  })
  group.add(khata)

  // ---- the notes
  const geo = noteGeometry()
  const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, opacity: 0.42, depthWrite: false })
  const shadowGeo = new THREE.PlaneGeometry(NOTE.w * 1.08, NOTE.h * 1.08).translate(0.012, -NOTE.h / 2 - 0.014, 0.0015)
  const tackGeo = new THREE.SphereGeometry(0.012, 16, 10).scale(1, 1, 0.65).translate(0, -0.022, 0.014)
  const tackMats = TACKS.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.35, metalness: 0.15, emissive: c, emissiveIntensity: 0 }))
  for (const m of tackMats) lit.push([m, 0.3])
  const holder = new THREE.Group()
  holder.position.z = 0.02
  group.add(holder)
  const pinned = new Map() // id → { note, pivot, mesh, material, slot, arrive }
  let night = 0

  function slotPose(i, id) {
    const col = i % BOARD.cols
    const row = Math.floor(i / BOARD.cols)
    const cw = w / BOARD.cols
    const rh = span / BOARD.rows
    return {
      x: -w / 2 + (col + 0.5) * cw + ((hex(id, 6, 8) % 9) - 4) * 0.009,
      y: y1 - 0.035 - row * rh + ((hex(id, 8, 10) % 5) - 2) * 0.006,
      tilt: ((hex(id, 0, 4) % 9) - 4) * 0.018,
    }
  }

  function pin(note, i, fonts, fresh) {
    const tex = noteTexture(note, fonts)
    const material = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92, side: THREE.DoubleSide, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0 })
    const pivot = new THREE.Group()
    const mesh = new THREE.Mesh(geo, material)
    mesh.castShadow = true
    const shadow = new THREE.Mesh(shadowGeo, shadowMat)
    const tack = new THREE.Mesh(tackGeo, tackMats[hex(note.id, 4, 6) % TACKS.length])
    pivot.add(shadow, mesh, tack)
    const slot = slotPose(i, note.id)
    pivot.position.set(slot.x, slot.y, 0)
    pivot.rotation.z = slot.tilt
    holder.add(pivot)
    const entry = { note, pivot, mesh, material, slot, phase: hex(note.id, 2, 6) * 0.01, arrive: fresh ? 0 : 1, lift: 0 }
    pinned.set(note.id, entry)
    return entry
  }

  return {
    group,
    /** The note the pointer is over: it comes a little off the board toward you. */
    hover: null,
    metals: [brass],
    size: { w, h: y1 + 0.5 },
    /** Pin the newest notes up: the ones already there stay, gone ones come down, the fresh one is brought in. */
    setNotes(notes, fresh, f = fonts) {
      const shown = notes.slice(0, BOARD.cols * BOARD.rows)
      const keep = new Set(shown.map((n) => n.id))
      for (const [id, e] of pinned) {
        if (keep.has(id)) continue
        holder.remove(e.pivot)
        e.material.map.dispose()
        e.material.dispose()
        pinned.delete(id)
      }
      shown.forEach((note, i) => {
        const e = pinned.get(note.id) || pin(note, i, f, note.id === fresh)
        // the newest first: everything moves along a place when a note goes up
        e.slot = slotPose(i, note.id)
      })
    },
    /** Redraw every note (once the handwriting has loaded). */
    redraw(f) {
      for (const e of pinned.values()) {
        const old = e.material.map
        const tex = noteTexture(e.note, f)
        e.material.map = tex
        e.material.emissiveMap = tex
        e.material.needsUpdate = true
        old.dispose()
      }
    },
    /** The notes pinned up, newest first: id and mesh (its corners are the slip's). */
    get pinned() {
      return [...pinned.values()]
    },
    /** A pinned note's four corners, in the board's frame (for the page's hit areas). */
    corners(e, out) {
      const hw = NOTE.w / 2
      const pts = [
        [-hw, 0],
        [hw, 0],
        [hw, -NOTE.h],
        [-hw, -NOTE.h],
      ]
      e.pivot.updateMatrix()
      pts.forEach(([x, y], k) => out[k].set(x, y, 0.01).applyMatrix4(e.pivot.matrix).add(holder.position))
      return out
    },
    /** Per frame: the slips in the wind (and the new one coming in), the lantern by night. */
    update(time, dt, nightness, daylight) {
      night = nightness
      const flick = 1 + Math.sin(time * 7.7) * 0.05 + Math.sin(time * 12.3 + 1.1) * 0.04
      glow.visible = night > 0.01
      glow.material.opacity = night * 0.8 * flick
      glassMat.emissiveIntensity = 0.15 + night * 2.4 * flick
      brass.emissiveIntensity = night * 0.35 * flick
      snowMat.emissiveIntensity = 0.3 * daylight
      for (const [m, k] of lit) m.emissiveIntensity = night * k * flick
      const gust = 0.6 + 0.4 * Math.sin(time * 0.37) * Math.sin(time * 0.21 + 1.3)
      // the khata's tails: blown out from the post, more toward the ends, rippling
      for (const t of tails) {
        const p = t.mesh.geometry.attributes.position
        for (let i = 0; i < p.count; i++) {
          const x0 = t.rest[i * 3]
          const y0 = t.rest[i * 3 + 1]
          const d = -y0 / t.len // 0 at the knot, 1 at the end
          const wave = Math.sin(time * 3.1 + t.phase - d * 6) * 0.06 + Math.sin(time * 5.3 + t.phase * 2 - d * 11) * 0.018
          // (and turning a little about its length as it goes)
          const twist = Math.sin(time * 2.3 + t.phase - d * 4) * 0.9 * d
          p.setXYZ(
            i,
            -d * d * 0.32 * gust + x0 * Math.cos(twist) + wave * d * 0.6,
            y0 + d * d * 0.12 * gust,
            x0 * Math.sin(twist) + wave * d * 1.4 + d * 0.06
          )
        }
        p.needsUpdate = true
        t.mesh.geometry.computeVertexNormals()
      }
      for (const e of pinned.values()) {
        // a new note: carried in, a little turn, pressed onto its tack
        if (e.arrive < 1) e.arrive = Math.min(1, e.arrive + dt / 1.1)
        const a = 1 - Math.pow(1 - e.arrive, 3)
        const { x, y, tilt } = e.slot
        e.pivot.position.x += (x - e.pivot.position.x) * Math.min(1, dt * 6)
        e.pivot.position.y += (y - e.pivot.position.y) * Math.min(1, dt * 6)
        e.lift += ((this.hover === e.note.id ? 1 : 0) - e.lift) * Math.min(1, dt * 10)
        if (e.arrive < 1) {
          e.pivot.position.set(x + (1 - a) * 0.12, y + (1 - a) * 0.18, (1 - a) * 0.55)
          e.pivot.scale.setScalar(1 + (1 - a) * 0.25)
        } else {
          e.pivot.position.z = e.lift * 0.035
          e.pivot.scale.setScalar(1 + e.lift * 0.06)
        }
        e.pivot.rotation.z = tilt + (1 - a) * 0.5
        e.pivot.rotation.x = -(1 - a) * 0.7 - (0.03 + Math.sin(time * 1.7 + e.phase * 9) * 0.035 + Math.sin(time * 4.1 + e.phase * 17) * 0.012) * gust * (1 - e.lift * 0.7) - e.lift * 0.08
        e.pivot.rotation.y = Math.sin(time * 1.1 + e.phase * 5) * 0.015 * gust
        e.material.emissiveIntensity = night * 0.32 * flick
      }
    },
  }
}

import * as THREE from 'three'

// Procedural painterly placeholder art, generated on canvases at runtime.
// Each maker returns a THREE.CanvasTexture. These stand in for (and will be
// drop-in replaced by) the final generated art set — same slots, same alpha
// layout. Palette is pinned to the reference paintings: vivid blue sky,
// snow peaks, warm ochre rock, golden grassland.

function mulberry32(seed) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Midpoint-displacement ridgeline, heights normalized 0..1
function ridgeline(rand, n, roughness, smooth = 0) {
  const h = new Float32Array(n + 1)
  h[0] = rand()
  h[n] = rand()
  let step = n
  let disp = 1
  while (step > 1) {
    const half = step / 2
    for (let i = half; i < n; i += step) {
      h[i] = (h[i - half] + h[i + half]) / 2 + (rand() * 2 - 1) * disp
    }
    step = half
    disp *= roughness
  }
  for (let s = 0; s < smooth; s++) {
    for (let i = 1; i < n; i++) h[i] = (h[i - 1] + h[i] * 2 + h[i + 1]) / 4
  }
  let min = Infinity
  let max = -Infinity
  for (let i = 0; i <= n; i++) {
    if (h[i] < min) min = h[i]
    if (h[i] > max) max = h[i]
  }
  const span = max - min || 1
  for (let i = 0; i <= n; i++) h[i] = (h[i] - min) / span
  return h
}

function makeCanvas(w, h) {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  return [canvas, canvas.getContext('2d')]
}

function toTexture(canvas) {
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

function grain(ctx, rand, w, h, count, alpha = 0.04) {
  for (let i = 0; i < count; i++) {
    const dark = rand() > 0.5
    ctx.fillStyle = dark ? `rgba(20,18,12,${alpha * rand()})` : `rgba(255,252,240,${alpha * rand()})`
    ctx.fillRect(rand() * w, rand() * h, 1 + rand() * 2.5, 1 + rand() * 2.5)
  }
}

function softBlobs(ctx, rand, w, h, count, color, maxR, maxA) {
  for (let i = 0; i < count; i++) {
    const x = rand() * w
    const y = rand() * h
    const r = maxR * (0.3 + rand() * 0.7)
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, color.replace('A', String(maxA * rand())))
    g.addColorStop(1, color.replace('A', '0'))
    ctx.fillStyle = g
    ctx.fillRect(x - r, y - r, r * 2, r * 2)
  }
}

// Mountain ridge with optional snow caps and a hazier back ridge.
export function makeRidgeTexture({
  w = 2048,
  h = 1024,
  seed = 1,
  peakMin = 0.45, // ridge occupies upper band: fraction of height from top
  peakMax = 0.05,
  colorTop = '#7d8fa8',
  colorBottom = '#46566b',
  snow = true,
  snowColor = '#f4f7fb',
  snowDepth = 0.22,
  roughness = 0.58,
  smoothing = 2, // box-smooth passes: keeps big peaks, kills spikes
  backRidge = null, // { colorTop, colorBottom, peakMin, peakMax }
  strata = false, // horizontal rock banding on the body
  fadeBottom = 0, // fraction of height that dissolves to alpha at the bottom
}) {
  const [canvas, ctx] = makeCanvas(w, h)
  const rand = mulberry32(seed)
  const n = 512

  const drawRidge = (cfg) => {
    const hs = ridgeline(rand, n, cfg.roughness ?? roughness, cfg.smooth ?? smoothing)
    const ys = new Float32Array(n + 1)
    for (let i = 0; i <= n; i++) {
      ys[i] = h * (cfg.peakMax + (cfg.peakMin - cfg.peakMax) * (1 - hs[i]))
    }
    ctx.beginPath()
    ctx.moveTo(0, h + 4)
    for (let i = 0; i <= n; i++) ctx.lineTo((i / n) * w, ys[i])
    ctx.lineTo(w, h + 4)
    ctx.closePath()
    const grad = ctx.createLinearGradient(0, h * cfg.peakMax, 0, h)
    grad.addColorStop(0, cfg.colorTop)
    grad.addColorStop(1, cfg.colorBottom)
    ctx.fillStyle = grad
    ctx.fill()
    return ys
  }

  if (backRidge) {
    drawRidge({ peakMin: backRidge.peakMin ?? peakMin + 0.1, peakMax: backRidge.peakMax ?? peakMax + 0.1, colorTop: backRidge.colorTop, colorBottom: backRidge.colorBottom, roughness: backRidge.roughness })
  }
  const ys = drawRidge({ peakMin, peakMax, colorTop, colorBottom })

  if (snow) {
    // snow hugs the ridgeline, ragged lower edge
    ctx.beginPath()
    ctx.moveTo(0, ys[0])
    for (let i = 0; i <= n; i++) ctx.lineTo((i / n) * w, ys[i])
    for (let i = n; i >= 0; i--) {
      const jag = (Math.sin(i * 0.18) * 0.5 + 0.5) * 0.75 + rand() * 0.25
      const depth = h * snowDepth * (0.35 + jag * 0.65)
      ctx.lineTo((i / n) * w, ys[i] + depth)
    }
    ctx.closePath()
    const sg = ctx.createLinearGradient(0, h * peakMax, 0, h * (peakMin + snowDepth))
    sg.addColorStop(0, snowColor)
    sg.addColorStop(1, snowColor + '00')
    ctx.fillStyle = sg
    ctx.fill()
    // broad, shallow facet shadows for painterly volume (wide so they
    // read as rock faces, not trees)
    for (let i = 0; i < 18; i++) {
      const x0 = rand() * w
      const yTop = ys[Math.max(0, Math.min(n, Math.floor((x0 / w) * n)))]
      const wd = 110 + rand() * 220
      ctx.beginPath()
      ctx.moveTo(x0, yTop + 6)
      ctx.lineTo(x0 + wd, yTop + 10 + rand() * 26)
      ctx.lineTo(x0 + wd * 0.4, yTop + 30 + rand() * 50)
      ctx.closePath()
      ctx.fillStyle = `rgba(122,144,175,${0.05 + rand() * 0.08})`
      ctx.fill()
    }
  }

  if (strata) {
    // patchy short bands, not full-width lines
    for (let i = 0; i < 90; i++) {
      const y = h * peakMin + rand() * h * (1 - peakMin)
      ctx.fillStyle = rand() > 0.45 ? `rgba(35,26,15,${0.04 + rand() * 0.08})` : `rgba(230,210,170,${0.03 + rand() * 0.06})`
      ctx.fillRect(rand() * w, y, w * (0.08 + rand() * 0.22), 3 + rand() * 12)
    }
    softBlobs(ctx, rand, w, h, 20, 'rgba(184,141,63,A)', w * 0.07, 0.2)
  }

  softBlobs(ctx, rand, w, h, 14, 'rgba(255,250,235,A)', w * 0.12, 0.07)
  softBlobs(ctx, rand, w, h, 14, 'rgba(30,40,60,A)', w * 0.12, 0.08)
  grain(ctx, rand, w, h, 2600)

  if (fadeBottom > 0) {
    ctx.globalCompositeOperation = 'destination-out'
    const fade = ctx.createLinearGradient(0, h * (1 - fadeBottom), 0, h)
    fade.addColorStop(0, 'rgba(0,0,0,0)')
    fade.addColorStop(1, 'rgba(0,0,0,1)')
    ctx.fillStyle = fade
    ctx.fillRect(0, h * (1 - fadeBottom), w, h * fadeBottom)
    ctx.globalCompositeOperation = 'source-over'
  }
  return toTexture(canvas)
}

// Rolling golden hills (valley backdrop), distant snow range behind.
export function makeValleyTexture({ w = 2048, h = 1024, seed = 7 }) {
  const [canvas, ctx] = makeCanvas(w, h)
  const rand = mulberry32(seed)
  const n = 512

  // distant snow range
  const back = ridgeline(rand, n, 0.5, 3)
  ctx.beginPath()
  ctx.moveTo(0, h)
  for (let i = 0; i <= n; i++) ctx.lineTo((i / n) * w, h * (0.42 - back[i] * 0.3))
  ctx.lineTo(w, h)
  ctx.closePath()
  let g = ctx.createLinearGradient(0, h * 0.1, 0, h * 0.5)
  g.addColorStop(0, '#e9eef5')
  g.addColorStop(0.5, '#b9c9dd')
  g.addColorStop(1, '#9fb2c9')
  ctx.fillStyle = g
  ctx.fill()

  // two rolling golden ridges
  const hills = [
    { lift: 0.52, amp: 0.18, top: '#c9a455', bottom: '#a07f3c', smooth: 3 },
    { lift: 0.68, amp: 0.16, top: '#b8913f', bottom: '#82672c', smooth: 2 },
  ]
  for (const hill of hills) {
    const hs = ridgeline(rand, n, 0.5, hill.smooth)
    ctx.beginPath()
    ctx.moveTo(0, h)
    for (let i = 0; i <= n; i++) ctx.lineTo((i / n) * w, h * (hill.lift - hs[i] * hill.amp))
    ctx.lineTo(w, h)
    ctx.closePath()
    g = ctx.createLinearGradient(0, h * (hill.lift - hill.amp), 0, h)
    g.addColorStop(0, hill.top)
    g.addColorStop(1, hill.bottom)
    ctx.fillStyle = g
    ctx.fill()
  }
  softBlobs(ctx, rand, w, h * 0.5, 10, 'rgba(255,246,220,A)', w * 0.1, 0.1)
  softBlobs(ctx, rand, w, h, 16, 'rgba(70,52,20,A)', w * 0.09, 0.1)
  grain(ctx, rand, w, h, 2200)
  return toTexture(canvas)
}

// Side cliff wall with ragged inner edge. side: 'left' | 'right'
export function makeCliffTexture({ w = 1024, h = 2048, seed = 11, side = 'left' }) {
  const [canvas, ctx] = makeCanvas(w, h)
  const rand = mulberry32(seed)
  const n = 256
  const edge = ridgeline(rand, n, 0.55, 2)

  ctx.beginPath()
  if (side === 'left') {
    ctx.moveTo(0, 0)
    for (let i = 0; i <= n; i++) ctx.lineTo(w * (0.45 + edge[i] * 0.5), (i / n) * h)
    ctx.lineTo(0, h)
  } else {
    ctx.moveTo(w, 0)
    for (let i = 0; i <= n; i++) ctx.lineTo(w * (0.55 - edge[i] * 0.5), (i / n) * h)
    ctx.lineTo(w, h)
  }
  ctx.closePath()
  const g = ctx.createLinearGradient(side === 'left' ? 0 : w, 0, side === 'left' ? w : 0, 0)
  g.addColorStop(0, '#8a7355')
  g.addColorStop(1, '#574634')
  ctx.fillStyle = g
  ctx.fill()
  ctx.save()
  ctx.clip()
  // strata
  for (let i = 0; i < 60; i++) {
    const y = rand() * h
    ctx.fillStyle = rand() > 0.5 ? `rgba(35,26,18,${0.05 + rand() * 0.12})` : `rgba(225,205,170,${0.04 + rand() * 0.08})`
    ctx.fillRect(0, y, w, 3 + rand() * 22)
  }
  // golden scrub patches
  softBlobs(ctx, rand, w, h, 26, 'rgba(184,141,63,A)', w * 0.16, 0.22)
  // snow dust near top
  softBlobs(ctx, rand, w, h * 0.12, 8, 'rgba(240,245,250,A)', w * 0.2, 0.3)
  grain(ctx, rand, w, h, 3200)
  ctx.restore()
  return toTexture(canvas)
}

// Monastery on a cliff: white walls, maroon band, gold roofs, flag strings.
export function makeMonasteryTexture({ w = 1024, h = 1024, seed = 21 }) {
  const [canvas, ctx] = makeCanvas(w, h)
  const rand = mulberry32(seed)

  // cliff pedestal
  ctx.beginPath()
  ctx.moveTo(150, h)
  let px = 320
  for (let y = h; y > 600; y -= 40) {
    px += (rand() - 0.5) * 60
    ctx.lineTo(Math.max(180, Math.min(420, px)), y)
  }
  ctx.lineTo(330, 590)
  ctx.lineTo(840, 585)
  let qx = 760
  for (let y = 600; y < h; y += 40) {
    qx += (rand() - 0.5) * 60
    ctx.lineTo(Math.max(700, Math.min(940, qx)), y)
  }
  ctx.lineTo(920, h)
  ctx.closePath()
  let g = ctx.createLinearGradient(0, 560, 0, h)
  g.addColorStop(0, '#85705a')
  g.addColorStop(1, '#46382b')
  ctx.fillStyle = g
  ctx.fill()
  // cliff strata
  ctx.save()
  ctx.clip()
  for (let i = 0; i < 30; i++) {
    ctx.fillStyle = `rgba(30,22,15,${0.06 + rand() * 0.12})`
    ctx.fillRect(140, 600 + rand() * (h - 600), 800, 4 + rand() * 14)
  }
  softBlobs(ctx, rand, w, h, 12, 'rgba(184,141,63,A)', 140, 0.2)
  ctx.restore()
  // plateau highlight
  ctx.fillStyle = 'rgba(214,188,138,0.5)'
  ctx.fillRect(330, 583, 510, 10)

  const wall = (x0, y0, x1, y1, taper = 8) => {
    ctx.beginPath()
    ctx.moveTo(x0, y1)
    ctx.lineTo(x0 + taper, y0)
    ctx.lineTo(x1 - taper, y0)
    ctx.lineTo(x1, y1)
    ctx.closePath()
    const wg = ctx.createLinearGradient(x0, 0, x1, 0)
    wg.addColorStop(0, '#dcd5c6')
    wg.addColorStop(0.25, '#f3eee2')
    wg.addColorStop(1, '#e8e2d2')
    ctx.fillStyle = wg
    ctx.fill()
  }

  // main wall + maroon parapet
  wall(370, 440, 800, 588, 14)
  ctx.fillStyle = '#7e2f24'
  ctx.fillRect(378, 440, 416, 22)
  // windows (dark trapezoids, lighter frames)
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 5; c++) {
      const wx = 412 + c * 74
      const wy = 488 + r * 52
      ctx.fillStyle = '#efe9da'
      ctx.fillRect(wx - 4, wy - 4, 34, 40)
      ctx.beginPath()
      ctx.moveTo(wx, wy + 34)
      ctx.lineTo(wx + 3, wy)
      ctx.lineTo(wx + 23, wy)
      ctx.lineTo(wx + 26, wy + 34)
      ctx.closePath()
      ctx.fillStyle = '#2c2017'
      ctx.fill()
    }
  }
  // door
  ctx.fillStyle = '#2c2017'
  ctx.fillRect(566, 540, 44, 48)
  ctx.fillStyle = '#7e2f24'
  ctx.fillRect(560, 532, 56, 10)

  // upper structure + double gold roof
  wall(470, 372, 700, 442, 10)
  ctx.fillStyle = '#7e2f24'
  ctx.fillRect(476, 372, 218, 14)
  const roof = (x0, x1, yBase, rise) => {
    ctx.beginPath()
    ctx.moveTo(x0 - 16, yBase)
    ctx.lineTo(x1 + 16, yBase)
    ctx.lineTo(x1 - 28, yBase - rise)
    ctx.lineTo(x0 + 28, yBase - rise)
    ctx.closePath()
    const rg = ctx.createLinearGradient(0, yBase - rise, 0, yBase)
    rg.addColorStop(0, '#f0c468')
    rg.addColorStop(1, '#b97f24')
    ctx.fillStyle = rg
    ctx.fill()
    ctx.fillStyle = '#8a5d18'
    ctx.fillRect(x0 - 16, yBase - 3, x1 - x0 + 32, 4)
  }
  roof(470, 700, 372, 30)
  wall(516, 318, 654, 344, 6)
  roof(516, 654, 344, 26)
  // spire
  ctx.fillStyle = '#d9a441'
  ctx.beginPath()
  ctx.moveTo(585, 318)
  ctx.lineTo(572, 282)
  ctx.lineTo(598, 282)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()
  ctx.arc(585, 276, 7, 0, Math.PI * 2)
  ctx.fill()

  // side stupa
  ctx.fillStyle = '#efe9da'
  ctx.beginPath()
  ctx.arc(836, 556, 26, Math.PI, 0)
  ctx.fill()
  ctx.fillRect(810, 556, 52, 16)
  ctx.fillStyle = '#d9a441'
  ctx.fillRect(831, 514, 10, 42)
  ctx.beginPath()
  ctx.arc(836, 510, 6, 0, Math.PI * 2)
  ctx.fill()

  // prayer-flag strings from the spire
  const flagCols = ['#2f5fa8', '#f2f0e6', '#b8342a', '#2e7d4f', '#e8b53a']
  const string = (x1, y1) => {
    ctx.strokeStyle = 'rgba(46,38,28,0.85)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(585, 286)
    ctx.quadraticCurveTo((585 + x1) / 2, Math.max(y1, 286) + 36, x1, y1)
    ctx.stroke()
    for (let i = 1; i < 9; i++) {
      const t = i / 9
      const mx = (1 - t) * (1 - t) * 585 + 2 * (1 - t) * t * ((585 + x1) / 2) + t * t * x1
      const my = (1 - t) * (1 - t) * 286 + 2 * (1 - t) * t * (Math.max(y1, 286) + 36) + t * t * y1
      ctx.fillStyle = flagCols[i % 5]
      ctx.fillRect(mx - 7, my, 14, 11)
    }
  }
  string(330, 540)
  string(845, 500)

  grain(ctx, rand, w, h, 900)

  // dissolve the cliff pedestal into haze (no hard bottom cut)
  ctx.globalCompositeOperation = 'destination-out'
  const fade = ctx.createLinearGradient(0, h * 0.72, 0, h)
  fade.addColorStop(0, 'rgba(0,0,0,0)')
  fade.addColorStop(1, 'rgba(0,0,0,1)')
  ctx.fillStyle = fade
  ctx.fillRect(0, h * 0.72, w, h * 0.28)
  ctx.globalCompositeOperation = 'source-over'
  return toTexture(canvas)
}

// Soft cloud puff sprite
export function makeCloudTexture({ size = 512, seed = 31, density = 14 }) {
  const [canvas, ctx] = makeCanvas(size, size)
  const rand = mulberry32(seed)
  for (let i = 0; i < density; i++) {
    const x = size * (0.5 + (rand() - 0.5) * 0.66)
    const y = size * (0.52 + (rand() - 0.5) * 0.4)
    const r = size * (0.1 + rand() * 0.2)
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, `rgba(255,255,255,${0.32 + rand() * 0.25})`)
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(x - r, y - r, r * 2, r * 2)
  }
  // kill hard edges
  ctx.globalCompositeOperation = 'destination-in'
  const mask = ctx.createRadialGradient(size / 2, size / 2, size * 0.1, size / 2, size / 2, size * 0.5)
  mask.addColorStop(0, 'rgba(0,0,0,1)')
  mask.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = mask
  ctx.fillRect(0, 0, size, size)
  return toTexture(canvas)
}

// Golden grassland ground (tiling)
export function makeGroundTexture({ size = 1024, seed = 41 }) {
  const [canvas, ctx] = makeCanvas(size, size)
  const rand = mulberry32(seed)
  ctx.fillStyle = '#a3823b'
  ctx.fillRect(0, 0, size, size)
  softBlobs(ctx, rand, size, size, 40, 'rgba(140,106,40,A)', size * 0.16, 0.5)
  softBlobs(ctx, rand, size, size, 34, 'rgba(206,170,86,A)', size * 0.14, 0.45)
  softBlobs(ctx, rand, size, size, 12, 'rgba(110,94,46,A)', size * 0.2, 0.35)
  grain(ctx, rand, size, size, 5200, 0.08)
  const tex = toTexture(canvas)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  return tex
}

// White "block print" overlay for prayer flags (border, mantra rows, emblem)
export function makeFlagPrintTexture({ size = 256, seed = 51 }) {
  const [canvas, ctx] = makeCanvas(size, size)
  const rand = mulberry32(seed)
  ctx.strokeStyle = 'rgba(255,253,245,0.92)'
  ctx.lineWidth = 7
  ctx.strokeRect(12, 12, size - 24, size - 24)
  ctx.lineWidth = 2.5
  ctx.strokeRect(26, 26, size - 52, size - 52)
  // mantra-like dash rows top & bottom
  for (const rowY of [44, size - 52]) {
    let x = 40
    while (x < size - 48) {
      const len = 8 + rand() * 16
      ctx.fillStyle = `rgba(255,253,245,${0.55 + rand() * 0.35})`
      ctx.fillRect(x, rowY, len, 5)
      if (rand() > 0.6) ctx.fillRect(x + len * 0.3, rowY - 6, 3, 5)
      x += len + 7
    }
  }
  // center emblem: abstract windhorse / endless knot
  ctx.strokeStyle = 'rgba(255,253,245,0.9)'
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.arc(size / 2, size / 2 + 6, 46, 0, Math.PI * 2)
  ctx.stroke()
  ctx.lineWidth = 4
  ctx.save()
  ctx.translate(size / 2, size / 2 + 6)
  for (const a of [-0.6, 0.2, 1.0]) {
    ctx.rotate(a)
    ctx.strokeRect(-30, -14, 60, 28)
  }
  ctx.restore()
  return toTexture(canvas)
}

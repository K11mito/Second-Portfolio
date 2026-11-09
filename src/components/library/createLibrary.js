// The projects library: one wall of a monastery library, in three.js. A
// weathered, red-painted bookcase of uneven pigeonholes holds every project
// wrapped as a pecha (loose leaves between two boards, in cloth, with a silk
// face hung on the end). The text under the cursor lifts and warms; open one
// and it is carried out to you, unwrapped, and its top leaf rises to become the
// readable page, the HTML leaf that Library.jsx renders.
//
// Everything is painted in code on canvases: no models, no image files.
// Library.jsx owns the DOM. This owns the scene, the camera and the motion: it
// moves the leaf it is given, and calls back (`on`) when what the page shows
// should change. Throws if WebGL is not available.
//
// The look was set in three r128, where hex colours were linear values and
// lights were scaled by π (the old "legacy" lighting). `lin` and the π factors
// below keep it exactly; the point lights use decay 1, which matches the old
// falloff to within a few per cent over the distances they reach here.

import * as THREE from 'three'
import { tib, metaOf, shelfLayout, UNITS } from './pecha'

const PI = Math.PI
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const lerp = (a, b, t) => a + (b - a) * t
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}
const Rnd = (seed) => {
  let s = Math.floor(Math.abs(seed) * 9301 + 49297) % 233280 || 7
  return () => (s = (s * 9301 + 49297) % 233280) / 233280
}
const hash = (a, b, c, s) => {
  const x = Math.sin(a * 127.1 + b * 311.7 + c * 74.7 + s * 19.3) * 43758.5453
  return x - Math.floor(x)
}
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const easeOut = (t) => 1 - Math.pow(1 - t, 3)
const easeIn = (t) => t * t * t
const lin = (hex) => new THREE.Color().setHex(hex, THREE.LinearSRGBColorSpace)

/**
 * @param {object} o
 * @param {HTMLCanvasElement} o.canvas
 * @param {object[]} o.items       shelfItems(projects): the texts, newest first, then the blank one
 * @param {{serif: string, mono: string, tib: string}} o.fonts  CSS font-family lists for the painted text
 * @param {{leaf: HTMLElement, inner: HTMLElement, shades: HTMLElement[]}} o.dom  the reading leaf
 * @param {object} o.on  hover(i), open(i), show(i), leaving(), closed(i, byKeyboard), panHint(bool), ready()
 */
export function createLibrary({ canvas, items, fonts: F, dom, on }) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  const coarse = matchMedia('(pointer: coarse)').matches
  const { leaf, inner, shades } = dom
  let disposed = false
  const emit = (name, ...args) => {
    if (!disposed) on[name]?.(...args)
  }

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.08
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  const maxAniso = renderer.capabilities.getMaxAnisotropy()

  // ================================================================== painted textures
  const textures = []
  const mk = (w, h) => {
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    return [c, c.getContext('2d')]
  }
  // The painted textures are filtered as they are stored, in sRGB, and decoded
  // in the shader after: how r128 did it, and so the look this was made with.
  // (three now decodes before filtering, which pales these grainy textures. It
  // keeps the old way for video, and `painted` borrows that.)
  const texOf = (c, rx = 1, ry = 1, decodeFirst = false) => {
    const t = new THREE.CanvasTexture(c)
    if (decodeFirst) t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = maxAniso
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(rx, ry)
    textures.push(t)
    return t
  }
  const decodeAfterFiltering = (shader) => {
    shader.fragmentShader = `#define DECODE_VIDEO_TEXTURE\n${shader.fragmentShader}`
  }
  const painted = (m) => {
    m.onBeforeCompile = decodeAfterFiltering
    return m
  }
  function grain(x, w, h, r, amount) {
    const img = x.getImageData(0, 0, w, h)
    const d = img.data
    for (let i = 0; i < d.length; i += 4) {
      const n = (r() - 0.5) * amount
      d[i] += n
      d[i + 1] += n
      d[i + 2] += n
    }
    x.putImageData(img, 0, 0)
  }
  function mottle(x, w, h, r, n, dark, light) {
    for (let i = 0; i < n; i++) {
      x.fillStyle =
        r() < 0.55 ? `rgba(${dark},${(0.04 + r() * 0.12).toFixed(3)})` : `rgba(${light},${(0.03 + r() * 0.08).toFixed(3)})`
      x.beginPath()
      x.ellipse(r() * w, r() * h, 3 + r() * 30, 2 + r() * 12, r() * 3.14, 0, 6.29)
      x.fill()
    }
  }
  function chips(x, w, h, r, n, scale = 1) {
    // where the paint has flaked away and the wood shows
    for (let i = 0; i < n; i++) {
      const cx = r() * w
      const cy = r() * h
      const s = (2 + r() * 11) * scale
      x.fillStyle = `rgba(${(64 + r() * 40) | 0},${(40 + r() * 22) | 0},${(24 + r() * 14) | 0},${(0.55 + r() * 0.4).toFixed(2)})`
      x.beginPath()
      const k = 5 + ((r() * 5) | 0)
      for (let j = 0; j < k; j++) {
        const a = (j / k) * 6.283
        const rr = s * (0.45 + r() * 0.75)
        x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.65)
      }
      x.closePath()
      x.fill()
    }
  }
  function scratches(x, w, h, r, n) {
    for (let i = 0; i < n; i++) {
      x.strokeStyle = `rgba(${r() < 0.5 ? '230,190,160' : '20,6,2'},${(0.08 + r() * 0.14).toFixed(2)})`
      x.lineWidth = 0.5 + r()
      x.beginPath()
      const sx = r() * w
      const sy = r() * h
      x.moveTo(sx, sy)
      x.lineTo(sx + (r() - 0.5) * 60, sy + (r() - 0.5) * 12)
      x.stroke()
    }
  }
  function edgeGrime(x, w, h, vertical, a = 0.45) {
    const g = vertical ? x.createLinearGradient(0, 0, w, 0) : x.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, `rgba(10,3,1,${a})`)
    g.addColorStop(0.22, 'rgba(10,3,1,0)')
    g.addColorStop(0.78, 'rgba(10,3,1,0)')
    g.addColorStop(1, `rgba(10,3,1,${a})`)
    x.fillStyle = g
    x.fillRect(0, 0, w, h)
  }
  function cloud(x, cx, cy, s) {
    x.lineCap = 'round'
    x.lineJoin = 'round'
    x.strokeStyle = '#4f7ea9'
    x.lineWidth = 3.4 * s
    x.beginPath()
    x.arc(cx, cy, 6 * s, PI * 0.85, PI * 2.15)
    x.stroke()
    x.beginPath()
    x.arc(cx + 11.5 * s, cy - 3 * s, 7 * s, PI * 1.0, PI * 2.02)
    x.stroke()
    x.beginPath()
    x.arc(cx + 23 * s, cy, 6 * s, PI * 1.05, PI * 2.4)
    x.stroke()
    x.strokeStyle = '#eae1cd'
    x.lineWidth = 1.3 * s
    x.beginPath()
    x.arc(cx, cy, 2.6 * s, 0, PI * 1.5)
    x.stroke()
    x.beginPath()
    x.arc(cx + 23 * s, cy, 2.6 * s, PI, PI * 2.5)
    x.stroke()
    x.strokeStyle = '#64976f'
    x.lineWidth = 2.6 * s
    x.beginPath()
    x.moveTo(cx + 29 * s, cy + 3 * s)
    x.bezierCurveTo(cx + 39 * s, cy + 9 * s, cx + 47 * s, cy - 6 * s, cx + 57 * s, cy + 1 * s)
    x.stroke()
  }
  function paintTex({ w, h, seed, motif, base = '104,27,19', vertical = false, chipScale = 1 }) {
    const [c, x] = mk(w, h)
    const r = Rnd(seed)
    x.fillStyle = `rgb(${base})`
    x.fillRect(0, 0, w, h)
    mottle(x, w, h, r, (w * h) / 700, '34,5,2', '196,84,54')
    if (motif === 'clouds') {
      const s = h / 34
      const period = 64 * s
      for (let cx = -r() * period; cx < w + period; cx += period * (0.9 + r() * 0.25)) cloud(x, cx, h * 0.55, s * (0.85 + r() * 0.2))
      x.strokeStyle = 'rgba(214,170,90,.55)'
      x.lineWidth = Math.max(1, h * 0.04)
      x.beginPath()
      x.moveTo(0, h * 0.1)
      x.lineTo(w, h * 0.1)
      x.moveTo(0, h * 0.92)
      x.lineTo(w, h * 0.92)
      x.stroke()
    } else if (motif === 'vine') {
      x.lineCap = 'round'
      x.strokeStyle = '#4f7ea9'
      x.lineWidth = w * 0.09
      x.beginPath()
      for (let y = 0; y <= h; y += 4) x.lineTo(w / 2 + Math.sin(y / (w * 0.9)) * w * 0.18, y)
      x.stroke()
      for (let y = w * 0.6; y < h; y += w * 1.45) {
        const side = Math.round(y / (w * 1.45)) % 2 ? 1 : -1
        x.strokeStyle = '#64976f'
        x.lineWidth = w * 0.07
        x.beginPath()
        x.arc(w / 2 + side * w * 0.2, y, w * 0.16, 0, PI * 1.6 * side)
        x.stroke()
        x.fillStyle = '#eae1cd'
        x.beginPath()
        x.arc(w / 2, y + w * 0.7, w * 0.05, 0, 6.29)
        x.fill()
      }
    } else if (motif === 'frieze') {
      // the painted top beam: blue, with lotus-cloud scrolls in white, red and green
      const s = h / 60
      for (let cx = -r() * 120 * s; cx < w + 120 * s; cx += 130 * s) {
        x.strokeStyle = 'rgba(234,225,205,.85)'
        x.lineWidth = 2.4 * s
        x.beginPath()
        x.ellipse(cx + 30 * s, h * 0.52, 26 * s, 14 * s, 0, 0, 6.29)
        x.stroke()
        x.fillStyle = 'rgba(170,40,28,.85)'
        x.beginPath()
        x.ellipse(cx + 30 * s, h * 0.52, 12 * s, 7 * s, 0, 0, 6.29)
        x.fill()
        cloud(x, cx + 64 * s, h * 0.44, s * 1.2)
        x.strokeStyle = 'rgba(100,151,111,.9)'
        x.lineWidth = 2.2 * s
        x.beginPath()
        x.moveTo(cx - 20 * s, h * 0.8)
        x.bezierCurveTo(cx, h * 0.62, cx + 10 * s, h * 0.95, cx + 30 * s, h * 0.78)
        x.stroke()
      }
      x.fillStyle = 'rgba(150,34,22,.95)'
      x.fillRect(0, 0, w, h * 0.1)
      x.fillRect(0, h * 0.9, w, h * 0.1)
      x.fillStyle = 'rgba(214,170,90,.7)'
      x.fillRect(0, h * 0.1, w, h * 0.025)
      x.fillRect(0, h * 0.875, w, h * 0.025)
    }
    chips(x, w, h, r, (w * h) / (motif ? 1400 : 900), (Math.max(w, h) / 512) * chipScale)
    scratches(x, w, h, r, (w * h) / 2500)
    if (motif !== 'frieze') edgeGrime(x, w, h, vertical, 0.5)
    // soot and dust
    mottle(x, w, h, r, (w * h) / 2600, '12,4,2', '170,140,110')
    grain(x, w, h, r, 26)
    return c
  }
  function woodTex({ w, h, seed, base = [70, 50, 34], dark = 0 }) {
    const [c, x] = mk(w, h)
    const r = Rnd(seed)
    x.fillStyle = `rgb(${base.map((v) => v - dark).join(',')})`
    x.fillRect(0, 0, w, h)
    for (let i = 0; i < h * 1.6; i++) {
      const y = r() * h
      const a = 0.05 + r() * 0.16
      const light = r() < 0.4
      x.strokeStyle = light ? `rgba(170,140,105,${a * 0.6})` : `rgba(20,10,4,${a})`
      x.lineWidth = 0.6 + r() * 1.6
      x.beginPath()
      x.moveTo(0, y)
      for (let xx = 0; xx <= w; xx += 24) x.lineTo(xx, y + Math.sin(xx / (60 + r() * 80) + i) * (1 + r() * 2.5))
      x.stroke()
    }
    for (let k = 0; k < 3; k++) {
      const kx = r() * w
      const ky = r() * h
      for (let j = 0; j < 5; j++) {
        x.strokeStyle = `rgba(28,14,6,${0.25 - j * 0.04})`
        x.lineWidth = 1.2
        x.beginPath()
        x.ellipse(kx, ky, 6 + j * 4, 2 + j * 1.6, 0, 0, 6.29)
        x.stroke()
      }
    }
    mottle(x, w, h, r, (w * h) / 900, '14,6,2', '160,140,118')
    grain(x, w, h, r, 22)
    return c
  }
  function clothTex({ seed, silk }) {
    const w = 256
    const h = 256
    const [c, x] = mk(w, h)
    const r = Rnd(seed)
    x.fillStyle = silk ? '#d4961f' : '#d6501a'
    x.fillRect(0, 0, w, h)
    // folds: broad soft bands
    for (let i = 0; i < 9; i++) {
      const cx = r() * w
      const bw = 10 + r() * 40
      const g = x.createLinearGradient(cx - bw, 0, cx + bw, 0)
      const tone = r() < 0.5 ? (silk ? '255,240,190' : '255,170,110') : silk ? '120,70,0' : '110,22,0'
      g.addColorStop(0, `rgba(${tone},0)`)
      g.addColorStop(0.5, `rgba(${tone},${(0.08 + r() * 0.12).toFixed(2)})`)
      g.addColorStop(1, `rgba(${tone},0)`)
      x.fillStyle = g
      x.fillRect(cx - bw, 0, bw * 2, h)
    }
    // weave
    x.globalAlpha = silk ? 0.05 : 0.07
    for (let y = 0; y < h; y += 2) {
      x.fillStyle = y % 4 ? '#000' : '#fff'
      x.fillRect(0, y, w, 1)
    }
    for (let xx = 0; xx < w; xx += 2) {
      x.fillStyle = xx % 4 ? '#000' : '#fff'
      x.fillRect(xx, 0, 1, h)
    }
    x.globalAlpha = 1
    mottle(x, w, h, r, 36, silk ? '90,50,0' : '80,12,0', silk ? '255,235,180' : '255,150,90')
    grain(x, w, h, r, 11)
    return c
  }
  function brocade(x, X, Y, W, H, kind) {
    const pal =
      kind === 'blue' ? ['#1c2a50', '#2f4579', '#b9903e'] : kind === 'red' ? ['#8c1d12', '#b23a26', '#c99a3c'] : ['#c4922f', '#ecd07c', '#9b6c22']
    x.fillStyle = pal[0]
    x.fillRect(X, Y, W, H)
    x.save()
    x.beginPath()
    x.rect(X, Y, W, H)
    x.clip()
    if (kind === 'gold') {
      x.strokeStyle = pal[1]
      x.lineWidth = 2
      for (let yy = Y + 10; yy < Y + H; yy += 26)
        for (let xx = X + ((yy / 26) % 2) * 13; xx < X + W; xx += 26) {
          x.beginPath()
          x.arc(xx, yy, 6, 0.6, PI * 1.8)
          x.stroke()
          x.beginPath()
          x.arc(xx + 7, yy + 4, 3.5, PI, PI * 2.6)
          x.stroke()
        }
      x.fillStyle = 'rgba(255,245,210,.12)'
      x.fillRect(X, Y, W, H * 0.4)
    } else {
      x.fillStyle = pal[1]
      for (let yy = Y + 4; yy < Y + H; yy += 10)
        for (let xx = X + ((yy / 10) % 2) * 5; xx < X + W; xx += 10) {
          x.beginPath()
          x.moveTo(xx, yy - 3.5)
          x.lineTo(xx + 3.5, yy)
          x.lineTo(xx, yy + 3.5)
          x.lineTo(xx - 3.5, yy)
          x.fill()
        }
      x.fillStyle = pal[2]
      for (let yy = Y + 9; yy < Y + H; yy += 20)
        for (let xx = X + 9 + ((yy / 20) % 2) * 10; xx < X + W; xx += 20) {
          x.beginPath()
          x.arc(xx, yy, 1.4, 0, 6.29)
          x.fill()
        }
    }
    x.restore()
  }
  // the dongdar: the silk face hung on the end of the bundle
  function flagTex(it) {
    const W = 256
    const H = 300
    const [c, x] = mk(W, H)
    const r = Rnd(it.n * 31)
    const precious = !!it.featured
    // three layers of contrasting brocade, nested, open at the top
    brocade(x, 0, 0, W, H, precious ? 'red' : 'blue')
    x.fillStyle = '#c99a3c'
    x.fillRect(26, 0, W - 52, H - 24)
    brocade(x, 29, 0, W - 58, H - 27, precious ? 'blue' : 'red')
    x.fillStyle = '#2a120a'
    x.fillRect(54, 0, W - 108, H - 50)
    brocade(x, 56, 0, W - 112, H - 52, 'gold')
    // the leaf number, embroidered in the gold
    x.fillStyle = 'rgba(110,30,14,.85)'
    x.font = `44px ${F.tib}`
    x.textAlign = 'center'
    x.textBaseline = 'middle'
    x.fillText(tib(it.n), W / 2, 92)
    // white gauze with the short title inked on: the shelf's call number
    const label = it.short || it.title
    x.font = `italic 38px ${F.serif}`
    const tw = Math.min(W - 40, x.measureText(label).width + 48)
    const lx = (W - tw) / 2
    const ly = H - 112
    x.save()
    x.translate(W / 2, ly + 30)
    x.rotate((r() - 0.5) * 0.05)
    x.translate(-W / 2, -(ly + 30))
    x.fillStyle = 'rgba(246,240,226,.96)'
    x.fillRect(lx, ly, tw, 60)
    x.globalAlpha = 0.12
    x.fillStyle = '#7a6448'
    for (let yy = ly; yy < ly + 60; yy += 3) x.fillRect(lx, yy, tw, 1)
    for (let xx = lx; xx < lx + tw; xx += 3) x.fillRect(xx, ly, 1, 60)
    x.globalAlpha = 1
    x.fillStyle = '#2a1a10'
    x.fillText(label, W / 2 + 6, ly + 31, tw - 30)
    x.restore()
    // worn edges and grime
    edgeGrime(x, W, H, true, 0.35)
    const g = x.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, 'rgba(0,0,0,.45)')
    g.addColorStop(0.12, 'rgba(0,0,0,0)')
    g.addColorStop(1, 'rgba(0,0,0,.25)')
    x.fillStyle = g
    x.fillRect(0, 0, W, H)
    grain(x, W, H, r, 16)
    return c
  }
  // the title leaf, as painted on the top of the stack: the same as the HTML leaf's front
  function titleTex(it, aspect) {
    const W = 1024
    const H = Math.round(1024 / aspect)
    const [c, x] = mk(W, H)
    const r = Rnd(it.n * 7)
    const precious = !!it.featured
    const g = x.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, precious ? '#161c40' : '#f2e5c7')
    g.addColorStop(1, precious ? '#0e1330' : '#e9d9b6')
    x.fillStyle = g
    x.fillRect(0, 0, W, H)
    const v = x.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.62)
    v.addColorStop(0, 'rgba(0,0,0,0)')
    v.addColorStop(1, precious ? 'rgba(0,0,0,.45)' : 'rgba(120,84,40,.3)')
    x.fillStyle = v
    x.fillRect(0, 0, W, H)
    grain(x, W, H, r, 10)
    const rule = precious ? 'rgba(220,178,90,.82)' : 'rgba(181,49,29,.85)'
    const ink = precious ? '#dcb25a' : '#2a1a10'
    const k = W / 1100
    const L = 51 * k
    const T = 21 * k
    const R = 22 * k
    x.strokeStyle = rule
    x.lineWidth = 2.2 * k
    x.strokeRect(L, T, W - L - R, H - 2 * T)
    x.lineWidth = 1.2 * k
    x.strokeRect(L - 5 * k, T - 5 * k, W - L - R + 10 * k, H - 2 * T + 10 * k)
    x.save()
    x.translate(26 * k, H / 2)
    x.rotate(-PI / 2)
    x.fillStyle = precious ? '#dcb25a' : '#b5311d'
    x.font = `${17 * k}px ${F.tib}`
    x.textAlign = 'center'
    x.textBaseline = 'middle'
    x.fillText(`ཀ ${tib(it.n)}`, 0, 0)
    x.restore()
    x.textAlign = 'center'
    x.textBaseline = 'alphabetic'
    x.fillStyle = precious ? '#dcb25a' : '#b5311d'
    x.font = `${21 * k}px ${F.tib}`
    x.fillText('༄༅། །', W / 2, H / 2 - 44 * k)
    let size = 62 * k
    x.font = `${size}px ${F.serif}`
    while (x.measureText(it.title).width > W * 0.68 && size > 24) {
      size -= 2
      x.font = `${size}px ${F.serif}`
    }
    x.fillStyle = ink
    x.fillText(it.title, W / 2, H / 2 + 14 * k)
    x.font = `500 ${11.5 * k}px ${F.mono}`
    if ('letterSpacing' in x) x.letterSpacing = `${2.3 * k}px`
    x.globalAlpha = 0.7
    x.fillText(metaOf(it).toUpperCase(), W / 2, H / 2 + 44 * k)
    x.globalAlpha = 1
    if ('letterSpacing' in x) x.letterSpacing = '0px'
    x.globalAlpha = 0.16
    x.font = `${42 * k}px ${F.tib}`
    x.textAlign = 'right'
    x.fillText(tib(it.n), W - 42 * k, H - 26 * k)
    x.globalAlpha = 1
    return c
  }
  function pageEdgeTex() {
    const [c, x] = mk(64, 256)
    const r = Rnd(3)
    x.fillStyle = '#e8d8b4'
    x.fillRect(0, 0, 64, 256)
    for (let y = 0; y < 256; y += 2 + ((r() * 2) | 0)) {
      x.fillStyle = `rgba(110,80,40,${(0.15 + r() * 0.3).toFixed(2)})`
      x.fillRect(0, y, 64, 1)
    }
    x.fillStyle = 'rgba(170,40,24,.18)'
    x.fillRect(0, 0, 64, 256)
    grain(x, 64, 256, r, 18)
    return c
  }
  function dotTex() {
    const [c, x] = mk(64, 64)
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32)
    g.addColorStop(0, 'rgba(255,236,200,1)')
    g.addColorStop(0.35, 'rgba(255,220,170,.45)')
    g.addColorStop(1, 'rgba(255,200,140,0)')
    x.fillStyle = g
    x.fillRect(0, 0, 64, 64)
    return c
  }
  // a butter lamp's flame: a soft, tall glow, white at the wick
  function flameTex() {
    const [c, x] = mk(64, 160)
    x.translate(32, 96)
    x.scale(1, 2.2)
    const g = x.createRadialGradient(0, 0, 0, 0, 0, 24)
    g.addColorStop(0, 'rgba(255,250,232,1)')
    g.addColorStop(0.3, 'rgba(255,212,128,0.95)')
    g.addColorStop(0.64, 'rgba(255,126,30,0.4)')
    g.addColorStop(1, 'rgba(255,80,0,0)')
    x.fillStyle = g
    x.fillRect(-32, -44, 64, 88)
    return c
  }
  function shaftTex() {
    const [c, x] = mk(128, 512)
    const g = x.createLinearGradient(0, 0, 128, 0)
    g.addColorStop(0, 'rgba(255,214,160,0)')
    g.addColorStop(0.5, 'rgba(255,214,160,1)')
    g.addColorStop(1, 'rgba(255,214,160,0)')
    x.fillStyle = g
    x.fillRect(0, 0, 128, 512)
    x.globalCompositeOperation = 'destination-in'
    const v = x.createLinearGradient(0, 0, 0, 512)
    v.addColorStop(0, 'rgba(0,0,0,0)')
    v.addColorStop(0.18, 'rgba(0,0,0,1)')
    v.addColorStop(0.7, 'rgba(0,0,0,.5)')
    v.addColorStop(1, 'rgba(0,0,0,0)')
    x.fillStyle = v
    x.fillRect(0, 0, 128, 512)
    return c
  }

  // ================================================================== geometry
  function smoothNormals(geo) {
    const pos = geo.attributes.position
    const nor = geo.attributes.normal
    const map = new Map()
    for (let i = 0; i < pos.count; i++) {
      const key = `${pos.getX(i).toFixed(4)},${pos.getY(i).toFixed(4)},${pos.getZ(i).toFixed(4)}`
      let e = map.get(key)
      if (!e) map.set(key, (e = [0, 0, 0, []]))
      e[0] += nor.getX(i)
      e[1] += nor.getY(i)
      e[2] += nor.getZ(i)
      e[3].push(i)
    }
    for (const e of map.values()) {
      const l = Math.hypot(e[0], e[1], e[2]) || 1
      for (const i of e[3]) nor.setXYZ(i, e[0] / l, e[1] / l, e[2] / l)
    }
    nor.needsUpdate = true
  }
  // a box with rounded edges, swelling sides, a warp and a little irregularity
  function softBox(w, h, d, { r = 0.01, seg = 6, bulge = 0, warp = 0, jitter = 0, seed = 1 } = {}) {
    const geo = new THREE.BoxGeometry(w, h, d, seg, Math.max(2, seg >> 1), seg)
    const pos = geo.attributes.position
    const hx = w / 2 - r
    const hy = h / 2 - r
    const hz = d / 2 - r
    const v = new THREE.Vector3()
    const q = new THREE.Vector3()
    const dir = new THREE.Vector3()
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i)
      const ox = v.x
      const oy = v.y
      const oz = v.z
      q.set(clamp(v.x, -hx, hx), clamp(v.y, -hy, hy), clamp(v.z, -hz, hz))
      dir.subVectors(v, q)
      if (dir.lengthSq() > 1e-12) v.copy(q).add(dir.normalize().multiplyScalar(r))
      const ty = 1 - Math.pow(clamp(v.y / (h / 2), -1, 1), 2)
      if (bulge) {
        v.x += Math.sign(v.x) * bulge * ty * (1 - (0.35 * Math.abs(v.z)) / (d / 2))
        v.z += Math.sign(v.z) * bulge * 0.7 * ty * (1 - (0.3 * Math.abs(v.x)) / (w / 2))
      }
      if (warp) v.y += warp * (Math.pow(v.z / (d / 2), 2) - 0.5)
      if (jitter) {
        v.x += (hash(ox, oy, oz, seed) - 0.5) * jitter
        v.y += (hash(oy, oz, ox, seed + 1) - 0.5) * jitter
        v.z += (hash(oz, ox, oy, seed + 2) - 0.5) * jitter
      }
      pos.setXYZ(i, v.x, v.y, v.z)
    }
    geo.computeVertexNormals()
    smoothNormals(geo)
    return geo
  }

  // ================================================================== scene, light, materials
  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#0a0504')
  scene.fog = new THREE.Fog(lin(0x0a0504), 6, 14)
  const camera = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, 0.05, 40)

  // the room's light, lower than the prototype's: the butter lamps (below) do
  // more of the lighting. The hover glow is not part of it and keeps its strength.
  const ROOM = 0.6
  scene.add(new THREE.HemisphereLight(lin(0x8a5a3a), lin(0x120804), 0.38 * PI * ROOM))
  const key = new THREE.DirectionalLight(lin(0xffc488), 3.05 * PI * ROOM)
  key.position.set(-3.6, 3.4, 4.6)
  key.castShadow = true
  key.shadow.mapSize.set(2048, 2048)
  Object.assign(key.shadow.camera, { left: -3.2, right: 3.2, top: 2.2, bottom: -2.2, near: 1, far: 16 })
  key.shadow.bias = -0.0006
  key.shadow.normalBias = 0.015
  scene.add(key)
  const fillLight = new THREE.DirectionalLight(lin(0x7d8cb8), 0.2 * PI * ROOM)
  fillLight.position.set(4, 0.6, 3)
  scene.add(fillLight)
  const LAMP = 0.7 * PI * ROOM
  const lamp = new THREE.PointLight(lin(0xff9a50), LAMP, 7, 1)
  lamp.position.set(0.4, -1.6, 2.4)
  scene.add(lamp)
  const GLOW = 1.4
  const glow = new THREE.PointLight(lin(0xff8a3a), 0, 1.5, 1)
  scene.add(glow)

  const tex = {
    plain: texOf(paintTex({ w: 256, h: 256, seed: 11 })),
    plainDark: texOf(paintTex({ w: 256, h: 256, seed: 12, base: '92,24,15' })),
    clouds: [0, 1, 2].map((k) => texOf(paintTex({ w: 1024, h: 64, seed: 20 + k, motif: 'clouds' }))),
    vine: [0, 1].map((k) => texOf(paintTex({ w: 64, h: 512, seed: 40 + k, motif: 'vine', vertical: true }))),
    frieze: texOf(paintTex({ w: 1024, h: 128, seed: 60, motif: 'frieze', base: '34,56,98', chipScale: 0.45 })),
    inner: texOf(woodTex({ w: 512, h: 512, seed: 75, base: [58, 40, 28] })),
    back: texOf(woodTex({ w: 512, h: 512, seed: 70, base: [40, 26, 18] }), 2, 2),
    boards: [0, 1, 2].map((k) => texOf(woodTex({ w: 512, h: 128, seed: 80 + k, base: [78 - k * 8, 58 - k * 6, 40 - k * 4] }))),
    cloth: texOf(clothTex({ seed: 90, silk: false })),
    silk: texOf(clothTex({ seed: 91, silk: true })),
    edge: texOf(pageEdgeTex()),
    dot: texOf(dotTex(), 1, 1, true),
    shaft: texOf(shaftTex()),
  }
  const mat = {
    plain: painted(new THREE.MeshStandardMaterial({ map: tex.plain, roughness: 0.86 })),
    plainDark: painted(new THREE.MeshStandardMaterial({ map: tex.plainDark, roughness: 0.9 })),
    back: painted(new THREE.MeshStandardMaterial({ map: tex.back, roughness: 0.95, color: lin(0x8a7a70) })),
    frieze: painted(new THREE.MeshStandardMaterial({ map: tex.frieze, roughness: 0.8 })),
    boards: tex.boards.map((t) => painted(new THREE.MeshStandardMaterial({ map: t, roughness: 0.94 }))),
    edge: painted(new THREE.MeshStandardMaterial({ map: tex.edge, roughness: 0.92 })),
    inner: painted(new THREE.MeshStandardMaterial({ map: tex.inner, roughness: 0.96, color: lin(0x9a8678) })),
  }
  const cloudMat = (k, len) => {
    const t = tex.clouds[k % 3].clone()
    t.needsUpdate = true
    t.repeat.set(len, 1)
    t.offset.x = Math.random()
    textures.push(t)
    return painted(new THREE.MeshStandardMaterial({ map: t, roughness: 0.84 }))
  }
  const vineMat = (k, len) => {
    const t = tex.vine[k % 2].clone()
    t.needsUpdate = true
    t.repeat.set(1, len)
    t.offset.y = Math.random()
    textures.push(t)
    return painted(new THREE.MeshStandardMaterial({ map: t, roughness: 0.86 }))
  }

  // ================================================================== the bookcase
  const LAYOUT = shelfLayout(items.length - 1)
  const U = 0.5
  const HR = 0.38
  const D = 0.86
  const P = 0.068
  const T = 0.056
  const FRIEZE = 0.2
  const ROWS = LAYOUT.length
  const CW = UNITS * U + (UNITS + 1) * P
  const CH = ROWS * HR + (ROWS + 1) * T
  tex.frieze.repeat.set((CW + 0.08) / (FRIEZE * 8), 1)
  const shelf = new THREE.Group()
  scene.add(shelf)
  const rnd = Rnd(5)
  const jit = (a) => (rnd() - 0.5) * a
  const add = (geo, m, x, y, z, rot = [0, 0, 0], cast = true, receive = true) => {
    const o = new THREE.Mesh(geo, m)
    o.position.set(x, y, z)
    o.rotation.set(...rot)
    o.castShadow = cast
    o.receiveShadow = receive
    shelf.add(o)
    return o
  }
  // back wall of the case
  add(new THREE.BoxGeometry(CW, CH + FRIEZE, 0.04), mat.back, 0, FRIEZE / 2, -D / 2 - 0.02, [0, 0, 0], false, true)
  // the planks (shelf fronts painted with clouds)
  for (let k = 0; k <= ROWS; k++) {
    const y = CH / 2 - T / 2 - k * (HR + T)
    const front = cloudMat(k, CW / (T * 16))
    add(
      new THREE.BoxGeometry(CW + 0.02, T, D),
      [mat.plain, mat.plain, mat.inner, mat.inner, front, mat.plainDark],
      jit(0.008),
      y + jit(0.012),
      jit(0.012),
      [jit(0.01), 0, jit(0.012)],
    )
  }
  // the frieze and its stepped ornaments
  add(
    new THREE.BoxGeometry(CW + 0.08, FRIEZE, 0.12),
    [mat.plain, mat.plain, mat.plainDark, mat.plainDark, mat.frieze, mat.plainDark],
    0,
    CH / 2 + FRIEZE / 2,
    D / 2 - 0.04,
  )
  const orn = painted(new THREE.MeshStandardMaterial({ map: tex.plain, roughness: 0.8, color: lin(0xd07a5a) }))
  const gilt = new THREE.MeshStandardMaterial({ color: lin(0xb8893a), roughness: 0.45, metalness: 0.55 })
  for (let x = -CW / 2 + 0.07; x < CW / 2 - 0.04; x += 0.135) {
    const by = CH / 2 + FRIEZE
    for (let s = 0; s < 3; s++) {
      const sz = 0.075 - s * 0.022
      add(new THREE.BoxGeometry(sz, 0.022, 0.06 - s * 0.012), s === 2 ? gilt : orn, x + jit(0.004), by + 0.011 + s * 0.022, D / 2 - 0.05, [0, jit(0.08), 0])
    }
  }
  // posts: full height at the ends, and between the pigeonholes of each row
  const postAt = (x, y, h, k) => {
    const m = vineMat(k, h / (P * 8))
    add(
      new THREE.BoxGeometry(P * (0.9 + rnd() * 0.2), h, D),
      [mat.inner, mat.inner, mat.plain, mat.plain, m, mat.plainDark],
      x + jit(0.008),
      y,
      jit(0.012),
      [jit(0.012), 0, jit(0.024)],
    )
  }
  postAt(-CW / 2 + P / 2, 0, CH, 0)
  postAt(CW / 2 - P / 2, 0, CH, 1)
  const slots = []
  LAYOUT.forEach((row, r) => {
    const top = CH / 2 - T - r * (HR + T)
    const bottom = top - HR
    let x = -CW / 2 + P
    row.forEach(([w, kind], c) => {
      const cw = w * U + (w - 1) * P
      slots.push({ x0: x, x1: x + cw, bottom, top, kind, w, row: r })
      x += cw
      if (x < CW / 2 - P - 1e-6) postAt(x + P / 2, (top + bottom) / 2, HR, r * 7 + c)
      x += P
    })
  })

  // ================================================================== the wrapped texts
  const bundles = []
  const picks = []
  const LEN = 0.74
  function makeBundle(it, { w, hc, seed }) {
    const r = Rnd(seed)
    const g = new THREE.Group()
    const bt = 0.03 + r() * 0.01
    const boardMat = mat.boards[seed % 3]
    const bottom = new THREE.Mesh(softBox(w + 0.04, bt, LEN + 0.02, { r: 0.006, seg: 4, warp: 0.006 * (r() - 0.3), jitter: 0.004, seed }), boardMat)
    bottom.position.y = bt / 2
    const clothMaterial = painted(
      new THREE.MeshStandardMaterial({
        map: it.featured ? tex.silk : tex.cloth,
        roughness: it.featured ? 0.62 : 0.97,
        metalness: 0,
        emissive: lin(0xff6a1a),
        emissiveIntensity: 0,
      }),
    )
    const bulge = Math.min(0.009, hc * 0.05)
    const cloth = new THREE.Mesh(softBox(w, hc, LEN - 0.03, { r: Math.min(hc, w) * 0.16, seg: 10, bulge, jitter: 0.004, seed: seed + 3 }), clothMaterial)
    cloth.position.y = bt + hc / 2
    // the leaves inside, and the first one's title on top
    const stack = new THREE.Mesh(new THREE.BoxGeometry(w * 0.84, hc * 0.72, LEN * 0.92), mat.edge)
    stack.position.y = bt + hc * 0.36 + 0.002
    stack.visible = false
    const top = new THREE.Mesh(
      softBox(w + 0.04 + r() * 0.02, bt, LEN + 0.02, { r: 0.006, seg: 4, warp: -0.008 * r(), jitter: 0.005, seed: seed + 7 }),
      boardMat,
    )
    top.position.set((r() - 0.5) * 0.02, bt + hc + bt / 2 - 0.002, (r() - 0.5) * 0.02)
    top.rotation.y = (r() - 0.5) * 0.06
    let pivot = null
    let flag = null
    let flagMaterial = null
    if (!it.next) {
      flagMaterial = painted(
        new THREE.MeshStandardMaterial({
          map: texOf(flagTex(it)),
          roughness: 0.66,
          metalness: 0.12,
          emissive: lin(0xffb050),
          emissiveIntensity: 0,
          side: THREE.DoubleSide,
        }),
      )
      const fw = w * 0.64
      const fh = hc * 0.94
      const fg = new THREE.PlaneGeometry(fw, fh, 8, 8)
      const fp = fg.attributes.position
      for (let i = 0; i < fp.count; i++) {
        const fx = fp.getX(i)
        const fy = fp.getY(i)
        // drape over the swelling cloth, and curl a little off it at the hem
        const across = 1 - Math.pow(fx / (fw / 2), 2)
        const down = (fh / 2 - fy) / fh
        fp.setZ(i, bulge * 0.7 * across * Math.sin(down * PI) + Math.pow(down, 3) * 0.012)
      }
      fg.computeVertexNormals()
      flag = new THREE.Mesh(fg, flagMaterial)
      flag.position.y = -fh / 2
      pivot = new THREE.Group()
      pivot.position.set(0, bt + hc - 0.004, (LEN - 0.03) / 2 + 0.0035)
      pivot.add(flag)
    } else {
      // the open end of the shelf: a short tag on the blank leaves
      const [c, x] = mk(256, 96)
      x.fillStyle = '#f3ecdc'
      x.fillRect(0, 0, 256, 96)
      x.fillStyle = '#2a1a10'
      x.font = `500 30px ${F.mono}`
      x.textAlign = 'center'
      x.textBaseline = 'middle'
      if ('letterSpacing' in x) x.letterSpacing = '6px'
      x.fillText('NEXT', 128, 50)
      const tag = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.4, w * 0.15), painted(new THREE.MeshStandardMaterial({ map: texOf(c), roughness: 0.9 })))
      tag.position.set(0, bt + hc * 0.5, LEN / 2 - 0.005)
      g.add(tag)
      stack.visible = true
      stack.scale.set(1.1, 1.3, 1.04)
      stack.position.y = bt + hc * 0.5
    }
    const parts = [bottom, cloth, stack, top]
    for (const m of parts) {
      m.castShadow = true
      m.receiveShadow = true
    }
    if (it.next) cloth.visible = false
    g.add(...parts)
    if (pivot) g.add(pivot)
    // the leaf's title, lying on the stack, for when it's unwrapped
    const titleMat = painted(new THREE.MeshBasicMaterial({ map: texOf(titleTex(it, 2.65)), toneMapped: false }))
    const topLeaf = new THREE.Mesh(new THREE.PlaneGeometry(LEN * 0.9, w * 0.8), titleMat)
    topLeaf.rotation.set(-PI / 2, -PI / 2, 0, 'YXZ')
    topLeaf.position.y = stack.position.y + (hc * 0.72) / 2 + 0.002
    topLeaf.visible = false
    g.add(topLeaf)
    const b = { it, root: g, bottom, cloth, stack, top, pivot, flag, clothMaterial, flagMaterial, boardMat, topLeaf, titleMat, w, hc, bt, lift: 0, liftTarget: 0 }
    for (const m of [bottom, cloth, top, flag].filter(Boolean)) {
      m.userData.bundle = b
      picks.push(m)
    }
    if (it.next) {
      stack.userData.bundle = b
      picks.push(stack)
    }
    return b
  }
  function place(b, x, y, seed) {
    const r = Rnd(seed)
    b.home = {
      p: new THREE.Vector3(x + (r() - 0.5) * 0.02, y, D / 2 - LEN / 2 - 0.035 - r() * 0.05),
      q: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, (r() - 0.5) * 0.12, (r() - 0.5) * 0.01)),
    }
    b.root.position.copy(b.home.p)
    b.root.quaternion.copy(b.home.q)
    shelf.add(b.root)
  }
  let idx = 0
  const desc = (k) => (items[k]?.description || '').length
  const hcOf = (k, max) => clamp(0.155 + desc(k) / 2600, 0.16, max)
  slots.forEach((s) => {
    const cx = (s.x0 + s.x1) / 2
    if (s.kind === 'one') {
      const w = s.w === 2 ? 0.46 : 0.36
      const b = makeBundle(items[idx], { w, hc: s.w === 2 ? 0.23 : hcOf(idx, 0.23), seed: idx * 13 + 5 })
      place(b, cx, s.bottom, idx * 7 + 3)
      bundles[idx] = b
      idx++
    } else if (s.kind === 'side') {
      for (const off of [-0.27, 0.27]) {
        const b = makeBundle(items[idx], { w: 0.4, hc: hcOf(idx, 0.21), seed: idx * 13 + 5 })
        place(b, cx + off, s.bottom, idx * 7 + 3)
        bundles[idx] = b
        idx++
      }
    } else if (s.kind === 'stack') {
      let y = s.bottom
      for (let k = 0; k < 2; k++) {
        const hc = 0.085 + k * 0.01
        const b = makeBundle(items[idx], { w: 0.34 - k * 0.02, hc, seed: idx * 13 + 5 })
        place(b, cx + (k ? 0.012 : -0.008), y, idx * 7 + 3)
        bundles[idx] = b
        idx++
        y += b.bt * 2 + hc + 0.004
      }
    } else if (s.kind === 'next') {
      const nIdx = items.length - 1
      const b = makeBundle(items[nIdx], { w: 0.34, hc: 0.06, seed: 99 })
      place(b, cx, s.bottom, 41)
      bundles[nIdx] = b
    } else if (s.kind === 'boards') {
      // old covers, without their texts
      let y = s.bottom
      const n = s.w === 2 ? 5 : 3
      for (let k = 0; k < n; k++) {
        const bw = 0.38 + rnd() * 0.06
        const bt = 0.026 + rnd() * 0.012
        const m = new THREE.Mesh(
          softBox(bw, bt, LEN + 0.02, { r: 0.006, seg: 3, warp: 0.01 * (rnd() - 0.5), jitter: 0.004, seed: 300 + k }),
          mat.boards[k % 3],
        )
        m.position.set(cx + (s.w === 2 ? (k % 2 ? 0.26 : -0.24) : 0) + jit(0.03), y + bt / 2, D / 2 - LEN / 2 - 0.05 + jit(0.04))
        m.rotation.y = jit(0.14)
        m.castShadow = m.receiveShadow = true
        shelf.add(m)
        if (s.w !== 2 || k % 2) y += bt + 0.001
      }
    }
  })

  // dust in the light, and the light itself
  const DUST = 420
  const dustGeo = new THREE.BufferGeometry()
  const dustPos = new Float32Array(DUST * 3)
  const dustSeed = new Float32Array(DUST)
  for (let i = 0; i < DUST; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * (CW + 1)
    dustPos[i * 3 + 1] = (Math.random() - 0.5) * (CH + 1.2)
    dustPos[i * 3 + 2] = D / 2 + 0.1 + Math.random() * 1.6
    dustSeed[i] = Math.random() * 100
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3))
  const dust = new THREE.Points(
    dustGeo,
    new THREE.PointsMaterial({
      map: tex.dot,
      size: 0.014,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      color: lin(0xffd8a8),
      opacity: 0.55,
    }),
  )
  scene.add(dust)
  for (const [x, w, a, o] of [
    [-0.9, 1.3, 0.52, 0.056],
    [0.5, 0.8, 0.5, 0.04],
  ]) {
    const s = new THREE.Mesh(
      new THREE.PlaneGeometry(w, 5),
      painted(new THREE.MeshBasicMaterial({ map: tex.shaft, transparent: true, opacity: o, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })),
    )
    s.position.set(x, 0.4, D / 2 + 0.55)
    s.rotation.z = a
    scene.add(s)
  }
  // ================================================================== butter lamps
  // A row of butter lamps on the floor before the bookcase: brass cups with
  // flickering flames, whose warm light pools on the floor and the lowest
  // shelves and fades as it climbs. One light for each third of the row.
  const floorY = -CH / 2
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 7),
    painted(new THREE.MeshStandardMaterial({ map: texOf(woodTex({ w: 512, h: 512, seed: 78, base: [46, 32, 24] }), 9, 4), roughness: 0.9 })),
  )
  floor.rotation.x = -PI / 2
  floor.position.set(0, floorY - 0.001, -D / 2 + 3.5)
  floor.receiveShadow = true
  scene.add(floor)
  const brass = new THREE.MeshStandardMaterial({ color: lin(0x6e4a1c), metalness: 0.7, roughness: 0.32, side: THREE.DoubleSide })
  const lampGeo = new THREE.LatheGeometry(
    [
      [0, 0],
      [0.026, 0],
      [0.026, 0.005],
      [0.011, 0.013],
      [0.008, 0.027],
      [0.012, 0.033],
      [0.031, 0.045],
      [0.034, 0.056],
      [0.03, 0.057],
      [0, 0.051],
    ].map(([r, y]) => new THREE.Vector2(r, y)),
    20,
  )
  const flameMat = new THREE.SpriteMaterial({ map: texOf(flameTex(), 1, 1, true), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })
  const haloMat = new THREE.SpriteMaterial({
    map: tex.dot,
    color: lin(0xff9a4a),
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  })
  const flames = []
  const lr = Rnd(23)
  for (let x = -CW / 2 + 0.14; x < CW / 2 - 0.1; x += 0.27 + lr() * 0.12) {
    const lx = x + (lr() - 0.5) * 0.05
    const lz = D / 2 + 0.13 + lr() * 0.09
    const cup = new THREE.Mesh(lampGeo, brass)
    cup.position.set(lx, floorY, lz)
    cup.scale.setScalar(0.9 + lr() * 0.25)
    cup.castShadow = cup.receiveShadow = true
    scene.add(cup)
    const top = floorY + 0.053 * cup.scale.y
    const fh = 0.064 + lr() * 0.016
    const flame = new THREE.Sprite(flameMat)
    flame.center.set(0.5, 0.1) // the wick sits on the butter
    flame.position.set(lx, top, lz)
    flame.scale.set(fh * 0.42, fh, 1)
    const halo = new THREE.Sprite(haloMat)
    halo.position.set(lx, top + fh * 0.35, lz)
    halo.scale.setScalar(0.2 + lr() * 0.06)
    scene.add(flame, halo)
    flames.push({ flame, halo, x: lx, fh, hs: halo.scale.x, phase: lr() * 100 })
  }
  const CANDLE = 0.6
  const candles = [-1.3, 0, 1.3].map((x, i) => {
    const l = new THREE.PointLight(lin(0xff9640), CANDLE, 2, 1.7)
    l.position.set(x, floorY + 0.14, D / 2 + 0.3)
    scene.add(l)
    return { l, phase: i * 17.3 }
  })

  // a dark curtain that falls between you and the shelf while you read
  const curtainMat = new THREE.MeshBasicMaterial({ color: lin(0x040201), transparent: true, opacity: 0, depthWrite: false })
  const curtain = new THREE.Mesh(new THREE.PlaneGeometry(40, 30), curtainMat)
  curtain.position.z = D / 2 + 0.3
  curtain.renderOrder = 2
  scene.add(curtain)
  // the leaf that rises to you
  const leafMat = painted(new THREE.MeshBasicMaterial({ toneMapped: false, transparent: true, side: THREE.DoubleSide }))
  const leaf3d = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), leafMat)
  leaf3d.visible = false
  leaf3d.renderOrder = 4
  scene.add(leaf3d)

  // ================================================================== the reading leaf's place on screen
  const leafBox = { w: 0, h: 0, x: 0, y: 0 }
  function layoutLeaf() {
    const W = innerWidth
    const H = innerHeight
    const narrow = W <= 720
    const w = narrow ? Math.min(W - 28, 520) : Math.min(1100, W * 0.9)
    const h = narrow ? Math.min(H - 132, w * 1.9) : Math.min(Math.max(w / 2.65, 340), H - 170)
    Object.assign(leafBox, { w, h, x: (W - w) / 2, y: (H - h) / 2 - (narrow ? 4 : 10) })
    Object.assign(leaf.style, { width: `${w}px`, height: `${h}px`, left: `${leafBox.x}px`, top: `${leafBox.y}px` })
  }

  // ================================================================== camera: framing and looking along the shelf
  const view = { panX: 0, panTarget: 0, panRange: 0, dist: 4, px: 0, py: 0, tx: 0, ty: 0, frozen: false, started: false, hint: null }
  const totalH = CH + FRIEZE + 0.06
  const centerY = FRIEZE / 2
  function frame() {
    const W = innerWidth
    const H = innerHeight
    camera.aspect = W / H
    camera.updateProjectionMatrix()
    renderer.setSize(W, H, false)
    const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
    const portrait = W / H < 0.9
    // the full height of the case fits between the title and the caption
    const usable = portrait ? 0.58 : 0.68
    view.dist = totalH / (2 * tanV * usable)
    const visibleW = 2 * view.dist * tanV * camera.aspect
    view.panRange = Math.max(0, (CW + 0.3 - visibleW) / 2)
    if (!view.started) {
      // on a phone, start at the newest end
      view.started = true
      if (portrait || coarse) view.panTarget = view.panX = -view.panRange
    }
    view.panTarget = clamp(view.panTarget, -view.panRange, view.panRange)
    const hint = coarse && view.panRange > 0.2
    if (hint !== view.hint) emit('panHint', (view.hint = hint))
    layoutLeaf()
  }
  frame()

  // ================================================================== hover, look, open
  const ray = new THREE.Raycaster()
  const ndc = new THREE.Vector2()
  const state = { open: false, busy: false, i: -1, skip: false, flipped: false, kbd: false }
  let hovered = null
  function pick(clientX, clientY) {
    ndc.set((clientX / innerWidth) * 2 - 1, -(clientY / innerHeight) * 2 + 1)
    ray.setFromCamera(ndc, camera)
    const hit = ray.intersectObjects(picks, false)[0]
    return hit ? hit.object.userData.bundle : null
  }
  function setHover(b) {
    if (hovered === b) return
    if (hovered) hovered.liftTarget = 0
    hovered = b
    if (b) b.liftTarget = 1
    if (b || !state.open) emit('hover', b ? bundles.indexOf(b) : -1)
    canvas.dataset.pointing = String(!!b)
  }
  let down = null
  function onPointerDown(e) {
    down = { x: e.clientX, y: e.clientY, pan: view.panTarget, id: e.pointerId, moved: false, vx: 0, lx: e.clientX, lt: performance.now() }
  }
  function onPointerMove(e) {
    if (state.open) return
    if (down && e.pointerId === down.id && (e.pointerType !== 'mouse' || e.buttons & 1)) {
      const dx = e.clientX - down.x
      if (Math.abs(dx) > 8) down.moved = true
      if (down.moved) {
        const perPx = (2 * view.dist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) / innerHeight
        view.panTarget = clamp(down.pan - dx * perPx, -view.panRange, view.panRange)
        const now = performance.now()
        down.vx = ((e.clientX - down.lx) / Math.max(1, now - down.lt)) * perPx
        down.lx = e.clientX
        down.lt = now
        setHover(null)
        return
      }
    }
    if (e.pointerType === 'mouse') {
      view.tx = (e.clientX / innerWidth - 0.5) * 2
      view.ty = (e.clientY / innerHeight - 0.5) * 2
      if (!down) {
        // look toward the cursor along the shelf
        view.panTarget = view.panRange * clamp(view.tx * 1.15, -1, 1)
        setHover(pick(e.clientX, e.clientY))
      }
    }
  }
  function onPointerUp(e) {
    if (!down || e.pointerId !== down.id) return
    const d = down
    down = null
    if (state.open) return
    if (d.moved) {
      if (!reduced) view.panTarget = clamp(view.panTarget - d.vx * 260, -view.panRange, view.panRange)
      return
    }
    const b = pick(e.clientX, e.clientY)
    if (b) openText(bundles.indexOf(b))
  }
  function onPointerLeave() {
    setHover(null)
  }
  function lookAt(b) {
    const wp = new THREE.Vector3()
    b.root.getWorldPosition(wp)
    view.panTarget = clamp(wp.x, -view.panRange, view.panRange)
  }

  // ------------------------------------------------------------------ tweens
  const tweens = new Set()
  function tween(sec, update, ease = easeInOut) {
    return new Promise((resolve) => {
      const t = { start: performance.now(), dur: state.skip || reduced ? 0 : sec * 1000, update, ease, resolve }
      if (t.dur === 0) {
        update(1)
        resolve()
        return
      }
      tweens.add(t)
    })
  }
  const wait = (sec) => tween(sec, () => {}, (t) => t)
  function stepTweens(now) {
    for (const t of [...tweens]) {
      const k = Math.min(1, (now - t.start) / t.dur)
      t.update(t.ease(k))
      if (k >= 1) {
        tweens.delete(t)
        t.resolve()
      }
    }
  }
  function hurry() {
    state.skip = true
    for (const t of [...tweens]) {
      t.update(1)
      tweens.delete(t)
      t.resolve()
    }
  }

  // ------------------------------------------------------------------ poses
  const fwd = new THREE.Vector3()
  const up = new THREE.Vector3()
  const right = new THREE.Vector3()
  function camAxes() {
    camera.updateMatrixWorld()
    camera.getWorldDirection(fwd)
    up.set(0, 1, 0).applyQuaternion(camera.quaternion)
    right.set(1, 0, 0).applyQuaternion(camera.quaternion)
  }
  function readingPose(b) {
    camAxes()
    const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
    const frac = innerWidth / innerHeight < 0.9 ? 0.82 : 0.42
    const dist = LEN / (frac * 2 * tanV * camera.aspect)
    const p = camera.position
      .clone()
      .addScaledVector(fwd, dist)
      .addScaledVector(up, -dist * tanV * 0.12)
    const local = new THREE.Quaternion()
      .setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.62)
      .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), PI / 2))
    const q = camera.quaternion.clone().multiply(local)
    // the bundle's centre sits at its base; lift so its middle is on the view line
    p.addScaledVector(up, -(b.bt + b.hc / 2) * 0.5)
    return { p, q }
  }
  function leafPose() {
    camAxes()
    const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
    const worldW = 1
    const dist = (worldW * innerHeight) / (2 * leafBox.w * tanV)
    const halfH = dist * tanV
    const cx = ((leafBox.x + leafBox.w / 2) / innerWidth) * 2 - 1
    const cy = -(((leafBox.y + leafBox.h / 2) / innerHeight) * 2 - 1)
    const p = camera.position
      .clone()
      .addScaledVector(fwd, dist)
      .addScaledVector(right, cx * halfH * camera.aspect)
      .addScaledVector(up, cy * halfH)
    return { p, q: camera.quaternion.clone(), scale: new THREE.Vector3(worldW, (worldW * leafBox.h) / leafBox.w, 1) }
  }
  function fadeMaterials(b, open) {
    // fading needs transparent materials, but only on the text in your hands
    for (const m of [b.clothMaterial, b.flagMaterial].filter(Boolean)) {
      m.transparent = open
      m.needsUpdate = true
    }
    if (open) {
      b.topMat = painted(b.boardMat.clone())
      b.topMat.transparent = true
      b.top.material = b.topMat
      b.bottomMat = painted(b.boardMat.clone())
      b.bottomMat.transparent = true
      b.bottom.material = b.bottomMat
      b.stackMat = painted(mat.edge.clone())
      b.stackMat.transparent = true
      b.stack.material = b.stackMat
      b.titleMat.transparent = true
    } else {
      for (const m of [b.topMat, b.bottomMat, b.stackMat]) m?.dispose()
      b.topMat = b.bottomMat = b.stackMat = null
      b.top.material = b.boardMat
      b.bottom.material = b.boardMat
      b.stack.material = mat.edge
      b.clothMaterial.opacity = 1
      if (b.flagMaterial) b.flagMaterial.opacity = 1
    }
  }
  function setOpened(b, k) {
    // k: 0 wrapped, 1 unwrapped (silk face up, top board off, cloth fallen open)
    if (b.pivot) {
      b.pivot.rotation.x = -2.55 * smooth(0, 0.6, k)
      b.flagMaterial.opacity = 1 - smooth(0.35, 0.65, k)
    }
    const kb = smooth(0.12, 0.75, k)
    b.top.position.y = b.bt + b.hc + b.bt / 2 - 0.002 + 0.24 * kb
    b.top.rotation.x = -0.55 * kb
    if (b.topMat) b.topMat.opacity = 1 - smooth(0.45, 0.9, k)
    const kc = smooth(0.25, 1, k)
    b.cloth.scale.set(1 + 0.12 * kc, 1 - 0.72 * kc, 1 + 0.05 * kc)
    b.cloth.position.y = b.bt + b.hc / 2 - b.hc * 0.36 * kc
    b.clothMaterial.opacity = 1 - smooth(0.45, 1, k)
    b.stack.visible = b.it.next || k > 0.01
    b.topLeaf.visible = !b.it.next && k > 0.3
    b.titleMat.opacity = smooth(0.3, 0.7, k)
  }
  const setLeaf = (opacity, angle) => {
    if (opacity != null) leaf.style.opacity = String(opacity)
    if (angle != null) inner.style.transform = `rotateX(${angle}deg)`
  }

  // ------------------------------------------------------------------ open
  async function openText(i, byKeyboard = false) {
    if (state.busy || state.open || i < 0 || !bundles[i]) return
    const b = bundles[i]
    state.busy = state.open = true
    state.skip = false
    state.kbd = byKeyboard
    state.i = i
    view.frozen = true
    setHover(null)
    b.liftTarget = 0
    setLeaf(0, 0)
    for (const s of shades) s.style.opacity = '0'
    state.flipped = false
    emit('open', i)
    fadeMaterials(b, true)
    tween(0.7, (k) => (curtainMat.opacity = 0.8 * k), easeOut)

    // 1. lifted out of its pigeonhole and carried to you
    const from = { p: b.root.getWorldPosition(new THREE.Vector3()), q: b.root.getWorldQuaternion(new THREE.Quaternion()) }
    shelf.remove(b.root)
    scene.add(b.root)
    b.root.position.copy(from.p)
    b.root.quaternion.copy(from.q)
    const to = readingPose(b)
    const pz = from.p.clone().add(new THREE.Vector3(0, 0.03, 0.28))
    await tween(0.32, (k) => b.root.position.lerpVectors(from.p, pz, k), easeOut)
    await tween(0.82, (k) => {
      b.root.position.lerpVectors(pz, to.p, k).addScaledVector(up.set(0, 1, 0), Math.sin(k * PI) * 0.1)
      b.root.quaternion.copy(from.q).slerp(to.q, k)
    })

    // 2. unwrapped: the silk face lifts, the top board comes off, the cloth falls open
    await tween(1.05, (k) => setOpened(b, k), (t) => t)

    // 3. the top leaf rises from the stack and turns to face you
    const lp = leafPose()
    const sp = b.topLeaf.getWorldPosition(new THREE.Vector3())
    const sq = b.topLeaf.getWorldQuaternion(new THREE.Quaternion())
    const ss = new THREE.Vector3(LEN * 0.9, b.w * 0.8, 1)
    leafMat.map = b.titleMat.map
    leafMat.opacity = 1
    leafMat.needsUpdate = true
    leaf3d.visible = true
    b.topLeaf.visible = false
    leaf3d.position.copy(sp)
    leaf3d.quaternion.copy(sq)
    leaf3d.scale.copy(ss)
    await tween(
      0.85,
      (k) => {
        leaf3d.position.lerpVectors(sp, lp.p, k)
        leaf3d.quaternion.copy(sq).slerp(lp.q, k)
        leaf3d.scale.lerpVectors(ss, lp.scale, k)
        b.stackMat.opacity = 1 - k
        b.bottomMat.opacity = 1 - k
      },
      (t) => 1 - Math.pow(1 - t, 2.4),
    )

    // 4. the page you can read takes its place, and its first leaf is turned
    await tween(0.24, (k) => {
      setLeaf(k)
      leafMat.opacity = 1 - k
    })
    leaf3d.visible = false
    setLeaf(1)
    await turn(true, 0.15)
    state.busy = false
    state.skip = false
  }

  // turn the leaf over its long edge, away from you
  async function turn(toBack, delay = 0) {
    const from = state.flipped ? 180 : 0
    const to = toBack ? 180 : 0
    if (from === to) return
    if (delay) await wait(delay)
    const [sf, sb] = shades
    await tween(0.76, (k) => {
      const a = lerp(from, to, k)
      setLeaf(null, a)
      const edge = Math.sin((a / 180) * PI) * 0.55
      sf.style.opacity = String(a < 90 ? edge : 0)
      sb.style.opacity = String(a >= 90 ? edge : 0)
    })
    state.flipped = toBack
  }

  // along the shelf without leaving: the leaf turns on to the next text
  async function go(delta) {
    if (state.busy || !state.open) return
    state.busy = true
    const j = (state.i + delta + items.length) % items.length
    const at = state.flipped ? 180 : 0
    await tween(0.34, (k) => setLeaf(null, at + 90 * delta * k), easeIn)
    // put the old text back on its shelf and take the new one out, quietly
    const old = bundles[state.i]
    const nb = bundles[j]
    restoreHome(old)
    fadeMaterials(nb, true)
    shelf.remove(nb.root)
    scene.add(nb.root)
    const pose = readingPose(nb)
    nb.root.position.copy(pose.p)
    nb.root.quaternion.copy(pose.q)
    setOpened(nb, 1)
    nb.stackMat.opacity = 0
    nb.bottomMat.opacity = 0
    nb.topLeaf.visible = false
    state.i = j
    emit('show', j)
    state.flipped = true
    await tween(0.34, (k) => setLeaf(null, 180 - 90 * delta * (1 - k)), easeOut)
    state.busy = false
  }
  function restoreHome(b) {
    setOpened(b, 0)
    b.topLeaf.visible = false
    b.stack.visible = !!b.it.next
    fadeMaterials(b, false)
    scene.remove(b.root)
    shelf.add(b.root)
    b.root.position.copy(b.home.p)
    b.root.quaternion.copy(b.home.q)
    b.lift = 0
  }

  // ------------------------------------------------------------------ put back
  async function putBack() {
    if (!state.open) return
    if (state.busy) {
      hurry()
      await new Promise((r) => setTimeout(r, 50))
      if (state.busy || disposed) return
    }
    state.busy = true
    state.skip = false
    const b = bundles[state.i]
    if (state.flipped) await turn(false)
    emit('leaving')
    // the readable page hands back to the leaf in the scene
    const lp = leafPose()
    leafMat.map = b.titleMat.map
    leafMat.needsUpdate = true
    leaf3d.position.copy(lp.p)
    leaf3d.quaternion.copy(lp.q)
    leaf3d.scale.copy(lp.scale)
    leaf3d.visible = true
    await tween(0.2, (k) => {
      setLeaf(1 - k)
      leafMat.opacity = k
    })
    const sp = new THREE.Vector3()
    const sq = new THREE.Quaternion()
    b.topLeaf.getWorldPosition(sp)
    b.topLeaf.getWorldQuaternion(sq)
    const ss = new THREE.Vector3(LEN * 0.9, b.w * 0.8, 1)
    await tween(0.7, (k) => {
      leaf3d.position.lerpVectors(lp.p, sp, k)
      leaf3d.quaternion.copy(lp.q).slerp(sq, k)
      leaf3d.scale.lerpVectors(lp.scale, ss, k)
      b.stackMat.opacity = k
      b.bottomMat.opacity = k
    })
    leaf3d.visible = false
    b.topLeaf.visible = true
    // wrapped up again
    await tween(0.8, (k) => setOpened(b, 1 - k), (t) => t)
    // and carried home
    const from = { p: b.root.position.clone(), q: b.root.quaternion.clone() }
    const homeW = { p: b.home.p.clone(), q: b.home.q.clone() }
    shelf.localToWorld(homeW.p)
    const near = homeW.p.clone().add(new THREE.Vector3(0, 0.03, 0.28))
    tween(0.9, (k) => (curtainMat.opacity = 0.8 * (1 - k)))
    await tween(0.8, (k) => {
      b.root.position.lerpVectors(from.p, near, k).addScaledVector(up.set(0, 1, 0), Math.sin(k * PI) * 0.08)
      b.root.quaternion.copy(from.q).slerp(homeW.q, k)
    })
    await tween(0.3, (k) => b.root.position.lerpVectors(near, homeW.p, k), easeOut)
    restoreHome(b)
    setLeaf(0)
    state.open = false
    state.busy = false
    view.frozen = false
    emit('closed', state.i, state.kbd)
    state.kbd = false
  }

  // ------------------------------------------------------------------ the room's controls
  async function turnLeaf() {
    if (!state.open || state.busy) return
    state.busy = true
    await turn(!state.flipped)
    state.busy = false
  }
  function onKey(e) {
    if (!state.open) return
    if (e.key === 'Escape') {
      e.preventDefault()
      putBack()
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      go(-1)
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      go(1)
    }
  }

  // ================================================================== the loop
  let last = performance.now()
  let raf = 0
  const tmp = new THREE.Vector3()
  function loop(now) {
    raf = requestAnimationFrame(loop)
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    stepTweens(now)
    if (!view.frozen) {
      const kk = 1 - Math.exp(-dt * (reduced ? 30 : 3.2))
      view.panX += (view.panTarget - view.panX) * kk
      view.px += (view.tx - view.px) * (1 - Math.exp(-dt * 2.4))
      view.py += (view.ty - view.py) * (1 - Math.exp(-dt * 2.4))
      const par = reduced ? 0 : 1
      camera.position.set(view.panX - 0.22 + view.px * 0.12 * par, centerY - 0.08 - view.py * 0.08 * par, D / 2 + view.dist)
      camera.lookAt(view.panX + view.px * 0.04 * par, centerY + 0.085, 0)
    }
    // the text under your hand lifts toward you and warms
    let gl = 0
    for (const b of bundles) {
      if (!b || b.root.parent !== shelf) continue
      b.lift += (b.liftTarget - b.lift) * (1 - Math.exp(-dt * (b.liftTarget ? 9 : 6)))
      if (b.lift < 1e-4 && !b.liftTarget) b.lift = 0
      b.root.position.set(b.home.p.x, b.home.p.y + 0.018 * b.lift, b.home.p.z + 0.075 * b.lift)
      b.clothMaterial.emissiveIntensity = 0.3 * b.lift
      if (b.flagMaterial) b.flagMaterial.emissiveIntensity = 0.22 * b.lift
      if (b.lift > gl) {
        gl = b.lift
        b.root.getWorldPosition(tmp)
        glow.position.set(tmp.x, tmp.y + b.hc * 0.7 + 0.05, tmp.z + LEN / 2 + 0.22)
      }
    }
    glow.intensity = GLOW * gl
    // dust drifting in the light, and the lamp's flame
    if (!reduced) {
      const a = dustGeo.attributes.position.array
      for (let i = 0; i < DUST; i++) {
        a[i * 3 + 1] += dt * (0.012 + (dustSeed[i] % 1) * 0.02)
        a[i * 3] += Math.sin(now / 2600 + dustSeed[i]) * dt * 0.01
        if (a[i * 3 + 1] > CH / 2 + 0.7) a[i * 3 + 1] = -CH / 2 - 0.5
      }
      dustGeo.attributes.position.needsUpdate = true
      lamp.intensity = LAMP * ((0.62 + Math.sin(now / 310) * 0.04 + Math.sin(now / 1270) * 0.05) / 0.7)
      // the butter lamps: each flame and each pool of light flickers on its own
      const t = now / 1000
      for (const c of candles) {
        c.l.intensity = CANDLE * (0.86 + 0.07 * Math.sin(t * 7.1 + c.phase) + 0.05 * Math.sin(t * 13.7 + c.phase * 1.7) + 0.03 * Math.sin(t * 23.3 + c.phase * 0.6))
      }
      for (const f of flames) {
        f.flame.scale.y = f.fh * (0.9 + 0.08 * Math.sin(t * 9.3 + f.phase) + 0.05 * Math.sin(t * 17.1 + f.phase * 1.3))
        f.flame.position.x = f.x + Math.sin(t * 2.1 + f.phase) * 0.0016
        f.halo.scale.setScalar(f.hs * (0.94 + 0.06 * Math.sin(t * 6.3 + f.phase)))
      }
    }
    renderer.render(scene, camera)
  }
  raf = requestAnimationFrame(loop)
  const readyTimer = setTimeout(() => emit('ready'), 250)

  canvas.addEventListener('pointerdown', onPointerDown)
  canvas.addEventListener('pointerleave', onPointerLeave)
  addEventListener('pointermove', onPointerMove)
  addEventListener('pointerup', onPointerUp)
  addEventListener('keydown', onKey)
  addEventListener('resize', frame)

  return {
    /** Open the i-th text: carried out, unwrapped, read. */
    open: (i, byKeyboard = false) => openText(i, byKeyboard),
    putBack,
    /** The next (1) or newer (-1) text, without leaving the reading room. */
    go,
    turn: turnLeaf,
    /** A click outside the leaf: hurry the motion along, or put the text back. */
    backdrop: () => (state.busy ? hurry() : putBack()),
    /** A click on the leaf itself: hurry along, or turn it. */
    leaf: () => (state.busy ? hurry() : turnLeaf()),
    /** Keyboard focus on a text: it warms, and the shelf turns to it. */
    focus: (i) => {
      if (state.open || !bundles[i]) return
      setHover(bundles[i])
      lookAt(bundles[i])
    },
    blur: () => setHover(null),
    dispose() {
      disposed = true
      cancelAnimationFrame(raf)
      clearTimeout(readyTimer)
      tweens.clear()
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointerleave', onPointerLeave)
      removeEventListener('pointermove', onPointerMove)
      removeEventListener('pointerup', onPointerUp)
      removeEventListener('keydown', onKey)
      removeEventListener('resize', frame)
      const materials = new Set()
      scene.traverse((o) => {
        o.geometry?.dispose()
        for (const m of [o.material].flat()) if (m) materials.add(m)
      })
      for (const b of bundles) for (const m of [b?.topMat, b?.bottomMat, b?.stackMat]) if (m) materials.add(m)
      for (const m of materials) m.dispose()
      for (const t of textures) t.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
    },
  }
}

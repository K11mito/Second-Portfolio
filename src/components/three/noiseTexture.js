import * as THREE from 'three'

// A tileable fBm noise texture generated once at startup (~5 ms). Sampling a
// texture is far cheaper than evaluating multi-octave noise per pixel, which
// keeps the terrain, sky and cloud shaders light enough for phones.
let cached = null

function lattice(size, cells, seed) {
  const g = new Float32Array(cells * cells)
  let s = seed
  for (let i = 0; i < g.length; i++) {
    s = (s * 16807) % 2147483647
    g[i] = s / 2147483647
  }
  const out = new Float32Array(size * size)
  for (let y = 0; y < size; y++) {
    const fy = (y / size) * cells
    const y0 = Math.floor(fy)
    const ty = fy - y0
    const sy = ty * ty * ty * (ty * (ty * 6 - 15) + 10)
    const y1 = (y0 + 1) % cells
    for (let x = 0; x < size; x++) {
      const fx = (x / size) * cells
      const x0 = Math.floor(fx)
      const tx = fx - x0
      const sx = tx * tx * tx * (tx * (tx * 6 - 15) + 10)
      const x1 = (x0 + 1) % cells
      const a = g[y0 * cells + x0]
      const b = g[y0 * cells + x1]
      const c = g[y1 * cells + x0]
      const d = g[y1 * cells + x1]
      out[y * size + x] = (a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy
    }
  }
  return out
}

export function getNoiseTexture() {
  if (cached) return cached
  const size = 256
  const data = new Uint8Array(size * size * 4)
  // R: broad fBm, G: fine fBm, B: billow (ridged-inverted) noise, A: single octave
  const layers = [
    { base: 4, oct: 6, seed: 11 },
    { base: 16, oct: 4, seed: 23 },
    { base: 6, oct: 5, seed: 37, billow: true },
    { base: 8, oct: 1, seed: 51 },
  ]
  layers.forEach((L, ch) => {
    const acc = new Float32Array(size * size)
    let amp = 1
    let total = 0
    for (let o = 0; o < L.oct; o++) {
      const n = lattice(size, L.base << o, L.seed + o * 101)
      for (let i = 0; i < acc.length; i++) acc[i] += (L.billow ? Math.abs(n[i] * 2 - 1) : n[i]) * amp
      total += amp
      amp *= 0.5
    }
    let mn = Infinity
    let mx = -Infinity
    for (let i = 0; i < acc.length; i++) {
      acc[i] /= total
      mn = Math.min(mn, acc[i])
      mx = Math.max(mx, acc[i])
    }
    for (let i = 0; i < acc.length; i++) data[i * 4 + ch] = Math.round(((acc[i] - mn) / (mx - mn)) * 255)
  })
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.magFilter = THREE.LinearFilter
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.generateMipmaps = true
  tex.colorSpace = THREE.NoColorSpace
  tex.needsUpdate = true
  cached = tex
  return tex
}

// Bakes public/textures/prayer-flags.webp: the five lung-ta (blue, white, red,
// green, yellow), each fresh and weathered, woodblock-printed with the wind
// horse carrying the flaming jewel, the six syllables, rows of dharani and the
// four dignities in the corners. Ported from the "Wind Horse Flags" study.
//
// Needs Playwright and the Noto Serif Tibetan font files:
//   npm pack @fontsource/noto-serif-tibetan && tar -xzf fontsource-noto-serif-tibetan-*.tgz
//   node assets/source/flags/bake-flags.js package/files [out.webp] [preview.png]
//
// Layout (read by src/components/three/PrayerFlags.jsx): 1360 x 622, element
// columns 272 px wide, fresh row above weathered (311 px each), every 256 x 295
// cell padded by 8 px of edge-extended gutter so mipmaps never bleed.
const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')

;(async () => {
  const [, , fontDir, out = path.join(__dirname, '..', '..', '..', 'public', 'textures', 'prayer-flags.webp'), preview] =
    process.argv
  if (!fontDir) throw new Error('usage: node bake-flags.js <noto-serif-tibetan files dir> [out.webp] [preview.png]')
  const font = (w) => fs.readFileSync(path.join(fontDir, `noto-serif-tibetan-tibetan-${w}-normal.woff2`)).toString('base64')
  const fonts = { nst400: font(400), nst600: font(600), nst800: font(800) }
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1400, height: 1300 } })
  await page.setContent('<html><body style="margin:0;background:#666"></body></html>')
  await page.addScriptTag({ content: fs.readFileSync(path.join(__dirname, 'horse.js'), 'utf8') })
  const data = await page.evaluate(async (fonts) => {
    const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0)).buffer
    for (const [k, w] of [
      ['nst400', '400'],
      ['nst600', '600'],
      ['nst800', '800'],
    ]) {
      const f = new FontFace('Tib', b64(fonts[k]), { weight: w })
      await f.load()
      document.fonts.add(f)
    }
    await document.fonts.ready

    const ELEMENTS = [
      { hex: '#1D63AE', ink: '#0A2647' }, // sky
      { hex: '#EDE8DB', ink: '#3B3428' }, // air
      { hex: '#BE3A2B', ink: '#3A0E08' }, // fire
      { hex: '#2F8B50', ink: '#08301A' }, // water
      { hex: '#E5B32C', ink: '#4A3205' }, // earth
    ]
    const MANI = 'ཨོཾ་མ་ཎི་པདྨེ་ཧཱུྃ།'
    const GURU = 'ཨོཾ་ཨཱཿཧཱུྃ་བཛྲ་གུ་རུ་པདྨ་སིདྡྷི་ཧཱུྃ།'
    const TARA = 'ཨོཾ་ཏཱ་རེ་ཏུཏྟཱ་རེ་ཏུ་རེ་སྭཱ་ཧཱ།'
    const LHA = 'ལྷ་རྒྱལ་ལོ། '

    const TW = 512
    const TH = 590

    function c2d(w, h) {
      const c = document.createElement('canvas')
      c.width = w
      c.height = h
      return [c, c.getContext('2d')]
    }
    const seeded = (s) => () => (s = (s * 16807) % 2147483647) / 2147483647

    function vnoise(x, seedA) {
      const i = Math.floor(x)
      const f = x - i
      const h = (n) => {
        const s = Math.sin(n * 127.1 + seedA * 311.7) * 43758.5453
        return s - Math.floor(s)
      }
      const u = f * f * (3 - 2 * f)
      return h(i) * (1 - u) + h(i + 1) * u
    }
    function ridgeAt(x, seedA, oct) {
      let v = 0
      let amp = 1
      let fr = 1
      let norm = 0
      for (let o = 0; o < oct; o++) {
        v += vnoise(x * fr, seedA + o * 13) * amp
        norm += amp
        amp *= 0.5
        fr *= 2.07
      }
      return v / norm
    }

    // Woodblock lungta: blocky, high-contrast, carved rather than drawn.
    function drawHorse(g, x, y, s, ink) {
      g.save()
      g.translate(x, y)
      g.scale(s, s)
      g.fillStyle = ink
      const blob = (pts) => {
        g.beginPath()
        g.moveTo(pts[0][0], pts[0][1])
        for (let i = 1; i < pts.length; i++) {
          const p = pts[i]
          if (p.length === 6) g.bezierCurveTo(p[0], p[1], p[2], p[3], p[4], p[5])
          else g.lineTo(p[0], p[1])
        }
        g.closePath()
        g.fill()
      }
      // hind legs, extended back
      blob([[-20, 2], [-30, 10, -38, 19, -44, 30], [-39, 31], [-31, 20, -23, 12, -14, 6]])
      blob([[-14, 4], [-24, 14, -31, 24, -34, 35], [-29, 36], [-23, 25, -15, 15, -8, 8]])
      // fore legs, reaching
      blob([[19, 2], [29, 9, 37, 17, 42, 27], [37, 29], [30, 19, 23, 11, 14, 5]])
      blob([[13, 4], [23, 13, 30, 23, 33, 33], [28, 34], [22, 24, 15, 15, 8, 8]])
      // barrel
      blob([[-22, -2], [-16, -13, 14, -14, 22, -3], [24, 6], [14, 15, -14, 15, -23, 6]])
      // neck
      blob([[16, -7], [24, -15, 30, -24, 32, -33], [41, -31], [36, -20, 29, -9, 23, -1]])
      // head + muzzle
      blob([[31, -34], [35, -40, 44, -43, 49, -39], [53, -32], [52, -27, 44, -25, 38, -28], [33, -31]])
      blob([[47, -40], [52, -42, 56, -40, 57, -36], [52, -34], [48, -36, 46, -38, 46, -39]])
      // ear
      blob([[36, -39], [36, -46, 38, -49, 40, -49], [41, -41], [40, -39, 38, -38, 37, -38]])
      // mane, jagged
      g.beginPath()
      g.moveTo(20, -8)
      ;[[24, -16], [19, -18], [27, -24], [22, -26], [31, -32], [26, -34], [35, -39], [38, -34], [31, -30], [34, -24], [27, -20], [29, -13], [24, -6]].forEach((p) => g.lineTo(p[0], p[1]))
      g.closePath()
      g.fill()
      // tail, flame-swept
      g.beginPath()
      g.moveTo(-22, -2)
      ;[[-33, -9], [-28, -4], [-41, -7], [-34, -1], [-45, 2], [-36, 4], [-43, 11], [-33, 8], [-36, 16], [-27, 8], [-24, 6]].forEach((p) => g.lineTo(p[0], p[1]))
      g.closePath()
      g.fill()
      // the jewel it carries: three flames on a saddle
      g.save()
      g.translate(0, -14)
      for (const dx of [-8, 0, 8]) {
        g.beginPath()
        g.moveTo(dx, 0)
        g.bezierCurveTo(dx - 5, -5, dx - 4, -12, dx, -17)
        g.bezierCurveTo(dx + 4, -12, dx + 5, -5, dx, 0)
        g.closePath()
        g.fill()
      }
      g.fillRect(-11, 0, 22, 3)
      g.restore()

      // Carved highlights: a woodblock cutter leaves lines of bare cloth inside
      // the black — the saddle cloth, the eye, the line of the belly.
      g.globalCompositeOperation = 'destination-out'
      g.strokeStyle = '#000'
      g.fillStyle = '#000'
      g.lineCap = 'round'
      g.lineWidth = 1.5
      g.beginPath() // saddle cloth
      g.moveTo(-10, -9.5)
      g.quadraticCurveTo(-11, 1, -4, 4.5)
      g.lineTo(6, 4.5)
      g.quadraticCurveTo(12, 1, 11, -9.5)
      g.stroke()
      g.lineWidth = 1.1
      g.beginPath() // girth strap
      g.moveTo(1, 4.5)
      g.lineTo(2, 11)
      g.stroke()
      g.beginPath() // belly line
      g.moveTo(-17, 6)
      g.quadraticCurveTo(-2, 11.5, 16, 4)
      g.stroke()
      g.beginPath() // eye
      g.arc(42.5, -35.5, 1.4, 0, 7)
      g.fill()
      g.beginPath() // bridle
      g.moveTo(39, -30)
      g.lineTo(45, -39)
      g.stroke()
      g.globalCompositeOperation = 'source-over'
      g.restore()
    }

    // a row of block-printed text, repeated to fill its width and clipped
    function textRow(g, rnd, str, y, x0, x1, size, weight, alpha) {
      g.save()
      g.beginPath()
      g.rect(x0, y - size * 1.4, x1 - x0, size * 2.2)
      g.clip()
      g.font = `${weight} ${size}px Tib`
      g.globalAlpha = alpha
      g.textAlign = 'left'
      const w = g.measureText(str).width
      // centre the run, starting part-way through a repeat like a real block
      let x = (x0 + x1) / 2 - w * (0.5 + Math.floor(((x1 - x0) / w) / 2 + 1))
      x += rnd() * 6
      while (x < x1) {
        g.fillText(str, x, y)
        x += w
      }
      g.restore()
    }

    function makeFlag(idx, weathered, seed) {
      const rnd = seeded(seed)
      const E = ELEMENTS[idx]
      const [c, g] = c2d(TW, TH)

      /* cloth ground */
      g.fillStyle = E.hex
      g.fillRect(0, 0, TW, TH)

      // sun bleach: the top hem, nearest the sky, always goes first
      let gr = g.createLinearGradient(0, 0, 0, TH)
      gr.addColorStop(0, `rgba(255,255,255,${weathered ? 0.46 : 0.3})`)
      gr.addColorStop(0.42, `rgba(255,255,255,${weathered ? 0.2 : 0.07})`)
      gr.addColorStop(1, `rgba(0,0,0,${weathered ? 0.02 : 0.1})`)
      g.fillStyle = gr
      g.fillRect(0, 0, TW, TH)
      if (weathered) {
        // months of sun wash the dye out unevenly, streaked along the warp
        for (let i = 0; i < 26; i++) {
          const x = rnd() * TW
          const w = 10 + rnd() * 60
          const a = 0.03 + rnd() * 0.07
          const sg = g.createLinearGradient(x - w, 0, x + w, 0)
          sg.addColorStop(0, 'rgba(255,255,255,0)')
          sg.addColorStop(0.5, `rgba(255,255,255,${a})`)
          sg.addColorStop(1, 'rgba(255,255,255,0)')
          g.fillStyle = sg
          g.fillRect(x - w, 0, w * 2, TH)
        }
      }

      // wear patches
      for (let i = 0; i < (weathered ? 34 : 22); i++) {
        const x = rnd() * TW
        const y = rnd() * TH
        const r = 26 + rnd() * 94
        const rg = g.createRadialGradient(x, y, 0, x, y, r)
        const a = 0.03 + rnd() * (weathered ? 0.08 : 0.055)
        rg.addColorStop(0, `rgba(255,255,255,${a})`)
        rg.addColorStop(1, 'rgba(255,255,255,0)')
        g.fillStyle = rg
        g.beginPath()
        g.arc(x, y, r, 0, 7)
        g.fill()
      }
      // woven texture
      g.globalAlpha = 0.055
      for (let y = 0; y < TH; y += 2) {
        g.fillStyle = (y >> 1) % 2 ? '#000' : '#fff'
        g.fillRect(0, y, TW, 1)
      }
      for (let x = 0; x < TW; x += 2) {
        g.fillStyle = (x >> 1) % 2 ? '#000' : '#fff'
        g.fillRect(x, 0, 1, TH)
      }
      g.globalAlpha = 1

      // the top hem, folded over the cord and stitched
      g.fillStyle = 'rgba(0,0,0,0.10)'
      g.fillRect(0, 0, TW, 20)
      g.fillStyle = 'rgba(0,0,0,0.16)'
      g.fillRect(0, 20, TW, 2)
      g.strokeStyle = 'rgba(0,0,0,0.28)'
      g.lineWidth = 1.4
      g.setLineDash([7, 5])
      g.beginPath()
      g.moveTo(4, 14.5)
      g.lineTo(TW, 14.5)
      g.stroke()
      g.setLineDash([])

      /* the print, on its own layer so wear only breaks the ink */
      const [ic, ig] = c2d(TW, TH)
      const ink = E.ink
      ig.save()
      ig.translate(TW / 2, TH / 2 + 4)
      ig.rotate((rnd() - 0.5) * 0.02) // woodblock never lands square
      ig.translate((rnd() - 0.5) * 6, (rnd() - 0.5) * 6)
      ig.translate(-TW / 2, -TH / 2 - 4)

      // double rule border
      ig.strokeStyle = ink
      ig.globalAlpha = 0.82
      ig.lineWidth = 5
      ig.strokeRect(30, 40, TW - 60, TH - 74)
      ig.globalAlpha = 0.62
      ig.lineWidth = 1.6
      ig.strokeRect(41, 51, TW - 82, TH - 96)
      ig.globalAlpha = 1

      // corner blocks: the four dignities (garuda, dragon, tiger, snow lion)
      ig.fillStyle = ink
      ig.globalAlpha = 0.7
      for (const [cx, cy] of [
        [64, 74],
        [TW - 64, 74],
        [64, TH - 68],
        [TW - 64, TH - 68],
      ]) {
        ig.save()
        ig.translate(cx, cy)
        ig.beginPath()
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2
          const r = k % 2 ? 8 : 17
          k ? ig.lineTo(Math.cos(a) * r, Math.sin(a) * r) : ig.moveTo(Math.cos(a) * r, Math.sin(a) * r)
        }
        ig.closePath()
        ig.fill()
        ig.restore()
      }
      ig.globalAlpha = 1

      // prayers: the six syllables above, rows of dharani below
      ig.fillStyle = ink
      ig.save()
      ig.font = '800 36px Tib'
      ig.textAlign = 'center'
      ig.globalAlpha = 0.92
      ig.fillText(MANI, TW / 2 + (rnd() - 0.5) * 4, 120)
      ig.restore()
      textRow(ig, rnd, GURU, 162, 56, TW - 56, 21, 600, 0.8)
      // the wind horse, galloping with the flaming jewel on its saddle
      drawHorse2(ig, TW / 2 - 1, 292 + 12 * 2.45, 2.45, ink)
      ig.fillStyle = ink
      textRow(ig, rnd, TARA, 434, 56, TW - 56, 21, 600, 0.8)
      textRow(ig, rnd, MANI + ' ', 472, 56, TW - 56, 21, 600, 0.78)
      textRow(ig, rnd, LHA + LHA, 510, 92, TW - 92, 22, 600, 0.76)
      ig.restore()

      // broken ink: the block never transfers evenly
      ig.globalCompositeOperation = 'destination-out'
      for (let i = 0; i < (weathered ? 900 : 380); i++) {
        const x = rnd() * TW
        const y = rnd() * TH
        const r = rnd() * 3.1
        ig.globalAlpha = 0.1 + rnd() * 0.5
        ig.beginPath()
        ig.arc(x, y, r, 0, 7)
        ig.fill()
      }
      ig.globalAlpha = 1
      ig.globalCompositeOperation = 'source-over'
      // faded prints lose density but keep their hue
      g.globalAlpha = weathered ? 0.66 : 0.97
      g.drawImage(ic, 0, 0)
      g.globalAlpha = 1
      const ctx = g
      const c2 = c

      /* frayed edges: the free edge tears first, the hem lasts longest */
      ctx.globalCompositeOperation = 'destination-out'
      const biteMax = weathered ? 34 : 20
      for (let y = 24; y < TH; y += 2) {
        const bite = Math.max(0, ridgeAt(y * 0.05, seed * 0.37 + 3, 4) * biteMax - 5)
        if (bite > 0) ctx.fillRect(TW - bite, y, bite, 2)
      }
      for (let i = 0; i < (weathered ? 110 : 70); i++) {
        const y = 24 + rnd() * (TH - 24)
        const w = 4 + rnd() * (weathered ? 26 : 16)
        const h = 1 + rnd() * 3
        ctx.fillRect(TW - w, y, w, h)
      }
      // the hem bottom unravels into threads
      const hemMax = weathered ? 26 : 9
      for (let x = 0; x < TW; x += 2) {
        const bite = Math.max(0, ridgeAt(x * 0.06, seed * 0.53 + 11, 4) * hemMax - 3)
        if (bite > 0) ctx.fillRect(x, TH - bite, 2, bite)
      }
      for (let i = 0; i < (weathered ? 90 : 30); i++) {
        const x = rnd() * TW
        const h = 3 + rnd() * (weathered ? 22 : 10)
        ctx.fillRect(x, TH - h, 1 + rnd() * 2.5, h)
      }
      if (weathered) {
        // a couple of wind-worn holes
        for (let i = 0; i < 3; i++) {
          const x = TW * (0.55 + rnd() * 0.4)
          const y = TH * (0.55 + rnd() * 0.4)
          ctx.beginPath()
          ctx.ellipse(x, y, 3 + rnd() * 7, 2 + rnd() * 5, rnd() * 3, 0, 7)
          ctx.fill()
        }
      }
      ctx.globalCompositeOperation = 'source-over'
      return c2
    }

    // Atlas: element columns, fresh row above weathered row; a gutter of
    // edge-extended pixels around each cell keeps mipmaps from bleeding.
    const G = 16
    const SW = TW + G * 2
    const SH = TH + G * 2
    const [atlas, ag] = c2d(SW * 5, SH * 2)
    for (let e = 0; e < 5; e++) {
      for (let v = 0; v < 2; v++) {
        const cell = makeFlag(e, v === 1, 1000 + e * 97 + v * 31)
        const x = e * SW + G
        const y = v * SH + G
        ag.drawImage(cell, x, y)
        ag.drawImage(cell, 0, 0, 1, TH, x - G, y, G, TH)
        ag.drawImage(cell, TW - 1, 0, 1, TH, x + TW, y, G, TH)
        ag.drawImage(cell, 0, 0, TW, 1, x, y - G, TW, G)
        ag.drawImage(cell, 0, TH - 1, TW, 1, x, y + TH, TW, G)
        ag.drawImage(cell, 0, 0, 1, 1, x - G, y - G, G, G)
        ag.drawImage(cell, TW - 1, 0, 1, 1, x + TW, y - G, G, G)
        ag.drawImage(cell, 0, TH - 1, 1, 1, x - G, y + TH, G, G)
        ag.drawImage(cell, TW - 1, TH - 1, 1, 1, x + TW, y + TH, G, G)
      }
    }
    // ship at half size: the weave and broken ink average into texture
    const [half, hg] = c2d(atlas.width / 2, atlas.height / 2)
    hg.imageSmoothingEnabled = true
    hg.imageSmoothingQuality = 'high'
    hg.drawImage(atlas, 0, 0, half.width, half.height)
    return { url: half.toDataURL('image/webp', 0.8), w: half.width, h: half.height, cell: [TW / 2, TH / 2, G / 2] }
  }, fonts)
  fs.writeFileSync(out, Buffer.from(data.url.split(',')[1], 'base64'))
  console.log(path.relative(process.cwd(), out), data.w + 'x' + data.h, Math.round(fs.statSync(out).size / 1024) + ' KB')
  if (preview) {
    await page.setContent(
      `<html><body style="margin:0;background:#5b6f96"><img src="${data.url}" style="width:1400px;display:block"></body></html>`
    )
    await page.waitForTimeout(300)
    await page.screenshot({ path: preview, fullPage: true })
  }
  await browser.close()
})()

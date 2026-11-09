// A woodblock wind horse in the flying gallop, carrying the flaming jewel.
// Shared by the atlas bake (stringified into the page) and the preview.
// Canvas units: x right, y down; origin at the middle of the barrel.
function drawHorse2(g, x, y, s, ink) {
  g.save()
  g.translate(x, y)
  g.scale(s, s)
  g.fillStyle = ink
  g.strokeStyle = ink
  g.lineJoin = 'round'
  g.lineCap = 'round'

  const path = (pts) => {
    g.beginPath()
    g.moveTo(pts[0][0], pts[0][1])
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i]
      if (p.length === 6) g.bezierCurveTo(p[0], p[1], p[2], p[3], p[4], p[5])
      else if (p.length === 4) g.quadraticCurveTo(p[0], p[1], p[2], p[3])
      else g.lineTo(p[0], p[1])
    }
    g.closePath()
    g.fill()
  }
  // a tapered limb through three joints, ending in a hoof
  const leg = (a, b, c, wa, wc, hoofAng) => {
    const seg = (p, q, w0, w1) => {
      const dx = q[0] - p[0]
      const dy = q[1] - p[1]
      const l = Math.hypot(dx, dy) || 1
      const nx = -dy / l
      const ny = dx / l
      g.beginPath()
      g.moveTo(p[0] + nx * w0, p[1] + ny * w0)
      g.lineTo(q[0] + nx * w1, q[1] + ny * w1)
      g.lineTo(q[0] - nx * w1, q[1] - ny * w1)
      g.lineTo(p[0] - nx * w0, p[1] - ny * w0)
      g.closePath()
      g.fill()
      g.beginPath()
      g.arc(q[0], q[1], w1, 0, 7)
      g.fill()
    }
    const wb = (wa + wc) / 2
    seg(a, b, wa, wb)
    seg(b, c, wb, wc)
    // hoof: a small wedge
    g.save()
    g.translate(c[0], c[1])
    g.rotate(hoofAng)
    g.beginPath()
    g.moveTo(-wc * 1.1, 0)
    g.lineTo(wc * 1.3, 0)
    g.lineTo(wc * 1.6, wc * 2.4)
    g.lineTo(-wc * 1.2, wc * 2.2)
    g.closePath()
    g.fill()
    g.restore()
  }

  // far-side legs first (a touch thinner)
  leg([20, 6], [33, 17], [46, 20], 4.2, 2.1, -0.35)
  leg([-20, 5], [-31, 17], [-45, 23], 4.6, 2.1, 0.5)

  // tail: flame locks streaming back
  path([
    [-27, -9],
    [-38, -16, -44, -12, -52, -19],
    [-47, -9],
    [-58, -11],
    [-50, -3],
    [-60, 0],
    [-50, 3],
    [-57, 9],
    [-44, 6],
    [-36, 2, -31, 0, -27, 2],
  ])

  // body, neck and head in one silhouette
  path([
    [-4, -11],
    [6, -12, 14, -14, 18, -16], // back to withers
    [24, -21, 28, -30, 35, -38], // arched crest
    [36, -44], // ear
    [38, -40],
    [40, -46], // second ear
    [42, -39],
    [47, -37, 54, -31, 59, -25], // face
    [61, -22, 60, -19, 56, -18], // muzzle
    [52, -19, 47, -21, 44, -20], // jaw
    [41, -15, 39, -9, 36, -3], // throat into chest
    [35, 4, 31, 8, 26, 10], // chest
    [14, 14, 0, 14, -14, 12], // belly
    [-24, 10, -32, 4, -32, -3], // haunch
    [-31, -10, -24, -13, -16, -12], // rump
  ])

  // near-side legs, reaching
  leg([25, 3], [39, 12], [53, 13], 5.4, 2.4, -0.55)
  leg([-23, 2], [-35, 13], [-50, 17], 6, 2.4, 0.42)

  // mane: flame locks streaming back off the crest
  path([
    [17, -15],
    [19, -24],
    [12, -22],
    [22, -31],
    [15, -31],
    [27, -38],
    [21, -40],
    [33, -43],
    [36, -38],
    [29, -31, 26, -24, 23, -18],
  ])

  // saddle cloth and the flaming jewel it carries
  path([
    [-12, -11],
    [-13, -4, -9, 2, -1, 3],
    [7, 3, 11, -3, 10, -11],
  ])
  // flame aura
  path([
    [-12, -13],
    [-15, -20, -12, -28, -8, -31],
    [-9, -26],
    [-4, -35, 0, -40, 1, -48],
    [4, -40, 8, -35, 9, -26],
    [9, -32],
    [14, -27, 15, -19, 11, -13],
  ])

  // Carving: the cutter leaves lines of bare cloth inside the black.
  g.globalCompositeOperation = 'destination-out'
  g.fillStyle = '#000'
  g.strokeStyle = '#000'
  g.lineWidth = 1.3
  // three jewels inside the flames
  for (const [jx, jy, rx, ry] of [
    [-4.6, -19, 3, 4.2],
    [5.2, -19, 3, 4.2],
    [0.3, -28.5, 3.1, 4.4],
  ]) {
    g.beginPath()
    g.ellipse(jx, jy, rx, ry, 0, 0, 7)
    g.stroke()
  }
  // saddle cloth border and tassels
  g.beginPath()
  g.moveTo(-9.5, -9)
  g.quadraticCurveTo(-10, -2, -1, 0.6)
  g.quadraticCurveTo(7, 0.4, 7.6, -9)
  g.stroke()
  // eye, nostril, bridle
  g.beginPath()
  g.arc(45.5, -32.5, 1.5, 0, 7)
  g.fill()
  g.beginPath()
  g.arc(57, -22.5, 0.9, 0, 7)
  g.fill()
  g.lineWidth = 1
  g.beginPath()
  g.moveTo(41, -24)
  g.lineTo(50, -34)
  g.moveTo(44, -20.5)
  g.lineTo(55, -21.5)
  g.stroke()
  // the line of the shoulder and the haunch
  g.lineWidth = 1.1
  g.beginPath()
  g.moveTo(27, -9)
  g.quadraticCurveTo(31, -2, 27, 5)
  g.moveTo(-19, -9)
  g.quadraticCurveTo(-26, -3, -22, 5)
  g.stroke()
  // a few strands carved into mane and tail
  g.lineWidth = 0.9
  g.beginPath()
  g.moveTo(21, -20)
  g.lineTo(15, -24)
  g.moveTo(25, -28)
  g.lineTo(19, -32)
  g.moveTo(-33, -6)
  g.lineTo(-45, -10)
  g.moveTo(-34, 1)
  g.lineTo(-48, 2)
  g.stroke()
  g.globalCompositeOperation = 'source-over'
  g.restore()
}

if (typeof module !== 'undefined') module.exports = { drawHorse2 }

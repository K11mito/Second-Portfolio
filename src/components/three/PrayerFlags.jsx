'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useLoader, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { env } from './env'
import { heroView } from './Director'
import { scrollState } from '@/lib/scroll'
import { startCloth } from './flags/clothClient'
import { flagsThatFit } from './flags/cloth'

// light bounced up off the mountain onto the cloth: warm by day, dark at night
const FLAG_GROUND_DAY = new THREE.Color('#7a6152')
const FLAG_GROUND_NIGHT = new THREE.Color('#1b1d26')

// Strings of lung-ta across the opening shot. The cloth is simulated (rope and
// flags as one Verlet system, see flags/cloth.js) in a worker; the prints come
// from a baked atlas: the wind horse carrying the flaming jewel, the six
// syllables, rows of prayers and the four dignities. Blue, white, red, green,
// yellow — always in that order.

const FLAG_W = 1.05
const FLAG_H = 1.21
// World units per flag unit. Sets the parallax against the handheld drift and
// how soon the strings leave as the camera moves off the summit.
const SCALE = 3.2
const WIND = 0.4

// Atlas: element columns (blue, white, red, green, yellow), fresh row above
// weathered, each cell padded so mipmaps never bleed into a neighbour.
const ATLAS = { w: 1360, h: 622, slotW: 272, slotH: 311, pad: 8, cellW: 256, cellH: 295 }

// Strings are composed on screen: each end is an [x, y] in normalized device
// coordinates (-1..1, y up) at a depth in flag units, just outside the frame
// so the knots never show. Spacing follows from the rope, as on a real line.
// Like two strings tied off at the same cairn just out of frame, they fan
// apart across the sky: the near one under the nav, the far one falling toward
// the open sky over the summit.
const LAYOUTS = {
  landscape: [
    // the near string, close enough to read the prints
    { a: [-1.18, 0.74, 17], b: [1.18, 0.78, 22], sag: 0.55, gw: 9, gh: 10, gap: 1, weathered: 0.25 },
    // the far string: small, many, and older
    { a: [-1.15, 0.54, 50], b: [1.15, 0.3, 58], sag: 0.8, gw: 5, gh: 6, gap: 0, weathered: 0.6 },
  ],
  portrait: [
    { a: [-1.25, 0.62, 13], b: [1.25, 0.7, 16], sag: 0.45, gw: 8, gh: 9, gap: 1, weathered: 0.25 },
    { a: [-1.2, 0.4, 44], b: [1.2, 0.48, 50], sag: 1, gw: 5, gh: 6, gap: 0, weathered: 0.6 },
  ],
}

const kindFor = (aspect) => (aspect < 0.9 ? 'portrait' : 'landscape')

function seeded(seed) {
  let s = seed
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}

// Flag space: origin at the hero camera, x to the right of the shot, y up, z
// back toward the viewer (horizontal), scaled by SCALE into the world.
function buildLayout(aspect) {
  const view = heroView(aspect)
  const f = view.look.clone().sub(view.cam).normalize()
  const fh = new THREE.Vector3(f.x, 0, f.z).normalize()
  const right = new THREE.Vector3(-fh.z, 0, fh.x)
  const matrix = new THREE.Matrix4()
    .makeBasis(right, new THREE.Vector3(0, 1, 0), fh.clone().negate())
    .scale(new THREE.Vector3(SCALE, SCALE, SCALE))
    .setPosition(view.cam)
  const pitch = Math.asin(f.y)
  const cp = Math.cos(pitch)
  const sp = Math.sin(pitch)
  const tanV = Math.tan(THREE.MathUtils.degToRad(view.fov / 2))
  const tanH = tanV * aspect
  const toFlag = ([sx, sy, d]) => {
    const cx = sx * tanH * d
    const cy = sy * tanV * d
    return [cx, cy * cp + d * sp, cy * sp - d * cp]
  }
  const kind = kindFor(aspect)
  const specs = LAYOUTS[kind]
  const lines = specs.map((S) => {
    const line = { a: toFlag(S.a), b: toFlag(S.b), sag: S.sag, gw: S.gw, gh: S.gh, gap: S.gap, fw: FLAG_W, fh: FLAG_H }
    line.count = flagsThatFit(line)
    return line
  })
  return { kind, aspect, matrix, lines, specs }
}

const clothVertex = /* glsl */ `
  attribute vec2 aCloth; // x: per-flag tint, y: 0 at the rope .. 1 at the hem
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vW;
  varying vec2 vCloth;
  void main() {
    vUv = uv;
    vCloth = aCloth;
    vN = normalize(mat3(modelMatrix) * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vW = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`

// Diffuse + hemisphere ambient + the transmission term that makes sun through
// cotton read as cotton and not as plastic (from the study, retuned for the
// site's light). Ambient is kept apart from the haze: routing it through the
// haze colour turns five distinct flags into five shades of mud.
const clothFragment = /* glsl */ `
  uniform sampler2D map;
  uniform vec3 uSun;
  uniform vec3 uSunCol;
  uniform vec3 uSky;
  uniform vec3 uGround;
  uniform vec3 uFogCol;
  uniform float uAmb;
  uniform float uSunI;
  uniform float uFogNear;
  uniform float uFogFar;
  uniform float uFogMax;
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vW;
  varying vec2 vCloth;
  void main() {
    vec4 tex = texture2D(map, vUv);
    if (tex.a < 0.5) discard;

    vec3 N = normalize(vN);
    if (!gl_FrontFacing) N = -N;
    vec3 V = normalize(cameraPosition - vW);
    vec3 L = normalize(uSun);
    float ndl = dot(N, L);
    float diff = max(ndl, 0.0);

    // hemisphere fill: sky above, warm rock bounce below
    float hemi = 0.5 + 0.5 * N.y;
    vec3 amb = mix(uGround, uSky, hemi) * uAmb * 0.92;
    // key light, tinted toward the sun but held back so each flag keeps its own hue
    vec3 key = mix(vec3(1.0), uSunCol, 0.45) * diff * 1.12 * uSunI;

    // transmission: light entering the far face, through the weave (Beer-Lambert:
    // a grazing view crosses more fibre), scattered broadly but still forward
    float backLit = max(-ndl, 0.0);
    float ndv = max(abs(dot(N, V)), 0.18);
    float survive = exp(-0.55 / ndv);
    float forward = pow(max(dot(V, -L), 0.0), 2.5);
    float trans = backLit * survive * (0.18 + 0.82 * forward) * uSunI;

    // cotton sheen at grazing angles
    vec3 H = normalize(L + V);
    float sheen = pow(max(dot(N, H), 0.0), 24.0) * 0.09 * diff;

    vec3 base = tex.rgb * vCloth.x;
    vec3 col = base * (amb + key);
    // transmitted light crosses the full thickness of the dye: more saturated
    vec3 dyed = base * mix(vec3(1.0), base, 0.3);
    col += dyed * mix(vec3(1.0), uSunCol, 0.55) * trans * 1.7;
    col += uSunCol * sheen * uSunI;
    // the cloth gathers and self-shadows where it is sewn over the rope
    col *= 0.93 + 0.07 * smoothstep(0.0, 0.3, vCloth.y);

    // aerial perspective across the pass
    float fog = smoothstep(uFogNear, uFogFar, length(cameraPosition - vW)) * uFogMax;
    col = mix(col, uFogCol, fog);

    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

const ropeVertex = /* glsl */ `
  varying vec3 vW;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vW = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`

const ropeFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uSky;
  uniform vec3 uSunCol;
  uniform vec3 uFogCol;
  uniform float uAmb;
  uniform float uSunI;
  uniform float uFogNear;
  uniform float uFogFar;
  uniform float uFogMax;
  varying vec3 vW;
  void main() {
    vec3 col = uColor * (uSky * uAmb * 0.8 + mix(vec3(1.0), uSunCol, 0.45) * 0.55 * uSunI);
    float fog = smoothstep(uFogNear, uFogFar, length(cameraPosition - vW)) * uFogMax;
    col = mix(col, uFogCol, fog);
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

// Everything one built layout needs: the client driving its cloth, its meshes,
// and the transform into the world.
function makeRig(client, layout, flagMat, ropeMat) {
  const { meta } = client
  const nV = meta.nVerts
  const rnd = seeded(20240719)

  const geo = new THREE.BufferGeometry()
  const pos = new THREE.BufferAttribute(new Float32Array(nV * 3), 3).setUsage(THREE.DynamicDrawUsage)
  const nor = new THREE.BufferAttribute(new Float32Array(nV * 3), 3).setUsage(THREE.DynamicDrawUsage)
  const uv = new Float32Array(nV * 2)
  const cloth = new Float32Array(nV * 2)
  for (const fl of meta.flags) {
    const spec = layout.specs[fl.line]
    const element = fl.i % 5
    const row = rnd() < spec.weathered ? 1 : 0
    const tint = 0.9 + rnd() * 0.14
    const x0 = element * ATLAS.slotW + ATLAS.pad
    const y0 = row * ATLAS.slotH + ATLAS.pad
    for (let r = 0; r < fl.gh; r++) {
      for (let c = 0; c < fl.gw; c++) {
        const v = fl.v0 + r * fl.gw + c
        uv[v * 2] = (x0 + (c / (fl.gw - 1)) * ATLAS.cellW) / ATLAS.w
        uv[v * 2 + 1] = 1 - (y0 + (r / (fl.gh - 1)) * ATLAS.cellH) / ATLAS.h
        cloth[v * 2] = tint
        cloth[v * 2 + 1] = r / (fl.gh - 1)
      }
    }
  }
  geo.setAttribute('position', pos)
  geo.setAttribute('normal', nor)
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  geo.setAttribute('aCloth', new THREE.BufferAttribute(cloth, 2))
  geo.setIndex(new THREE.BufferAttribute(meta.index, 1))
  const flagMesh = new THREE.Mesh(geo, flagMat)
  flagMesh.frustumCulled = false

  // the cord: a camera-facing ribbon rebuilt each frame
  let nR = 0
  for (const r of meta.ropes) nR += r.length
  const rgeo = new THREE.BufferGeometry()
  const rpos = new THREE.BufferAttribute(new Float32Array(nR * 6), 3).setUsage(THREE.DynamicDrawUsage)
  const ridx = []
  let base = 0
  for (const r of meta.ropes) {
    for (let i = 0; i < r.length - 1; i++) {
      const a = base + i * 2
      ridx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
    }
    base += r.length * 2
  }
  rgeo.setIndex(ridx)
  rgeo.setAttribute('position', rpos)
  const ropeMesh = new THREE.Mesh(rgeo, ropeMat)
  ropeMesh.frustumCulled = false

  const root = new THREE.Group()
  layout.matrix.decompose(root.position, root.quaternion, root.scale)
  root.add(flagMesh, ropeMesh)

  // the main line's vertical plane: where the cursor stirs the air
  const [A, B] = [layout.lines[0].a, layout.lines[0].b]
  const along = new THREE.Vector3(B[0] - A[0], 0, B[2] - A[2]).normalize()
  const stirPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(
    new THREE.Vector3(-along.z, 0, along.x),
    new THREE.Vector3(...A)
  )

  return {
    client,
    layout,
    root,
    pos,
    nor,
    rpos,
    geo,
    rgeo,
    seen: -1,
    inv: layout.matrix.clone().invert(),
    stirPlane,
    lastHit: null,
    nextGust: 0,
    dispose() {
      root.removeFromParent()
      geo.dispose()
      rgeo.dispose()
      client.dispose()
    },
  }
}

export default function PrayerFlags() {
  const atlas = useLoader(THREE.TextureLoader, '/textures/prayer-flags.webp')
  const { size, camera, gl } = useThree()
  const holder = useMemo(() => new THREE.Group(), [])
  const rig = useRef(null)
  const building = useRef(false)
  const pointer = useRef({ x: 0, y: 0, moved: false, at: 0 })
  const tmp = useMemo(
    () => ({
      cam: new THREE.Vector3(),
      ray: new THREE.Ray(),
      hit: new THREE.Vector3(),
      a: new THREE.Vector3(),
      t: new THREE.Vector3(),
      v: new THREE.Vector3(),
      s: new THREE.Vector3(),
    }),
    []
  )

  const { flagMat, ropeMat } = useMemo(() => {
    atlas.colorSpace = THREE.SRGBColorSpace
    atlas.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy())
    const shared = {
      uSun: { value: new THREE.Vector3(0, 1, 0) },
      uSunCol: { value: new THREE.Color() },
      uSky: { value: new THREE.Color() },
      uGround: { value: new THREE.Color('#7a6152') },
      uFogCol: { value: new THREE.Color() },
      uAmb: { value: 0.86 },
      uSunI: { value: 1 },
      // a breath of air between the strings, no more: the mountain itself is crisp
      uFogNear: { value: 30 * SCALE },
      uFogFar: { value: 90 * SCALE },
      uFogMax: { value: 0.32 },
    }
    const flagMat = new THREE.ShaderMaterial({
      uniforms: { map: { value: atlas }, ...shared },
      vertexShader: clothVertex,
      fragmentShader: clothFragment,
      side: THREE.DoubleSide,
    })
    const ropeMat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color('#3a3026') }, ...shared },
      vertexShader: ropeVertex,
      fragmentShader: ropeFragment,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    })
    return { flagMat, ropeMat }
  }, [atlas, gl])

  // (Re)build the strings for this screen. A rebuild happens in the background
  // and swaps in when ready, so resizing never blanks the flags.
  const aspect = size.width / Math.max(1, size.height)
  useEffect(() => {
    const current = rig.current?.layout
    // a narrower window still hides the knots; only rebuild when they would show
    if (current && current.kind === kindFor(aspect) && aspect <= current.aspect * 1.08) return
    if (building.current) return
    let cancelled = false
    const id = setTimeout(
      () => {
        building.current = true
        const layout = buildLayout(aspect)
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        const coarse = window.matchMedia('(max-width: 767px), (pointer: coarse)').matches
        startCloth({
          lines: layout.lines,
          seed: 11,
          substeps: coarse ? 1 : 2,
          iters: 4,
          wind: WIND,
          // reduced motion: let the wind lift them once, then hold still
          settle: reduced ? 420 : 150,
        })
          .then((client) => {
            building.current = false
            if (cancelled) return client.dispose()
            rig.current?.dispose()
            const next = makeRig(client, layout, flagMat, ropeMat)
            holder.add(next.root)
            rig.current = next
            env.flagsReady = true
            if (window.location.search.includes('debug')) window.__flags = next
          })
          .catch(() => {
            building.current = false
            env.flagsReady = true // never hold the curtain for decoration
          })
      },
      rig.current ? 400 : 0
    )
    return () => {
      cancelled = true
      clearTimeout(id)
    }
  }, [aspect, flagMat, ropeMat, holder])

  useEffect(
    () => () => {
      rig.current?.dispose()
      rig.current = null
    },
    []
  )

  // the cursor stirs the air near the near string
  useEffect(() => {
    const onMove = (e) => {
      const p = pointer.current
      p.x = (e.clientX / window.innerWidth) * 2 - 1
      p.y = -(e.clientY / window.innerHeight) * 2 + 1
      // a pause starts a new stroke: no velocity carried across the gap
      if (e.timeStamp - p.at > 250 && rig.current) rig.current.lastHit = null
      p.at = e.timeStamp
      p.moved = true
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  useFrame((_, delta) => {
    const R = rig.current
    // only worth drawing (or simulating) near the summit
    const visible = env.act === 'mountain' && env.t < 1.4
    holder.visible = visible && !!R
    if (!R || !visible) return
    const { client } = R
    const dt = Math.min(delta, 1 / 20)

    // newest pose from the cloth
    if (client.version !== R.seen) {
      R.seen = client.version
      const n3 = client.meta.nVerts * 3
      R.pos.array.set(client.frame.subarray(0, n3))
      R.nor.array.set(client.frame.subarray(n3, n3 * 2))
      R.pos.needsUpdate = true
      R.nor.needsUpdate = true
    }

    // the cord faces the camera; never thinner than about a pixel
    const camF = tmp.cam.copy(camera.position).applyMatrix4(R.inv)
    const pxPerUnit = size.height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)))
    const fr = client.frame
    const out = R.rpos.array
    let o = 0
    const base = client.meta.nVerts * 6
    for (const r of client.meta.ropes) {
      for (let i = 0; i < r.length; i++) {
        const k = base + (r.offset + i) * 3
        const kp = base + (r.offset + Math.max(0, i - 1)) * 3
        const kn = base + (r.offset + Math.min(r.length - 1, i + 1)) * 3
        tmp.a.set(fr[k], fr[k + 1], fr[k + 2])
        tmp.t.set(fr[kn] - fr[kp], fr[kn + 1] - fr[kp + 1], fr[kn + 2] - fr[kp + 2])
        tmp.v.subVectors(camF, tmp.a)
        const dist = tmp.v.length()
        const half = Math.max(0.011, (0.62 * dist) / pxPerUnit)
        tmp.s.crossVectors(tmp.t, tmp.v).normalize().multiplyScalar(half)
        out[o++] = tmp.a.x + tmp.s.x
        out[o++] = tmp.a.y + tmp.s.y
        out[o++] = tmp.a.z + tmp.s.z
        out[o++] = tmp.a.x - tmp.s.x
        out[o++] = tmp.a.y - tmp.s.y
        out[o++] = tmp.a.z - tmp.s.z
      }
    }
    R.rpos.needsUpdate = true

    // light, from the Director's sky
    const u = flagMat.uniforms
    u.uSun.value.copy(env.sunDir)
    u.uSunCol.value.copy(env.sunColor)
    u.uSunI.value = env.sunIntensity / 3.2
    u.uSky.value.copy(env.ambient)
    u.uGround.value.lerpColors(FLAG_GROUND_NIGHT, FLAG_GROUND_DAY, env.daylight)
    // after dark the cloth would go black; thin cotton keeps a little of the sky's glow
    u.uAmb.value = (env.ambientIntensity / 0.62) * 0.86 + (1 - env.daylight) * 0.42
    u.uFogCol.value.copy(env.fogColor)

    if (scrollState.reducedMotion) return

    // the wind: a steady breeze, the odd gust, and scrolling is moving through air
    if (env.time > R.nextGust) {
      client.gust += R.nextGust ? 18 + Math.random() * 30 : 0
      R.nextGust = env.time + 5 + Math.random() * 9
    }
    const v = Math.abs(scrollState.velocity)
    if (v > 1) client.gust += Math.min(30, v * 0.5) * dt * 2.2

    const p = pointer.current
    if (p.moved) {
      p.moved = false
      tmp.v.set(p.x, p.y, 0.5).unproject(camera).applyMatrix4(R.inv).sub(camF).normalize()
      tmp.ray.set(camF, tmp.v)
      if (tmp.ray.intersectPlane(R.stirPlane, tmp.hit)) {
        if (R.lastHit) {
          // the air moves with the cursor, but never faster than a brisk sweep
          const move = tmp.t.subVectors(tmp.hit, R.lastHit)
          if (move.length() > 0.5) move.setLength(0.5)
          const { x: vx, y: vy, z: vz } = move
          tmp.s.subVectors(camF, tmp.hit).normalize()
          client.stir = {
            x: tmp.hit.x,
            y: tmp.hit.y,
            z: tmp.hit.z,
            vx,
            vy,
            vz,
            px: tmp.s.x,
            py: tmp.s.y,
            pz: tmp.s.z,
            power: Math.min(1, Math.hypot(vx, vy, vz) * 2.4),
          }
        } else R.lastHit = new THREE.Vector3()
        R.lastHit.copy(tmp.hit)
      }
    }

    // Quality governor. In a worker the cloth only has to keep up with real
    // time; on the main thread it must also leave the frame room to draw.
    const strained = client.inWorker ? client.load > 0.7 : client.ms > 3.5
    if (strained && (client.substeps > 1 || client.iters > 3)) {
      if (client.substeps > 1) client.substeps = 1
      else client.iters = 3
      client.load = 0
      client.ms = 0
    }
    client.step(dt, WIND)
  })

  return <primitive object={holder} userData={{ act: 'mountain' }} />
}

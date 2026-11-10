'use client'

import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { env, HALL_ORIGIN } from './env'
import { terrainUniforms } from './Terrain'
import { applySky } from './skyLight'
import { dest } from './sites'
import { scrollState, timelinePosition } from '@/lib/scroll'
import { journey, timeline } from '@/lib/journey'

const V = (x, y, z) => new THREE.Vector3(x, y, z)
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)
const smooth = (a, b, x) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}
const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)

// ---------------------------------------------------------------------------
// Mountain act. Camera keyframes sit at timeline positions (section units):
// 0 hero · 1 about · 2 where to now · 3 contact (4 is the foot of the page).
// The light is not keyed to scroll: it's the real sky over Bangkok right now
// (or the visitor's pick), set by applySky() from the sun's true position.
// `pcam`/`plook` are the same shot framed for a portrait screen.
const MOUNTAIN = [
  // hero: the summit, from the south-west, with room for the type
  { t: 0, cam: V(-560, 360, 620), look: V(-190, 384, -110), fov: 36 },
  // about: swinging round to the west face
  { t: 1, cam: V(-700, 300, 260), look: V(-125, 300, -190), fov: 37 },
  // where to now: the library's monastery at the mountain's foot, half in the
  // cloud, and the temple on its rock to the east; held while you choose
  { t: 2, cam: V(110, 326, 930), look: V(-40, 226, 300), fov: 37, pcam: V(55, 365, 1330), plook: V(68, 248, 310) },
  { t: 2.34, cam: V(104, 322, 906), look: V(-40, 226, 300), fov: 37, pcam: V(54, 361, 1308), plook: V(68, 248, 310) },
  // contact: low over the cloud sea, the whole range in view and sky for the type
  { t: 3, cam: V(120, 250, 1100), look: V(-180, 320, 200), fov: 36, pcam: V(60, 262, 1300), plook: V(-20, 330, 200) },
  { t: 4, cam: V(150, 244, 1160), look: V(-170, 328, 200), fov: 36, pcam: V(80, 256, 1360), plook: V(-20, 336, 200) },
]

// Monastery act (local to HALL_ORIGIN): the prayer-wheel hall, the wheel
// centred behind the turning card ring. The camera eases in as the lamps come up.
const HALL = {
  start: { cam: V(0, 6.2, 33.5), look: V(0, 7.4, 0), fov: 34 },
  end: { cam: V(0.4, 6.8, 30), look: V(0.2, 7.4, 0), fov: 34 },
}

const hallBackground = new THREE.Color('#060405')
// Just under the summit: centring this puts the peak in the upper middle of a portrait frame.
const PEAK_AIM = new THREE.Vector3(-37, 365, 15)

// Landscape frames push the peak aside to make room for type; portrait screens
// are too narrow for that, so the aim eases back onto the summit.
const aimTowardPeak = (aspect) => 1 - smooth(0.55, 1.35, aspect)
// Portrait screens see a narrow slice of the world: widen the lens a little.
const widen = (aspect) => (aspect < 1 ? THREE.MathUtils.lerp(1.35, 1, THREE.MathUtils.clamp(aspect, 0.45, 1)) : 1)
// How far a frame is from landscape toward portrait, for the shots framed both ways
const portraitness = (aspect) => 1 - smooth(0.72, 1.25, aspect)

/** The opening shot as framed for a given aspect ratio (before handheld drift). */
export function heroView(aspect) {
  const k = MOUNTAIN[0]
  return {
    cam: k.cam.clone(),
    look: k.look.clone().lerp(PEAK_AIM, aimTowardPeak(aspect)),
    fov: k.fov * widen(aspect),
  }
}

// Where the camera comes to rest at a destination's door, facing the way in.
function approach(to, out) {
  const a = dest.anchors[to]
  if (!a) return null
  // the summit says where to stand
  if (a.view) {
    out.pos.copy(a.view)
    out.look.copy(a.look)
    out.fov = a.fov || 38
    out.dir.copy(a.facing)
    return out
  }
  const target = to === 'temple' && a.wheel ? a.wheel : a.door || a.center
  const back = to === 'temple' ? 21 : 27
  const up = to === 'temple' ? 4.5 : 9
  out.pos.copy(target).addScaledVector(a.facing, back).y += up
  out.look.copy(target).y += to === 'temple' ? 1 : 3
  out.fov = 34
  out.dir.copy(a.facing)
  return out
}

function readDebug() {
  if (typeof window === 'undefined') return null
  const q = new URLSearchParams(window.location.search)
  const nums = (k) => q.get(k)?.split(',').map(Number)
  const out = {}
  if (q.get('cam')) out.cam = V(...nums('cam'))
  if (q.get('look')) out.look = V(...nums('look'))
  if (q.get('fov')) out.fov = Number(q.get('fov'))
  if (q.get('t')) scrollState.override = Number(q.get('t'))
  if (q.has('nodamp')) scrollState.snap = true
  if (q.has('debug')) {
    // live hooks for composing shots from a headless browser
    window.__setCam = (cam, lookAt, fov) => {
      window.__cam = cam ? { cam: V(...cam), look: V(...lookAt), fov } : null
    }
    window.__setT = (t) => {
      scrollState.override = t
    }
    if (out.cam) window.__cam = out
  }
  return out.cam ? out : null
}

export default function Director() {
  const { camera, scene, size } = useThree()
  useMemo(readDebug, [])
  const smoothY = useRef(null)
  const look = useRef(new THREE.Vector3())
  const tmp = useMemo(
    () => ({ pos: new THREE.Vector3(), look: new THREE.Vector3(), v: new THREE.Vector3(), c1: new THREE.Vector3(), c2: new THREE.Vector3() }),
    []
  )
  // the flight: where it left from, and where it is going
  const flight = useMemo(
    () => ({
      version: -1,
      from: { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 36 },
      door: { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 34, dir: new THREE.Vector3() },
    }),
    []
  )

  const fog = useMemo(() => {
    const f = new THREE.FogExp2('#b4cbe6', 0.0005)
    scene.fog = f
    return f
  }, [scene])

  // Smooth camera paths through the keyframes (centripetal Catmull-Rom: no
  // overshoot loops), rebuilt when the screen turns between landscape and portrait.
  const paths = useRef({ k: -1, cam: null, look: null })
  const pathsFor = (k) => {
    const P = paths.current
    if (P.cam && Math.abs(P.k - k) < 0.02) return P
    const at = (key, a, b) => (key[b] ? key[a].clone().lerp(key[b], k) : key[a].clone())
    P.cam = new THREE.CatmullRomCurve3(MOUNTAIN.map((key) => at(key, 'cam', 'pcam')), false, 'centripetal')
    P.look = new THREE.CatmullRomCurve3(MOUNTAIN.map((key) => at(key, 'look', 'plook')), false, 'centripetal')
    P.k = k
    return P
  }

  // the camera's pose on the scroll path at timeline position t
  const scrollPose = (t, out) => {
    const P = pathsFor(portraitness(env.aspect))
    const n = MOUNTAIN.length
    let i = 0
    while (i < n - 2 && t > MOUNTAIN[i + 1].t) i++
    const a = MOUNTAIN[i]
    const b = MOUNTAIN[i + 1]
    const k = clamp01((t - a.t) / (b.t - a.t))
    const u = (i + k) / (n - 1)
    P.cam.getPoint(u, out.pos)
    P.look.getPoint(u, out.look)
    // portrait frames of the opening shots aim at the summit
    const aim = aimTowardPeak(env.aspect)
    if (aim > 0) out.look.lerp(PEAK_AIM, aim * (1 - smooth(1.15, 1.85, t)))
    out.fov = THREE.MathUtils.lerp(a.fov, b.fov, k)
    return out
  }
  const home = useMemo(() => ({ pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 36 }), [])

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 20)
    env.time += dt
    env.aspect = size.width / Math.max(1, size.height)
    // the light of the moment (cheap: only recomputed when the shown time moves)
    applySky(env, terrainUniforms)

    // ---- smoothed scroll: the camera glides even when a mouse wheel jumps 100px
    const rawY = scrollState.y
    if (smoothY.current == null || scrollState.reducedMotion || scrollState.snap) smoothY.current = rawY
    smoothY.current = THREE.MathUtils.damp(smoothY.current, rawY, 3.2, dt)
    const t = timelinePosition(smoothY.current)
    env.t = t

    // ---- the journey decides which world is drawn and who holds the camera
    const tl = timeline()
    env.act = tl.act === 'none' ? 'void' : tl.act
    env.whiteout = 0
    env.hallLight = tl.act === 'monastery' ? tl.reveal : 0

    let fov
    let drift = 1
    if (tl.act === 'monastery') {
      // the prayer-wheel hall
      const e = easeInOut(tl.reveal)
      const A = HALL.start
      const B = HALL.end
      tmp.pos.lerpVectors(A.cam, B.cam, e)
      tmp.look.lerpVectors(A.look, B.look, e)
      fov = THREE.MathUtils.lerp(A.fov, B.fov, e)
      // portrait: step back, so the wheel doesn't tower over the card ring
      const portrait = 1 - smooth(0.7, 1.15, env.aspect)
      if (portrait > 0) tmp.pos.add(tmp.v.subVectors(tmp.pos, tmp.look).multiplyScalar(portrait * 0.28))
      tmp.pos.add(HALL_ORIGIN)
      tmp.look.add(HALL_ORIGIN)
      fog.color.set('#060405')
      fog.density = 0.013
      scene.background = hallBackground
      drift = 0.06
    } else {
      scrollPose(t, home)
      tmp.pos.copy(home.pos)
      tmp.look.copy(home.look)
      fov = home.fov * widen(env.aspect)

      const door = tl.fly && journey.to ? approach(journey.to, flight.door) : null
      if (door) {
        // A flight to a destination's door, or back out again. Going in, it
        // leaves from wherever the camera was; coming out, it lands back on the
        // scroll path. Either way it arrives head-on, along the way in.
        if (!tl.fly.out && flight.version !== journey.version) {
          flight.version = journey.version
          flight.from.pos.copy(camera.position)
          flight.from.look.copy(look.current)
          flight.from.fov = camera.fov
        }
        const from = tl.fly.out ? { pos: home.pos, look: home.look, fov } : flight.from
        const p = tl.fly.p
        const e = easeInOut(p)
        const span = from.pos.distanceTo(door.pos)
        // a cubic Bézier: out along the start's heading, in along the way in
        tmp.c1.lerpVectors(from.pos, door.pos, 0.33).y += span * 0.06
        tmp.c2.copy(door.pos).addScaledVector(door.dir, span * 0.42).y += span * 0.08
        const u = 1 - e
        tmp.pos
          .copy(from.pos)
          .multiplyScalar(u * u * u)
          .addScaledVector(tmp.c1, 3 * u * u * e)
          .addScaledVector(tmp.c2, 3 * u * e * e)
          .addScaledVector(door.pos, e * e * e)
        // the eyes turn toward the door a little ahead of the body
        tmp.look.lerpVectors(from.look, door.look, easeInOut(clamp01(p * 1.3)))
        fov = THREE.MathUtils.lerp(from.fov, door.fov, e)
        drift = 1 - e
      }
      fog.color.copy(env.fogColor)
      fog.density = env.fogDensity
      scene.background = null
    }

    const debug = typeof window !== 'undefined' ? window.__cam : null
    if (debug) {
      tmp.pos.copy(debug.cam)
      tmp.look.copy(debug.look || debug.cam.clone().add(V(0, 0, -1)))
      if (debug.fov) fov = debug.fov
    }

    // A whisper of handheld drift keeps the frame alive when you stop scrolling.
    if (!scrollState.reducedMotion && !debug) {
      const s = env.time
      tmp.pos.x += Math.sin(s * 0.21) * 1.2 * drift
      tmp.pos.y += Math.sin(s * 0.17 + 1.3) * 0.8 * drift
    }

    camera.position.copy(tmp.pos)
    look.current.copy(tmp.look)
    camera.lookAt(look.current)
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov
      camera.updateProjectionMatrix()
    }
  }, -1)

  return null
}

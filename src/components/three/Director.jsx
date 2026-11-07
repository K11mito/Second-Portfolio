'use client'

import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { env, HALL_ORIGIN } from './env'
import { terrainUniforms } from './Terrain'
import { scrollState, timelinePosition, pinProgress } from '@/lib/scroll'

const V = (x, y, z) => new THREE.Vector3(x, y, z)
const C = (hex) => new THREE.Color(hex)
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

// Sun direction from elevation/azimuth in degrees.
function sun(elev, azim) {
  const e = THREE.MathUtils.degToRad(elev)
  const a = THREE.MathUtils.degToRad(azim)
  return V(Math.cos(e) * Math.sin(a), Math.sin(e), Math.cos(e) * Math.cos(a))
}

// ---------------------------------------------------------------------------
// Mountain act. Keyframes sit at timeline positions (section units):
// 0 hero · 1 about · 2 work · 3 interlude (cloud descent handled separately)
const MOUNTAIN = [
  {
    // hero — dawn alpenglow: low sun behind us paints the peak, deep blue sky ahead
    t: 0,
    cam: V(-560, 360, 620),
    look: V(-190, 384, -110),
    fov: 36,
    sun: sun(5, -72),
    sunColor: C('#ffbf96'),
    sunI: 3.2,
    zenith: C('#0a2556'),
    horizon: C('#c7a7b5'),
    glow: C('#ffd0b0'),
    fog: C('#8c9abd'),
    fogD: 0.0003,
    haze: 0.0008,
    ambient: C('#6f84b6'),
    ambientI: 0.62,
    rockDark: C('#2e2929'),
    rockLight: C('#7c6c64'),
    snow: C('#f3f1f4'),
    cloudLight: C('#ffd4bd'),
    cloudShade: C('#65749f'),
  },
  {
    // about — clear morning
    t: 1,
    cam: V(-700, 300, 260),
    look: V(-125, 300, -190),
    fov: 37,
    sun: sun(24, -128),
    sunColor: C('#fff2e0'),
    sunI: 3.3,
    zenith: C('#0a3a88'),
    horizon: C('#a9c8e8'),
    glow: C('#fff0da'),
    fog: C('#b3c8e2'),
    fogD: 0.0003,
    haze: 0.0008,
    ambient: C('#a2bde3'),
    ambientI: 0.66,
    rockDark: C('#35302d'),
    rockLight: C('#8a7a6e'),
    snow: C('#f6f7f9'),
    cloudLight: C('#ffffff'),
    cloudShade: C('#a2b3cf'),
  },
  {
    // work — warm afternoon, long light raking across the face
    t: 2,
    cam: V(-760, 285, -470),
    look: V(-40, 310, 10),
    fov: 38,
    sun: sun(13, -62),
    sunColor: C('#ffdcb0'),
    sunI: 3.3,
    zenith: C('#0b2f6e'),
    horizon: C('#cfc4bd'),
    glow: C('#ffd3a3'),
    fog: C('#bcbfcc'),
    fogD: 0.00032,
    haze: 0.0009,
    ambient: C('#8fa3cc'),
    ambientI: 0.6,
    rockDark: C('#352d2a'),
    rockLight: C('#88766a'),
    snow: C('#faf5ef'),
    cloudLight: C('#fff1e2'),
    cloudShade: C('#9ca6c0'),
  },
  {
    // interlude — sunset, skimming the cloud tops before we sink in
    t: 3,
    cam: V(-620, 232, -760),
    look: V(-120, 215, -160),
    fov: 40,
    sun: sun(1.2, -140),
    sunColor: C('#ffa27c'),
    sunI: 2.4,
    zenith: C('#0a1838'),
    horizon: C('#dc9582'),
    glow: C('#ffa07c'),
    fog: C('#a092a2'),
    fogD: 0.00042,
    haze: 0.0012,
    ambient: C('#626fa0'),
    ambientI: 0.6,
    rockDark: C('#2a2528'),
    rockLight: C('#695c5c'),
    snow: C('#ebe7ef'),
    cloudLight: C('#ffc9ad'),
    cloudShade: C('#7a7a9e'),
  },
]

// ---------------------------------------------------------------------------
// Monastery act (local to HALL_ORIGIN). Poses are keyed to section progress,
// not timeline fractions, so they stay right whatever the section heights are.
const HALL = {
  // experience: the wheel centred behind the turning card ring
  expStart: { cam: V(0, 6.6, 31.5), look: V(0, 7.3, 0), fov: 34 },
  expEnd: { cam: V(0.6, 7.2, 29.5), look: V(0.3, 7.5, 0), fov: 34 },
  // contact: the camera slides left so the wheel settles to the right of the type
  contact: { cam: V(-10.5, 8.2, 33), look: V(-6.2, 7.4, 0), fov: 36 },
  end: { cam: V(-11.5, 9.4, 37), look: V(-6.6, 8.2, 0), fov: 37 },
}

const hallBackground = new THREE.Color('#060405')
// Just under the summit: centring this puts the peak in the upper middle of a portrait frame.
const PEAK_AIM = new THREE.Vector3(-37, 365, 15)

function segment(keys, t) {
  if (t <= keys[0].t) return [keys[0], keys[0], 0]
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i]
    const b = keys[i + 1]
    if (t <= b.t) return [a, b, (t - a.t) / (b.t - a.t)]
  }
  const last = keys[keys.length - 1]
  return [last, last, 0]
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
    () => ({ pos: new THREE.Vector3(), look: new THREE.Vector3(), c: new THREE.Color(), v: new THREE.Vector3() }),
    []
  )

  const fog = useMemo(() => {
    const f = new THREE.FogExp2('#b4cbe6', 0.0005)
    scene.fog = f
    return f
  }, [scene])

  // Smooth camera paths through the keyframes (centripetal Catmull-Rom: no overshoot loops)
  const paths = useMemo(() => {
    const mk = (keys, field) => new THREE.CatmullRomCurve3(keys.map((k) => k[field].clone()), false, 'centripetal')
    return {
      mCam: mk(MOUNTAIN, 'cam'),
      mLook: mk(MOUNTAIN, 'look'),
    }
  }, [])

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 20)
    env.time += dt
    env.aspect = size.width / Math.max(1, size.height)

    // ---- smoothed scroll: the camera glides even when a mouse wheel jumps 100px
    const rawY = scrollState.y
    if (smoothY.current == null || scrollState.reducedMotion || scrollState.snap) smoothY.current = rawY
    smoothY.current = THREE.MathUtils.damp(smoothY.current, rawY, 3.2, dt)
    const sy = smoothY.current
    const t = timelinePosition(sy)
    env.t = t

    // ---- the cloud descent (interlude) decides which act we are in. The switch
    // uses the raw scroll, exactly like the white-out drawn by <Atmosphere/>, so
    // it always happens behind full white (0.44–0.6) and is never seen.
    const debugT = scrollState.override != null
    const p = debugT ? THREE.MathUtils.clamp(t - 3, 0, 1) : pinProgress('interlude')
    const ps = debugT ? p : pinProgress('interlude', sy)
    const inHall = t >= 3 && p >= 0.55
    // While the white-out/black-out fully covers the screen there is nothing to
    // see: hide every act so the GPU only clears (saves the heaviest frames).
    const covered = !debugT && p > 0.45 && p < 0.82
    env.act = covered ? 'void' : inHall ? 'monastery' : 'mountain'
    env.whiteout = t < 3 ? 0 : smooth(0.2, 0.44, p)

    let fov
    if (!inHall) {
      const tt = Math.min(t, 3)
      const [a, b, k] = segment(MOUNTAIN, tt)
      paths.mCam.getPoint(tt / 3, tmp.pos)
      paths.mLook.getPoint(tt / 3, tmp.look)
      // Landscape frames push the peak aside to make room for type; portrait
      // screens are too narrow for that, so ease the aim back onto the summit.
      const frame = smooth(0.55, 1.35, env.aspect)
      if (frame < 1) tmp.look.lerp(PEAK_AIM, (1 - frame) * (1 - smooth(2.2, 3, tt)))
      // descent into the cloud sea during the interlude
      if (t >= 3) {
        const sink = smooth(0, 0.46, ps)
        tmp.pos.y -= sink * 82
        tmp.pos.addScaledVector(tmp.v.subVectors(tmp.look, tmp.pos).setY(0).normalize(), sink * 90)
        tmp.look.y -= sink * 60
      }
      fov = THREE.MathUtils.lerp(a.fov, b.fov, k)

      env.sunDir.lerpVectors(a.sun, b.sun, k).normalize()
      env.sunColor.lerpColors(a.sunColor, b.sunColor, k)
      env.sunIntensity = THREE.MathUtils.lerp(a.sunI, b.sunI, k)
      env.skyZenith.lerpColors(a.zenith, b.zenith, k)
      env.skyHorizon.lerpColors(a.horizon, b.horizon, k)
      env.skyGlow.lerpColors(a.glow, b.glow, k)
      env.fogColor.lerpColors(a.fog, b.fog, k)
      env.fogDensity = THREE.MathUtils.lerp(a.fogD, b.fogD, k)
      env.ambient.lerpColors(a.ambient, b.ambient, k)
      env.ambientIntensity = THREE.MathUtils.lerp(a.ambientI, b.ambientI, k)
      terrainUniforms.uRockDark.value.lerpColors(a.rockDark, b.rockDark, k)
      terrainUniforms.uRockLight.value.lerpColors(a.rockLight, b.rockLight, k)
      terrainUniforms.uSnow.value.lerpColors(a.snow, b.snow, k)
      terrainUniforms.uHaze.value = THREE.MathUtils.lerp(a.haze, b.haze, k)
      env.cloudLight.lerpColors(a.cloudLight, b.cloudLight, k)
      env.cloudShade.lerpColors(a.cloudShade, b.cloudShade, k)

      fog.color.copy(env.fogColor)
      fog.density = env.fogDensity * (1 + env.whiteout * 6)
      scene.background = null
    } else {
      // e: how far the card ring has turned; c: contact arriving; f: final drift
      const e = debugT ? THREE.MathUtils.clamp(t - 4, 0, 1) : pinProgress('experience', sy)
      const exp = scrollState.sections.experience
      const con = scrollState.sections.contact
      let c = 0
      let f = 0
      if (debugT) {
        c = smooth(4.8, 5.0, t)
        f = THREE.MathUtils.clamp(t - 5, 0, 1)
      } else if (exp && con) {
        const pinEnd = exp.top + exp.height - scrollState.vh
        c = smooth(pinEnd, con.top, sy)
        f = THREE.MathUtils.clamp((sy - con.top) / Math.max(1, scrollState.max - con.top), 0, 1)
      }
      const A = HALL.expStart
      const B = HALL.expEnd
      const C = HALL.contact
      const D = HALL.end
      tmp.pos.lerpVectors(A.cam, B.cam, e).lerp(C.cam, c).lerp(D.cam, f)
      tmp.look.lerpVectors(A.look, B.look, e).lerp(C.look, c).lerp(D.look, f)
      fov = THREE.MathUtils.lerp(THREE.MathUtils.lerp(THREE.MathUtils.lerp(A.fov, B.fov, e), C.fov, c), D.fov, f)
      // Portrait: the type stacks above the scene instead of beside it, so the
      // contact shot needn't shove the wheel aside; and stepping back keeps the
      // wheel from towering over the card ring.
      const portrait = 1 - smooth(0.7, 1.15, env.aspect)
      if (portrait > 0) {
        tmp.pos.x *= 1 - portrait * 0.8
        tmp.look.x *= 1 - portrait * 0.8
        tmp.v.subVectors(tmp.pos, tmp.look).multiplyScalar(portrait * 0.28)
        tmp.pos.add(tmp.v)
        // for contact, aim higher so the wheel settles below the stacked type
        tmp.look.y += portrait * c * 4.5
      }
      tmp.pos.add(HALL_ORIGIN)
      tmp.look.add(HALL_ORIGIN)
      fog.color.set('#060405')
      fog.density = 0.013
      scene.background = hallBackground
      // the hall's lamps come up as the black lifts
      env.hallLight = t >= 4 ? 1 : smooth(0.78, 1, p)
    }

    // Portrait screens see a narrow slice of the world: widen the lens a little.
    if (env.aspect < 1) fov *= THREE.MathUtils.lerp(1.35, 1, THREE.MathUtils.clamp(env.aspect, 0.45, 1))

    const debug = typeof window !== 'undefined' ? window.__cam : null
    if (debug) {
      tmp.pos.copy(debug.cam)
      tmp.look.copy(debug.look || debug.cam.clone().add(V(0, 0, -1)))
      if (debug.fov) fov = debug.fov
    }

    // A whisper of handheld drift keeps the frame alive when you stop scrolling.
    if (!scrollState.reducedMotion && !debug) {
      const s = env.time
      const amp = inHall ? 0.06 : 1
      tmp.pos.x += Math.sin(s * 0.21) * 1.2 * amp
      tmp.pos.y += Math.sin(s * 0.17 + 1.3) * 0.8 * amp
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

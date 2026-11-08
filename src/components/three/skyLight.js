import * as THREE from 'three'
import { sky, tickSky } from '@/lib/sky'

// The light of the mountain act as a function of where the sun really is.
// Palettes are keyed to the sun's altitude (degrees); dawn and dusk have their
// own (dawn pinker and cooler, dusk warmer), sharing deep night and midday.
// At night the moon, when it's up, becomes the key light, in its real phase.

const C = (hex) => new THREE.Color(hex)
const COLOR_KEYS = ['sunColor', 'zenith', 'horizon', 'glow', 'fog', 'ambient', 'rockDark', 'rockLight', 'snow', 'cloudLight', 'cloudShade', 'veil']
const NUMBER_KEYS = ['sunI', 'fogD', 'haze', 'ambientI', 'stars']

const key = (e, o) => {
  const k = { e }
  for (const [name, v] of Object.entries(o)) k[name] = typeof v === 'string' ? C(v) : v
  return k
}

// moonless deep night: starlight and airglow, enough to read the snow
const NIGHT = {
  sunColor: '#000000', sunI: 0,
  zenith: '#01040c', horizon: '#0b1529', glow: '#0d172e',
  fog: '#081022', fogD: 0.00026, haze: 0.0005,
  ambient: '#4d67a6', ambientI: 0.46,
  rockDark: '#141419', rockLight: '#303340', snow: '#cdd7ee',
  cloudLight: '#2c3956', cloudShade: '#0d1323',
  stars: 1, veil: '#1c2336',
}
const NAUTICAL = {
  sunColor: '#000000', sunI: 0,
  zenith: '#030a1d', horizon: '#1a2546', glow: '#2e2c4c',
  fog: '#0f1630', fogD: 0.0003, haze: 0.0007,
  ambient: '#5163a0', ambientI: 0.48,
  rockDark: '#17161b', rockLight: '#383843', snow: '#d2d7ec',
  cloudLight: '#3d4869', cloudShade: '#131a30',
  stars: 0.7, veil: '#2a2f45',
}
const MIDDAY = {
  sunColor: '#fff8ee', sunI: 3.4,
  zenith: '#0a3d92', horizon: '#b2cfec', glow: '#fffaf0',
  fog: '#bad0ea', fogD: 0.00028, haze: 0.0007,
  ambient: '#a8c2e6', ambientI: 0.7,
  rockDark: '#36312e', rockLight: '#8d7d71', snow: '#f7f8fa',
  cloudLight: '#ffffff', cloudShade: '#a8b8d2',
  stars: 0, veil: '#f4f2ee',
}
const CLEAR = {
  sunColor: '#fff2e0', sunI: 3.3,
  zenith: '#0a3a88', horizon: '#a9c8e8', glow: '#fff0da',
  fog: '#b3c8e2', fogD: 0.0003, haze: 0.0008,
  ambient: '#a2bde3', ambientI: 0.66,
  rockDark: '#35302d', rockLight: '#8a7a6e', snow: '#f6f7f9',
  cloudLight: '#ffffff', cloudShade: '#a2b3cf',
  stars: 0, veil: '#f4f2ee',
}

const DUSK = [
  key(-18, NIGHT),
  key(-12, NAUTICAL),
  key(-6, {
    sunColor: '#000000', sunI: 0,
    zenith: '#071533', horizon: '#3c4471', glow: '#a26a6c',
    fog: '#2a3150', fogD: 0.00034, haze: 0.0009,
    ambient: '#5868a8', ambientI: 0.52,
    rockDark: '#1c1a20', rockLight: '#45404c', snow: '#dad9ec',
    cloudLight: '#8a7f9e', cloudShade: '#2c3150',
    stars: 0.18, veil: '#5a586e',
  }),
  key(-2.5, {
    sunColor: '#ff8c64', sunI: 0,
    zenith: '#0a1a40', horizon: '#b97a80', glow: '#ff9468',
    fog: '#5e5574', fogD: 0.0004, haze: 0.0011,
    ambient: '#5c69a0', ambientI: 0.52,
    rockDark: '#241f24', rockLight: '#5a4f55', snow: '#e4dfeb',
    cloudLight: '#dc9d8f', cloudShade: '#4a4d72',
    stars: 0, veil: '#c8aaaa',
  }),
  key(1.5, {
    sunColor: '#ffa27c', sunI: 2.4,
    zenith: '#0a1838', horizon: '#dc9582', glow: '#ffa07c',
    fog: '#a092a2', fogD: 0.00042, haze: 0.0012,
    ambient: '#626fa0', ambientI: 0.6,
    rockDark: '#2a2528', rockLight: '#695c5c', snow: '#ebe7ef',
    cloudLight: '#ffc9ad', cloudShade: '#7a7a9e',
    stars: 0, veil: '#f4e2d6',
  }),
  key(6, {
    sunColor: '#ffb98a', sunI: 3.1,
    zenith: '#0a2556', horizon: '#d4aaa8', glow: '#ffc79e',
    fog: '#9c9fbd', fogD: 0.00034, haze: 0.001,
    ambient: '#7184b4', ambientI: 0.62,
    rockDark: '#2e2929', rockLight: '#7c6c64', snow: '#f3efef',
    cloudLight: '#ffd2b8', cloudShade: '#6f7aa0',
    stars: 0, veil: '#f6ece4',
  }),
  key(13, {
    sunColor: '#ffdcb0', sunI: 3.3,
    zenith: '#0b2f6e', horizon: '#cfc4bd', glow: '#ffd3a3',
    fog: '#bcbfcc', fogD: 0.00032, haze: 0.0009,
    ambient: '#8fa3cc', ambientI: 0.6,
    rockDark: '#352d2a', rockLight: '#88766a', snow: '#faf5ef',
    cloudLight: '#fff1e2', cloudShade: '#9ca6c0',
    stars: 0, veil: '#f6f3ee',
  }),
  key(26, CLEAR),
  key(55, MIDDAY),
]

const DAWN = [
  key(-18, NIGHT),
  key(-12, NAUTICAL),
  key(-6, {
    sunColor: '#000000', sunI: 0,
    zenith: '#081633', horizon: '#4a4a78', glow: '#b0788a',
    fog: '#2c3352', fogD: 0.00034, haze: 0.0009,
    ambient: '#5a6aab', ambientI: 0.52,
    rockDark: '#1c1a21', rockLight: '#46414f', snow: '#dcdcef',
    cloudLight: '#8f86a6', cloudShade: '#2c3152',
    stars: 0.18, veil: '#5c5a74',
  }),
  key(-2.5, {
    sunColor: '#ff9c86', sunI: 0,
    zenith: '#0a1d45', horizon: '#c39aaa', glow: '#ffae96',
    fog: '#6a6488', fogD: 0.0004, haze: 0.001,
    ambient: '#5e6ca6', ambientI: 0.52,
    rockDark: '#252027', rockLight: '#5c5258', snow: '#e8e2ee',
    cloudLight: '#e0b0b0', cloudShade: '#4d5278',
    stars: 0, veil: '#d2b8be',
  }),
  key(1.5, {
    sunColor: '#ffb19a', sunI: 2.4,
    zenith: '#0a1f4a', horizon: '#d8a6b4', glow: '#ffc0a8',
    fog: '#a49ab4', fogD: 0.0004, haze: 0.0011,
    ambient: '#6676aa', ambientI: 0.6,
    rockDark: '#2a2528', rockLight: '#6e6264', snow: '#efeaf2',
    cloudLight: '#ffd0c0', cloudShade: '#7a7aa2',
    stars: 0, veil: '#f4e6e4',
  }),
  key(5, {
    sunColor: '#ffbf96', sunI: 3.2,
    zenith: '#0a2556', horizon: '#c7a7b5', glow: '#ffd0b0',
    fog: '#8c9abd', fogD: 0.0003, haze: 0.0008,
    ambient: '#6f84b6', ambientI: 0.62,
    rockDark: '#2e2929', rockLight: '#7c6c64', snow: '#f3f1f4',
    cloudLight: '#ffd4bd', cloudShade: '#65749f',
    stars: 0, veil: '#f5ece8',
  }),
  key(13, {
    sunColor: '#ffe6c8', sunI: 3.3,
    zenith: '#0a3070', horizon: '#b8c4d8', glow: '#ffe2c4',
    fog: '#aab8d0', fogD: 0.0003, haze: 0.0008,
    ambient: '#93aad6', ambientI: 0.62,
    rockDark: '#33302e', rockLight: '#857668', snow: '#f8f6f6',
    cloudLight: '#fff4ea', cloudShade: '#9eaac6',
    stars: 0, veil: '#f5f2ee',
  }),
  key(26, CLEAR),
  key(55, MIDDAY),
]

function makeState() {
  const s = {}
  for (const k of COLOR_KEYS) s[k] = new THREE.Color()
  for (const k of NUMBER_KEYS) s[k] = 0
  return s
}

function evalPalette(table, e, out) {
  let a = table[0]
  let b = table[0]
  let k = 0
  if (e >= table[table.length - 1].e) a = b = table[table.length - 1]
  else if (e > table[0].e) {
    for (let i = 0; i < table.length - 1; i++) {
      if (e <= table[i + 1].e) {
        a = table[i]
        b = table[i + 1]
        k = (e - a.e) / (b.e - a.e)
        k = k * k * (3 - 2 * k)
        break
      }
    }
  }
  for (const c of COLOR_KEYS) out[c].lerpColors(a[c], b[c], k)
  for (const n of NUMBER_KEYS) out[n] = a[n] + (b[n] - a[n]) * k
  return out
}

const RAD = Math.PI / 180
// Where north lies in the scene. The opening shot looks a little east of north,
// so the sun sits behind your shoulder at both sunrise (south-east of you) and
// sunset (south-west), and the peaks catch it, as Himalayan faces do from the south.
const COMPASS = 20
/** Compass bearing to a scene direction (north = -z rotated by COMPASS, east = +x). */
export function skyDirection(alt, az, out = new THREE.Vector3()) {
  const a = alt * RAD
  const z = (az + COMPASS) * RAD
  return out.set(Math.cos(a) * Math.sin(z), Math.sin(a), -Math.cos(a) * Math.cos(z))
}

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

const MOON_LIGHT = C('#aebfe4')
const STARLIGHT = C('#8296c8')
const tmp = { dawn: makeState(), dusk: makeState(), out: makeState(), v: new THREE.Vector3(), w: new THREE.Vector3() }

/**
 * Light the scene for the moment the sky store shows. Writes the shared env
 * and the terrain's tint uniforms. Cheap; only recomputes when time moved.
 */
let lastTime = NaN
export function applySky(env, terrainUniforms, now) {
  tickSky(now)
  if (sky.time === lastTime) return false
  lastTime = sky.time
  const { sun, moon } = sky
  const e = sun.alt
  // morning and evening palettes, blended across midday so noon never jumps
  const morning = sun.az < 180
  const toNoon = smooth(18, 40, e)
  evalPalette(DAWN, e, tmp.dawn)
  evalPalette(DUSK, e, tmp.dusk)
  const out = tmp.out
  const w = morning ? 1 - toNoon * 0.5 : toNoon * 0.5 // weight of the dawn table
  for (const c of COLOR_KEYS) out[c].lerpColors(tmp.dusk[c], tmp.dawn[c], w)
  for (const n of NUMBER_KEYS) out[n] = tmp.dusk[n] + (tmp.dawn[n] - tmp.dusk[n]) * w

  // where things really are
  skyDirection(sun.alt, sun.az, env.skySunDir)
  skyDirection(moon.alt, moon.az, env.moonDir)
  const elong = Math.acos(Math.min(1, Math.max(-1, env.skySunDir.dot(env.moonDir))))
  env.moonPhase = (1 - Math.cos(elong)) / 2 // lit fraction of the disc
  const moonUp = smooth(-1, 10, moon.alt)
  const dark = 1 - smooth(-8, -3, e) // how dark it is: moonlight only counts at night
  const moonKey = Math.pow(env.moonPhase, 0.7) * moonUp * dark * 0.85

  // the key light: the sun, or at night the moon. Its direction never grazes
  // below a few degrees, so the peaks keep their modelling at the very ends of the day.
  // On a moonless night the sky itself is the light: a faint, high, cool key,
  // the way snow still reads in a long exposure under the stars.
  const starKey = 0.34 * dark
  if (out.sunI >= moonKey + starKey) {
    skyDirection(Math.max(e, 3), sun.az, env.sunDir)
    env.sunColor.copy(out.sunColor)
    env.sunIntensity = out.sunI
  } else {
    // moon and starlight, blended by strength, so moonrise eases in
    skyDirection(Math.max(moon.alt, 8), moon.az, tmp.v).multiplyScalar(moonKey)
    skyDirection(58, 190, tmp.w).multiplyScalar(starKey)
    env.sunDir.copy(tmp.v).add(tmp.w).normalize()
    env.sunColor.copy(STARLIGHT).lerp(MOON_LIGHT, moonKey / Math.max(1e-4, moonKey + starKey))
    env.sunIntensity = moonKey + starKey
  }

  env.skyZenith.copy(out.zenith)
  env.skyHorizon.copy(out.horizon)
  env.skyGlow.copy(out.glow)
  env.fogColor.copy(out.fog)
  env.fogDensity = out.fogD
  env.ambient.copy(out.ambient)
  // moonlight lifts the night a little everywhere
  env.ambientIntensity = out.ambientI + moonKey * 0.12
  env.cloudLight.copy(out.cloudLight).lerp(MOON_LIGHT, moonKey * 0.25)
  env.cloudShade.copy(out.cloudShade)
  env.stars = out.stars * (1 - 0.55 * moonKey)
  env.moonGlow = moonUp * Math.sqrt(env.moonPhase) * (1 - 0.8 * smooth(-4, 10, e))
  env.daylight = smooth(-8, 6, e)
  terrainUniforms.uRockDark.value.copy(out.rockDark)
  terrainUniforms.uRockLight.value.copy(out.rockLight)
  terrainUniforms.uSnow.value.copy(out.snow)
  terrainUniforms.uHaze.value = out.haze

  // for the HTML layers: the colour of the inside of a cloud right now
  const v = out.veil.clone().convertLinearToSRGB()
  sky.veil = [Math.round(v.r * 255), Math.round(v.g * 255), Math.round(v.b * 255)]
  sky.daylight = env.daylight
  return true
}

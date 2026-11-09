// The sky over the summit follows the real sun and moon over Bangkok, where I
// live. A visitor can match it to their own clock, or pick a time of day.
// Framework-free: the 3D scene samples it every frame, the clock button
// subscribes for changes.

export const BANGKOK = { lat: 13.7563, lon: 100.5018, zone: 'Asia/Bangkok', utcOffset: 7 }

// ---------------------------------------------------------------- astronomy
// Low-precision positions (about a degree for the moon): plenty for lighting.
const RAD = Math.PI / 180
const DAY = 86400000
const J1970 = 2440588
const J2000 = 2451545
const OBLIQUITY = RAD * 23.4397

const daysSinceJ2000 = (ms) => ms / DAY - 0.5 + J1970 - J2000
const rightAscension = (l, b) =>
  Math.atan2(Math.sin(l) * Math.cos(OBLIQUITY) - Math.tan(b) * Math.sin(OBLIQUITY), Math.cos(l))
const declination = (l, b) =>
  Math.asin(Math.sin(b) * Math.cos(OBLIQUITY) + Math.cos(b) * Math.sin(OBLIQUITY) * Math.sin(l))

function sunCoords(d) {
  const M = RAD * (357.5291 + 0.98560028 * d) // mean anomaly
  const C = RAD * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M)) // equation of centre
  const L = M + C + RAD * 102.9372 + Math.PI // ecliptic longitude
  return { ra: rightAscension(L, 0), dec: declination(L, 0) }
}

function moonCoords(d) {
  const L = RAD * (218.316 + 13.176396 * d) // mean longitude
  const M = RAD * (134.963 + 13.064993 * d) // mean anomaly
  const F = RAD * (93.272 + 13.22935 * d) // mean distance from the node
  const l = L + RAD * 6.289 * Math.sin(M)
  const b = RAD * 5.128 * Math.sin(F)
  return { ra: rightAscension(l, b), dec: declination(l, b) }
}

/** Altitude above the horizon and compass azimuth (from north, clockwise), in degrees. */
export function skyPosition(ms, body = 'sun', { lat, lon } = BANGKOK) {
  const d = daysSinceJ2000(ms)
  const c = body === 'moon' ? moonCoords(d) : sunCoords(d)
  const phi = RAD * lat
  const H = RAD * (280.16 + 360.9856235 * d) + RAD * lon - c.ra // local hour angle
  const alt = Math.asin(Math.sin(phi) * Math.sin(c.dec) + Math.cos(phi) * Math.cos(c.dec) * Math.cos(H))
  const azSouth = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(c.dec) * Math.cos(phi))
  return { alt: alt / RAD, az: (((azSouth / RAD + 180) % 360) + 360) % 360 }
}

// ---------------------------------------------------------------- times of day
const bangkokMidnight = (ms) => {
  const local = ms + BANGKOK.utcOffset * 3600000
  return Math.floor(local / DAY) * DAY - BANGKOK.utcOffset * 3600000
}
const atBangkokHour = (ms, hours) => bangkokMidnight(ms) + hours * 3600000

// When today (in Bangkok) the sun crosses `alt` degrees, rising or setting.
function sunCrossing(ms, alt, rising) {
  const start = bangkokMidnight(ms)
  let prevT = start
  let prev = skyPosition(start).alt
  for (let i = 1; i <= 288; i++) {
    const t = start + i * 300000
    const a = skyPosition(t).alt
    if (rising ? prev < alt && a >= alt : prev > alt && a <= alt) return prevT + ((alt - prev) / (a - prev)) * (t - prevT)
    prev = a
    prevT = t
  }
  return rising ? atBangkokHour(ms, 6.5) : atBangkokHour(ms, 18)
}

export const MODES = {
  bangkok: { label: 'Bangkok', live: true },
  local: { label: 'Your time', live: true },
  dawn: { label: 'Dawn' },
  day: { label: 'Day' },
  sunset: { label: 'Sunset' },
  night: { label: 'Night' },
  // a given instant (?at=2026-11-08T18:00+07:00), for testing and the posters
  fixed: { label: 'Bangkok', hidden: true },
}

/** The moment a mode shows, as an instant in time (presets are today's, in Bangkok). */
export function momentFor(mode, now = Date.now()) {
  switch (mode) {
    case 'local': {
      // the visitor's wall-clock time of day, as if they were standing on the summit with me
      const localOffset = -new Date(now).getTimezoneOffset() / 60
      return now + (localOffset - BANGKOK.utcOffset) * 3600000
    }
    case 'dawn':
      return sunCrossing(now, 4, true) // alpenglow: the sun just up, lighting the peaks pink
    case 'day':
      return atBangkokHour(now, 9.75)
    case 'sunset':
      return sunCrossing(now, 2.5, false)
    case 'night':
      return atBangkokHour(now, 22)
    default:
      return now
  }
}

// ---------------------------------------------------------------- the store
export const sky = {
  mode: 'bangkok',
  time: Date.now(), // the instant the scene shows
  sun: { alt: 0, az: 0 },
  moon: { alt: 0, az: 0 },
  transition: null,
  // set by the scene from the current light, read by the HTML layers
  daylight: 1,
  veil: [244, 242, 238],
}

const listeners = new Set()
export function onSky(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
const emit = () => listeners.forEach((fn) => fn(sky))

let computedAt = -Infinity
function computePositions(force = false) {
  if (!force && Math.abs(sky.time - computedAt) < 20000) return
  computedAt = sky.time
  sky.sun = skyPosition(sky.time, 'sun')
  sky.moon = skyPosition(sky.time, 'moon')
}

const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)

/**
 * Switch what the sky shows. The change plays as a short time-lapse (the
 * shorter way round the clock), unless `instant`.
 */
export function setSkyMode(mode, { instant = false } = {}) {
  if (!MODES[mode]) return
  const now = Date.now()
  const target = momentFor(mode, now)
  sky.mode = mode
  if (instant) {
    sky.transition = null
    sky.time = target
  } else {
    // go round the clock the short way: a sunset 20 hours ahead is 4 hours back
    let delta = (target - sky.time) % DAY
    if (delta > DAY / 2) delta -= DAY
    if (delta < -DAY / 2) delta += DAY
    const hours = Math.abs(delta) / 3600000
    sky.transition = { from: sky.time, delta, target, start: now, duration: 1400 + Math.min(12, hours) * 160 }
  }
  // `?sky=night` (or dawn, day, sunset, local) opens on that sky; `?at=<ISO date>` on a given moment
if (typeof window !== 'undefined') {
  const q = new URLSearchParams(window.location.search)
  const at = Date.parse(q.get('at') || '')
  const mode = q.get('sky')
  if (Number.isFinite(at)) {
    sky.mode = 'fixed'
    sky.time = at
  } else if (mode && MODES[mode] && !MODES[mode].hidden) {
    sky.mode = mode
    sky.time = momentFor(mode)
  }
}
computePositions(true)
  emit()
}

/** Advance the shown time. Called once per frame by the scene. Returns true when it moved. */
export function tickSky(now = Date.now()) {
  const tr = sky.transition
  if (tr) {
    const k = Math.min(1, (now - tr.start) / tr.duration)
    sky.time = tr.from + tr.delta * easeInOut(k)
    if (k >= 1) {
      sky.transition = null
      // land exactly on the moment asked for (the short way round may differ by whole days)
      sky.time = MODES[sky.mode].live ? momentFor(sky.mode, now) : tr.target
      emit()
    }
    // `?sky=night` (or dawn, day, sunset, local) opens on that sky; `?at=<ISO date>` on a given moment
if (typeof window !== 'undefined') {
  const q = new URLSearchParams(window.location.search)
  const at = Date.parse(q.get('at') || '')
  const mode = q.get('sky')
  if (Number.isFinite(at)) {
    sky.mode = 'fixed'
    sky.time = at
  } else if (mode && MODES[mode] && !MODES[mode].hidden) {
    sky.mode = mode
    sky.time = momentFor(mode)
  }
}
computePositions(true)
    return true
  }
  if (MODES[sky.mode].live) {
    const t = momentFor(sky.mode, now)
    if (Math.abs(t - sky.time) > 15000) {
      sky.time = t
      computePositions()
      return true
    }
  }
  return false
}

/** The shown time, formatted for the clock button. */
export function clockLabel(ms = sky.time, mode = sky.mode) {
  const local = mode === 'local'
  // in "your time" the scene runs on Bangkok's sky at your wall-clock hour: show your clock
  const shown = local ? ms - (-new Date(ms).getTimezoneOffset() / 60 - BANGKOK.utcOffset) * 3600000 : ms
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    ...(local ? {} : { timeZone: BANGKOK.zone }),
  }).format(new Date(shown))
}

/** A rough name for the light, for the button's icon and label. */
export function phaseOf(alt = sky.sun.alt) {
  if (alt < -10) return 'night'
  if (alt < 0.5) return 'twilight'
  if (alt < 12) return 'golden'
  return 'day'
}

// `?sky=night` (or dawn, day, sunset, local) opens on that sky; `?at=<ISO date>` on a given moment
if (typeof window !== 'undefined') {
  const q = new URLSearchParams(window.location.search)
  const at = Date.parse(q.get('at') || '')
  const mode = q.get('sky')
  if (Number.isFinite(at)) {
    sky.mode = 'fixed'
    sky.time = at
  } else if (mode && MODES[mode] && !MODES[mode].hidden) {
    sky.mode = mode
    sky.time = momentFor(mode)
  }
}
computePositions(true)

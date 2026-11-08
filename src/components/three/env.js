import * as THREE from 'three'

// Mutable, per-frame environment written by the Director and read by every 3D
// component. Plain objects (not React state) so nothing re-renders at 60fps.
export const env = {
  t: 0, // smoothed timeline position (section units)
  act: 'mountain', // 'mountain' | 'monastery'
  time: 0,
  aspect: 1,

  sunDir: new THREE.Vector3(0.5, 0.4, -0.6).normalize(),
  sunColor: new THREE.Color('#fff4e6'),
  sunIntensity: 3,
  ambient: new THREE.Color('#9fb8d8'),
  ambientIntensity: 0.6,

  skyZenith: new THREE.Color('#1b4f9c'),
  skyHorizon: new THREE.Color('#a9cbe8'),
  skyGlow: new THREE.Color('#fff2d6'),

  fogColor: new THREE.Color('#b9d0ea'),
  fogDensity: 0.00045,
  hazeDensity: 0.0012,

  cloudLight: new THREE.Color('#ffffff'),
  cloudShade: new THREE.Color('#9fb0c8'),
  cloudOpacity: 1,

  // 0 = clear, 1 = fully inside the cloud (screen whited out)
  whiteout: 0,
  // the prayer flags' cloth has settled (they simulate off the main thread)
  flagsReady: false,
  // monastery
  wheelAngle: 0,
  wheelBoost: 0,
  hallLight: 0,
}

// World constants for the mountain act
export const TERRAIN = {
  N: 362,
  SIZE: 1000,
  MIN_H: 28.011,
  MAX_H: 306.666,
  V_SCALE: 1.55,
  // >1 sharpens summits and widens valleys: Himalayan rather than rolling.
  CURVE: 1.3,
}
TERRAIN.PEAK_Y = (TERRAIN.MAX_H - TERRAIN.MIN_H) * TERRAIN.V_SCALE

// The monastery lives far from the mountain so the two never overlap.
export const HALL_ORIGIN = new THREE.Vector3(0, -6000, 0)

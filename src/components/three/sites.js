import { PINNACLE } from './terrainData'

// Where the destinations stand. The library's monastery sits on the shoulder
// of the south spur, right at the top of the cloud sea, with the summit
// towering behind it; the prayer-wheel temple crowns the small peak of rock
// to the east. `ry` turns each one to face the "Where to now?" view; `scale`
// is how large its kit is drawn in the world.
export const SITES = {
  library: { x: -62, y: 194, z: 302, ry: 0.08, scale: 1 },
  temple: { x: PINNACLE.x, y: PINNACLE.top + 0.4, z: PINNACLE.z, ry: -0.24, scale: 1.15 },
}

export { dest } from '@/lib/destinations'

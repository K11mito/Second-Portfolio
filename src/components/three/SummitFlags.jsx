'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useLoader, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { env } from './env'
import { journey } from '@/lib/journey'
import { scrollState } from '@/lib/scroll'
import { startCloth } from './flags/clothClient'
import { flagsThatFit } from './flags/cloth'
import { FLAG_H, FLAG_W, drawRig, flagMaterials, lightFlags, makeRig } from './PrayerFlags'

// metres per flag unit: the flags at the summit are about a hand and a half across
const S = 0.23
const WIND = 0.44
// small flags flutter quicker than the opening shot's big ones: their cloth runs ahead of the clock
const PACE = 1.7

/**
 * The prayer flags strung from the summit cairn's pole: the same cloth as the
 * opening shot's (rope and flags simulated together, off the main thread) and
 * the same woodblock prints, at their real size. They are simulated only while
 * you are up there.
 *
 * `lines`: [{ a, b, sag, weathered }] with a and b in world metres (a at the
 * pole). `view` and `look`: where they are seen from; as in the opening shot,
 * the wind blows from behind you, a little from the right.
 */
export default function SummitFlags({ lines, view, look }) {
  const atlas = useLoader(THREE.TextureLoader, '/textures/prayer-flags.webp')
  const { camera, size, gl } = useThree()
  const holder = useMemo(() => new THREE.Group(), [])
  const rig = useRef(null)
  const started = useRef(false)
  const begin = useRef(null)
  const tmp = useMemo(
    () => ({ cam: new THREE.Vector3(), a: new THREE.Vector3(), t: new THREE.Vector3(), v: new THREE.Vector3(), s: new THREE.Vector3() }),
    []
  )
  // no haze between you and flags a few metres away
  const { flagMat, ropeMat } = useMemo(() => flagMaterials(atlas, gl, { near: 400, far: 900, max: 0 }), [atlas, gl])

  // flag space: x to the right of the view, y up, z back toward you; one unit is S metres
  const layout = useMemo(() => {
    const f = look.clone().sub(view).normalize()
    const fh = new THREE.Vector3(f.x, 0, f.z).normalize()
    const right = new THREE.Vector3(-fh.z, 0, fh.x)
    const back = fh.clone().negate()
    const origin = lines[0].a.clone()
    const matrix = new THREE.Matrix4()
      .makeBasis(right, new THREE.Vector3(0, 1, 0), back)
      .scale(new THREE.Vector3(S, S, S))
      .setPosition(origin)
    const toFlag = (p) => {
      const d = p.clone().sub(origin)
      return [d.dot(right) / S, d.y / S, d.dot(back) / S]
    }
    return {
      matrix,
      origin,
      specs: lines.map((L) => ({ weathered: L.weathered ?? 0.35 })),
      lines: lines.map((L) => {
        const line = { a: toFlag(L.a), b: toFlag(L.b), sag: L.sag / S, gw: 7, gh: 8, gap: 1, fw: FLAG_W, fh: FLAG_H }
        line.count = flagsThatFit(line)
        return line
      }),
    }
  }, [lines, view, look])

  useEffect(() => {
    let alive = true
    started.current = false
    const start = () => {
      started.current = true
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      startCloth({ lines: layout.lines, seed: 23, substeps: 1, iters: 4, wind: WIND, settle: reduced ? 420 : 240 })
        .then((client) => {
          if (!alive) return client.dispose()
          const R = makeRig(client, layout, flagMat, ropeMat)
          holder.add(R.root)
          rig.current = R
        })
        .catch(() => {})
    }
    begin.current = start
    return () => {
      alive = false
      rig.current?.dispose()
      rig.current = null
    }
  }, [layout, flagMat, ropeMat, holder])

  useFrame((_, delta) => {
    // the cloth starts once you set off for the summit (it settles on the way up)
    const going = (journey.to === 'summit' && journey.state !== 'idle') || !!window.__cam
    if (!started.current && going) begin.current?.()
    const R = rig.current
    const near = env.act === 'mountain' && camera.position.distanceTo(layout.origin) < 140
    holder.visible = !!R && near
    if (!R || !near) return
    drawRig(R, camera, size, tmp)
    lightFlags(flagMat)
    if (scrollState.reducedMotion) return
    // a steady wind, and now and then a gust
    if (env.time > R.nextGust) {
      R.client.gust += R.nextGust ? 14 + Math.random() * 24 : 0
      R.nextGust = env.time + 4 + Math.random() * 8
    }
    R.client.step(Math.min(delta, 1 / 20) * PACE, WIND)
  })

  return <primitive object={holder} />
}

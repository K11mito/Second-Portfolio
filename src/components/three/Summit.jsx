'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { env } from './env'
import { getHeights, heightAt } from './terrainData'
import { buildButterLamp, buildCairn, buildCounter, buildSnowCap, laidOnSnow, snowSurface, summitFlags } from './summitKit'
import { flutterFlags, glowTexture } from './gompa'
import { dest } from '@/lib/destinations'
import { register, loadRegister } from '@/lib/summitClient'
import { journey } from '@/lib/journey'

// The top of the mountain (its highest point), and how the register stands on it
export const SUMMIT = { x: -37.5, z: 18, ry: 0.32 }

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

function fonts() {
  const css = getComputedStyle(document.documentElement)
  const v = (name, fallback) => css.getPropertyValue(name).trim() || fallback
  return {
    serif: `${v('--font-serif', "'Amita'")}, Georgia, serif`,
    mono: `${v('--font-mono', "'DM Mono'")}, ui-monospace, monospace`,
  }
}

// a soft dark patch under something standing in the snow
let blobTex = null
function shade(strength = 0.45) {
  if (!blobTex) {
    const c = document.createElement('canvas')
    c.width = c.height = 64
    const x = c.getContext('2d')
    const g = x.createRadialGradient(32, 32, 2, 32, 32, 32)
    g.addColorStop(0, 'rgba(30,38,52,1)')
    g.addColorStop(1, 'rgba(30,38,52,0)')
    x.fillStyle = g
    x.fillRect(0, 0, 64, 64)
    blobTex = new THREE.CanvasTexture(c)
  }
  return new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, opacity: strength, depthWrite: false })
}

/**
 * The summit: the register (a counter with a lever, counting everyone who
 * reaches the top), a cairn flying prayer flags, a butter lamp to read it by
 * at night, and a finer cap of snow. It rolls the counter to the register's
 * count, swings the lever as it is pulled, and gives the page the summit's
 * sign and the camera's place to stand.
 */
export default function Summit() {
  const buffer = useLoader(THREE.FileLoader, '/terrain/height.bin', (l) => l.setResponseType('arraybuffer'))
  const [kit, setKit] = useState(null)
  const roll = useRef(null)
  const shown = useRef(null)
  const v = useMemo(() => new THREE.Vector3(), [])

  useEffect(() => {
    let alive = true
    const heights = getHeights(buffer)
    const surface = snowSurface((x, z) => heightAt(heights, x, z))
    const f = fonts()
    // the plate's lettering is drawn into a texture: wait for the fonts first
    Promise.race([
      Promise.all([document.fonts.load(`64px ${f.serif}`), document.fonts.load(`500 30px ${f.mono}`)]),
      new Promise((r) => setTimeout(r, 2500)),
    ])
      // a font that fails to load only changes the lettering's face
      .catch(() => {})
      .then(() => {
        if (!alive) return
        const { x: sx, z: sz, ry } = SUMMIT
        const root = new THREE.Group()
        root.name = 'summit'
        const c = Math.cos(ry)
        const s = Math.sin(ry)
        // the register's own frame: x to its right, z out of its face
        const at = (lx, lz) => [sx + lx * c + lz * s, sz - lx * s + lz * c]
        const place = (obj, lx, lz, sink = 0.04) => {
          const [wx, wz] = at(lx, lz)
          obj.position.set(wx, surface(wx, wz) - sink, wz)
          return obj
        }
        const laid = (lx, lz, size, material, lift) => laidOnSnow(surface, ...at(lx, lz), size, material, lift)

        const cap = buildSnowCap(surface, sx, sz, 64, 120)
        root.add(cap)
        const counter = buildCounter(f)
        counter.group.rotation.y = ry
        place(counter.group, 0, 0, 0.1)
        const cairn = buildCairn()
        cairn.group.rotation.y = ry + 0.6
        place(cairn.group, -1.9, -1.4, 0.08)
        const lamp = buildButterLamp()
        lamp.group.rotation.y = ry
        place(lamp.group, -0.42, 0.34, 0.03)
        const pool = laid(-0.42, 0.34, 3.4, new THREE.MeshBasicMaterial({ map: glowTexture(), color: '#ffb36a', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }), 0.02)
        pool.visible = false
        root.add(counter.group, cairn.group, lamp.group, pool, laid(0, 0, 1.2, shade(0.35)), laid(-1.9, -1.4, 2.2, shade(0.4)))
        root.updateMatrixWorld(true)

        // prayer flags from the cairn's pole: down to the snow, and across to the register
        const top = cairn.group.localToWorld(cairn.top.clone())
        const snowAt = (lx, lz, up = 0.35) => place(new THREE.Object3D(), lx, lz).position.clone().add(new THREE.Vector3(0, up, 0))
        const post = counter.group.localToWorld(new THREE.Vector3(0, 1.2, 0))
        const flags = [
          summitFlags(top, snowAt(2.6, -2.8), 1),
          summitFlags(top, snowAt(-4.2, 1.2), 2),
          summitFlags(top, post, 3),
          summitFlags(top, snowAt(-3.2, -3.6, 0.25), 4),
        ]
        root.add(...flags)
        flags.forEach((m) => flutterFlags(m, 0))

        // where the camera stands to sign the register, and what it looks at:
        // from a landscape screen, beside the panels the page puts on either side;
        // from a portrait one, higher and further back, above the board's sheet
        const local = (x, y, z) => counter.group.localToWorld(new THREE.Vector3(x, y, z))
        const [gx, gz] = at(0, 0)
        dest.anchors.summit = {
          marker: new THREE.Vector3(gx, surface(gx, gz) + 1, gz),
          center: new THREE.Vector3(gx, surface(gx, gz), gz),
          facing: new THREE.Vector3(s, 0, c),
          view: local(0.5, 1.68, 3.7),
          look: local(-0.15, 1.22, 0),
          fov: 40,
          pview: local(0.35, 1.9, 4.6),
          plook: local(-0.05, 1.19, 0),
          pfov: 46,
          span: 12,
        }
        if (new URLSearchParams(window.location.search).has('debug')) window.__summit = { root, counter }
        setKit({ root, counter, flags, cap, lamp, pool })
      })
    return () => {
      alive = false
    }
  }, [buffer])

  // the register's numbers are fetched once the summit is near: from the view of the destinations on
  useFrame(() => {
    if (register.status === 'idle' && (env.t > 1.6 || journey.to === 'summit')) loadRegister()
  })

  useFrame((_, delta) => {
    if (!kit) return
    const on = env.act === 'mountain'
    kit.root.visible = on
    if (!on) return
    // flags flutter only while you are up there (from below they are too small to see)
    const near = (journey.to === 'summit' && journey.state !== 'idle') || window.__cam
    if (near) kit.flags.forEach((m) => flutterFlags(m, env.time))
    // by day the fresh snow glows with the light it scatters; by night the lamp is lit
    kit.cap.material.emissiveIntensity = 0.3 * env.daylight
    const night = 1 - smooth(0.12, 0.72, env.daylight)
    const flick = kit.lamp.update(env.time, night)
    kit.counter.light(night * flick)
    kit.pool.visible = night > 0.01
    kit.pool.material.opacity = night * 0.5 * flick
    kit.counter.setLever(register.lever)
    // roll the wheels up to the count
    const n = register.count ?? 0
    if (shown.current !== n) {
      roll.current = kit.counter.show(n, shown.current == null ? 0 : 1.4)
      shown.current = n
    }
    if (roll.current && !roll.current(Math.min(delta, 0.05))) roll.current = null
  })

  // the lever's handle on the page follows the grip on screen
  useFrame(({ camera, size }) => {
    const el = register.els.lever
    if (!kit || !el) return
    v.copy(kit.counter.grip)
    kit.counter.group.localToWorld(v).project(camera)
    const x = (v.x * 0.5 + 0.5) * size.width
    const y = (-v.y * 0.5 + 0.5) * size.height
    el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`
  })

  return kit ? <primitive object={kit.root} /> : null
}

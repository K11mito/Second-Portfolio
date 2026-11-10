'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { env } from './env'
import { getHeights, heightAt } from './terrainData'
import { buildCairn, buildCounter, buildSnowCap, summitFlags } from './summitKit'
import { flutterFlags } from './gompa'
import { dest } from '@/lib/destinations'
import { register, loadRegister } from '@/lib/summitClient'
import { journey } from '@/lib/journey'

// The top of the mountain (its highest point), and how the register stands on it
export const SUMMIT = { x: -37.5, z: 18, ry: 0.32 }

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
function blob(size, strength = 0.45) {
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
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, opacity: strength, depthWrite: false })
  )
  m.renderOrder = 1
  return m
}

/**
 * The summit: the register (a counter with a lever, counting everyone who
 * reaches the top), a cairn flying prayer flags, and a finer cap of snow. It
 * rolls the counter to the register's count, swings the lever as it is pulled,
 * and gives the page the summit's sign and the camera's place to stand.
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
    const ground = (x, z) => heightAt(heights, x, z)
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
        const gy = ground(sx, sz)
        const root = new THREE.Group()
        root.name = 'summit'
        const c = Math.cos(ry)
        const s = Math.sin(ry)
        const place = (obj, lx, lz, sink = 0.04) => {
          const wx = sx + lx * c + lz * s
          const wz = sz - lx * s + lz * c
          obj.position.set(wx, ground(wx, wz) + 0.12 - sink, wz)
          return obj
        }
        const cap = buildSnowCap(ground, sx, sz, 64, 120)
        root.add(cap)
        const counter = buildCounter(f)
        counter.group.rotation.y = ry
        place(counter.group, 0, 0, 0.1)
        root.add(counter.group, place(blob(1.2, 0.35), 0, 0, -0.01))
        const cairn = buildCairn()
        cairn.group.rotation.y = ry + 0.6
        place(cairn.group, -1.9, -1.4, 0.08)
        root.add(cairn.group, place(blob(2.2, 0.4), -1.9, -1.4, -0.01))
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

        // where the camera stands to sign the register, and what it looks at
        const view = counter.group.localToWorld(new THREE.Vector3(0.5, 1.68, 3.7))
        const look = counter.group.localToWorld(new THREE.Vector3(-0.15, 1.22, 0))
        dest.anchors.summit = {
          marker: new THREE.Vector3(sx, gy + 1, sz),
          center: new THREE.Vector3(sx, gy, sz),
          facing: new THREE.Vector3(s, 0, c),
          view,
          look,
          fov: 40,
          span: 12,
        }
        if (new URLSearchParams(window.location.search).has('debug')) window.__summit = { root, counter }
        setKit({ root, counter, flags, cap })
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
    kit.cap.material.emissiveIntensity = 0.3 * env.daylight
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

'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useLoader, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { env } from './env'
import { terrainUniforms } from './Terrain'
import { getHeights, heightAt } from './terrainData'
import { buildButterLamp, buildCairn, buildCounter, buildSnowCap, buildStake, laidOnSnow, skyReflections, snowSurface } from './summitKit'
import { glowTexture } from './gompa'
import { buildNoticeBoard } from './summitBoard'
import SummitFlags from './SummitFlags'
import { dest } from '@/lib/destinations'
import { ON_BOARD, register, loadRegister } from '@/lib/summitClient'
import { journey } from '@/lib/journey'
import { scrollState } from '@/lib/scroll'

// The top of the mountain (its highest point), and how the register stands on it
export const SUMMIT = { x: -37.5, z: 18, ry: 0.32 }

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

function fonts() {
  const css = getComputedStyle(document.documentElement)
  const v = (name, fallback) => css.getPropertyValue(name).trim() || fallback
  // the notes' handwriting is set on the summit's page (SummitRegister)
  const page = document.getElementById('summit')
  const hand = (page && getComputedStyle(page).getPropertyValue('--font-hand').trim()) || "'Caveat'"
  return {
    serif: `${v('--font-serif', "'Amita'")}, Georgia, serif`,
    mono: `${v('--font-mono', "'DM Mono'")}, ui-monospace, monospace`,
    hand: `${hand}, 'Segoe Print', 'Bradley Hand', cursive`,
  }
}

const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)

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
 * reaches the top), a cairn with lines of prayer flags tied off to stakes in
 * the snow, a butter lamp to read it by at night, and a finer cap of snow. It
 * rolls the counter to the register's count, swings the lever as it is pulled,
 * and gives the page the summit's sign and the camera's place to stand.
 */
export default function Summit() {
  const buffer = useLoader(THREE.FileLoader, '/terrain/height.bin', (l) => l.setResponseType('arraybuffer'))
  const { gl } = useThree()
  const [kit, setKit] = useState(null)
  const roll = useRef(null)
  const shown = useRef(null)
  const fill = useRef()
  const v = useMemo(() => new THREE.Vector3(), [])
  const quad = useMemo(() => [0, 1, 2, 3].map(() => new THREE.Vector3()), [])
  const sky = useMemo(() => new THREE.Color(), [])

  useEffect(() => {
    let alive = true
    const heights = getHeights(buffer)
    const surface = snowSurface((x, z) => heightAt(heights, x, z))
    const f = fonts()
    // the plate's lettering is drawn into a texture: wait for the fonts first
    Promise.race([
      Promise.all([document.fonts.load(`64px ${f.serif}`), document.fonts.load(`500 30px ${f.mono}`), document.fonts.load(`600 40px ${f.hand}`)]),
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

        const cap = buildSnowCap(surface, sx, sz, 64, 200)
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
        // the board, off to the right of the register and a step back, facing the
        // way it does (so the place to read it from is as high on the top as it is)
        // It stands where the top falls away behind, on longer legs, so its notes
        // are at eye height for someone standing on the top in front of it.
        const ground = (lx, lz) => surface(...at(lx, lz))
        const BX = 1.9
        const BZ = -1.9
        const BR = -0.3
        const legs = Math.min(1.5, Math.max(0, ground(BX + Math.sin(BR) * 3.4, BZ + Math.cos(BR) * 3.4) - ground(BX, BZ) - 0.25))
        const board = buildNoticeBoard(f, { legs })
        board.group.rotation.y = ry + BR
        place(board.group, BX, BZ, 0.06 - legs)
        board.setNotes(register.notes.slice(0, ON_BOARD), null)
        // the handwriting, if it was late: the notes are written out again once it's here
        if (!document.fonts.check(`600 40px ${f.hand}`)) document.fonts.load(`600 40px ${f.hand}`).then(() => alive && board.redraw(f), () => {})
        const pool = laid(-0.42, 0.34, 3.4, new THREE.MeshBasicMaterial({ map: glowTexture(), color: '#ffb36a', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }), 0.02)
        pool.visible = false
        // the things on the top, too small to see from further off (where they are left undrawn)
        const props = new THREE.Group()
        props.add(counter.group, cairn.group, lamp.group, pool, laid(0, 0, 1.2, shade(0.35)), laid(-1.9, -1.4, 2.2, shade(0.4)), board.group, laid(BX, BZ, 2.8, shade(0.32)))
        root.add(props)
        root.updateMatrixWorld(true)

        // lines of prayer flags from the cairn's pole, each tied off to a stake in the snow
        const top = cairn.group.localToWorld(cairn.top.clone())
        const lines = [
          [2.6, -2.8, 0.36],
          [4.4, -3.6, 0.22],
          [-4.2, 1.2, 0.3],
          [-3.2, -3.6, 0.45],
        ].map(([lx, lz, weathered], i) => {
          const stake = buildStake(i + 1)
          stake.group.rotation.y = ry + i
          place(stake.group, lx, lz, 0.06)
          props.add(stake.group)
          stake.group.updateMatrixWorld(true)
          const b = stake.group.localToWorld(stake.top.clone())
          // a little lower down the pole for each line, so they don't all leave from one point
          const a = top.clone().add(new THREE.Vector3(0, -0.07 * i, 0))
          return { a, b, sag: a.distanceTo(b) * 0.035, weathered }
        })
        // the shine on its metal: the sky (redrawn as the light changes)
        const reflections = skyReflections(gl)
        const metals = [...counter.metals, ...lamp.metals, ...cairn.metals, ...board.metals]
        const envMap = reflections.update(env)
        for (const m of metals) m.envMap = envMap

        // where the camera stands to sign the register, and what it looks at:
        // from a landscape screen, beside the panels the page puts on either side;
        // from a portrait one, higher and further back, above the board's sheet
        // And where it stands to read the board: square on to it.
        const local = (x, y, z) => counter.group.localToWorld(new THREE.Vector3(x, y, z))
        const onBoard = (x, y, z) => board.group.localToWorld(new THREE.Vector3(x, y, z))
        const stations = {
          register: { view: local(0.5, 1.68, 3.7), look: local(-0.15, 1.22, 0), fov: 40, pview: local(0.35, 1.9, 4.6), plook: local(-0.05, 1.19, 0), pfov: 46 },
          board: { view: onBoard(0, 1.58, 3.4), look: onBoard(0, 1.27, 0), fov: 40, pview: onBoard(0, 1.9, 5.5), plook: onBoard(0, 1.2, 0), pfov: 50 },
        }
        // (the snow rises toward the top: stand on it, at eye height, never in it)
        for (const st of [stations.board.view, stations.board.pview]) st.y = Math.max(st.y, surface(st.x, st.z) + 1.65)
        const [gx, gz] = at(0, 0)
        dest.anchors.summit = {
          marker: new THREE.Vector3(gx, surface(gx, gz) + 1, gz),
          center: new THREE.Vector3(gx, surface(gx, gz), gz),
          facing: new THREE.Vector3(s, 0, c),
          view: stations.register.view.clone(),
          look: stations.register.look.clone(),
          fov: 40,
          pview: stations.register.pview.clone(),
          plook: stations.register.plook.clone(),
          pfov: 46,
          span: 12,
        }
        if (new URLSearchParams(window.location.search).has('debug')) window.__summit = { root, counter, board, stations, register, surface, at }
        setKit({
          root,
          props,
          counter,
          cap,
          lamp,
          pool,
          lines,
          reflections,
          metals,
          board,
          stations,
          // between the register (0) and the board (1), and how far along the walk is
          walk: { k: 0, from: 0, to: 0, t: 1 },
          notes: null,
          seen: { view: stations.register.view, look: stations.register.look },
          top: new THREE.Vector3(sx, surface(sx, sz), sz),
        })
      })
    return () => {
      alive = false
    }
  }, [buffer, gl])

  // the sky reflections are let go with the summit
  useEffect(() => () => kit?.reflections.dispose(), [kit])

  // the register's numbers are fetched once the summit is near: from the view of the destinations on
  useFrame(() => {
    if (register.status === 'idle' && (env.t > 1.6 || journey.to === 'summit')) loadRegister()
  })

  useFrame(({ camera }, delta) => {
    if (!kit) return
    const on = env.act === 'mountain'
    kit.root.visible = on
    if (!on) return
    const far = camera.position.distanceTo(kit.top)
    kit.props.visible = far < 320
    // Up close, the sky's light fills the shadows, as it does for anyone standing
    // there: with the sun low (or gone), the register would be a silhouette
    // against it. (An ambient light: adding it recompiles nothing.)
    // (at dawn and dusk: by night the lamp is the light to read it by)
    const lowSun = (1 - smooth(0.2, 0.6, env.skySunDir.y)) * env.daylight
    const close = 1 - smooth(40, 160, far)
    if (fill.current) {
      fill.current.color.copy(env.ambient)
      fill.current.intensity = env.ambientIntensity * 2 * lowSun * close
    }
    // the metal's reflections follow the sky (redrawn only when it has moved on, and only up close)
    if (far < 160) {
      const envMap = kit.reflections.update(env)
      if (kit.metals[0].envMap !== envMap) for (const m of kit.metals) m.envMap = envMap
    }
    // the cap takes the light the mountain's own snow does (and so blends into it
    // from afar); by day it glows a little with the light it scatters
    const snow = terrainUniforms.uSnow.value
    kit.cap.material.color.copy(snow)
    kit.cap.material.emissive.copy(env.sunColor).multiply(snow)
    kit.cap.material.emissiveIntensity = 0.3 * env.daylight
    // by night the lamp is lit
    const night = 1 - smooth(0.12, 0.72, env.daylight)
    const flick = kit.lamp.update(env.time, night)
    kit.counter.light(night * flick, sky.copy(env.ambient).multiplyScalar(env.ambientIntensity * lowSun * close))
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

    // the board: the newest notes pinned up (a new one brought in by hand), moving in the wind
    if (kit.notes !== register.notes) {
      kit.notes = register.notes
      kit.board.setNotes(register.notes.slice(0, ON_BOARD), register.fresh)
    }
    kit.board.hover = register.hover
    if (far < 160) kit.board.update(env.time, Math.min(delta, 0.05), night, env.daylight)

    // walking over to the board and back: the place to stand moves, and the camera with it
    const w = kit.walk
    const goal = register.view === 'board' && journey.to === 'summit' ? 1 : 0
    if (goal !== w.to) {
      w.from = w.k
      w.to = goal
      w.t = 0
    }
    if (w.t < 1) {
      w.t = scrollState.reducedMotion ? 1 : Math.min(1, w.t + Math.min(delta, 0.05) / 1.6)
      w.k = w.from + (w.to - w.from) * ease(w.t)
      const a = dest.anchors.summit
      const { register: R, board: B } = kit.stations
      a.view.lerpVectors(R.view, B.view, w.k)
      // the eyes turn ahead of the feet
      a.look.lerpVectors(R.look, B.look, w.from + (w.to - w.from) * ease(Math.min(1, w.t * 1.25)))
      a.pview.lerpVectors(R.pview, B.pview, w.k)
      a.plook.lerpVectors(R.plook, B.plook, w.from + (w.to - w.from) * ease(Math.min(1, w.t * 1.25)))
      // a little up and over on the way, rather than straight through
      const lift = Math.sin(Math.PI * w.t) * Math.abs(w.to - w.from) * 0.18
      a.view.y += lift
      a.pview.y += lift
      a.fov = THREE.MathUtils.lerp(R.fov, B.fov, w.k)
      a.pfov = THREE.MathUtils.lerp(R.pfov, B.pfov, w.k)
    }
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
    if (!el.dataset.placed) el.dataset.placed = 'true'
  })

  // a hit area on the page over each note on the board, to read it by
  useFrame(({ camera, size }) => {
    if (!kit) return
    const els = register.els.notes
    for (const e of kit.board.pinned) {
      const el = els[e.note.id]
      if (!el) continue
      kit.board.corners(e, quad)
      let x0 = Infinity
      let y0 = Infinity
      let x1 = -Infinity
      let y1 = -Infinity
      for (const p of quad) {
        kit.board.group.localToWorld(p).project(camera)
        const x = (p.x * 0.5 + 0.5) * size.width
        const y = (-p.y * 0.5 + 0.5) * size.height
        x0 = Math.min(x0, x)
        x1 = Math.max(x1, x)
        y0 = Math.min(y0, y)
        y1 = Math.max(y1, y)
      }
      el.style.transform = `translate3d(${x0.toFixed(1)}px, ${y0.toFixed(1)}px, 0)`
      el.style.width = `${(x1 - x0).toFixed(1)}px`
      el.style.height = `${(y1 - y0).toFixed(1)}px`
      if (!el.dataset.placed) el.dataset.placed = 'true'
    }
  })

  return (
    <>
      {kit && <primitive object={kit.root} />}
      {kit && <SummitFlags lines={kit.lines} view={kit.seen.view} look={kit.seen.look} />}
      <ambientLight ref={fill} intensity={0} />
    </>
  )
}

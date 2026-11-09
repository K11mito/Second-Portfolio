'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useLoader, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { env } from './env'
import { SHADOW_LAYER } from './Terrain'
import { getHeights, heightAt } from './terrainData'
import { buildLibraryGompa, buildWheelTemple, glowTexture, updateGompas } from './gompa'
import { SITES, dest } from './sites'
import { journey } from '@/lib/journey'

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

// Put a monastery on the mountain: its kit is built against the real ground
// under it, then turned and scaled into place.
function raise(builder, site, heights) {
  const c = Math.cos(site.ry)
  const s = Math.sin(site.ry)
  const ground = (lx, lz) => {
    const wx = site.x + (lx * c + lz * s) * site.scale
    const wz = site.z + (-lx * s + lz * c) * site.scale
    return (heightAt(heights, wx, wz) - site.y) / site.scale
  }
  const g = builder(ground)
  g.position.set(site.x, site.y, site.z)
  g.rotation.y = site.ry
  g.scale.setScalar(site.scale)
  g.updateMatrixWorld(true)
  g.traverse((o) => {
    // the walls throw shadows on the rock (the sun's shadow camera only sees layer 1)
    if (o.isMesh && !o.isInstancedMesh) o.layers.enable(SHADOW_LAYER)
  })
  const u = g.userData
  const world = (v) => (v ? g.localToWorld(v.clone()) : null)
  return {
    group: g,
    anchors: {
      marker: world(u.marker),
      door: world(u.door),
      wheel: world(u.wheel),
      center: g.position.clone(),
      // the way the monastery faces: the way in
      facing: new THREE.Vector3(s, 0, c),
      span: u.span * site.scale,
    },
  }
}

// The warm haze that hangs around a monastery at night: lamplight in the mist.
function makeHalo(size) {
  const m = new THREE.SpriteMaterial({
    map: glowTexture(),
    color: '#ff9c52',
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
  })
  const s = new THREE.Sprite(m)
  s.scale.setScalar(size)
  s.renderOrder = 7
  return s
}

const IDS = ['library', 'temple']

/**
 * The two destinations on the mountain: the library's monastery and the
 * prayer-wheel temple, with their lamps lit through the night. Every frame it
 * also pins each destination's marker (plain HTML, see site/Destinations) over
 * its roof, and fades the markers with the "Where to now?" view.
 */
export default function Gompas() {
  const buffer = useLoader(THREE.FileLoader, '/terrain/height.bin', (l) => l.setResponseType('arraybuffer'))
  const { gl } = useThree()
  const group = useRef()
  const last = useRef({})

  const built = useMemo(() => {
    const heights = getHeights(buffer)
    const library = raise(buildLibraryGompa, SITES.library, heights)
    const temple = raise(buildWheelTemple, SITES.temple, heights)
    const halos = [library, temple].map(({ anchors }) => {
      const h = makeHalo(anchors.span * 2.1)
      h.position.copy(anchors.center).y += anchors.span * 0.12
      return h
    })
    return { library, temple, gompas: [library.group, temple.group], halos }
  }, [buffer])

  useEffect(() => {
    dest.anchors.library = built.library.anchors
    dest.anchors.temple = built.temple.anchors
    if (new URLSearchParams(window.location.search).has('debug')) window.__dest = dest
    // draw the new walls into the (otherwise static) shadow map
    gl.shadowMap.needsUpdate = true
  }, [built, gl])

  const v = useMemo(() => new THREE.Vector3(), [])

  useFrame(({ camera, size }) => {
    const on = env.act === 'mountain'
    if (group.current) group.current.visible = on
    // lamps come on through dusk and burn all night
    const night = 1 - smooth(0.12, 0.72, env.daylight)
    if (on) {
      updateGompas(built.gompas, env.time, night)
      built.halos.forEach((h, i) => {
        const hovered = dest.hover === IDS[i] ? 1 : 0
        h.material.opacity = night * 0.42 + hovered * (0.08 + night * 0.12)
      })
    }

    // The markers: shown with the "Where to now?" view, and never mid-journey
    const show = on && journey.state === 'idle' ? smooth(1.8, 1.98, env.t) * (1 - smooth(2.42, 2.62, env.t)) : 0
    for (const id of IDS) {
      const el = dest.els[id]
      const a = dest.anchors[id]
      if (!el || !a) continue
      v.copy(a.marker).project(camera)
      const behind = v.z > 1
      const x = (v.x * 0.5 + 0.5) * size.width
      const y = (-v.y * 0.5 + 0.5) * size.height
      const o = behind ? 0 : show
      const prev = last.current[id] || (last.current[id] = { x: -1, y: -1, o: -1 })
      if (Math.abs(prev.x - x) > 0.05 || Math.abs(prev.y - y) > 0.05) {
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`
        // the label goes on whichever side of the sign has the room
        const side = x > size.width * 0.6 ? 'left' : 'right'
        if (el.dataset.side !== side) el.dataset.side = side
        prev.x = x
        prev.y = y
      }
      if (Math.abs(prev.o - o) > 0.002) {
        el.style.setProperty('--o', o.toFixed(3))
        el.dataset.on = o > 0.6 ? 'true' : 'false'
        prev.o = o
      }
    }
  })

  return (
    <group ref={group} userData={{ act: 'mountain' }}>
      {built.gompas.map((g) => (
        <primitive key={g.name} object={g} />
      ))}
      {built.halos.map((h, i) => (
        <primitive key={i} object={h} />
      ))}
    </group>
  )
}

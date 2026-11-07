'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { env, HALL_ORIGIN } from './env'
import { pinProgress, scrollState } from '@/lib/scroll'
import { ringTurn } from '@/lib/ring'
import { experience } from '@/content/site'

useGLTF.preload('/models/prayer_wheel.glb')

const CARD_COUNT = experience.length

const WHEEL_SCALE = 0.0125

// A tiny procedural environment: warm lamp-light below, a pale skylight above.
// Without something to reflect, metal renders as flat brown; this lets the
// brass drum actually gleam. Generated once, ~1 ms.
function useHallEnvironment() {
  const { gl } = useThree()
  return useMemo(() => {
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#050304')
    const panel = (color, intensity, w, h, pos, rot) => {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide })
      )
      m.position.set(...pos)
      m.rotation.set(...rot)
      scene.add(m)
    }
    panel('#ffb15e', 3.2, 10, 2, [0, -3, 4], [0, 0, 0]) // lamp rows in front
    panel('#ff8a3d', 1.6, 8, 1.5, [-5, -2.5, -2], [0, Math.PI / 2, 0])
    panel('#ff8a3d', 1.6, 8, 1.5, [5, -2.5, -2], [0, -Math.PI / 2, 0])
    panel('#fff1dc', 2.4, 3, 3, [0, 6, 0], [Math.PI / 2, 0, 0]) // skylight
    panel('#3a4a7a', 0.6, 12, 6, [0, 1, -6], [0, 0, 0]) // cool bounce behind
    const pmrem = new THREE.PMREMGenerator(gl)
    const tex = pmrem.fromScene(scene, 0.04).texture
    pmrem.dispose()
    return tex
  }, [gl])
}

function Wheel({ envMap }) {
  const { scene } = useGLTF('/models/prayer_wheel.glb')
  const drumRef = useRef(null)
  const baseQ = useRef(new THREE.Quaternion())
  const angle = useRef(0)
  const spin = useMemo(() => new THREE.Quaternion(), [])
  const zAxis = useMemo(() => new THREE.Vector3(0, 0, 1), [])

  const root = useMemo(() => {
    const r = scene.clone(true)
    r.traverse((o) => {
      if (o.name === 'Cylinder') drumRef.current = o
      if (o.isMesh) {
        o.material = o.material.clone()
        const m = o.material
        m.envMap = envMap
        const name = m.name
        if (name === 'maniguruma' || name === 'ueshita') {
          // embossed brass drum and its caps
          m.metalness = 0.8
          m.roughness = 0.38
          m.envMapIntensity = 1.8
          m.color = new THREE.Color('#f0cf98')
        } else if (name === 'tama') {
          // the finial jewels: gilded, with only an ember of glow
          m.emissiveIntensity = 0.08
          m.color = new THREE.Color('#e0b070')
          m.metalness = 0.85
          m.roughness = 0.3
          m.envMapIntensity = 1.4
        } else {
          m.metalness = 0.35
          m.roughness = 0.6
          m.envMapIntensity = 0.8
        }
      }
    })
    if (drumRef.current) baseQ.current.copy(drumRef.current.quaternion)
    return r
  }, [scene, envMap])

  useFrame((_, delta) => {
    const d = drumRef.current
    if (!d || env.act !== 'monastery') return
    const dt = Math.min(delta, 1 / 20)
    // Scroll turns the wheel clockwise (seen from above), in step with the card
    // ring; a slow idle turn keeps it alive, as if someone just passed by.
    // same detented mapping as the HTML card ring, so the two turn as one
    const scrollTurn = -ringTurn(pinProgress('experience'), CARD_COUNT) * ((Math.PI * 2) / CARD_COUNT)
    const idle = scrollState.reducedMotion ? 0 : -env.time * 0.12
    const target = scrollTurn + idle
    angle.current = scrollState.reducedMotion ? target : THREE.MathUtils.damp(angle.current, target, 4, dt)
    env.wheelAngle = angle.current
    spin.setFromAxisAngle(zAxis, angle.current)
    d.quaternion.copy(baseQ.current).multiply(spin)
  })

  return <primitive object={root} scale={WHEEL_SCALE} position={[0.16, 0, 0]} />
}

// Butter lamps: instanced brass cups with flickering flames.
function ButterLamps({ count = 26 }) {
  const cups = useRef()
  const flames = useRef()
  const lights = useRef([])
  const layout = useMemo(() => {
    const out = []
    for (let i = 0; i < count; i++) {
      const row = i < count * 0.55 ? 0 : 1
      const nRow = row === 0 ? Math.ceil(count * 0.55) : count - Math.ceil(count * 0.55)
      const k = row === 0 ? i : i - Math.ceil(count * 0.55)
      const a = THREE.MathUtils.lerp(-1.05, 1.05, nRow > 1 ? k / (nRow - 1) : 0.5)
      const R = row === 0 ? 7.2 : 8.6
      out.push({ x: Math.sin(a) * R, z: Math.cos(a) * R * 0.75 + 1, y: row === 0 ? 0.55 : 0.95, phase: i * 1.7 })
    }
    return out
  }, [count])

  const flameMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uTime: { value: 0 }, uLight: { value: 0 } },
        vertexShader: /* glsl */ `
          attribute float aPhase;
          uniform float uTime;
          varying vec2 vUv;
          varying float vFlick;
          void main() {
            vUv = uv;
            float f = 0.82 + 0.1 * sin(uTime * 9.0 + aPhase) + 0.08 * sin(uTime * 17.0 + aPhase * 2.1);
            vFlick = f;
            vec3 p = position;
            p.y *= f;
            p.x += sin(uTime * 3.0 + aPhase) * 0.02 * (p.y + 0.5);
            vec4 mv = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
            mv.xy += p.xy;
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uLight;
          varying vec2 vUv;
          varying float vFlick;
          void main() {
            vec2 q = vUv * 2.0 - 1.0;
            q.y = q.y * 0.62 + 0.18;
            float d = length(vec2(q.x * 1.7, q.y));
            float core = smoothstep(0.55, 0.0, d);
            float halo = smoothstep(1.0, 0.0, length(vUv * 2.0 - 1.0)) * 0.25;
            vec3 col = mix(vec3(1.0, 0.45, 0.12), vec3(1.0, 0.9, 0.7), core) * (core * 1.6 + halo) * vFlick;
            gl_FragColor = vec4(col * uLight, 1.0);
          }
        `,
      }),
    []
  )

  useEffect(() => {
    const m = new THREE.Matrix4()
    layout.forEach((l, i) => {
      m.makeTranslation(l.x, l.y, l.z)
      cups.current.setMatrixAt(i, m)
      m.makeTranslation(l.x, l.y + 0.33, l.z)
      flames.current.setMatrixAt(i, m)
    })
    cups.current.instanceMatrix.needsUpdate = true
    flames.current.instanceMatrix.needsUpdate = true
    const phase = new Float32Array(layout.map((l) => l.phase))
    flames.current.geometry.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phase, 1))
  }, [layout])

  useFrame(({ clock }) => {
    const t = scrollState.reducedMotion ? 0 : clock.elapsedTime
    flameMat.uniforms.uTime.value = t
    flameMat.uniforms.uLight.value = env.hallLight
    lights.current.forEach((l, i) => {
      if (!l) return
      const f = 0.86 + 0.08 * Math.sin(t * 7.3 + i * 2.1) + 0.06 * Math.sin(t * 13.1 + i)
      l.intensity = 34 * f * env.hallLight
    })
  })

  return (
    <group>
      <instancedMesh ref={cups} args={[null, null, count]}>
        <cylinderGeometry args={[0.16, 0.11, 0.26, 12]} />
        <meshStandardMaterial color="#b88a4a" metalness={0.8} roughness={0.35} />
      </instancedMesh>
      <instancedMesh ref={flames} args={[null, flameMat, count]} frustumCulled={false}>
        <planeGeometry args={[0.32, 0.62]} />
      </instancedMesh>
      {[-4.2, 0, 4.2].map((x, i) => (
        <pointLight
          key={x}
          ref={(el) => (lights.current[i] = el)}
          position={[x, 1.6, 5.4 - Math.abs(x) * 0.25]}
          color="#ff9a48"
          distance={22}
          decay={2}
        />
      ))}
    </group>
  )
}

// Dust motes drifting through the skylight beam.
function Dust({ count = 420 }) {
  const ref = useRef()
  const { geo, mat } = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const seed = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 16
      pos[i * 3 + 1] = Math.random() * 16
      pos[i * 3 + 2] = (Math.random() - 0.5) * 12 + 2
      seed[i] = Math.random() * 100
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uLight: { value: 0 }, uPx: { value: 1 } },
      vertexShader: /* glsl */ `
        attribute float aSeed;
        uniform float uTime;
        uniform float uPx;
        varying float vA;
        void main() {
          vec3 p = position;
          p.x += sin(uTime * 0.13 + aSeed) * 0.6;
          p.y = mod(p.y + uTime * 0.12 + aSeed, 16.0);
          p.z += cos(uTime * 0.11 + aSeed * 1.3) * 0.5;
          // brightest inside the beam that falls on the wheel
          float beam = smoothstep(4.2, 0.0, length(p.xz - vec2(0.0, 1.0)));
          vA = (0.15 + 0.85 * beam) * (0.5 + 0.5 * sin(uTime * 0.7 + aSeed * 3.0));
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = uPx * (1.0 + fract(aSeed) * 1.6) * (30.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uLight;
        varying float vA;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.0, d) * vA * uLight;
          gl_FragColor = vec4(vec3(1.0, 0.82, 0.6) * a * 0.55, 1.0);
        }
      `,
    })
    return { geo, mat }
  }, [count])

  useFrame(({ clock, gl }) => {
    mat.uniforms.uTime.value = scrollState.reducedMotion ? 0 : clock.elapsedTime
    mat.uniforms.uLight.value = env.hallLight
    mat.uniforms.uPx.value = gl.getPixelRatio()
  })

  return <points ref={ref} geometry={geo} material={mat} frustumCulled={false} />
}

// A soft shaft of light from a high window, falling on the wheel.
function LightShaft() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        uniforms: { uLight: { value: 0 }, uTime: { value: 0 } },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          varying vec3 vN;
          varying vec3 vV;
          void main() {
            vUv = uv;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vN = normalize(normalMatrix * normal);
            vV = normalize(-mv.xyz);
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uLight;
          uniform float uTime;
          varying vec2 vUv;
          varying vec3 vN;
          varying vec3 vV;
          void main() {
            float rim = pow(1.0 - abs(dot(vN, vV)), 1.5);
            float edge = 1.0 - rim;
            float fall = smoothstep(0.0, 0.35, vUv.y) * smoothstep(1.0, 0.55, vUv.y);
            float stripes = 0.85 + 0.15 * sin(vUv.x * 40.0 + uTime * 0.2);
            float a = edge * fall * stripes * 0.075 * uLight;
            gl_FragColor = vec4(vec3(1.0, 0.86, 0.66) * a, 1.0);
          }
        `,
      }),
    []
  )
  useFrame(({ clock }) => {
    mat.uniforms.uLight.value = env.hallLight
    mat.uniforms.uTime.value = clock.elapsedTime
  })
  return (
    <mesh position={[-1.5, 13, 0.5]} rotation={[0, 0, 0.18]} material={mat}>
      <cylinderGeometry args={[1.4, 5.2, 26, 32, 1, true]} />
    </mesh>
  )
}

function Pillars() {
  const xs = [-11, 11]
  const zs = [-2, -11, -20]
  return (
    <group>
      {xs.map((x) =>
        zs.map((z) => (
          <group key={`${x}${z}`} position={[x + Math.sign(x) * (-z * 0.12), 0, z]}>
            <mesh position={[0, 9, 0]}>
              <boxGeometry args={[1.25, 18, 1.25]} />
              <meshStandardMaterial color="#5a1712" roughness={0.75} metalness={0.05} />
            </mesh>
            {/* painted capital */}
            <mesh position={[0, 17.2, 0]}>
              <boxGeometry args={[2.4, 0.7, 1.6]} />
              <meshStandardMaterial color="#8a5a22" roughness={0.6} metalness={0.2} />
            </mesh>
          </group>
        ))
      )}
    </group>
  )
}

export default function Monastery() {
  const group = useRef()
  const key = useRef()
  const keyTarget = useRef()
  const rim = useRef()
  const fill = useRef()
  const amb = useRef()
  const envMap = useHallEnvironment()

  const { gl, scene } = useThree()

  // A spotlight's target must live in the scene graph, or it aims at the origin.
  useEffect(() => {
    if (key.current && keyTarget.current) key.current.target = keyTarget.current
  }, [])

  // Warm-up: three.js picks shader programs per *visible light setup* (and for
  // the screen's tone mapping, which render targets don't use). So when the
  // page is idle, briefly show only the hall and ask for its programs with
  // compileAsync, which links them in the background where the browser allows.
  // Entering the monastery then never stalls.
  useEffect(() => {
    const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 600))
    const cancel = window.cancelIdleCallback || clearTimeout
    const id = idle(() => {
      const saved = []
      scene.traverse((o) => {
        if (o.userData.act) {
          saved.push([o, o.visible])
          o.visible = o.userData.act === 'monastery'
        }
      })
      const cam = new THREE.PerspectiveCamera(34, 1.6, 0.5, 400)
      cam.position.copy(HALL_ORIGIN).add(new THREE.Vector3(0, 7, 31))
      cam.lookAt(HALL_ORIGIN.x, HALL_ORIGIN.y + 7, HALL_ORIGIN.z)
      cam.updateMatrixWorld()
      try {
        // program selection happens synchronously inside this call
        const parallel = gl.compileAsync && gl.extensions.has('KHR_parallel_shader_compile')
        if (parallel) gl.compileAsync(scene, cam).catch(() => {})
        else gl.compile(scene, cam)
      } finally {
        saved.forEach(([o, v]) => (o.visible = v))
      }
    })
    return () => cancel(id)
  }, [gl, scene])

  useFrame(() => {
    const on = env.act === 'monastery'
    if (group.current) group.current.visible = on
    const L = env.hallLight
    if (key.current) key.current.intensity = 1100 * L
    if (rim.current) rim.current.intensity = 150 * L
    if (fill.current) fill.current.intensity = 95 * L
    if (amb.current) amb.current.intensity = 0.05 + 0.1 * L
  })

  return (
    <group ref={group} position={HALL_ORIGIN} visible={false} userData={{ act: 'monastery' }}>
      <ambientLight ref={amb} color="#3a2a26" />
      {/* skylight key */}
      <spotLight
        ref={key}
        position={[-3, 24, 6]}
        angle={0.32}
        penumbra={0.85}
        decay={2}
        distance={60}
        color="#ffe2bf"
      />
      <object3D ref={keyTarget} position={[0, 6, 0]} />
      {/* cool rim from behind to separate the wheel from the dark */}
      <pointLight ref={rim} position={[4, 12, -9]} color="#7f95d6" distance={40} decay={2} />
      {/* warm fill thrown up from the lamp rows onto the face of the drum */}
      <pointLight ref={fill} position={[0, 3.2, 12]} color="#ffae6b" distance={34} decay={2} />

      <Wheel envMap={envMap} />
      <ButterLamps />
      <Dust />
      <LightShaft />
      <Pillars />

      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <circleGeometry args={[70, 48]} />
        <meshStandardMaterial color="#140d0a" roughness={0.82} metalness={0.05} />
      </mesh>
    </group>
  )
}

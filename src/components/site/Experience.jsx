'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import { experience } from '@/content/site'
import { scrollState } from '@/lib/scroll'
import { ringTurn } from '@/lib/ring'
import Ornament from './Ornament'
import {
  bringToFront,
  frontCard,
  hold,
  letGo,
  mod,
  nudge,
  onWheel,
  setCount,
  setTurn,
  stepBy,
  turnBy,
  update,
  wheel,
} from '@/lib/wheel'

const N = experience.length
const STEP = 360 / N
const pad = (n) => String(n).padStart(2, '0')
// The ring widens with the number of cards so neighbours keep the spacing they
// had at five, rather than crowding into each other.
const RK = Math.sin(Math.PI / 5) / Math.sin(Math.PI / Math.max(3, N))
// How far you scroll (in screen heights) while the cards come out of the wheel.
const EMERGE = 0.7
const PERSPECTIVE = 1800 // as on .exp-viewport

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)
const smooth = (a, b, x) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}
const easeOut = (x, p = 3) => 1 - Math.pow(1 - clamp01(x), p)

function Chevron({ flip = false }) {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden="true" style={flip ? { transform: 'scaleX(-1)' } : undefined}>
      <path d="M14.5 5.5 8 12l6.5 6.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// A clockwise turn: how prayer wheels are spun
function TurnIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[15px] w-[15px]" aria-hidden="true">
      <path d="M19 12a7 7 0 1 1-2.05-4.95" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M17.4 3.6v3.9h-3.9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// The experience cards ride a drum in front of the monastery's prayer wheel.
// As the hall is revealed the stage is already in place, and scrolling on draws
// the cards out of the wheel itself: they unspool from the drum's axis as it
// turns, grow and settle into a ring, and the heading arrives with them. Then
// you turn it by hand, as you would a real one: drag or swipe it (it spins on
// with some weight and settles facing a card), use the arrows or arrow keys, or
// click a card at the side. Cards are real HTML (crisp, readable by screen
// readers), arranged with CSS 3D; without JavaScript they fall back to a
// swipeable list. `?wheel=scroll` restores the old scroll-driven turning.
export default function Experience() {
  const section = useRef(null)
  const viewport = useRef(null)
  const ring = useRef(null)
  const glow = useRef(null)
  const counter = useRef(null)
  const hint = useRef(null)
  const hintLabel = useRef(null)
  const live = useRef(null)
  const cards = useRef([])

  useEffect(() => {
    const vp = viewport.current
    const sec = section.current
    if (!vp || !sec) return
    const query = new URLSearchParams(window.location.search)
    const scrollMode = query.get('wheel') === 'scroll'
    sec.dataset.mode = scrollMode ? 'scroll' : 'hand'
    if (query.has('debug')) window.__wheel = wheel
    setCount(N)
    if (window.matchMedia('(pointer: coarse)').matches && hintLabel.current) hintLabel.current.textContent = 'Swipe to turn'

    // Layout numbers the animation needs, read once per resize rather than
    // every frame: the ring's width, radius and resting centre on the stage.
    const geo = { cw: 320, r: 260, xc: 0, yc: 0, W: 1, H: 1 }
    const measure = () => {
      const el = ring.current
      if (!el) return
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
      geo.cw = el.offsetWidth || 320
      geo.r = (geo.cw * 0.69 + 2.5 * rem) * RK
      geo.xc = el.offsetLeft + geo.cw / 2
      geo.yc = el.offsetTop + el.offsetHeight / 2
      geo.W = vp.clientWidth || 1
      geo.H = vp.clientHeight || 1
      lastE = -1 // redraw
    }
    const ro = new ResizeObserver(measure)
    ro.observe(vp)

    // One card's worth of drum surface, in pixels: dragging the front card
    // keeps the same spot of it under your finger, like a real drum.
    const pxPerCard = () => geo.r * ((2 * Math.PI) / N)

    // How far the cards have come out of the wheel: 0 still inside it (the
    // stage pins as the hall is revealed), 1 in their ring.
    const emergence = () => {
      const s = scrollState.sections.experience
      if (!scrollState.measured || !s) return 0
      return clamp01((scrollState.y - s.top) / (EMERGE * scrollState.vh))
    }

    const inView = () => {
      const s = scrollState.sections.experience
      if (!s) return false
      const y = scrollState.y
      return emergence() > 0.9 && y <= s.top + s.height - scrollState.vh * 0.65
    }

    // ---- drag and swipe
    let drag = null
    const onDown = (e) => {
      if (scrollMode) return
      if (e.pointerType === 'mouse' && e.button !== 0) return
      if (e.target.closest('button, a')) return
      if (drag?.started) {
        if (drag.id === e.pointerId) return
        letGo(0) // a second finger: the first one lets go
      }
      drag = {
        id: e.pointerId,
        type: e.pointerType,
        x0: e.clientX,
        y0: e.clientY,
        x: e.clientX,
        started: false,
        samples: [[e.timeStamp, e.clientX]],
        card: e.target.closest('[data-index]'),
      }
      // grabbing a spinning drum stops it under your hand
      if (wheel.glide && Math.abs(wheel.velocity) > 0.5) {
        hold()
        drag.started = true
        drag.caught = true
        vp.dataset.dragging = 'true'
      }
      if (e.pointerType === 'mouse') e.preventDefault() // no text selection or image drag
    }
    const onMove = (e) => {
      if (!drag || e.pointerId !== drag.id) return
      // a mouse released outside the page never sent its pointerup: drop the drag
      if (drag.type === 'mouse' && !(e.buttons & 1)) {
        if (drag.started) letGo(0)
        drag = null
        vp.dataset.dragging = 'false'
        return
      }
      if (!drag.started) {
        const tx = e.clientX - drag.x0
        const ty = e.clientY - drag.y0
        if (Math.abs(tx) < 5 || Math.abs(tx) < Math.abs(ty) * 1.1) {
          // mostly vertical on a touch screen: that's a scroll, not a turn
          if (Math.abs(ty) > 10 && drag.type !== 'mouse') drag = null
          return
        }
        drag.started = true
        hold()
        vp.dataset.dragging = 'true'
        try {
          vp.setPointerCapture(e.pointerId)
        } catch {}
      }
      const dx = e.clientX - drag.x
      drag.x = e.clientX
      turnBy(-dx / pxPerCard())
      drag.samples.push([e.timeStamp, e.clientX])
      while (drag.samples.length > 2 && e.timeStamp - drag.samples[0][0] > 100) drag.samples.shift()
    }
    const onUp = (e) => {
      if (!drag || e.pointerId !== drag.id) return
      // touch pointers start out captured by the element under the finger;
      // taking the capture for the viewport fires this on that element first
      if (e.type === 'lostpointercapture' && e.target !== vp) return
      const d = drag
      drag = null
      vp.dataset.dragging = 'false'
      if (d.started) {
        // release speed from the last ~100 ms of movement; a hand that stopped
        // before letting go gives no flick
        const s = d.samples
        const [t1, x1] = s[s.length - 1]
        const [t0, x0] = s[0]
        const still = e.timeStamp - t1 > 70
        const v = !still && t1 - t0 > 8 ? ((x1 - x0) / (t1 - t0)) * 1000 : 0
        letGo(-v / pxPerCard())
      } else if (d.card && e.type === 'pointerup') {
        bringToFront(Number(d.card.dataset.index))
      }
    }

    // ---- trackpads: a two-finger sideways swipe turns it (vertical still scrolls)
    let wheelTimer = 0
    const onWheelEvent = (e) => {
      if (scrollMode) return
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1
      const dx = e.deltaX * unit
      const dy = e.deltaY * unit
      if (Math.abs(dx) < 0.5 || Math.abs(dx) <= Math.abs(dy) * 1.1) return
      // ours, not the page's (and not the browser's back/forward swipe)
      e.preventDefault()
      e.stopPropagation()
      if (!wheel.held) hold()
      turnBy(dx / pxPerCard())
      clearTimeout(wheelTimer)
      // the trackpad's own momentum keeps sending events; settle when it ends
      wheelTimer = setTimeout(() => wheel.held && letGo(0), 180)
    }

    // ---- arrow keys, whenever the wheel is on screen
    const onKey = (e) => {
      if (scrollMode || e.defaultPrevented || e.altKey || e.metaKey || e.ctrlKey || e.shiftKey) return
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      if (e.target?.closest?.('input, textarea, select, [contenteditable="true"]')) return
      if (!inView()) return
      e.preventDefault()
      stepBy(e.key === 'ArrowRight' ? 1 : -1)
    }

    vp.addEventListener('pointerdown', onDown)
    vp.addEventListener('pointermove', onMove)
    vp.addEventListener('pointerup', onUp)
    vp.addEventListener('pointercancel', onUp)
    vp.addEventListener('lostpointercapture', onUp)
    vp.addEventListener('wheel', onWheelEvent, { passive: false })
    const noDrag = (e) => e.preventDefault()
    vp.addEventListener('dragstart', noDrag)
    window.addEventListener('keydown', onKey)

    // announce the card the wheel comes to rest on
    const off = onWheel((type, i) => {
      if (type !== 'rest') return
      if (live.current) live.current.textContent = `${experience[i].org}, ${i + 1} of ${N}`
      if (wheel.touched) hint.current?.setAttribute('data-touched', 'true')
    })

    // ---- draw
    let raf
    let lastTurn = NaN
    let lastE = -1
    let lastTime = performance.now()
    let seenAt = 0
    let nudges = 0
    const render = (e) => {
      const el = ring.current
      const reduced = scrollState.reducedMotion
      // u: the cards' journey out of the drum, eased so they slow as they settle
      const u = reduced ? 1 : easeOut(e / 0.92, 3)
      const rot = -(wheel.turn + wheel.spin) * STEP

      // Start with the ring's axis on the drum's: project the drum's screen
      // position back through the stage's perspective to the depth of the axis.
      let dx = 0
      let dy = 0
      const d = wheel.drum
      const ox = geo.W * 0.5
      const oy = geo.H * 0.35 // perspective-origin
      const tx = d ? d.x : ox
      const ty = d ? d.y : geo.H * 0.45
      if (u < 1) {
        const g = (PERSPECTIVE + geo.r) / PERSPECTIVE
        dx = (ox + (tx - ox) * g - geo.xc) * (1 - u)
        dy = (oy + (ty - oy) * g - geo.yc) * (1 - u)
      }
      const k = 0.1 + 0.9 * u // radius: from the axis out to the ring
      const s = 0.4 + 0.6 * u // and size
      el.style.transform = `translate3d(${dx.toFixed(2)}px, ${dy.toFixed(2)}px, 0) translateZ(calc(var(--r) * -1)) scale3d(${s.toFixed(4)}, ${s.toFixed(4)}, ${s.toFixed(4)}) rotateY(${rot.toFixed(3)}deg)`
      el.style.setProperty('--k', k.toFixed(4))

      const alpha = reduced ? smooth(0, 0.3, e) : smooth(0.02, 0.42, e)
      const ready = e > 0.9
      const front = frontCard()
      cards.current.forEach((card, i) => {
        if (!card) return
        const a = mod(i * STEP + rot + 180, 360) - 180
        const facing = Math.cos((a * Math.PI) / 180)
        // neighbours stay faintly visible so the ring reads as a ring
        const o = Math.max(0, (facing + 0.08) / 1.08)
        card.style.opacity = (Math.pow(o, 1.6) * alpha).toFixed(3)
        // the side cards can be clicked to bring them round
        card.style.pointerEvents = ready && Math.abs(a) < 100 ? 'auto' : 'none'
        const isFront = i === front
        if (card.dataset.front !== String(isFront)) {
          card.dataset.front = String(isFront)
          card.setAttribute('aria-hidden', String(!isFront))
        }
      })
      if (counter.current) counter.current.textContent = pad(front + 1)

      // the heading arrives with the cards; the controls once they've settled
      sec.style.setProperty('--head', (reduced ? smooth(0, 0.3, e) : smooth(0.3, 0.8, e)).toFixed(3))
      sec.style.setProperty('--meta', smooth(0.72, 0.98, e).toFixed(3))
      const stage = e <= 0 ? '0' : e >= 1 ? '1' : 'mid'
      if (sec.dataset.emerge !== stage) sec.dataset.emerge = stage
      if (sec.dataset.ready !== String(ready)) sec.dataset.ready = String(ready)

      // lamplight spilling out of the drum as the cards leave it
      if (glow.current) {
        const gl = reduced ? 0 : Math.sin(Math.PI * Math.min(1, u * 1.15)) * smooth(0, 0.12, e)
        glow.current.style.opacity = gl.toFixed(3)
        if (gl > 0.001) glow.current.style.transform = `translate3d(${(tx - geo.W / 2).toFixed(1)}px, ${(ty - geo.H / 2).toFixed(1)}px, 0) scale(${(0.7 + u * 0.6).toFixed(3)})`
      }
    }
    const tick = (now) => {
      raf = requestAnimationFrame(tick)
      // the glide is closed-form in time, so slow frames don't slow the drum down
      const dt = Math.min(0.25, Math.max(0, (now - lastTime) / 1000))
      lastTime = now
      if (!ring.current) return
      const e = emergence()
      // as they come out the drum unspools them: a little extra turn, gone once they're out
      wheel.spin = scrollState.reducedMotion ? 0 : -(1 - easeOut(e, 4)) * 1.4
      if (scrollMode) {
        const s = scrollState.sections.experience
        if (scrollState.measured && s) {
          const span = Math.max(1, s.height - scrollState.vh * (1 + EMERGE))
          setTurn(ringTurn(clamp01((scrollState.y - s.top - EMERGE * scrollState.vh) / span), N))
        }
      } else {
        update(dt)
        // the first time you arrive, the drum gives a small swing: "this turns"
        if (!wheel.touched && nudges < 2 && !scrollState.reducedMotion) {
          if (inView()) {
            seenAt = seenAt || now
            if (now - seenAt > (nudges === 0 ? 1100 : 7000)) {
              nudge()
              nudges++
              seenAt = now
            }
          } else seenAt = 0
        }
      }
      // redraw when the drum turns or the cards move (and every frame while
      // they're coming out, as they track the drum through the camera's drift)
      const moving = e > 0 && e < 1
      if (!moving && Math.abs(wheel.turn - lastTurn) < 1e-5 && Math.abs(e - lastE) < 1e-5) return
      lastTurn = wheel.turn
      lastE = e
      render(e)
    }
    measure()
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(wheelTimer)
      ro.disconnect()
      wheel.spin = 0
      off()
      vp.removeEventListener('pointerdown', onDown)
      vp.removeEventListener('pointermove', onMove)
      vp.removeEventListener('pointerup', onUp)
      vp.removeEventListener('pointercancel', onUp)
      vp.removeEventListener('lostpointercapture', onUp)
      vp.removeEventListener('wheel', onWheelEvent)
      vp.removeEventListener('dragstart', noDrag)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  return (
    <section
      ref={section}
      data-scene="experience"
      className="exp relative"
      style={{ '--n': N, '--rk': RK.toFixed(4) }}
      aria-labelledby="experience-title"
    >
      {/* links to #experience land with the cards already out of the wheel */}
      <span id="experience" className="exp-anchor" aria-hidden="true" />
      <div className="exp-stage">
        <header className="shell exp-header">
          <p className="eyebrow text-snow/70">
            <span className="text-snow">03</span> — Experience
          </p>
          <h2 id="experience-title" className="title mt-5 text-[clamp(2.5rem,min(5.6vw,9.5vh),5.25rem)] text-snow">
            Some stuff I&rsquo;ve <em className="italic">done</em>
          </h2>
          <p className="exp-lede mt-4 max-w-[24rem] text-[0.98rem] leading-[1.65] text-snow/70">
            Things I&rsquo;ve started, teams I&rsquo;ve worked with, and a few wins along the way.
          </p>
          <div className="exp-meta eyebrow mt-6 flex items-center gap-5 text-snow/65" aria-hidden="true">
            <span>
              <span ref={counter} className="text-saffron">
                01
              </span>{' '}
              / {pad(N)}
            </span>
            <span ref={hint} className="exp-hint flex items-center gap-2 text-snow/60">
              <TurnIcon />
              <span ref={hintLabel}>Drag to turn</span>
            </span>
          </div>
        </header>

        <div
          ref={viewport}
          className="exp-viewport"
          role="region"
          aria-roledescription="carousel"
          aria-label="Experience. Use the arrow buttons or the left and right arrow keys to turn the wheel."
        >
          <div ref={glow} className="exp-glow" aria-hidden="true" />
          <button type="button" className="exp-arrow exp-arrow--prev" aria-label="Previous chapter" onClick={() => stepBy(-1)}>
            <Chevron />
          </button>
          <ol ref={ring} className="exp-ring">
            {experience.map((item, i) => (
              <li
                key={item.org}
                ref={(el) => (cards.current[i] = el)}
                data-index={i}
                className="exp-card"
                style={{ '--i': i, '--step': `${STEP}deg` }}
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${N}`}
              >
                <article className="glass-warm orn-host relative flex h-full flex-col overflow-hidden rounded-[1.25rem]">
                  <div className="relative aspect-[2/1] shrink-0 overflow-hidden bg-black/40 md:aspect-[16/10]">
                    <Image
                      src={item.image}
                      alt={item.imageAlt}
                      fill
                      draggable={false}
                      sizes="(min-width: 768px) 26rem, 80vw"
                      className="object-cover"
                    />
                    <div aria-hidden="true" className="absolute inset-0 ring-1 ring-inset ring-white/[0.07]" />
                  </div>
                  <div className="flex flex-1 flex-col p-6 sm:p-7">
                    <div className="eyebrow flex items-center justify-between text-snow/60">
                      <span>{item.role}</span>
                      <span>{pad(i + 1)}</span>
                    </div>
                    <h3 className="title mt-4 text-[clamp(1.75rem,2.4vw,2.25rem)] text-snow">{item.org}</h3>
                    <p className="mt-3 text-[0.92rem] leading-[1.55] text-snow/75 md:text-[0.96rem] md:leading-[1.62]">{item.description}</p>
                    <ul className="mt-auto flex flex-wrap gap-2 pt-4 md:pt-5" aria-label="Focus">
                      {item.tags.map((t) => (
                        <li key={t} className="rounded-full border border-saffron/25 px-2.5 py-0.5 text-[0.75rem] text-saffron/90">
                          {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Ornament tone="brass" />
                </article>
              </li>
            ))}
          </ol>
          <button type="button" className="exp-arrow exp-arrow--next" aria-label="Next chapter" onClick={() => stepBy(1)}>
            <Chevron flip />
          </button>
        </div>
        <p ref={live} className="sr-only" aria-live="polite" />
      </div>
    </section>
  )
}

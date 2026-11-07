'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import { experience } from '@/content/site'
import { pinProgress, scrollState } from '@/lib/scroll'
import { ringTurn } from '@/lib/ring'

const N = experience.length
const STEP = 360 / N

// "Turning the wheel": the experience cards sit on a slowly turning drum in
// front of the monastery's prayer wheel; scrolling turns both. Cards are real
// HTML (crisp, selectable, readable by screen readers), arranged with CSS 3D.
// Without JavaScript they fall back to a simple horizontal list.
export default function Experience() {
  const ring = useRef(null)
  const counter = useRef(null)
  const cards = useRef([])

  useEffect(() => {
    let raf
    let last = -1
    const tick = () => {
      raf = requestAnimationFrame(tick)
      if (!scrollState.measured || !ring.current) return
      const p = pinProgress('experience')
      if (Math.abs(p - last) < 1e-5) return
      last = p
      const rot = -ringTurn(p, N) * STEP
      ring.current.style.transform = `translateZ(calc(var(--r) * -1)) rotateY(${rot}deg)`
      let front = 0
      cards.current.forEach((card, i) => {
        if (!card) return
        let a = (i * STEP + rot) % 360
        if (a > 180) a -= 360
        if (a < -180) a += 360
        const facing = Math.cos((a * Math.PI) / 180)
        // neighbours stay faintly visible so the ring reads as a ring
        const o = Math.max(0, (facing + 0.08) / 1.08)
        card.style.opacity = Math.pow(o, 1.6).toFixed(3)
        card.style.pointerEvents = Math.abs(a) < STEP / 2 ? 'auto' : 'none'
        if (Math.abs(a) < STEP / 2) front = i
      })
      if (counter.current) counter.current.textContent = String(front + 1).padStart(2, '0')
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <section
      id="experience"
      data-scene="experience"
      className="exp relative"
      style={{ '--n': N }}
      aria-labelledby="experience-title"
    >
      <div className="exp-stage">
        <header className="shell exp-header">
          <p className="eyebrow text-snow/70">
            <span className="text-snow">03</span> — Experience
          </p>
          <h2 id="experience-title" className="title mt-5 text-[clamp(2.5rem,5.6vw,5.25rem)] text-snow">
            Turning the <em className="italic">wheel</em>
          </h2>
          <p className="mt-4 max-w-[24rem] text-[0.98rem] leading-[1.65] text-snow/70">
            Ventures, roles and teams I&rsquo;ve been part of. Each turn of the wheel, another chapter.
          </p>
          <p className="eyebrow exp-counter mt-6 text-snow/65" aria-hidden="true">
            <span ref={counter} className="text-saffron">
              01
            </span>{' '}
            / {String(N).padStart(2, '0')} <span className="ml-3 text-snow/55">Scroll to turn</span>
          </p>
        </header>

        <div className="exp-viewport">
          <ol ref={ring} className="exp-ring" aria-label="Experience">
            {experience.map((item, i) => (
              <li
                key={item.org}
                ref={(el) => (cards.current[i] = el)}
                className="exp-card"
                style={{ '--i': i, '--step': `${STEP}deg` }}
              >
                <article className="glass-warm flex h-full flex-col overflow-hidden rounded-[1.25rem]">
                  <div className="relative aspect-[16/10] shrink-0 overflow-hidden bg-black/40">
                    <Image
                      src={item.image}
                      alt={item.imageAlt}
                      fill
                      sizes="(min-width: 768px) 26rem, 80vw"
                      className="object-cover"
                    />
                    <div aria-hidden="true" className="absolute inset-0 ring-1 ring-inset ring-white/[0.07]" />
                  </div>
                  <div className="flex flex-1 flex-col p-6 sm:p-7">
                    <div className="eyebrow flex items-center justify-between text-snow/60">
                      <span>{item.role}</span>
                      <span>{String(i + 1).padStart(2, '0')}</span>
                    </div>
                    <h3 className="title mt-4 text-[clamp(1.75rem,2.4vw,2.25rem)] text-snow">{item.org}</h3>
                    <p className="mt-3 text-[0.96rem] leading-[1.62] text-snow/75">{item.description}</p>
                    <ul className="mt-auto flex flex-wrap gap-2 pt-5" aria-label="Focus">
                      {item.tags.map((t) => (
                        <li key={t} className="rounded-full border border-saffron/25 px-2.5 py-0.5 text-[0.75rem] text-saffron/90">
                          {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

'use client'

import { useRef } from 'react'
import { projects } from '@/content/site'
import { dest } from '@/lib/destinations'
import { openDestination, PATHS } from '@/lib/journey'

// A pecha between its boards, its silk face hung on the end: the library
function PechaGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 7.2h17M3.5 17.3h17" strokeWidth="1.8" />
      <rect x="5" y="8.9" width="14" height="6.7" rx="2.6" strokeWidth="1.4" />
      <path d="M10 8.9v4.4l2 1.5 2-1.5V8.9" strokeWidth="1.15" opacity=".75" />
    </svg>
  )
}

// A hand prayer wheel: the drum on its spindle, the weight on its chain
function WheelGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 2.6v2" strokeWidth="1.6" />
      <rect x="6.6" y="4.6" width="8.8" height="9.6" rx="2.2" strokeWidth="1.5" />
      <path d="M6.6 8.1h8.8M6.6 10.9h8.8" strokeWidth="1.05" opacity=".7" />
      <path d="M11 14.2v7.2" strokeWidth="1.9" />
      <path d="M15.4 6.4l2.9 3.3" strokeWidth="1.05" />
      <circle cx="18.9" cy="10.6" r="1.35" fill="currentColor" stroke="none" />
    </svg>
  )
}

// The peak with a flag flying from its top: the summit
function PeakGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.6 20 9.7 8.3l2.9 4.5 2.2-3 6.6 10.2z" strokeWidth="1.5" />
      <path d="M7.2 12.4l2.5 1.7 1.5-1.2" strokeWidth="1.05" opacity=".7" />
      <path d="M9.7 8.3V2.8" strokeWidth="1.3" />
      <path d="M9.7 3.1l4.4 1.4-4.4 1.5z" fill="currentColor" strokeWidth="1" />
    </svg>
  )
}

const MARKERS = [
  { id: 'library', kind: 'Projects', title: 'The library', note: `${projects.length} texts`, Glyph: PechaGlyph },
  { id: 'temple', kind: 'Experience', title: 'The prayer wheel', note: 'Turn it', Glyph: WheelGlyph },
  { id: 'summit', kind: 'Guestbook', title: 'The summit', note: 'Pull the lever', Glyph: PeakGlyph },
]

/**
 * Where to now? The mountain with its three destinations, each marked by a
 * small hovering sign the scene pins over it (three/Gompas): over the roofs of
 * the two monasteries, and hanging just under the very top of the mountain.
 * Choosing one flies the camera there. They are real links underneath, so they
 * still go to /projects, /experience and /summit without the scene, and open
 * in a new tab as usual.
 */
export default function Destinations() {
  const section = useRef(null)

  const onClick = (e, id) => {
    // new tabs, new windows and downloads go their own way
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    // without the scene there is no mountain to fly over: just follow the link
    if (document.documentElement.dataset.webgl !== 'yes') return
    e.preventDefault()
    openDestination(id)
  }

  // Tabbing onto a sign while the view is elsewhere brings the view round first
  const onFocus = (e) => {
    if (e.currentTarget.dataset.on === 'true' || document.documentElement.dataset.webgl !== 'yes') return
    const s = section.current
    if (!s) return
    const top = s.getBoundingClientRect().top
    if (top <= 0 && top > -0.4 * window.innerHeight) return // already in view
    const y = top + window.scrollY
    if (window.__lenis) window.__lenis.scrollTo(y, { duration: 1.2 })
    else window.scrollTo({ top: y, behavior: 'smooth' })
  }

  return (
    <section ref={section} id="destinations" data-scene="destinations" className="dest relative" aria-labelledby="dest-title">
      <div className="dest-stage">
        <div data-dest-shade className="dest-shade pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="shell dest-copy relative">
          <div data-reveal>
            <p className="eyebrow text-snow/70">
              <span className="text-snow">02</span> — Choose your destination
            </p>
            <h2 id="dest-title" className="display mt-5 text-[clamp(3rem,min(6.6vw,11.5vh),6.25rem)] text-snow md:mt-6">
              Where to <em>now?</em>
            </h2>
            <p className="prose-lede mt-5 max-w-[27rem] text-snow/80 md:mt-6">
              Go explore the places. You might find something cool.
            </p>
          </div>
        </div>

        <ul className="dest-list" aria-label="Destinations">
          {MARKERS.map(({ id, kind, title, note, Glyph }) => (
            <li key={id}>
              <a
                href={PATHS[id]}
                ref={(el) => {
                  if (el) dest.els[id] = el
                  else delete dest.els[id]
                }}
                className="dest-marker"
                data-dest={id}
                data-on="false"
                data-side="right"
                onClick={(e) => onClick(e, id)}
                onFocus={onFocus}
                onPointerEnter={() => (dest.hover = id)}
                onPointerLeave={() => dest.hover === id && (dest.hover = null)}
              >
                <span className="dest-inner">
                  <span className="dest-pin" aria-hidden="true">
                    <Glyph />
                  </span>
                  <span className="dest-label">
                    <span className="dest-kind">{kind}</span>
                    <span className="dest-title">{title}</span>
                    <span className="dest-note">{note}</span>
                  </span>
                  <span className="dest-stem" aria-hidden="true" />
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

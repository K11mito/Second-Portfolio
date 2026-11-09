'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import Image from 'next/image'
import { shelfItems, tib, metaOf } from './pecha'
import s from './library.module.css'

// The canvas fonts: the site's own (next/font names them), and the Tibetan cut.
function canvasFonts() {
  const css = getComputedStyle(document.documentElement)
  const v = (name, fallback) => css.getPropertyValue(name).trim() || fallback
  return {
    serif: `${v('--font-serif', "'Instrument Serif'")}, Georgia, serif`,
    mono: `${v('--font-mono', "'DM Mono'")}, ui-monospace, monospace`,
    tib: "'Jomolhari Library', 'Noto Serif Tibetan', serif",
  }
}
function loadFonts(f) {
  return Promise.race([
    Promise.all([
      document.fonts.load(`italic 52px ${f.serif}`),
      document.fonts.load(`52px ${f.serif}`),
      document.fonts.load(`500 20px ${f.mono}`),
      document.fonts.load(`40px ${f.tib}`, '༄༅ཀ༠༡༢'),
    ]),
    new Promise((r) => setTimeout(r, 3000)),
  ]).catch(() => {})
}

// A lotus, for the texts that have no picture
function Lotus({ n }) {
  return (
    <svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="200" height="200" fill="#3a170c" />
      <circle cx="100" cy="100" r="84" fill="none" stroke="#7c2414" strokeWidth="10" />
      {Array.from({ length: 8 }, (_, k) => (
        <ellipse key={k} cx="100" cy="58" rx="13" ry="30" transform={`rotate(${k * 45} 100 100)`} fill="none" stroke="#d8ae58" strokeWidth="2" />
      ))}
      <circle cx="100" cy="100" r="26" fill="#5a1c0e" stroke="#d8ae58" strokeWidth="2" />
      <text x="100" y="112" textAnchor="middle" fontFamily="'Jomolhari Library', serif" fontSize="34" fill="#efd383">
        {tib(n)}
      </text>
    </svg>
  )
}

function Caption({ it, total }) {
  if (!it) {
    return (
      <>
        {total} texts, newest first · <b>open one to read it</b>
      </>
    )
  }
  return (
    <>
      <span className={s.tib} lang="bo">
        {tib(it.n)}
      </span>
      {it.next ? (
        <>
          <b>The next project</b> · still being written
        </>
      ) : (
        <>
          <b>{it.title}</b> · {it.year} · {it.kind}
          {it.featured ? ' · precious' : ''}
        </>
      )}
    </>
  )
}

/**
 * The /projects library: the bookcase (createLibrary, loaded once the page is
 * up) and everything around it. `intro` is the page's header and `children`
 * its plain list of projects, both rendered on the server; the list stands in
 * when there is no WebGL. In tab order: home, the texts on the shelf, the
 * glossary, then the plain list.
 */
export default function Library({ projects, intro, children }) {
  const items = useMemo(() => shelfItems(projects), [projects])
  const total = projects.length
  const stageRef = useRef(null)
  const leafRef = useRef(null)
  const innerRef = useRef(null)
  const frontShade = useRef(null)
  const backShade = useRef(null)
  const closeRef = useRef(null)
  const keyRefs = useRef([])
  const lib = useRef(null)
  const [webgl, setWebgl] = useState('pending')
  const [ready, setReady] = useState(false)
  const [hover, setHover] = useState(-1)
  const [current, setCurrent] = useState(-1)
  const [room, setRoom] = useState('closed') // closed → reading → leaving → closed
  const [panHint, setPanHint] = useState(false)
  const [about, setAbout] = useState(false)

  useEffect(() => {
    let cancelled = false
    let library = null
    // a canvas of its own for each scene, so its WebGL context can be let go
    const canvas = document.createElement('canvas')
    canvas.className = s.canvas
    canvas.setAttribute('aria-hidden', 'true')
    ;(async () => {
      try {
        const fonts = canvasFonts()
        const [{ createLibrary }] = await Promise.all([import('./createLibrary'), loadFonts(fonts)])
        if (cancelled) return
        stageRef.current.appendChild(canvas)
        library = createLibrary({
          canvas,
          items,
          fonts,
          dom: { leaf: leafRef.current, inner: innerRef.current, shades: [frontShade.current, backShade.current] },
          on: {
            hover: setHover,
            open(i) {
              flushSync(() => {
                setCurrent(i)
                setRoom('reading')
              })
              closeRef.current?.focus({ preventScroll: true })
            },
            show: (i) => flushSync(() => setCurrent(i)),
            leaving: () => setRoom('leaving'),
            closed(i, byKeyboard) {
              flushSync(() => {
                setRoom('closed')
                setHover(-1)
              })
              if (byKeyboard) keyRefs.current[i]?.focus({ preventScroll: true })
              else if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
            },
            panHint: setPanHint,
            ready: () => setReady(true),
          },
        })
        lib.current = library
        setWebgl('yes')
      } catch (err) {
        // no WebGL (or the scene failed to load): the plain list stands in
        canvas.remove()
        if (cancelled) return
        setWebgl('no')
        setReady(true)
      }
    })()
    return () => {
      cancelled = true
      lib.current = null
      library?.dispose()
      canvas.remove()
    }
  }, [items])

  const it = current >= 0 ? items[current] : null
  const open = room !== 'closed'
  const quiet = it && (it.next ? 'Blank for now' : it.private && !it.links.length ? 'Kept private' : null)

  return (
    <div className={s.page} data-webgl={webgl} data-room={room}>
      <div ref={stageRef} />
      <div className={s.vignette} aria-hidden="true" />

      <div inert={open ? '' : undefined}>
        {intro}
        {webgl !== 'no' && (
          <ul className={s.keys} aria-label="Open a text from the shelf">
            {items.map((t, i) => (
              <li key={t.n}>
                <button
                  type="button"
                  ref={(el) => (keyRefs.current[i] = el)}
                  onFocus={() => lib.current?.focus(i)}
                  onBlur={() => lib.current?.blur()}
                  onClick={() => lib.current?.open(i, true)}
                >
                  {t.next ? 'The next project, still being written' : `${t.title}, ${t.year}, ${t.kind}`}
                </button>
              </li>
            ))}
          </ul>
        )}
        <button type="button" className={s.aboutToggle} aria-expanded={about} aria-controls="pecha-about" onClick={() => setAbout((a) => !a)}>
          What’s a pecha?
        </button>
        <dl className={s.about} id="pecha-about" hidden={!about}>
          <div>
            <dt>
              Pecha
              <span className={s.tib} lang="bo">
                དཔེ་ཆ།
              </span>
            </dt>
            <dd>A Tibetan book of loose, long leaves, read lying flat, each leaf turned away from you.</dd>
          </div>
          <div>
            <dt>
              Legshing
              <span className={s.tib} lang="bo">
                གླེགས་ཤིང་།
              </span>
            </dt>
            <dd>The pair of wooden boards the leaves are kept between, one above and one below.</dd>
          </div>
          <div>
            <dt>
              Peré
              <span className={s.tib} lang="bo">
                དཔེ་རས།
              </span>
            </dt>
            <dd>The cloth the boards are wrapped in. Precious texts go in yellow silk; here, the three I’m proudest of.</dd>
          </div>
          <div>
            <dt>
              Dongdar
              <span className={s.tib} lang="bo">
                གདོང་དར།
              </span>
            </dt>
            <dd>The silk face hung on the bundle’s end, with a short title inked on gauze: the shelf’s call number.</dd>
          </div>
        </dl>
        <p className={s.caption} aria-live="polite">
          <Caption it={hover >= 0 ? items[hover] : null} total={total} />
        </p>
        <p className={s.panHint} hidden={!panHint}>
          Drag to look along the shelf
        </p>
        {children}
      </div>

      <p className={s.loading} data-done={ready} aria-hidden="true">
        Lighting the lamps
      </p>

      <div className={s.room} role="dialog" aria-modal="true" aria-labelledby="leaf-title" hidden={!open} data-reading={room === 'reading'}>
        <div className={s.backdrop} onClick={() => lib.current?.backdrop()} />
        <p className={`${s.roomHint} ${s.roomUi}`}>Click the leaf to turn it · Esc to put it back</p>
        <button type="button" ref={closeRef} className={`${s.chip} ${s.roomClose} ${s.roomUi}`} onClick={() => lib.current?.putBack()}>
          <span aria-hidden="true">✕</span>
          <span className={s.chipLabel}>Put it back</span>
        </button>
        <div className={`${s.roomBar} ${s.roomUi}`}>
          <button type="button" className={`${s.chip} ${s.chipRound}`} aria-label="Newer project" onClick={() => lib.current?.go(-1)}>
            ‹
          </button>
          <button type="button" className={s.chip} onClick={() => lib.current?.turn()}>
            <span aria-hidden="true">↻</span>
            <span className={s.chipLabel}>Turn the leaf</span>
          </button>
          <span className={s.counter}>
            {it && (
              <>
                <span className={s.tib} lang="bo">
                  {tib(it.n)}
                </span>
                {it.next ? 'Next' : `${it.n} of ${total}`}
              </>
            )}
          </span>
          <button type="button" className={`${s.chip} ${s.chipRound}`} aria-label="Older project" onClick={() => lib.current?.go(1)}>
            ›
          </button>
        </div>

        <article
          ref={leafRef}
          className={`${s.leaf} ${it?.featured ? s.precious : ''}`}
          onClick={(e) => {
            if (!e.target.closest('a, button')) lib.current?.leaf()
          }}
        >
          <div ref={innerRef} className={s.inner}>
            {/* the front: the title page */}
            <div className={s.face} aria-hidden="true">
              {it && (
                <>
                  <div className={s.margin}>
                    <span lang="bo">ཀ {tib(it.n)}</span>
                  </div>
                  <div className={s.frame} />
                  <div className={s.frontBody}>
                    <p className={s.headmark} lang="bo">
                      ༄༅། །
                    </p>
                    <p className={s.frontTitle}>{it.title}</p>
                    <p className={s.frontSub}>{metaOf(it)}</p>
                  </div>
                  <span className={s.frontNum} lang="bo">
                    {tib(it.n)}
                  </span>
                </>
              )}
              <div ref={frontShade} className={s.shade} />
            </div>
            {/* the back: what it is */}
            <div className={`${s.face} ${s.faceBack}`}>
              {it && (
                <>
                  <div className={s.margin} aria-hidden="true">
                    <span lang="bo">ཀ {tib(it.n)}</span>
                  </div>
                  <div className={s.frame} />
                  <div className={s.backBody}>
                    <figure className={s.mini}>
                      <div className={s.miniFrame}>
                        {it.image ? (
                          <Image
                            key={it.image}
                            src={it.image}
                            alt={it.imageAlt || it.title}
                            fill
                            sizes="(max-width: 720px) 92vw, 24rem"
                            style={{ objectPosition: it.focus || 'center' }}
                          />
                        ) : (
                          <Lotus n={it.n} />
                        )}
                      </div>
                      <figcaption>{it.kind}</figcaption>
                    </figure>
                    <div className={s.text}>
                      <p className={s.headmark} lang="bo" aria-hidden="true">
                        ༄༅། །
                      </p>
                      <h2 className={s.leafTitle} id="leaf-title">
                        {it.title}
                      </h2>
                      <p className={s.meta}>
                        {metaOf(it)}
                        {it.year && (
                          <>
                            {' '}
                            <span className={s.tib} lang="bo" aria-hidden="true">
                              {tib(it.year)}
                            </span>
                          </>
                        )}
                      </p>
                      {it.note && <p className={s.note}>{it.note}</p>}
                      <p className={s.desc}>{it.description}</p>
                      {it.tags.length > 0 && <p className={s.tags}>{it.tags.join(' · ')}</p>}
                    </div>
                    <div className={s.seals}>
                      {it.links.map((l, k) => (
                        <a
                          key={l.href}
                          className={s.seal}
                          style={{ '--seal-tilt': `${k % 2 ? 3 : -4}deg` }}
                          href={l.href}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {l.label}
                          <span className={s.arrow} aria-hidden="true">
                            ↗
                          </span>
                          <span className={s.srOnly}> (opens in a new tab)</span>
                        </a>
                      ))}
                      {quiet && <span className={`${s.seal} ${s.sealQuiet}`}>{quiet}</span>}
                    </div>
                  </div>
                </>
              )}
              <div ref={backShade} className={s.shade} />
            </div>
          </div>
        </article>
      </div>
    </div>
  )
}

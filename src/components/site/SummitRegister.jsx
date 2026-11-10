'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import localFont from 'next/font/local'
import { closeDestination, useJourney } from '@/lib/journey'
import { NOTE, NOTES_PER_DAY } from '@/lib/summitRules'
import { loadRegister, pinNote, pullLever, register, setLever, useRegister } from '@/lib/summitClient'
import { scrollState } from '@/lib/scroll'

// The notes are handwritten (Caveat, kept with the site so a build never
// waits on a font service; loaded only once the board is on screen)
const hand = localFont({ src: '../../app/fonts/caveat-latin.woff2', weight: '400 700', variable: '--font-hand', display: 'swap', preload: false })

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)
const easeIn = (x) => x * x * x
const easeOut = (x) => 1 - Math.pow(1 - x, 3)
// back up with a little bounce, as a sprung lever does
const springBack = (x) => 1 - Math.cos(x * Math.PI * 2.5) * Math.exp(-5.5 * x) * (1 - x)

const fmt = (n) => Number(n).toLocaleString('en-US')
const ORD = { one: 'st', two: 'nd', few: 'rd', other: 'th' }
const ordinal = (n) => `${fmt(n)}${ORD[new Intl.PluralRules('en-US', { type: 'ordinal' }).select(n)]}`
const climbers = (n) => (n === 1 ? '1 climber has' : `${fmt(n)} climbers have`)

const TACKS = ['blue', 'white', 'red', 'green', 'yellow']
const hex = (id, a, b) => parseInt(String(id).slice(a, b), 16) || 0
const dated = (at) => {
  const d = new Date(at)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

// the board slides up from the foot of the screen on phones (and narrow, tall windows)
const SHEET = '(max-width: 767px), (max-aspect-ratio: 4/5)'
const onMedia = (fn) => {
  const m = window.matchMedia(SHEET)
  m.addEventListener('change', fn)
  return () => m.removeEventListener('change', fn)
}
const useSheet = () =>
  useSyncExternalStore(
    onMedia,
    () => window.matchMedia(SHEET).matches,
    () => false
  )

const PULLED = {
  closed: 'The register isn’t open yet. Try again soon.',
  busy: 'A lot of pulls from your network today. Try again tomorrow.',
  failed: 'The lever stuck. Give it a moment and try again.',
}
const PINNED = {
  empty: 'Write something first.',
  limit: `That’s ${NOTES_PER_DAY} notes from you today. The board will be here tomorrow.`,
  closed: 'The board isn’t up yet.',
  forbidden: 'Reload the page and try again.',
  failed: 'It didn’t stick. Try again in a moment.',
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 3.5 20.5 9.5M16 5l-4.5 4.5-4-1L5 11l8 8 2.5-2.5-1-4L19 8" />
      <path d="M9 15l-5 5" />
    </svg>
  )
}

function LeverIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="9" width="11" height="8" rx="1.6" />
      <path d="M14.5 13h2.2l2.3-8.5" />
      <circle cx="19.3" cy="3.9" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  )
}

/**
 * The summit, opened over the page when you arrive at the top (see Journey):
 * the register to pull (the lever on the counter in the scene, or the button
 * here), how many have made it up, and the board of notes people leave, with
 * a slip of paper to write your own and pin it up.
 */
export default function SummitRegister() {
  const j = useJourney()
  const r = useRegister()
  const sheet = useSheet()
  const open = j.to === 'summit' && (j.state === 'inside' || j.state === 'leaving')
  const [said, setSaid] = useState(null) // what the lever's last pull came to
  const [pulling, setPulling] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [fresh, setFresh] = useState(null) // the note just pinned
  const anim = useRef(0)
  const busy = useRef(false)
  const drag = useRef(null)
  const dialog = useRef(null)

  // up there, the register is fetched fresh, and kept fresh while you stay
  useEffect(() => {
    if (!open) return
    loadRegister(true)
    const id = setInterval(() => document.visibilityState === 'visible' && loadRegister(true), 30000)
    return () => clearInterval(id)
  }, [open])

  // leaving puts the lever back and the board down
  useEffect(() => {
    if (open) return
    cancelAnimationFrame(anim.current)
    setLever(0)
    busy.current = false
    setPulling(false)
    setExpanded(false)
    setSaid(null)
    if (dialog.current?.open) dialog.current.close()
  }, [open])

  // ---------------------------------------------------------------- the lever
  const swing = (to, seconds, ease) =>
    new Promise((resolve) => {
      cancelAnimationFrame(anim.current)
      const from = register.lever
      if (scrollState.reducedMotion || seconds <= 0) {
        setLever(to)
        resolve()
        return
      }
      const t0 = performance.now()
      const step = (now) => {
        const k = clamp01((now - t0) / 1000 / seconds)
        setLever(from + (to - from) * ease(k))
        if (k < 1) anim.current = requestAnimationFrame(step)
        else resolve()
      }
      anim.current = requestAnimationFrame(step)
    })

  // down, a clunk at the bottom (the count is sent), and back up on its spring
  const pull = async () => {
    if (busy.current) return
    busy.current = true
    setPulling(true)
    await swing(1, 0.3 * (1 - register.lever) + 0.06, easeIn)
    const counting = pullLever()
    await swing(0, 0.9, springBack)
    const out = await counting
    setSaid(out.error ? { error: out.error } : out.already ? { again: true } : { counted: true })
    busy.current = false
    setPulling(false)
  }

  // the handle over the lever's grip: drag it down (or just click it)
  const travel = () => Math.min(150, Math.max(70, window.innerHeight * 0.15))
  const onDown = (e) => {
    if (busy.current || (e.pointerType === 'mouse' && e.button !== 0)) return
    cancelAnimationFrame(anim.current)
    drag.current = { id: e.pointerId, y: e.clientY, from: register.lever, moved: false }
    e.currentTarget.setPointerCapture(e.pointerId)
    e.currentTarget.dataset.grabbing = 'true'
  }
  const onMove = (e) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    const dy = e.clientY - d.y
    if (Math.abs(dy) > 4) d.moved = true
    setLever(clamp01(d.from + dy / travel()))
  }
  const onUp = (e) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    drag.current = null
    e.currentTarget.dataset.grabbing = 'false'
    if (!d.moved || register.lever > 0.55) pull()
    else swing(0, 0.4, easeOut)
  }

  // ---------------------------------------------------------------- the note
  const [text, setText] = useState('')
  const [name, setName] = useState('')
  const [from, setFrom] = useState('')
  const [sending, setSending] = useState(false)
  const [problem, setProblem] = useState(null)
  const trap = useRef(null)

  const write = () => {
    const d = dialog.current
    if (!d) return
    setProblem(null)
    if (!d.open) d.showModal()
    d.querySelector('textarea')?.focus()
  }
  const putAway = () => dialog.current?.close()
  const onSubmit = async (e) => {
    e.preventDefault()
    if (sending) return
    if (!text.trim()) {
      setProblem(PINNED.empty)
      return
    }
    setSending(true)
    setProblem(null)
    const out = await pinNote({ text, name, from, website: trap.current?.value || '' })
    setSending(false)
    if (out.error) {
      setProblem(PINNED[out.error] || PINNED.failed)
      return
    }
    setText('')
    setFresh(out.note.id)
    setExpanded(true)
    putAway()
  }
  // Escape puts the slip away (and only the slip: the page would take you down the mountain)
  const onDialogKey = (e) => {
    if (e.key !== 'Escape') return
    e.preventDefault()
    putAway()
  }

  // ---------------------------------------------------------------- words
  let status
  if (r.status !== 'ready') status = 'Counting the climbers…'
  else if (!r.open) status = 'The register opens soon.'
  else if (r.number) status = `You’re the ${ordinal(r.number)} to reach the top${r.count > r.number ? `, of ${fmt(r.count)} so far` : ''}.`
  else if (!r.count) status = 'No one has signed in yet. Be the first.'
  else status = `${climbers(r.count)} reached the top.`
  let after = null
  if (said?.error) after = PULLED[said.error] || PULLED.failed
  else if (said?.again) after = 'It only counts you once. Still, nice pull.'
  else if (said?.counted) after = `Counted. Now leave a note on the board${sheet ? ' below' : ''}.`

  const notes = r.notes || []
  const counted = !!r.number

  return (
    <section
      id="summit"
      className={`summit ${hand.variable}`}
      data-open={open ? 'true' : 'false'}
      data-leaving={open && j.state === 'leaving' ? 'true' : 'false'}
      data-sheet={sheet ? 'true' : 'false'}
      data-expanded={expanded ? 'true' : 'false'}
      aria-labelledby="summit-title"
      data-lenis-prevent
    >
      {/* the lever's handle: the scene keeps it over the grip (three/Summit) */}
      <div
        ref={(el) => {
          if (el) register.els.lever = el
          else delete register.els.lever
        }}
        className="summit-lever"
        data-counted={counted ? 'true' : 'false'}
        data-pulling={pulling ? 'true' : 'false'}
        aria-hidden="true"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <span className="summit-lever-ring" />
        <span className="summit-lever-tag">Pull</span>
      </div>

      <button type="button" className="journey-back" onClick={closeDestination}>
        <span aria-hidden="true">←</span>
        The mountain
      </button>

      <header className="summit-panel glass">
        <p className="eyebrow text-snow/70">
          <span className="tib" lang="bo" aria-hidden="true">
            རི་རྩེ།
          </span>{' '}
          The summit · 6,190 m
        </p>
        <h2 id="summit-title" className="title mt-4 text-[clamp(2.3rem,min(4.4vw,7.5vh),3.6rem)] text-snow">
          You made <em>it.</em>
        </h2>
        <p className="summit-lede mt-3 text-[0.95rem] leading-[1.6] text-snow/75">
          Pull the lever, and leave a note on the board. What&rsquo;s up?
        </p>
        <p className="summit-status mt-4 text-snow" aria-live="polite">
          {status}
          {after && <span className="summit-after">{after}</span>}
        </p>
        <button type="button" className="summit-pull mt-4" onClick={pull} disabled={pulling || r.status !== 'ready'}>
          <LeverIcon />
          {counted ? 'Pull it again' : 'Pull the lever'}
        </button>
        {r.sketch && <p className="summit-sketch">Preview: this register lives in memory, and forgets now and then.</p>}
      </header>

      <aside className="summit-board" aria-labelledby="summit-board-title">
        {sheet && <span className="board-grab" aria-hidden="true" />}
        <div className="board-head">
          {sheet ? (
            <button
              type="button"
              className="board-toggle"
              aria-expanded={expanded}
              aria-controls="summit-notes"
              onClick={() => setExpanded((v) => !v)}
            >
              <span id="summit-board-title" className="board-title">
                The board
              </span>
              <span className="board-sub">{notes.length ? `${notes.length} ${notes.length === 1 ? 'note' : 'notes'}` : 'Notes from the top'}</span>
            </button>
          ) : (
            <div className="board-toggle">
              <h3 id="summit-board-title" className="board-title">
                The board
              </h3>
              <span className="board-sub">Notes left at the top</span>
            </div>
          )}
          <button type="button" className="board-write" onClick={write} disabled={!r.open}>
            <PinIcon />
            Leave a note
          </button>
        </div>
        <div className="board-wood" onClick={() => sheet && !expanded && setExpanded(true)}>
          {notes.length ? (
            <ol id="summit-notes" className="board-notes">
              {notes.map((n) => (
                <li
                  key={n.id}
                  className="note"
                  data-paper={n.paper ?? 0}
                  data-tack={TACKS[hex(n.id, 4, 6) % TACKS.length]}
                  data-fresh={fresh === n.id ? 'true' : 'false'}
                  style={{ '--tilt': `${((hex(n.id, 0, 4) % 9) - 4) * 0.55}deg` }}
                >
                  <p className="note-text">{n.text}</p>
                  <p className="note-sign">
                    — {n.name || 'a climber'}
                    {n.from ? `, ${n.from}` : ''}
                  </p>
                  {n.at && (
                    <time className="note-date" dateTime={n.at}>
                      {dated(n.at)}
                    </time>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            <p id="summit-notes" className="board-empty">
              {r.status !== 'ready' ? 'Fetching the notes…' : r.open ? 'Nothing pinned up yet. Leave the first note.' : 'The board goes up with the register.'}
            </p>
          )}
        </div>
      </aside>

      <dialog ref={dialog} className="slip-dialog" aria-labelledby="slip-title" onKeyDown={onDialogKey} onClose={() => setProblem(null)}>
        <form className="slip" onSubmit={onSubmit} noValidate>
          <p id="slip-title" className="slip-eyebrow">
            A note for the board
          </p>
          <label className="sr-only" htmlFor="slip-text">
            Your note
          </label>
          <textarea
            id="slip-text"
            className="slip-text"
            rows={4}
            maxLength={NOTE.text}
            placeholder="What’s up?"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <p className="slip-left" aria-live="polite">
            {NOTE.text - [...text].length} left
          </p>
          <div className="slip-fields">
            <label>
              <span>Name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={NOTE.name} autoComplete="given-name" placeholder="optional" />
            </label>
            <label>
              <span>From</span>
              <input value={from} onChange={(e) => setFrom(e.target.value)} maxLength={NOTE.from} autoComplete="off" placeholder="optional" />
            </label>
          </div>
          {/* only scripts fill this in */}
          <input ref={trap} name="website" className="slip-trap" tabIndex={-1} autoComplete="off" aria-hidden="true" />
          <p className="slip-fine">It goes up as you write it, for everyone who comes up here to read. Keep it kind.</p>
          {problem && (
            <p className="slip-problem" role="alert">
              {problem}
            </p>
          )}
          <div className="slip-actions">
            <button type="button" className="slip-cancel" onClick={putAway}>
              Never mind
            </button>
            <button type="submit" className="slip-pin" disabled={sending || !text.trim()}>
              <PinIcon />
              {sending ? 'Pinning…' : 'Pin it up'}
            </button>
          </div>
        </form>
      </dialog>
    </section>
  )
}

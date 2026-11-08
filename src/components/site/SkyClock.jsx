'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { clockLabel, momentFor, MODES, onSky, phaseOf, setSkyMode, sky, skyPosition, tickSky } from '@/lib/sky'

const PRESETS = ['dawn', 'day', 'sunset', 'night']
const PRESET_PHASE = { dawn: 'golden', day: 'day', sunset: 'golden', night: 'night' }

// A small sun, a sun on the horizon, or a crescent moon
function PhaseIcon({ phase, className = 'h-[15px] w-[15px]' }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' }
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      {phase === 'night' && <path d="M15.5 4.2a8 8 0 1 0 4.3 13.6 6.6 6.6 0 0 1-4.3-13.6z" {...common} strokeLinejoin="round" />}
      {phase === 'day' && (
        <g {...common}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7" />
        </g>
      )}
      {(phase === 'golden' || phase === 'twilight') && (
        <g {...common}>
          <path d="M3 16.5h18M6.5 20h11" />
          <path d={phase === 'golden' ? 'M7.5 16.5a4.5 4.5 0 0 1 9 0' : 'M8.8 16.5a3.2 3.2 0 0 1 6.4 0'} />
          {phase === 'golden' ? (
            <path d="M12 7v2M6.2 9.6l1.3 1.3M17.8 9.6l-1.3 1.3" />
          ) : (
            <path d="M17.5 6.2v2.6M16.2 7.5h2.6" strokeWidth="1.2" />
          )}
        </g>
      )}
    </svg>
  )
}

function read() {
  const now = Date.now()
  tickSky(now) // the scene usually does this; without WebGL the clock still runs
  const mode = sky.mode
  const shown = sky.transition || !MODES[mode].live ? sky.time : momentFor(mode, now)
  return {
    mode,
    time: clockLabel(shown, mode),
    phase: phaseOf(skyPosition(shown).alt),
    bangkok: clockLabel(now, 'bangkok'),
    local: clockLabel(momentFor('local', now), 'local'),
    // a visitor already on Bangkok time has nothing to match
    sameZone: new Date(now).getTimezoneOffset() === -420,
    moving: !!sky.transition,
  }
}

/** The sky's clock: live over Bangkok by default, changeable by the visitor. */
export default function SkyClock() {
  const [view, setView] = useState(null) // the time is the visitor's, so it's filled in after mount
  const [open, setOpen] = useState(false)
  const root = useRef(null)
  const button = useRef(null)
  const panelId = useId()

  useEffect(() => {
    let raf = 0
    const update = () => setView(read())
    // while the sky time-lapses to a new hour, let the clock race along with it
    const follow = () => {
      update()
      raf = sky.transition ? requestAnimationFrame(follow) : 0
    }
    update()
    const off = onSky(() => {
      if (!raf) follow()
    })
    const id = window.setInterval(update, 15000)
    return () => {
      off()
      window.clearInterval(id)
      cancelAnimationFrame(raf)
    }
  }, [])

  // close on a click elsewhere, Escape, or once the page scrolls on
  useEffect(() => {
    if (!open) return
    const y0 = window.scrollY
    const onDown = (e) => !root.current?.contains(e.target) && setOpen(false)
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false)
        button.current?.focus()
      }
    }
    const onScroll = () => Math.abs(window.scrollY - y0) > 60 && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, { passive: true })
    root.current?.querySelector('[aria-checked="true"]')?.focus()
    return () => {
      document.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll)
    }
  }, [open])

  const choose = (mode) => {
    setSkyMode(mode, { instant: typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches })
    setView(read())
  }

  const label = view
    ? view.mode === 'bangkok' || view.mode === 'fixed'
      ? 'Live over Bangkok'
      : view.mode === 'local'
        ? 'Your time'
        : `${MODES[view.mode].label}, set by you`
    : ''

  const option = (mode, title, sub, time) => {
    const on = view?.mode === mode || (mode === 'bangkok' && view?.mode === 'fixed')
    return (
      <button
        type="button"
        role="radio"
        aria-checked={on}
        onClick={() => choose(mode)}
        className="group/opt flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-300 hover:bg-white/[0.06] aria-checked:bg-white/[0.08]"
      >
        <span
          className="grid h-4 w-4 shrink-0 place-items-center rounded-full border border-snow/40 group-aria-checked/opt:border-saffron"
          aria-hidden="true"
        >
          <span className="h-2 w-2 scale-0 rounded-full bg-saffron transition-transform duration-300 group-aria-checked/opt:scale-100" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-[0.875rem] text-snow">{title}</span>
          {sub && <span className="text-[0.75rem] text-snow/55">{sub}</span>}
        </span>
        <span className="text-[0.8125rem] tabular-nums text-snow/70">{time}</span>
      </button>
    )
  }

  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={view ? `Sky: ${label}, ${view.time}. Change the time of day` : 'Change the time of day'}
        className="group/clock relative inline-flex h-9 items-center gap-2 rounded-full px-3 text-[0.8125rem] text-snow/70 transition-colors duration-300 hover:text-snow aria-expanded:text-snow"
      >
        <span className={view?.moving ? 'animate-pulse' : undefined}>
          <PhaseIcon phase={view?.phase || 'night'} />
        </span>
        <span className="min-w-[3.6rem] text-left tabular-nums md:max-lg:hidden" suppressHydrationWarning>
          {view ? view.time : ' '}
        </span>
        {/* says what it is, on hover */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-0 top-[calc(100%+0.4rem)] whitespace-nowrap rounded-full border border-white/10 bg-[rgb(10_12_18/0.86)] px-3 py-1.5 text-[0.75rem] text-snow/80 opacity-0 backdrop-blur-md transition-[opacity,transform] duration-300 [transform:translateY(-4px)] group-hover/clock:opacity-100 group-hover/clock:[transform:none] group-aria-expanded/clock:!opacity-0"
        >
          {label} · Change time
        </span>
      </button>

      <div
        id={panelId}
        role="dialog"
        aria-label="Time of day on the summit"
        data-open={open}
        className="glass absolute right-0 top-[calc(100%+0.6rem)] z-10 w-[min(19.5rem,calc(100vw-2rem))] origin-top-right rounded-2xl p-2 transition-[opacity,transform,visibility] duration-300 ease-out data-[open=false]:invisible data-[open=false]:-translate-y-1 data-[open=false]:scale-[0.98] data-[open=false]:opacity-0"
      >
        <p className="eyebrow px-3 pb-1 pt-2 text-snow/50">The sky on the summit</p>
        <div role="radiogroup" aria-label="Whose time">
          {option('bangkok', 'Bangkok', 'Where I am, live', view?.bangkok)}
          {option('local', 'Match my time', view?.sameZone ? 'Same as Bangkok' : 'Your clock, my sky', view?.local)}
        </div>
        <div className="mx-3 my-2 h-px bg-white/10" />
        <div role="radiogroup" aria-label="Or a time of day" className="grid grid-cols-4 gap-1 px-1 pb-1">
          {PRESETS.map((m) => {
            const on = view?.mode === m
            return (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => choose(m)}
                className="flex flex-col items-center gap-1.5 rounded-xl py-2.5 text-[0.75rem] text-snow/65 transition-colors duration-300 hover:bg-white/[0.06] hover:text-snow aria-checked:bg-white/[0.08] aria-checked:text-saffron"
              >
                <PhaseIcon phase={PRESET_PHASE[m]} className="h-[18px] w-[18px]" />
                {MODES[m].label}
              </button>
            )
          })}
        </div>
        <p className="px-3 pb-2 pt-1 text-[0.72rem] leading-relaxed text-snow/45">
          The real sun and moon over Bangkok, where I am. Pick another hour to watch the light change.
        </p>
      </div>
    </div>
  )
}

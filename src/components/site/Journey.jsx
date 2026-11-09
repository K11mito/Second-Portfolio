'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { advance, closeDestination, destinationAt, go, journey, leave, timeline, useJourney } from '@/lib/journey'
import { dest } from '@/lib/destinations'
import s from '@/components/library/library.module.css'

// the library's bookcase loads only when you go to it
const Library = dynamic(() => import('@/components/library/Library'), { ssr: false })

function LibraryIntro({ count }) {
  return (
    <header className={s.intro}>
      <button type="button" className={`${s.back} ${s.backButton}`} onClick={closeDestination}>
        <span aria-hidden="true">←</span>
        The mountain
      </button>
      <h1 className={s.eyebrow}>
        <span className={s.tib} lang="bo" aria-hidden="true">
          དཔེ་ཆ།
        </span>
        <span>Projects · {count} texts</span>
      </h1>
    </header>
  )
}

/**
 * Runs the journeys from the mountain to its destinations and back: moves the
 * journey on as each leg ends, keeps the address bar and the browser's back
 * and forward buttons in step, holds the page still (and out of reach) while
 * you are away, and opens the library over it when you reach its door. The
 * prayer-wheel hall is <Experience/>, which shows itself.
 *
 * `start`: the destination this page was loaded at (/experience), if any.
 * `index`: the server-rendered list of projects, for the library.
 */
export default function Journey({ start = null, projects, index }) {
  const j = useJourney()
  const [library, setLibrary] = useState(false)
  const libraryUp = useRef(false)

  // move on as each leg runs out, and keep the library up while it closes
  useEffect(() => {
    let raf
    const tick = () => {
      raf = requestAnimationFrame(tick)
      if (journey.state === 'idle') {
        if (libraryUp.current) {
          libraryUp.current = false
          setLibrary(false)
        }
        return
      }
      const tl = timeline()
      const up = tl.overlay === 'library'
      if (up !== libraryUp.current) {
        libraryUp.current = up
        setLibrary(up)
      }
      if (tl.done) advance()
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  // the browser's back and forward buttons
  useEffect(() => {
    const onPop = () => {
      const to = destinationAt(window.location.pathname)
      if (!to) leave()
      else if (journey.state === 'idle' || journey.state === 'leaving') go(to, { quick: true })
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // loaded at a destination's address: start out there, with the mountain's
  // "Where to now?" waiting behind it for the way back
  useEffect(() => {
    if (!start) return
    const sec = document.getElementById('destinations')
    if (sec) {
      const y = sec.getBoundingClientRect().top + window.scrollY
      if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true, force: true })
      else window.scrollTo(0, y)
    }
    go(start, { quick: true })
  }, [start])

  // while away the page holds still, out of reach of the keyboard and screen readers
  const away = j.state !== 'idle'
  useEffect(() => {
    if (!away) return
    const root = document.documentElement
    window.__lenis?.stop()
    root.style.overflow = 'hidden'
    root.dataset.journey = 'away'
    const blocked = document.querySelectorAll('main, body > header, footer, #skip-link')
    blocked.forEach((el) => el.setAttribute('inert', ''))
    return () => {
      blocked.forEach((el) => el.removeAttribute('inert'))
      root.style.overflow = ''
      delete root.dataset.journey
      window.__lenis?.start()
    }
  }, [away])

  // Focus follows you: to the way back out when you arrive, and back to the
  // destination's sign when you return (if it was left inside the destination)
  const cameFrom = useRef(null)
  useEffect(() => {
    if (j.state === 'going') cameFrom.current = j.to
    if (j.state === 'inside') {
      // the way back may mount a frame late (the library loads on demand) or sit
      // in a stage that is still hidden: keep trying for a couple of seconds
      const sel = j.to === 'library' ? '.journey-library header button' : '#experience .journey-back'
      const until = performance.now() + 2500
      let raf
      const tryFocus = () => {
        const el = document.querySelector(sel)
        el?.focus({ preventScroll: true })
        if (el && document.activeElement === el) return
        if (performance.now() < until) raf = requestAnimationFrame(tryFocus)
      }
      raf = requestAnimationFrame(tryFocus)
      return () => cancelAnimationFrame(raf)
    }
    if (j.state === 'idle' && cameFrom.current) {
      const sign = dest.els[cameFrom.current]
      cameFrom.current = null
      const a = document.activeElement
      if (sign && (!a || a === document.body || !document.body.contains(a) || a.closest('#experience'))) sign.focus({ preventScroll: true })
    }
  }, [j.state, j.to])

  // Escape: back out to the mountain (unless the library has a text open; it puts that away first)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape' || e.defaultPrevented || journey.state !== 'inside') return
      const room = document.querySelector('[data-room]')
      if (room && room.dataset.room !== 'closed') return
      closeDestination()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!library) return null
  return (
    <div className="journey-library" data-closing={j.state === 'leaving' ? 'true' : 'false'}>
      <Library projects={projects} intro={<LibraryIntro count={projects.length} />}>
        {index}
      </Library>
    </div>
  )
}

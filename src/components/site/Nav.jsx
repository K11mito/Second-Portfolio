'use client'

import { useEffect, useRef, useState } from 'react'
import Knot from './Knot'
import SoundToggle from './SoundToggle'
import SkyClock from './SkyClock'
import { nav, person } from '@/content/site'
import { scrollState } from '@/lib/scroll'
import { openDestination } from '@/lib/journey'

// A destination in the nav: on the home page, with the scene running, the
// camera flies there; otherwise (or for a new tab) it is an ordinary link.
function fly(e, item) {
  if (!item.dest || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false
  if (document.documentElement.dataset.webgl !== 'yes' || !document.getElementById('destinations')) return false
  e.preventDefault()
  openDestination(item.dest)
  return true
}

export default function Nav() {
  const header = useRef(null)
  const [open, setOpen] = useState(false)

  // Scroll-driven state without React re-renders: toggled straight on the DOM.
  useEffect(() => {
    let lastY = window.scrollY
    let raf
    const links = Array.from(document.querySelectorAll('[data-nav-link]'))
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const el = header.current
      if (!el) return
      const y = window.scrollY
      const dy = y - lastY
      if (Math.abs(dy) > 2) {
        const hide = dy > 0 && y > window.innerHeight * 0.85
        el.dataset.hidden = hide ? 'true' : 'false'
        lastY = y
      }
      el.dataset.scrolled = y > 24 ? 'true' : 'false'

      // highlight the section currently under the middle of the viewport
      const mid = y + window.innerHeight * 0.45
      let current = ''
      for (const id of scrollState.order) {
        const s = scrollState.sections[id]
        if (s && mid >= s.top) current = id
      }
      const active = current
      for (const a of links) a.dataset.active = a.dataset.navLink === active ? 'true' : 'false'
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  // Lock scrolling behind the mobile menu; close it on Escape.
  useEffect(() => {
    if (!open) return
    window.__lenis?.stop()
    document.documentElement.style.overflow = 'hidden'
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => {
      window.__lenis?.start()
      document.documentElement.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <>
      <header
        ref={header}
        data-hidden="false"
        data-scrolled="false"
        className="group/nav fixed inset-x-0 top-0 z-50 transition-transform duration-500 ease-out data-[hidden=true]:-translate-y-full"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-28 bg-gradient-to-b from-[rgb(6_9_18/0.55)] to-transparent opacity-0 transition-opacity duration-500 group-data-[scrolled=true]/nav:opacity-100"
        />
        <div className="shell relative flex h-[4.5rem] items-center justify-between md:h-20">
          <a
            href="#top"
            className="group flex items-center gap-3 rounded-sm text-snow"
            aria-label={`${person.name}, back to top`}
          >
            <Knot id="knot-nav" className="h-[22px] w-[22px] transition-transform duration-700 ease-out group-hover:rotate-90" strokeWidth={2.3} />
            <span className="text-[0.9375rem] font-medium tracking-[-0.01em]">{person.name}</span>
          </a>

          <nav aria-label="Primary" className="hidden md:block">
            <ul className="flex items-center gap-1">
              {nav.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    onClick={(e) => fly(e, item)}
                    data-nav-link={item.href.slice(1)}
                    className="relative block rounded-full px-4 py-2 text-[0.875rem] text-snow/70 transition-colors duration-300 hover:text-snow data-[active=true]:text-snow"
                  >
                    {item.label}
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-4 -bottom-0.5 h-px origin-left scale-x-0 bg-snow/70 transition-transform duration-500 ease-out [[data-active=true]>&]:scale-x-100"
                    />
                  </a>
                </li>
              ))}
              <li className="ml-1">
                <SkyClock />
              </li>
              <li>
                <SoundToggle />
              </li>
              <li className="ml-2">
                <a
                  href={`mailto:${person.email}`}
                  className="block rounded-full border border-snow/25 px-4 py-2 text-[0.875rem] text-snow transition-colors duration-300 hover:border-snow/60 hover:bg-snow/10"
                >
                  Say hello
                </a>
              </li>
            </ul>
          </nav>

          <div className="-mr-2 flex items-center md:hidden">
            <SkyClock />
            <button
              type="button"
              className="rounded-full px-3 py-2 text-[0.875rem] text-snow"
              aria-expanded={open}
              aria-controls="mobile-menu"
              onClick={() => setOpen((v) => !v)}
            >
              {open ? 'Close' : 'Menu'}
            </button>
          </div>
        </div>
      </header>

      <div
        id="mobile-menu"
        data-open={open}
        className="fixed inset-0 z-40 flex flex-col bg-[rgb(7_8_11/0.96)] backdrop-blur-xl transition-[opacity,visibility] duration-500 data-[open=false]:invisible data-[open=false]:opacity-0 md:hidden"
        aria-hidden={!open}
      >
        <nav aria-label="Mobile" className="shell flex flex-1 flex-col justify-center gap-2">
          {nav.map((item, i) => (
            <a
              key={item.href}
              href={item.href}
              tabIndex={open ? 0 : -1}
              onClick={(e) => {
                fly(e, item)
                setOpen(false)
              }}
              className="title flex items-baseline gap-4 py-1 text-[3.25rem] text-snow transition-[transform,opacity] duration-700 ease-out"
              style={{
                transitionDelay: open ? `${80 + i * 60}ms` : '0ms',
                transform: open ? 'none' : 'translateY(12px)',
                opacity: open ? 1 : 0,
              }}
            >
              <span className="eyebrow text-snow/50">0{i + 1}</span>
              {item.label}
            </a>
          ))}
        </nav>
        <div className="shell flex items-center justify-between gap-4 pb-10">
          <a href={`mailto:${person.email}`} tabIndex={open ? 0 : -1} className="text-snow/70 underline-offset-4 hover:underline">
            {person.email}
          </a>
          <SoundToggle className="-mr-3 [&>span:last-child]:!inline" />
        </div>
      </div>
    </>
  )
}

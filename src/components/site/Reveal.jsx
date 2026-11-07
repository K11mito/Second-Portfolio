'use client'

import { useEffect } from 'react'

// One IntersectionObserver for the whole page. Elements marked [data-reveal]
// start hidden only once JS is running (see the `js` class in layout), so the
// content is always readable without JavaScript.
export default function RevealObserver() {
  useEffect(() => {
    const els = document.querySelectorAll('[data-reveal]')
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-in')
            io.unobserve(e.target)
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
  return null
}

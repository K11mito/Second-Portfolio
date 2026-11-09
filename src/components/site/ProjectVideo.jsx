'use client'

import { useEffect, useRef } from 'react'

// Optional looping preview for a project (set `video` in src/content/site.js;
// files go in public/videos/projects/). Plays only while on screen, and never
// autoplays for people who prefer reduced motion: they see the still poster.
export default function ProjectVideo({ src, poster, label }) {
  const ref = useRef(null)

  useEffect(() => {
    const v = ref.current
    if (!v) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) v.play().catch(() => {})
        else v.pause()
      },
      { threshold: 0.25 }
    )
    io.observe(v)
    return () => io.disconnect()
  }, [])

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      preload="none"
      aria-label={label}
      className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-[1.035]"
    />
  )
}

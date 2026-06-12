'use client'

import { useEffect } from 'react'
import { useScrollStore } from '@/lib/useScrollStore'

// Measures where each content section actually sits in the document and
// publishes the positions as scroll fractions. The canvas world keys its
// beats (camera descent, whiteout, valley arrival) off these marks, so
// content and world stay in sync on every viewport.
export default function SectionMarks() {
  useEffect(() => {
    const measure = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      if (max <= 0) return
      const visible = (id) => {
        const el = document.getElementById(id)
        return el && el.offsetHeight > 0 ? el : null
      }
      const topOf = (...ids) => {
        for (const id of ids) {
          const el = visible(id)
          if (el) return (el.getBoundingClientRect().top + window.scrollY) / max
        }
        return null
      }
      const centerOf = (id) => {
        const el = visible(id)
        if (!el) return null
        const r = el.getBoundingClientRect()
        return (r.top + window.scrollY + r.height / 2 - window.innerHeight / 2) / max
      }
      const prev = useScrollStore.getState().marks
      useScrollStore.getState().setMarks({
        about: topOf('about') ?? prev.about,
        projects: topOf('projects') ?? prev.projects,
        cloudsCenter: centerOf('clouds') ?? prev.cloudsCenter,
        experience: topOf('experience', 'experience-m') ?? prev.experience,
        contact: topOf('contact') ?? prev.contact,
      })
    }
    measure()
    const t1 = setTimeout(measure, 400)
    const t2 = setTimeout(measure, 1500)
    window.addEventListener('resize', measure)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      window.removeEventListener('resize', measure)
    }
  }, [])
  return null
}

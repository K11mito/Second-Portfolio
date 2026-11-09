// A tiny framework-free store shared by the DOM (Lenis, nav, sections) and the
// WebGL scene. Reading from it never triggers React renders, so the 3D scene can
// sample scroll every frame for free.
//
// Sections opt in with a `data-scene="id"` attribute. Their positions are
// measured on load and whenever layout changes, so the 3D timeline stays locked
// to the real content on every screen size (the original site assumed a fixed
// 5-page height, which broke on mobile).

export const scrollState = {
  y: 0,
  vh: 1,
  vw: 1,
  max: 1,
  velocity: 0,
  sections: {},
  order: [],
  measured: false,
  reducedMotion: false,
  // set by the debug harness (?t=…) to freeze the timeline for screenshots
  override: null,
}

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)

export function measureSections() {
  if (typeof window === 'undefined') return
  const s = scrollState
  s.vh = window.innerHeight
  s.vw = window.innerWidth
  s.max = Math.max(1, document.documentElement.scrollHeight - s.vh)
  s.order = []
  document.querySelectorAll('[data-scene]').forEach((el, index) => {
    const r = el.getBoundingClientRect()
    const id = el.dataset.scene
    s.sections[id] = { top: r.top + window.scrollY, height: r.height, index }
    s.order.push(id)
  })
  s.y = window.scrollY
  s.measured = true
}

/** 0 when the section's top reaches the viewport top, 1 when its bottom reaches the viewport bottom. */
export function pinProgress(id, y = scrollState.y) {
  const sec = scrollState.sections[id]
  if (!sec) return 0
  return clamp01((y - sec.top) / Math.max(1, sec.height - scrollState.vh))
}

/** 0 when the section's top enters at the bottom of the viewport, 1 when its bottom leaves at the top. */
export function passProgress(id, y = scrollState.y) {
  const sec = scrollState.sections[id]
  if (!sec) return 0
  return clamp01((y + scrollState.vh - sec.top) / (sec.height + scrollState.vh))
}

/**
 * Continuous position along the page in "section units": section i spans [i, i + 1),
 * starting when its top reaches the viewport top. The last section ends at the page bottom.
 */
export function timelinePosition(y = scrollState.y) {
  const s = scrollState
  if (s.override != null) return s.override
  const { order, sections } = s
  for (let i = order.length - 1; i >= 0; i--) {
    const sec = sections[order[i]]
    if (y >= sec.top - 0.5) {
      const span = i === order.length - 1 ? Math.max(1, s.max - sec.top) : sec.height
      return i + clamp01((y - sec.top) / span)
    }
  }
  return 0
}

export function sectionIndex(id) {
  return scrollState.sections[id]?.index ?? -1
}

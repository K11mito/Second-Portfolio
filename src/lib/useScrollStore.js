import { create } from 'zustand'

// Single source of scroll truth. Lenis writes, the canvas reads via
// getState() inside useFrame (no React re-renders on scroll).
export const useScrollStore = create((set) => ({
  progress: 0, // 0..1 across the whole document
  velocity: 0,
  ready: false, // first canvas frame rendered → loader can fade
  tier: 'high', // 'high' | 'medium' | 'low'
  reducedMotion: false,
  // Measured section positions as document-scroll fractions. Defaults are
  // close to the desktop layout; SectionMarks measures the real DOM so the
  // world beats stay aligned on every viewport (e.g. taller mobile stacks).
  marks: { about: 0.15, projects: 0.34, cloudsCenter: 0.6, experience: 0.71, contact: 0.95 },
  setScroll: (progress, velocity) => set({ progress, velocity }),
  setReady: () => set({ ready: true }),
  setTier: (tier) => set({ tier }),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
  setMarks: (marks) => set({ marks }),
}))

// Map a global progress value into a 0..1 local range
export function rangeProgress(progress, start, end) {
  if (end === start) return 0
  return Math.min(1, Math.max(0, (progress - start) / (end - start)))
}

'use client'

import dynamic from 'next/dynamic'

// Dynamically import Scene with no SSR since Three.js requires browser APIs
const Scene = dynamic(() => import('@/components/Scene'), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800">
      <div className="text-white text-xl">Loading experience...</div>
    </div>
  ),
})

export default function Home() {
  return (
    <main className="relative min-h-screen">
      <Scene />
    </main>
  )
}

'use client'

import dynamic from 'next/dynamic'
import Nav from '@/components/ui/Nav'
import Hero from '@/components/ui/Hero'
import About from '@/components/ui/About'
import Projects from '@/components/ui/Projects'
import CloudsInterlude, { WhiteoutOverlay } from '@/components/ui/CloudsInterlude'
import Experiences from '@/components/ui/Experiences'
import Footer from '@/components/ui/Footer'
import Loader from '@/components/ui/Loader'
import SectionMarks from '@/components/ui/SectionMarks'

// The 3D world needs browser APIs — client-only
const Experience = dynamic(() => import('@/components/canvas/Experience'), { ssr: false })

export default function Home() {
  return (
    <main className="relative min-h-screen">
      {/* living world, fixed behind everything */}
      <Experience />

      {/* whiteout veil between world and content */}
      <WhiteoutOverlay />

      {/* content journey */}
      <div className="relative z-10">
        <Hero />
        <About />
        <Projects />
        <CloudsInterlude />
        <Experiences />
        <Footer />
      </div>

      <Nav />
      <Loader />
      <SectionMarks />
    </main>
  )
}

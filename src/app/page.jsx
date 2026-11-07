import SceneLayer from '@/components/SceneLayer'
import ScrollManager from '@/components/ScrollManager'
import Atmosphere from '@/components/site/Atmosphere'
import RevealObserver from '@/components/site/Reveal'
import Nav from '@/components/site/Nav'
import Hero from '@/components/site/Hero'
import About from '@/components/site/About'
import Work from '@/components/site/Work'
import Interlude from '@/components/site/Interlude'
import Experience from '@/components/site/Experience'
import Contact from '@/components/site/Contact'

export default function Home() {
  return (
    <>
      <a
        href="#about"
        className="sr-only z-[100] rounded-full bg-snow px-4 py-2 text-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <SceneLayer />
      <Atmosphere />
      <ScrollManager />
      <RevealObserver />
      <Nav />
      <main className="relative z-10">
        <Hero />
        <About />
        <Work />
        <Interlude />
        <Experience />
        <Contact />
      </main>
      <div className="grain" aria-hidden="true" />
    </>
  )
}

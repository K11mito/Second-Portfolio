import SceneLayer from '@/components/SceneLayer'
import ScrollManager from '@/components/ScrollManager'
import ProjectsIndex from '@/components/library/ProjectsIndex'
import Atmosphere from './Atmosphere'
import RevealObserver from './Reveal'
import Nav from './Nav'
import Hero from './Hero'
import About from './About'
import Destinations from './Destinations'
import Contact from './Contact'
import Footer from './Footer'
import Experience from './Experience'
import Journey from './Journey'
import { person, projects, socials } from '@/content/site'

// Structured data so search engines understand whose site this is.
const personSchema = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: person.name,
  description: person.lede,
  email: `mailto:${person.email}`,
  affiliation: { '@type': 'CollegeOrUniversity', name: 'Mahidol University' },
  sameAs: socials.map((s) => s.href),
}

/**
 * The mountain: the summit, who I am, then "Where to now?", with its two
 * destinations (the library of projects and the prayer-wheel temple of
 * experience) and the way to get in touch. `start` opens a destination on
 * arrival: /experience is this same page, already at the temple.
 */
export default function HomePage({ start = null }) {
  return (
    <>
      <a
        id="skip-link"
        href="#about"
        className="sr-only z-[100] rounded-full bg-snow px-4 py-2 text-ink focus-visible:not-sr-only focus-visible:fixed focus-visible:left-4 focus-visible:top-4"
      >
        Skip to content
      </a>
      <SceneLayer start={start} />
      <Atmosphere />
      <ScrollManager />
      <RevealObserver />
      <Nav />
      <main className="relative z-10">
        <Hero />
        <About />
        <Destinations />
        <Contact />
      </main>
      {/* the prayer-wheel temple opens over the page (without JavaScript it is a plain list here) */}
      <Experience />
      <Footer />
      <Journey start={start} projects={projects} index={<ProjectsIndex projects={projects} />} />
      <div className="grain" aria-hidden="true" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }} />
    </>
  )
}

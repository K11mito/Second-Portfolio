import Link from 'next/link'
import Library from '@/components/library/Library'
import { tib } from '@/components/library/pecha'
import { person, projects } from '@/content/site'
import s from '@/components/library/library.module.css'

export const metadata = {
  title: 'Projects',
  description: `Every project ${person.firstName} has built, wrapped like Tibetan texts and shelved in a monastery library: ${projects.length} projects, from AI agents and computer vision to hardware and the web, newest first.`,
}

export const viewport = {
  themeColor: '#0a0504',
}

// The library: every project wrapped as a pecha on a monastery bookcase. The
// header and the plain list below are rendered here, on the server; the list
// is what search engines, screen readers and browsers without WebGL get.
export default function ProjectsPage() {
  // the way home on the left; the page's name in the top middle
  const intro = (
    <header className={s.intro}>
      <Link href="/" className={s.back}>
        <span aria-hidden="true">←</span>
        Home
      </Link>
      <h1 className={s.eyebrow}>
        <span className={s.tib} lang="bo" aria-hidden="true">
          དཔེ་ཆ།
        </span>
        <span>Projects · {projects.length} texts</span>
      </h1>
    </header>
  )

  return (
    <Library projects={projects} intro={intro}>
      <section className={s.index} aria-label="Every project, newest first">
        <ol>
          {projects.map((p, i) => (
            <li key={p.title}>
              <p className={s.indexMeta}>
                <span className={s.tib} lang="bo" aria-hidden="true">
                  {tib(i + 1)}
                </span>{' '}
                {p.kind} · {p.when.slice(0, 4)}
                {p.note ? ` · ${p.note}` : ''}
              </p>
              <h2>{p.title}</h2>
              <p>{p.description}</p>
              {p.links.length > 0 && (
                <p className={s.indexLinks}>
                  {p.links.map((l) => (
                    <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer">
                      {l.label} ↗<span className="sr-only">: {p.title} (opens in a new tab)</span>
                    </a>
                  ))}
                </p>
              )}
            </li>
          ))}
        </ol>
      </section>
    </Library>
  )
}

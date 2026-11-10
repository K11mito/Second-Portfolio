import { tib } from './pecha'
import s from './library.module.css'

// The plain list of every project, newest first, rendered on the server: what
// search engines, screen readers and browsers without WebGL get, and what the
// keyboard reaches after the shelf. Shared by /projects and the library as it
// opens over the mountain.
export default function ProjectsIndex({ projects }) {
  return (
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
  )
}

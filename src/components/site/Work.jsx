import Image from 'next/image'
import { projects } from '@/content/site'
import ArrowIcon from './ArrowIcon'

function ProjectCard({ project, index, total }) {
  const flip = index % 2 === 1
  return (
    <li data-reveal className="glass group grid overflow-hidden rounded-[1.5rem] md:grid-cols-12">
      <div
        className={`relative aspect-[16/10] overflow-hidden md:col-span-7 md:aspect-auto md:min-h-[27rem] ${flip ? 'md:order-2' : ''}`}
      >
        <Image
          src={project.image}
          alt={project.imageAlt}
          fill
          sizes="(min-width: 768px) 55vw, 100vw"
          className="object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-[1.035]"
          style={{ objectPosition: project.focus || 'center' }}
        />
        <div aria-hidden="true" className="absolute inset-0 ring-1 ring-inset ring-white/[0.06]" />
      </div>

      <div className="flex flex-col justify-between gap-10 p-7 sm:p-9 md:col-span-5 lg:p-11">
        <div>
          <div className="eyebrow flex items-center justify-between text-snow/50">
            <span>
              <span className="text-snow/85">{String(index + 1).padStart(2, '0')}</span> / {String(total).padStart(2, '0')}
            </span>
            <span>{project.kind}</span>
          </div>
          <h3 className="title mt-7 text-[clamp(2.25rem,3.6vw,3.5rem)] text-snow">{project.title}</h3>
          <p className="mt-4 max-w-[34rem] text-[1.0313rem] leading-[1.7] text-snow/75">{project.description}</p>
        </div>

        <div>
          <ul className="flex flex-wrap gap-2" aria-label="Built with">
            {project.tags.map((t) => (
              <li key={t} className="rounded-full border border-white/[0.12] px-3 py-1 text-[0.8125rem] text-snow/70">
                {t}
              </li>
            ))}
          </ul>
          <div className="mt-7 flex flex-wrap gap-x-7 gap-y-3">
            {project.links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group/link inline-flex items-center gap-1.5 text-[0.9375rem] font-medium text-snow"
              >
                <span className="link-draw">{l.label}</span>
                <ArrowIcon className="h-3 w-3 transition-transform duration-300 group-hover/link:-translate-y-0.5 group-hover/link:translate-x-0.5" />
                <span className="sr-only">: {project.title} (opens in a new tab)</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </li>
  )
}

export default function Work() {
  return (
    <section id="work" data-scene="work" className="relative py-[clamp(6rem,14vh,10rem)]" aria-labelledby="work-title">
      <div className="shell">
        <header className="mb-12 flex flex-col gap-6 md:mb-16 md:flex-row md:items-end md:justify-between" data-reveal>
          <div>
            <p className="eyebrow text-snow/70">
              <span className="text-snow">02</span> — Selected work
            </p>
            <h2 id="work-title" className="title mt-6 text-[clamp(2.75rem,6.6vw,6.25rem)] text-snow [text-shadow:0_2px_40px_rgb(0_10_30/0.35)]">
              Things I&rsquo;ve <em className="italic">built</em>
            </h2>
          </div>
          <p className="max-w-[22rem] text-[1.0313rem] leading-[1.65] text-snow/75 md:pb-3">
            A few side projects, from computer vision to desktop tools for working with AI agents.
          </p>
        </header>

        <ol className="flex flex-col gap-7 md:gap-10">
          {projects.map((p, i) => (
            <ProjectCard key={p.title} project={p} index={i} total={projects.length} />
          ))}
        </ol>
      </div>
    </section>
  )
}

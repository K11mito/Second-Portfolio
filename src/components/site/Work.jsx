import Image from 'next/image'
import Link from 'next/link'
import { featuredProjects, projects } from '@/content/site'
import ArrowIcon from './ArrowIcon'
import Ornament from './Ornament'
import ProjectVideo from './ProjectVideo'

// A rolled thangka on its rod: the way into the full archive
function ScrollGlyph() {
  return (
    <span className="grid h-11 w-11 place-items-center rounded-full bg-saffron/[0.12] text-saffron transition-colors duration-500 group-hover/all:bg-saffron/20" aria-hidden="true">
      <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]">
        <path d="M3 6.5h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M6 6.5v9.5c0 .8.6 1.5 1.4 1.5h9.2c.8 0 1.4-.7 1.4-1.5V6.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <path d="M4.5 19h15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M9 10h6M9 12.6h4.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity=".7" />
        <path d="M12 3.2 9.6 6.5M12 3.2l2.4 3.3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity=".7" />
      </svg>
    </span>
  )
}

// Compact, and staggered left and right with each image on the outer edge, so
// the mountain behind shows beside and between them.
function ProjectCard({ project, index, total }) {
  const flip = index % 2 === 1
  return (
    <li
      data-reveal
      className={`glass orn-host group relative grid w-full overflow-hidden rounded-[1.35rem] md:w-[min(100%,56rem)] md:grid-cols-2 ${flip ? 'md:self-end' : 'md:self-start'}`}
    >
      <div className={`relative aspect-[16/9] overflow-hidden md:aspect-auto md:min-h-[20rem] ${flip ? 'md:order-2' : ''}`}>
        {project.video ? (
          <ProjectVideo src={project.video} poster={project.image} label={project.imageAlt} />
        ) : (
          <Image
            src={project.image}
            alt={project.imageAlt}
            fill
            sizes="(min-width: 768px) 28rem, 100vw"
            className="object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-[1.035]"
            style={{ objectPosition: project.focus || 'center' }}
          />
        )}
        <div aria-hidden="true" className="absolute inset-0 ring-1 ring-inset ring-white/[0.06]" />
      </div>

      {/* padding clears the border's corner knots */}
      <div className="flex flex-col justify-between gap-7 px-7 pb-10 pt-8 sm:px-9 sm:pt-9">
        <div>
          <div className="eyebrow flex items-center justify-between gap-4 text-snow/60">
            <span>
              <span className="text-snow/85">{String(index + 1).padStart(2, '0')}</span> / {String(total).padStart(2, '0')}
            </span>
            <span className="text-right">{project.kind}</span>
          </div>
          <h3 className="title mt-5 text-[clamp(1.9rem,2.6vw,2.6rem)] text-snow">{project.title}</h3>
          <p className="mt-3 max-w-[30rem] text-[0.94rem] leading-[1.62] text-snow/75">{project.description}</p>
        </div>

        <div>
          <ul className="flex flex-wrap gap-1.5" aria-label="Built with">
            {project.tags.map((t) => (
              <li key={t} className="rounded-full border border-white/[0.12] px-2.5 py-0.5 text-[0.75rem] text-snow/70">
                {t}
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3">
            {project.links.length === 0 && project.private && (
              <p className="eyebrow flex items-center gap-2 text-snow/55">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
                  <rect x="5" y="10.5" width="14" height="9.5" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
                </svg>
                Private{project.note ? ` · ${project.note}` : ''}
              </p>
            )}
            {project.links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group/link inline-flex items-center gap-1.5 text-[0.875rem] font-medium text-snow"
              >
                <span className="link-draw">{l.label}</span>
                <ArrowIcon className="h-3 w-3 transition-transform duration-300 group-hover/link:-translate-y-0.5 group-hover/link:translate-x-0.5" />
                <span className="sr-only">: {project.title} (opens in a new tab)</span>
              </a>
            ))}
          </div>
        </div>
      </div>
      <Ornament />
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
            The three I&rsquo;m proudest of. Everything else I&rsquo;ve made hangs on the scroll.
          </p>
        </header>

        <ol className="flex flex-col gap-10 md:gap-16">
          {featuredProjects.map((p, i) => (
            <ProjectCard key={p.title} project={p} index={i} total={featuredProjects.length} />
          ))}
        </ol>

        <div className="mt-12 flex justify-center md:mt-16" data-reveal>
          <Link
            href="/projects"
            className="group/all glass relative inline-flex items-center gap-4 rounded-full py-2.5 pl-2.5 pr-6 text-snow transition-[border-color,background-color] duration-500 hover:border-saffron/40"
          >
            <ScrollGlyph />
            <span className="flex flex-col leading-tight">
              <span className="text-[1rem] font-medium">View all {projects.length} projects</span>
              <span className="eyebrow mt-1 text-snow/55">Unroll the scroll</span>
            </span>
            <ArrowIcon className="ml-1 h-3.5 w-3.5 transition-transform duration-300 group-hover/all:-translate-y-0.5 group-hover/all:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  )
}

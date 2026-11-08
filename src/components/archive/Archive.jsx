import Image from 'next/image'
import Link from 'next/link'
import { person, projects, socials } from '@/content/site'
import Knot from '@/components/site/Knot'
import ArrowIcon from '@/components/site/ArrowIcon'
import Unroll from './Unroll'
import s from './thangka.module.css'

const TIBETAN_DIGITS = '༠༡༢༣༤༥༦༧༨༩'
const tibetan = (n) =>
  String(n)
    .split('')
    .map((d) => TIBETAN_DIGITS[+d])
    .join('')
const pad = (n) => String(n).padStart(2, '0')
const github = socials.find((x) => x.label === 'GitHub')

// Auspicious clouds, drawn in gold either side of each year
function Clouds({ flip = false }) {
  return (
    <svg viewBox="0 0 200 26" preserveAspectRatio="none" aria-hidden="true" style={flip ? { transform: 'scaleX(-1)' } : undefined}>
      <path d="M0 13h112" stroke="currentColor" strokeWidth="1" opacity=".55" vectorEffect="non-scaling-stroke" />
      <g fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" vectorEffect="non-scaling-stroke">
        <path d="M112 13c0-5 4-8.5 8.5-8.5S129 8 129 12.5s-3 6.5-6 6.5-4.5-2-4.5-4.5 1.6-3.8 3.4-3.8" />
        <path d="M129 12.5c2-4.2 5.5-6.6 9.8-6.6 5.2 0 8.7 3.6 8.7 7.6s-2.6 6.3-5.6 6.3-4.2-1.8-4.2-4 1.5-3.3 3.1-3.3" />
        <path d="M147.5 13.4c2.4-3.6 5.6-5.4 9.3-5.4 4.3 0 7.2 3 7.2 6.3 0 2.8-2 4.9-4.6 4.9" />
        <path d="M164 14.3c3 0 6.4-.8 9.4-2.6M178 10.4c2.6-1.4 5.6-2.2 8.8-2.2" opacity=".7" />
      </g>
    </svg>
  )
}

// A seal stamped in vermilion: the endless knot inside a square border
function Seal() {
  return (
    <svg viewBox="0 0 48 48" className={s.seal} role="img" aria-label="One I’m proudest of">
      <defs>
        <filter id="seal-ink" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="1.6" result="d" />
          <feComponentTransfer in="n" result="speck">
            <feFuncA type="discrete" tableValues="1 1 1 0.75 1 1 0.6 1" />
          </feComponentTransfer>
          <feComposite in="d" in2="speck" operator="in" />
        </filter>
      </defs>
      <g filter="url(#seal-ink)">
        <rect x="3" y="3" width="42" height="42" rx="4" fill="currentColor" />
        <rect x="7" y="7" width="34" height="34" rx="2" fill="none" stroke="#f3e6cc" strokeWidth="1.4" />
        <path
          d="M17 17h14v14H17zM20.5 17v14M27.5 17v14M17 20.5h14M17 27.5h14M17 17c-3 0-4 4-1 5M31 17c3 0 4 4 1 5M17 31c-3 0-4-4-1-5M31 31c3 0 4-4 1-5"
          fill="none"
          stroke="#f3e6cc"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  )
}

function Entry({ p, n }) {
  return (
    <li className={s.entry} data-entry={n} data-plate={p.image ? '' : undefined}>
      <div className={s.num} aria-hidden="true">
        <span className={s.tib}>{tibetan(n)}</span>
        <span className={s.lat}>{pad(n)}</span>
      </div>
      <div>
        <p className={s.meta}>
          <span>{p.kind}</span>
          {p.note && <span className={s.note}>{p.note}</span>}
        </p>
        <h3 className={s.name}>{p.title}</h3>
        <p className={s.desc}>{p.description}</p>
        <div className={s.foot}>
          <ul className={s.tags} aria-label="Built with">
            {p.tags.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          {(p.links.length > 0 || p.private) && (
            <div className={s.links}>
              {p.links.map((l) => (
                <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer">
                  {l.label}
                  <ArrowIcon />
                  <span className="sr-only">: {p.title} (opens in a new tab)</span>
                </a>
              ))}
              {p.private && !p.links.some((l) => l.label === 'Source') && <span className={s.private}>Private repo</span>}
            </div>
          )}
        </div>
      </div>
      {p.image && (
        <figure className={s.plate}>
          <Image src={p.image} alt={p.imageAlt} fill sizes="(min-width: 768px) 16rem, 90vw" style={{ objectPosition: p.focus || 'top center' }} />
        </figure>
      )}
      {p.featured && <Seal />}
    </li>
  )
}

// Every project, painted onto a hanging scroll that unrolls as you read.
export default function Archive() {
  // the content file is newest first: group it by year as it comes
  const years = []
  for (const p of projects) {
    const y = p.when.slice(0, 4)
    if (!years.length || years[years.length - 1].year !== y) years.push({ year: y, items: [] })
    years[years.length - 1].items.push(p)
  }
  const first = years[years.length - 1].year
  const last = years[0].year
  const featured = projects.filter((p) => p.featured).length
  let n = 0

  return (
    <div className={s.wall}>
      <header className={s.bar}>
        <div className={`shell ${s.barInner}`}>
          <Link href="/" className={s.home} aria-label={`${person.name}, home`}>
            <Knot id="knot-archive" className="h-[22px] w-[22px]" strokeWidth={2.3} />
            <span>{person.name}</span>
          </Link>
          <div className={`eyebrow ${s.where}`}>
            <span className={s.count} aria-hidden="true">
              <span className={s.countLabel}>Project </span>
              <b data-current>01</b> / {pad(projects.length)}
            </span>
            <Link href="/" className="hidden sm:inline">
              Back to the summit
            </Link>
          </div>
        </div>
      </header>

      <main className={s.main}>
        <div className={s.hanging} data-thangka>
          <svg className={s.cord} viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
            <path d="M1 40 50 4 99 40" fill="none" stroke="currentColor" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
            <circle cx="50" cy="4" r="2.6" fill="#c79a4a" vectorEffect="non-scaling-stroke" />
          </svg>
          <div className={s.topRod} aria-hidden="true" />
          <div className={s.veil} aria-hidden="true">
            <span className={s.ribbon} />
            <span className={s.ribbon} />
          </div>

          <div className={s.scroll}>
            <div className={s.cloth} data-cloth>
              <article className={s.painting}>
                <header className={s.head}>
                  <p className={s.mantra} lang="bo" aria-hidden="true">
                    ཨོཾ་མ་ཎི་པདྨེ་ཧཱུྃ
                  </p>
                  <p className={s.eyebrow}>The archive</p>
                  <h1 className={s.title}>
                    Everything I&rsquo;ve <em>built</em>
                  </h1>
                  <p className={s.lede}>
                    From hackathon weekends to things I still work on every day, newest first. The ones stamped with a seal are
                    the ones I&rsquo;m proudest of. New work gets added at the top.
                  </p>
                  <p className={s.stats}>
                    <span>
                      <b>{projects.length}</b> projects
                    </span>
                    <span>
                      <b>{first}</b> → <b>{last}</b>
                    </span>
                    <span>
                      <b>{featured}</b> featured
                    </span>
                  </p>
                </header>

                {years.map((g) => (
                  <section key={g.year} className={s.year} aria-labelledby={`year-${g.year}`}>
                    <h2 className={s.yearMark} id={`year-${g.year}`}>
                      <Clouds />
                      <span className={s.yearLabel}>
                        <span>{g.year}</span>
                        <span aria-hidden="true">{tibetan(g.year)}</span>
                      </span>
                      <Clouds flip />
                    </h2>
                    <ol className={s.list}>
                      {g.items.map((p) => {
                        n += 1
                        return <Entry key={p.title} p={p} n={n} />
                      })}
                    </ol>
                  </section>
                ))}

                <footer className={s.colophon}>
                  <Knot id="knot-colophon" strokeWidth={2.2} />
                  <p className={s.colophonTitle}>That&rsquo;s everything, for now.</p>
                  <p className={s.colophonText}>
                    I&rsquo;m always building something. Come back in a month and there&rsquo;ll be something new at the top.
                  </p>
                  <div className={`${s.links} ${s.colophonLinks}`}>
                    <Link href="/">
                      Back to the summit
                      <ArrowIcon />
                    </Link>
                    {github && (
                      <a href={github.href} target="_blank" rel="noopener noreferrer">
                        GitHub
                        <ArrowIcon />
                        <span className="sr-only">(opens in a new tab)</span>
                      </a>
                    )}
                    <a href={`mailto:${person.email}`}>
                      Say hello
                      <ArrowIcon />
                    </a>
                  </div>
                </footer>
              </article>
              <div className={s.base} aria-hidden="true">
                <div className={s.door} />
              </div>
            </div>
            <div className={s.rod} data-rod aria-hidden="true">
              {/* the dowel runs through the roll: only its ends and caps show */}
              <span className={s.dowel} />
              <span className={s.roll} data-roll />
            </div>
          </div>
        </div>
        <p className={s.after}>
          © {new Date().getFullYear()} {person.name} · <Link href="/">Home</Link>
        </p>
      </main>
      <div className="grain" aria-hidden="true" />
      <Unroll />
    </div>
  )
}

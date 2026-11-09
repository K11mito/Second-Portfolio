import Image from 'next/image'
import { about, person, socials } from '@/content/site'
import ArrowIcon from './ArrowIcon'
import Ornament from './Ornament'

export default function About() {
  const links = [...socials, { label: 'Email', href: `mailto:${person.email}` }]
  return (
    <section id="about" data-scene="about" className="relative py-[clamp(6rem,16vh,11rem)]" aria-labelledby="about-title">
      <div className="shell">
        <div className="grid grid-cols-12 gap-x-6 gap-y-12 md:gap-y-16">
          <header className="col-span-12 lg:col-span-10" data-reveal>
            <p className="eyebrow text-snow/70">
              <span className="text-snow">01</span> — About
            </p>
            <h2 id="about-title" className="title mt-6 text-[clamp(2.75rem,6.6vw,6.25rem)] text-snow [text-shadow:0_2px_40px_rgb(0_10_30/0.35)]">
              {about.statement.map((part, i) =>
                i % 2 === 1 ? (
                  <em key={i} className="italic text-snow">
                    {part}
                  </em>
                ) : (
                  <span key={i}>{part}</span>
                )
              )}
            </h2>
          </header>

          <figure className="col-span-12 sm:col-span-8 md:col-span-5 lg:col-span-4 lg:col-start-2" data-reveal style={{ '--d': '120ms' }}>
            {/* a thin print-style mat rather than a device-like bezel */}
            <div className="rounded-[0.95rem] bg-white/[0.07] p-1.5 ring-1 ring-white/20 backdrop-blur-md">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[0.65rem]">
                <Image
                  src={person.photo.src}
                  alt={person.photo.alt}
                  fill
                  sizes="(min-width: 1024px) 30vw, (min-width: 768px) 40vw, 90vw"
                  className="object-cover object-[62%_35%]"
                />
              </div>
            </div>
            <figcaption className="eyebrow mt-4 flex items-center justify-between text-snow/65">
              <span>On the trail</span>
              <span className="flag-rule" aria-hidden="true">
                <i className="bg-flag-blue" />
                <i className="bg-flag-white" />
                <i className="bg-flag-red" />
                <i className="bg-flag-green" />
                <i className="bg-flag-yellow" />
              </span>
            </figcaption>
          </figure>

          <div className="col-span-12 md:col-span-7 lg:col-span-6 lg:col-start-7" data-reveal style={{ '--d': '220ms' }}>
            <div className="glass orn-host relative rounded-[1.25rem] p-7 sm:p-9 lg:p-11">
              <Ornament />
              <div className="space-y-5 text-[1.0625rem] leading-[1.7] text-snow/85">
                {about.body.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>

              <dl className="mt-9 border-t border-white/10">
                {about.facts.map((f) => (
                  <div key={f.term} className="grid grid-cols-[7.5rem_1fr] gap-4 border-b border-white/10 py-3.5 sm:grid-cols-[9rem_1fr]">
                    <dt className="eyebrow pt-[0.3rem] text-snow/60">{f.term}</dt>
                    <dd className="text-[0.975rem] text-snow/90">{f.detail}</dd>
                  </div>
                ))}
              </dl>

              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3" aria-label="Find me elsewhere">
                {links.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      {...(l.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                      className="group inline-flex items-center gap-1.5 text-[0.9375rem] text-snow/80 transition-colors hover:text-snow"
                    >
                      <span className="link-draw">{l.label}</span>
                      <ArrowIcon className="h-3 w-3 opacity-60 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100" />
                      {l.href.startsWith('http') && <span className="sr-only">(opens in a new tab)</span>}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

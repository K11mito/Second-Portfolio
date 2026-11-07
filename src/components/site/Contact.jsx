import { person, socials } from '@/content/site'
import ArrowIcon from './ArrowIcon'
import CopyEmail from './CopyEmail'

export default function Contact() {
  return (
    <section
      id="contact"
      data-scene="contact"
      className="relative flex min-h-[calc(100svh-5.5rem)] flex-col"
      aria-labelledby="contact-title"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: 'linear-gradient(to right, rgb(6 4 6 / 0.72) 0%, rgb(6 4 6 / 0.35) 45%, transparent 75%)' }}
      />
      <div className="shell relative flex flex-1 flex-col justify-center pb-16 pt-28 md:pt-36">
        <div data-reveal>
          <p className="eyebrow text-snow/70">
            <span className="text-snow">04</span> — Contact
          </p>
          <h2 id="contact-title" className="display mt-7 text-[clamp(3.5rem,10vw,9.75rem)] text-snow">
            Let&rsquo;s build
            <br />
            <em className="italic">something.</em>
          </h2>
          <p className="prose-lede mt-8 max-w-[27rem] text-snow/75">
            Have an idea, an opportunity, or just want to talk? My inbox is always open.
          </p>
        </div>

        <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-5" data-reveal style={{ '--d': '120ms' }}>
          <a
            href={`mailto:${person.email}`}
            className="title link-draw break-all text-[clamp(1.6rem,3.6vw,3rem)] text-snow sm:break-normal"
          >
            {person.email}
          </a>
          <CopyEmail email={person.email} />
        </div>

        <ul className="mt-12 flex flex-wrap gap-x-8 gap-y-3" aria-label="Elsewhere" data-reveal style={{ '--d': '200ms' }}>
          {socials.map((s) => (
            <li key={s.label}>
              <a
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-1.5 text-[0.9375rem] text-snow/75 transition-colors hover:text-snow"
              >
                <span className="link-draw">{s.label}</span>
                <ArrowIcon className="h-3 w-3 opacity-60 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </li>
          ))}
        </ul>
      </div>

    </section>
  )
}

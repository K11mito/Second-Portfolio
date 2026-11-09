import { person } from '@/content/site'
import Knot from './Knot'

export default function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="relative z-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: 'linear-gradient(to right, rgb(6 4 6 / 0.72) 0%, rgb(6 4 6 / 0.35) 45%, transparent 75%)' }}
      />
      <div className="shell relative pb-8">
        <div className="hairline" />
        <div className="flex flex-col gap-5 pt-6 text-[0.8125rem] text-snow/55 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Knot id="knot-footer" className="h-4 w-4 text-snow/60" strokeWidth={2.4} />
            <span>
              © {year} {person.name}
            </span>
          </div>
          <span className="hidden md:inline">Designed &amp; built with Next.js and three.js</span>
          <a href="#top" className="group inline-flex items-center gap-2 text-snow/65 transition-colors hover:text-snow">
            Back to the summit
            <span aria-hidden="true" className="transition-transform duration-300 group-hover:-translate-y-0.5">
              ↑
            </span>
          </a>
        </div>
      </div>
    </footer>
  )
}

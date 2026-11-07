import { person } from '@/content/site'
import SceneStatus from './SceneStatus'

export default function Hero() {
  return (
    <section id="top" data-scene="hero" className="relative h-[100svh] min-h-[620px]" aria-labelledby="hero-title">
      {/* legibility: a low, soft darkening behind the type — reads as atmosphere, not a box */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, rgb(4 12 34 / 0.5), transparent 9rem), linear-gradient(to top, rgb(5 9 22 / 0.62) 0%, rgb(5 9 22 / 0.28) 34%, transparent 62%), radial-gradient(70% 60% at 12% 78%, rgb(5 9 22 / 0.42), transparent 70%)',
        }}
      />

      <div className="shell relative flex h-full flex-col justify-end pb-[clamp(1.75rem,5.5vh,3.5rem)]">
        <div className="max-w-[52rem]">
          <p className="eyebrow hero-in text-snow/75" style={{ '--d': '150ms' }}>
            Finance <span className="mx-2 text-snow/35">/</span> Technology <span className="mx-2 text-snow/35">/</span> Ventures
          </p>

          <h1
            id="hero-title"
            className="display mt-5 text-[clamp(4.5rem,min(11.2vw,16.5vh),10.75rem)] text-snow md:mt-7 [@media(max-height:760px)]:md:mt-4"
          >
            <span className="line-mask">
              <span className="hero-line" style={{ '--d': '250ms' }}>
                {person.firstName}
              </span>
            </span>
            <span className="line-mask -mt-[0.06em]">
              <span className="hero-line pl-[0.55em] italic" style={{ '--d': '380ms' }}>
                {person.lastName}
              </span>
            </span>
          </h1>

          <p
            className="prose-lede hero-in mt-7 max-w-[30rem] text-snow/80 md:mt-9 [@media(max-height:760px)]:md:mt-5"
            style={{ '--d': '650ms' }}
          >
            {person.lede}
          </p>
        </div>

        <div
          className="hero-in mt-12 flex items-end justify-between gap-6 md:mt-16 [@media(max-height:760px)]:md:mt-8"
          style={{ '--d': '850ms' }}
        >
          <a href="#about" className="group flex items-center gap-4 text-snow/75 transition-colors hover:text-snow">
            <span className="scroll-cue relative block h-12 w-px overflow-hidden bg-snow/20" aria-hidden="true" />
            <span className="eyebrow">Scroll to descend</span>
          </a>
          <div className="flex flex-col items-end gap-2 text-right">
            <SceneStatus />
            <p className="eyebrow hidden text-snow/60 sm:block">Studying finance · Mahidol University</p>
          </div>
        </div>
      </div>
    </section>
  )
}

import Image from 'next/image'
import Knot from '@/components/site/Knot'

export const metadata = {
  title: 'Lost in the clouds',
}

export default function NotFound() {
  return (
    <main className="relative grid min-h-[100svh] place-items-center overflow-hidden px-6 text-center">
      <Image
        src="/images/poster-wide.webp"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover opacity-50"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ background: 'radial-gradient(60% 60% at 50% 50%, rgb(6 10 24 / 0.55), rgb(6 10 24 / 0.9))' }}
      />
      <div className="relative">
        <Knot id="knot-404" className="mx-auto h-10 w-10 text-snow/85" strokeWidth={2.2} />
        <p className="eyebrow mt-9 text-snow/70">404 — Off the trail</p>
        <h1 className="display mt-6 text-[clamp(3.25rem,9vw,7.5rem)] text-snow">
          Lost in the <em className="italic">clouds</em>
        </h1>
        <p className="prose-lede mx-auto mt-7 max-w-[26rem] text-snow/75">
          This trail doesn&rsquo;t lead anywhere. Head back to the summit and start the descent again.
        </p>
        <a
          href="/"
          className="mt-10 inline-flex items-center gap-2 rounded-full border border-snow/25 px-5 py-3 text-[0.9375rem] text-snow transition-colors duration-300 hover:border-snow/60 hover:bg-snow/10"
        >
          Back to the summit <span aria-hidden="true">↑</span>
        </a>
      </div>
    </main>
  )
}

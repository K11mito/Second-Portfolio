// The descent into the cloud sea. The section is tall so the camera has room
// to sink; the line stays pinned while the clouds close in. Its fade is
// driven from <Atmosphere/>, in lock-step with the white-out.
export default function Interlude() {
  return (
    <section id="interlude" data-scene="interlude" className="interlude relative" aria-label="Interlude">
      <div className="interlude-stage flex items-center justify-center overflow-hidden py-32">
        <div data-interlude className="shell text-center will-change-[opacity,transform]">
          <p className="eyebrow text-snow/75">Descending</p>
          <p className="display mt-6 text-[clamp(3.5rem,10.5vw,10rem)] italic text-snow [text-shadow:0_4px_60px_rgb(40_20_40/0.35)]">
            Into the clouds
          </p>
          <p className="eyebrow mt-8 text-snow/60">Next — Experience</p>
        </div>
      </div>
    </section>
  )
}

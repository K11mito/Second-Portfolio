import { createCloth } from './cloth'

// Message handler shared by the worker and the main-thread fallback, so the
// two can never drift apart. Returns the reply and anything to transfer.
export function createRunner() {
  let sim = null
  return function handle(m) {
    if (m.type === 'init') {
      sim = createCloth(m.lines, { seed: m.seed })
      sim.substeps = m.substeps
      sim.iters = m.iters
      sim.wind.now = sim.wind.target = m.wind
      sim.settle(m.settle)
      const frame = new Float32Array(sim.frameSize)
      sim.writeFrame(frame)
      return { msg: { type: 'ready', meta: sim.meta(), frame }, transfer: [frame.buffer] }
    }
    if (m.type === 'step' && sim) {
      const t0 = performance.now()
      sim.substeps = m.substeps
      sim.iters = m.iters
      sim.wind.target = m.wind
      sim.wind.gust += m.gust
      if (m.stir) Object.assign(sim.stir, m.stir)
      const steps = sim.step(m.dt)
      if (steps) sim.writeFrame(m.buf)
      return { msg: { type: 'frame', buf: m.buf, steps, ms: performance.now() - t0 }, transfer: [m.buf.buffer] }
    }
    return null
  }
}

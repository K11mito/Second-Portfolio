import { FIXED } from './cloth'
import { createRunner } from './runner'

// Drives the cloth from the render loop. One buffer ping-pongs between the
// threads: while the worker steps, the main thread keeps drawing the last
// pose, and time owed meanwhile is carried into the next step. If workers are
// unavailable the same runner works synchronously on the main thread.
export function startCloth(init) {
  return new Promise((resolve, reject) => {
    let worker = null
    let local = null
    let settled = false

    const client = {
      meta: null,
      frame: null, // latest pose: flag positions, flag normals, rope positions
      version: 0,
      busy: false,
      inWorker: false,
      ms: 0, // average time a step message takes, wherever it runs
      load: 0, // compute time over simulated time: above 1 the cloth falls behind
      substeps: init.substeps,
      iters: init.iters,
      owedDt: 0,
      gust: 0,
      stir: null,
      spare: null,

      /** Queue `dt` seconds of wind; sends a step as soon as the last one is back. */
      step(dt, wind) {
        client.owedDt += dt
        if (client.busy || !client.spare || client.owedDt <= 0) return
        const msg = {
          type: 'step',
          dt: client.owedDt,
          wind,
          gust: client.gust,
          stir: client.stir,
          substeps: client.substeps,
          iters: client.iters,
          buf: client.spare,
        }
        client.owedDt = 0
        client.gust = 0
        client.stir = null
        client.spare = null
        client.busy = true
        post(msg, [msg.buf.buffer])
      },

      dispose() {
        worker?.terminate()
        worker = null
        local = null
      },
    }

    const receive = (m) => {
      if (m.type === 'ready') {
        client.meta = m.meta
        client.frame = new Float32Array(m.frame.length)
        client.frame.set(m.frame)
        client.spare = m.frame
        client.version++
        settled = true
        resolve(client)
      } else if (m.type === 'frame') {
        if (m.steps) {
          client.frame.set(m.buf)
          client.version++
          const load = m.ms / (m.steps * FIXED * 1000)
          client.load = client.load ? client.load * 0.9 + load * 0.1 : load
        }
        client.spare = m.buf
        client.busy = false
        client.ms = client.ms ? client.ms * 0.9 + m.ms * 0.1 : m.ms
      }
    }

    const runLocal = () => {
      worker?.terminate()
      worker = null
      client.inWorker = false
      local = createRunner()
      // stay asynchronous, like a worker, so callers never re-enter
      setTimeout(() => {
        try {
          const out = local(initMsg)
          receive(out.msg)
        } catch (e) {
          reject(e)
        }
      }, 0)
    }

    function post(msg, transfer) {
      if (worker) worker.postMessage(msg, transfer)
      else if (local) {
        const out = local(msg)
        if (out) receive(out.msg)
      }
    }

    const initMsg = { type: 'init', ...init }

    try {
      worker = new Worker(new URL('./cloth.worker.js', import.meta.url))
      client.inWorker = true
      worker.onmessage = (e) => receive(e.data)
      worker.onerror = (e) => {
        e.preventDefault?.()
        // a worker that fails before its first frame is replaced by the main thread
        if (!settled) runLocal()
      }
      worker.postMessage(initMsg)
    } catch {
      runLocal()
    }
  })
}

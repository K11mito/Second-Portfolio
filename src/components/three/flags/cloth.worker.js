import { createRunner } from './runner'

// The cloth runs here, off the main thread: scrolling never waits on it.
const handle = createRunner()

self.onmessage = (e) => {
  const out = handle(e.data)
  if (out) self.postMessage(out.msg, out.transfer)
}

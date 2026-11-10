import { randomBytes } from 'node:crypto'
import { NOTE } from '@/lib/summitRules'
import { Limited, summitStore } from '@/lib/summitStore'
import { json, network, remember, sameSite, visitor } from '@/lib/summitRequest'

export const dynamic = 'force-dynamic'

// control characters and invisible direction marks (which could flip or hide text)
const hidden = (c) => c < 0x20 || (c >= 0x7f && c <= 0x9f) || (c >= 0x200b && c <= 0x200f) || (c >= 0x2028 && c <= 0x202e) || (c >= 0x2066 && c <= 0x2069)

// tidy what was typed: no hidden characters, single spaces, trimmed to length
function clean(v, max) {
  const s = [...String(v ?? '')]
    .map((ch) => (hidden(ch.codePointAt(0)) ? ' ' : ch))
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
  return [...s].slice(0, max).join('')
}

// Pin a note to the summit board. It goes up at once, as written (plain text,
// never a link); each visitor and each network has a few a day.
export async function POST(req) {
  if (!sameSite(req)) return json({ error: 'forbidden' }, { status: 403 })
  const store = summitStore()
  if (!store) return json({ error: 'closed' }, { status: 503 })
  let body
  try {
    body = await req.json()
  } catch {
    return json({ error: 'bad request' }, { status: 400 })
  }
  // a field people never see: only scripts fill it in
  if (body?.website) return json({ error: 'bad request' }, { status: 400 })
  const text = clean(body?.text, NOTE.text)
  if (!text) return json({ error: 'empty' }, { status: 400 })
  const note = {
    id: randomBytes(6).toString('hex'),
    text,
    name: clean(body?.name, NOTE.name),
    from: clean(body?.from, NOTE.from),
    at: new Date().toISOString(),
    paper: Math.floor(Math.random() * 4),
  }
  const who = visitor()
  try {
    await store.addNote(who.id, network(), note)
    return remember(json({ note }), who)
  } catch (err) {
    if (err instanceof Limited) return remember(json({ error: 'limit' }, { status: 429 }), who)
    console.error(err)
    return json({ error: 'failed' }, { status: 500 })
  }
}

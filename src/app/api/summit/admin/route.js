import { timingSafeEqual } from 'node:crypto'
import { summitStore } from '@/lib/summitStore'
import { json, sameSite } from '@/lib/summitRequest'

export const dynamic = 'force-dynamic'

const allowed = (key) => {
  const secret = process.env.SUMMIT_ADMIN_KEY
  if (!secret || typeof key !== 'string') return false
  const a = Buffer.from(key)
  const b = Buffer.from(secret)
  return a.length === b.length && timingSafeEqual(a, b)
}

// The owner's way to take a note down (the key is SUMMIT_ADMIN_KEY in the
// project's environment). { key, action: 'list' } or { key, action: 'remove', id }
export async function POST(req) {
  if (!sameSite(req)) return json({ error: 'forbidden' }, { status: 403 })
  let body
  try {
    body = await req.json()
  } catch {
    return json({ error: 'bad request' }, { status: 400 })
  }
  if (!allowed(body?.key)) return json({ error: 'not allowed' }, { status: 401 })
  const store = summitStore()
  if (!store) return json({ error: 'closed' }, { status: 503 })
  if (body.action === 'remove') return json({ removed: await store.removeNote(String(body.id || '')) })
  const all = await store.allNotes()
  return json({ notes: all.map((n) => n.note) })
}

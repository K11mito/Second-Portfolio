import { Limited, summitStore } from '@/lib/summitStore'
import { json, network, remember, sameSite, visitor } from '@/lib/summitRequest'

export const dynamic = 'force-dynamic'

// Pull the counter's lever: counts this browser once, ever.
export async function POST(req) {
  if (!sameSite(req)) return json({ error: 'forbidden' }, { status: 403 })
  const store = summitStore()
  if (!store) return json({ error: 'closed' }, { status: 503 })
  const who = visitor()
  try {
    const out = await store.pull(who.id, network())
    return remember(json(out), who)
  } catch (err) {
    if (err instanceof Limited) return remember(json({ error: 'busy' }, { status: 429 }), who)
    console.error(err)
    return json({ error: 'failed' }, { status: 500 })
  }
}

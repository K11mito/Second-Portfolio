import { summitIsSketch, summitStore } from '@/lib/summitStore'
import { json, remember, visitor } from '@/lib/summitRequest'

export const dynamic = 'force-dynamic'

// The register as this visitor sees it: the count, their own number if they
// have pulled the lever, and the newest notes on the board. When it is closed,
// `why` says whether no store is connected or the one connected can't be reached.
export async function GET() {
  const who = visitor()
  const store = summitStore()
  if (!store) return remember(json({ open: false, why: 'not-configured', count: null, number: null, notes: [] }), who)
  try {
    const s = await store.state(who.id)
    return remember(json({ open: true, sketch: summitIsSketch(), ...s }), who)
  } catch (err) {
    console.error(err)
    return remember(json({ open: false, why: 'unreachable', count: null, number: null, notes: [] }), who)
  }
}

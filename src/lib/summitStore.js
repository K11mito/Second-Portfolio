// The summit register: how many have pulled the counter's lever, and the notes
// pinned to the board. Kept in Redis: Upstash through its REST API (the free
// store Vercel connects in a couple of clicks), or any Redis by its redis://
// URL. In development and in preview deployments without one, it lives in
// memory so the summit can be tried (a preview's memory is per server
// instance, and is forgotten now and then); on the live site without one, the
// summit says the register is not open yet.
//
// Server only: it reads secrets from the environment.

import { BOARD_SIZE, NOTES_PER_DAY, NOTES_PER_NETWORK_PER_DAY, PULLS_PER_NETWORK_PER_DAY } from './summitRules'

/**
 * Where the register is kept, from the environment, under whichever names the
 * store was connected with:
 *  - a REST endpoint and its token: KV_REST_API_URL and KV_REST_API_TOKEN
 *    (Vercel's Upstash integration), UPSTASH_REDIS_REST_URL and _TOKEN
 *    (Upstash's own), or either under a prefix chosen when the store was
 *    connected (STORAGE_KV_REST_API_URL, …);
 *  - or a redis:// URL: REDIS_URL or KV_URL, prefixed or not. An Upstash one
 *    is reached over REST (the same host answers it, the password is the
 *    token); any other over a connection of its own.
 * Returns { kind: 'rest', url, token } or { kind: 'tcp', url }, or null.
 */
export function findStore(env = process.env) {
  const keys = Object.keys(env).sort((a, b) => a.length - b.length)
  for (const key of keys) {
    const m = key.match(/^(.*?)(KV_REST_API|REDIS_REST)_URL$/)
    const url = m && env[key]
    const token = m && env[`${m[1]}${m[2]}_TOKEN`]
    if (url && token && /^https?:\/\//.test(url)) return { kind: 'rest', url, token }
  }
  for (const key of keys) {
    if (!/(^|_)(REDIS|KV)_URL$/.test(key) || !/^rediss?:\/\//.test(env[key] || '')) continue
    try {
      const u = new URL(env[key])
      if (u.hostname.endsWith('.upstash.io') && u.password) return { kind: 'rest', url: `https://${u.hostname}`, token: decodeURIComponent(u.password) }
    } catch {
      continue
    }
    return { kind: 'tcp', url: env[key] }
  }
  return null
}

const STORE = findStore()
const KEY = {
  count: 'summit:count',
  pulled: 'summit:pulled',
  notes: 'summit:notes',
  limit: (kind, who) => `summit:rl:${kind}:${who}:${new Date().toISOString().slice(0, 10)}`,
}
const KEEP = 500 // notes kept in all; the board shows the newest

export class Limited extends Error {}

// ---------------------------------------------------------------- Redis, over REST or a connection
// Commands are sent in a batch and their replies come back in order.
async function overRest(cmds) {
  const res = await fetch(`${STORE.url.replace(/\/$/, '')}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${STORE.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmds),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`summit store: ${res.status}`)
  const out = await res.json()
  return out.map((r) => {
    if (r.error) throw new Error(`summit store: ${r.error}`)
    return r.result
  })
}

// one connection per server instance, opened on first use (and again after a failure)
let connection = null
function connect() {
  if (!connection) {
    connection = import('redis')
      .then(async ({ createClient }) => {
        const client = createClient({ url: STORE.url, socket: { connectTimeout: 5000, reconnectStrategy: (tries) => (tries > 3 ? false : 300) } })
        // a command that fails says so itself; a dropped connection is reopened next time
        client.on('error', () => {})
        client.on('end', () => {
          connection = null
        })
        await client.connect()
        return client
      })
      .catch((err) => {
        connection = null
        throw err
      })
  }
  return connection
}
async function overConnection(cmds) {
  const client = await connect()
  // sent together: the client pipelines commands issued in the same moment
  return Promise.all(cmds.map((c) => client.sendCommand(c.map(String))))
}

const pipeline = (cmds) => (STORE.kind === 'rest' ? overRest(cmds) : overConnection(cmds))

// claim the visitor's place and count them, in one step (atomic in Redis)
const PULL = `
local n = redis.call('HGET', KEYS[1], ARGV[1])
if n then return {tonumber(n), 0} end
n = redis.call('INCR', KEYS[2])
redis.call('HSET', KEYS[1], ARGV[1], n)
return {n, 1}`

const redis = {
  async state(visitor) {
    const [count, mine, notes] = await pipeline([
      ['GET', KEY.count],
      ['HGET', KEY.pulled, visitor],
      ['LRANGE', KEY.notes, 0, BOARD_SIZE - 1],
    ])
    return { count: Number(count) || 0, number: mine ? Number(mine) : null, notes: notes.map(parse).filter(Boolean) }
  },
  async pull(visitor, network) {
    const lim = KEY.limit('pull', network)
    const [used] = await pipeline([['INCR', lim], ['EXPIRE', lim, 172800]])
    if (used > PULLS_PER_NETWORK_PER_DAY) {
      // a pull refused here might be one already counted: answer with theirs
      const [count, mine] = await pipeline([['GET', KEY.count], ['HGET', KEY.pulled, visitor]])
      if (mine) return { count: Number(count) || 0, number: Number(mine), already: true }
      throw new Limited('pulls')
    }
    const [[number, fresh], count] = await pipeline([['EVAL', PULL, 2, KEY.pulled, KEY.count, visitor], ['GET', KEY.count]])
    return { count: Number(count) || 0, number: Number(number), already: !fresh }
  },
  async addNote(visitor, network, note) {
    const a = KEY.limit('note', visitor)
    const b = KEY.limit('note-net', network)
    const [mine, net] = await pipeline([['INCR', a], ['EXPIRE', a, 172800], ['INCR', b], ['EXPIRE', b, 172800]]).then((r) => [r[0], r[2]])
    if (mine > NOTES_PER_DAY || net > NOTES_PER_NETWORK_PER_DAY) throw new Limited('notes')
    await pipeline([['LPUSH', KEY.notes, JSON.stringify(note)], ['LTRIM', KEY.notes, 0, KEEP - 1]])
    return note
  },
  async allNotes() {
    const [notes] = await pipeline([['LRANGE', KEY.notes, 0, KEEP - 1]])
    return notes.map((raw) => ({ raw, note: parse(raw) })).filter((n) => n.note)
  },
  async removeNote(id) {
    const all = await redis.allNotes()
    const hit = all.find((n) => n.note.id === id)
    if (!hit) return false
    await pipeline([['LREM', KEY.notes, 1, hit.raw]])
    return true
  },
}

function parse(raw) {
  try {
    const n = JSON.parse(raw)
    return n && typeof n.text === 'string' ? n : null
  } catch {
    return null
  }
}

// ---------------------------------------------------------------- in memory (development and previews)
const mem = globalThis.__summitMemory || (globalThis.__summitMemory = { count: 0, pulled: new Map(), notes: [], limits: new Map() })
const bump = (key) => {
  const n = (mem.limits.get(key) || 0) + 1
  mem.limits.set(key, n)
  return n
}
const memory = {
  async state(visitor) {
    return { count: mem.count, number: mem.pulled.get(visitor) ?? null, notes: mem.notes.slice(0, BOARD_SIZE) }
  },
  async pull(visitor, network) {
    if (mem.pulled.has(visitor)) return { count: mem.count, number: mem.pulled.get(visitor), already: true }
    if (bump(KEY.limit('pull', network)) > PULLS_PER_NETWORK_PER_DAY) throw new Limited('pulls')
    mem.count += 1
    mem.pulled.set(visitor, mem.count)
    return { count: mem.count, number: mem.count, already: false }
  },
  async addNote(visitor, network, note) {
    if (bump(KEY.limit('note', visitor)) > NOTES_PER_DAY || bump(KEY.limit('note-net', network)) > NOTES_PER_NETWORK_PER_DAY) throw new Limited('notes')
    mem.notes.unshift(note)
    mem.notes.length = Math.min(mem.notes.length, KEEP)
    return note
  },
  async allNotes() {
    return mem.notes.map((note) => ({ raw: null, note }))
  },
  async removeNote(id) {
    const i = mem.notes.findIndex((n) => n.id === id)
    if (i < 0) return false
    mem.notes.splice(i, 1)
    return true
  },
}

/** The register's store, or null when none is connected (the live site without Redis). */
export function summitStore() {
  if (STORE) return redis
  if (process.env.NODE_ENV !== 'production' || process.env.VERCEL_ENV === 'preview') return memory
  return null
}

/** Whether the register is only kept in memory (a sketch: it forgets). */
export const summitIsSketch = () => !STORE

// The summit register: how many have pulled the counter's lever, and the notes
// pinned to the board. Kept in Redis (Upstash, through its REST API: the free
// store Vercel connects in a couple of clicks). In development without one, it
// lives in memory so the summit can be tried locally; in production without
// one, the summit says the register is not open yet.
//
// Server only: it reads secrets from the environment.

import { BOARD_SIZE, NOTES_PER_DAY, NOTES_PER_NETWORK_PER_DAY, PULLS_PER_NETWORK_PER_DAY } from './summitRules'

const URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
const KEY = {
  count: 'summit:count',
  pulled: 'summit:pulled',
  notes: 'summit:notes',
  limit: (kind, who) => `summit:rl:${kind}:${who}:${new Date().toISOString().slice(0, 10)}`,
}
const KEEP = 500 // notes kept in all; the board shows the newest

export class Limited extends Error {}

// ---------------------------------------------------------------- Redis over REST
async function pipeline(cmds) {
  const res = await fetch(`${URL.replace(/\/$/, '')}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
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

// ---------------------------------------------------------------- in memory (development only)
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

/** The register's store, or null when none is connected (production without Redis). */
export function summitStore() {
  if (URL && TOKEN) return redis
  if (process.env.NODE_ENV !== 'production') return memory
  return null
}

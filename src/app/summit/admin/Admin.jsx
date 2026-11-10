'use client'

import { useState } from 'react'

const call = (body) =>
  fetch('/api/summit/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(async (r) => ({ ok: r.ok, status: r.status, data: await r.json().catch(() => ({})) }))

export default function Admin() {
  const [key, setKey] = useState('')
  const [notes, setNotes] = useState(null)
  const [error, setError] = useState('')

  const load = async (e) => {
    e?.preventDefault()
    setError('')
    const r = await call({ key, action: 'list' })
    if (!r.ok) return setError(r.status === 401 ? 'That key is not right (or SUMMIT_ADMIN_KEY is not set).' : r.status === 503 ? 'The register is not connected yet.' : 'Something went wrong.')
    setNotes(r.data.notes)
  }
  const remove = async (id) => {
    if (!window.confirm('Take this note down for good?')) return
    const r = await call({ key, action: 'remove', id })
    if (r.ok) setNotes((n) => n.filter((x) => x.id !== id))
    else setError('Could not take it down.')
  }

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-5 py-16 text-snow">
      <h1 className="title text-4xl">Summit board</h1>
      <p className="mt-3 text-snow/70">Every note pinned at the summit, newest first. Take down any you do not want on the site.</p>
      <form onSubmit={load} className="mt-8 flex gap-3">
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="Admin key"
          autoComplete="current-password"
          className="flex-1 rounded-full border border-snow/25 bg-transparent px-4 py-2 text-snow outline-none focus:border-saffron"
        />
        <button className="rounded-full border border-snow/30 px-5 py-2 hover:border-snow/70">Open</button>
      </form>
      {error && <p className="mt-4 text-saffron">{error}</p>}
      {notes && (
        <ul className="mt-10 divide-y divide-snow/10 border-y border-snow/10">
          {notes.length === 0 && <li className="py-6 text-snow/60">No notes yet.</li>}
          {notes.map((n) => (
            <li key={n.id} className="flex items-start justify-between gap-6 py-5">
              <div>
                <p className="text-[1.05rem]">{n.text}</p>
                <p className="mt-1 text-sm text-snow/55">
                  {[n.name, n.from].filter(Boolean).join(', ') || 'Unsigned'} · {new Date(n.at).toLocaleString()}
                </p>
              </div>
              <button onClick={() => remove(n.id)} className="shrink-0 rounded-full border border-snow/25 px-4 py-1.5 text-sm hover:border-saffron hover:text-saffron">
                Take down
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

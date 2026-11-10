// Who is asking, for the summit register's routes (server only).
//  - visitor: a random id kept in a cookie, so the lever counts each browser once
//  - network: a salted hash of the address, for the daily caps (the address
//    itself is never stored)
import { createHash, randomUUID } from 'node:crypto'
import { cookies, headers } from 'next/headers'
import { NextResponse } from 'next/server'

const COOKIE = 'summit_v'
const TWO_YEARS = 60 * 60 * 24 * 730

export function visitor() {
  const jar = cookies()
  let id = jar.get(COOKIE)?.value
  const fresh = !id || !/^[a-f0-9-]{36}$/.test(id)
  if (fresh) id = randomUUID()
  return { id, fresh }
}

/** Sets the visitor cookie on a response if it was just made. */
export function remember(res, who) {
  if (who.fresh) {
    res.cookies.set(COOKIE, who.id, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: TWO_YEARS,
      path: '/',
    })
  }
  return res
}

export function network() {
  const h = headers()
  const ip = (h.get('x-forwarded-for') || '').split(',')[0].trim() || h.get('x-real-ip') || 'local'
  const salt = process.env.SUMMIT_SALT || 'summit-register'
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 20)
}

/** Writes must come from the site itself, not a form on someone else's. */
export function sameSite(req) {
  const origin = req.headers.get('origin')
  if (!origin) return true
  try {
    return new URL(origin).host === req.headers.get('host')
  } catch {
    return false
  }
}

export const json = (body, init) => NextResponse.json(body, { ...init, headers: { 'Cache-Control': 'no-store', ...(init?.headers || {}) } })

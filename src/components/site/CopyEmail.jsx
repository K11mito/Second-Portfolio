'use client'

import { useState } from 'react'

export default function CopyEmail({ email }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      window.location.href = `mailto:${email}`
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="eyebrow rounded-full border border-snow/20 px-4 py-2.5 text-snow/75 transition-colors duration-300 hover:border-snow/50 hover:text-snow"
      aria-live="polite"
    >
      {copied ? 'Copied ✓' : 'Copy address'}
    </button>
  )
}

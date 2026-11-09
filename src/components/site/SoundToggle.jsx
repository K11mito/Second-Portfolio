'use client'

import { useEffect, useState } from 'react'
import { isSoundOn, onSoundChange, setSound } from '@/lib/sound'

// Four little bars: still when off, breathing when on.
export default function SoundToggle({ className = '' }) {
  const [on, setOn] = useState(false)
  useEffect(() => {
    setOn(isSoundOn())
    return onSoundChange(setOn)
  }, [])
  return (
    <button
      type="button"
      onClick={() => setSound(!on)}
      aria-pressed={on}
      aria-label={on ? 'Turn ambient sound off' : 'Turn ambient sound on'}
      title={on ? 'Sound on' : 'Sound off'}
      className={`group/sound inline-flex h-9 items-center gap-2 rounded-full px-3 text-[0.8125rem] text-snow/70 transition-colors duration-300 hover:text-snow ${className}`}
    >
      <span className="flex h-3 items-end gap-[2px]" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <i
            key={i}
            className="sound-bar block w-[2px] rounded-full bg-current"
            data-on={on}
            style={{ '--i': i }}
          />
        ))}
      </span>
      <span className="hidden lg:inline">Sound</span>
    </button>
  )
}

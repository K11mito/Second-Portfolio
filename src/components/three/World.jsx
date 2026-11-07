'use client'

import { Suspense } from 'react'
import Director from './Director'
import Lights from './Lights'
import Sky from './Sky'
import Terrain from './Terrain'
import CloudSea from './CloudSea'
import PrayerFlags from './PrayerFlags'
import Monastery from './Monastery'

export default function World() {
  return (
    <>
      <Director />
      <Lights />
      <Sky />
      <Terrain />
      <CloudSea />
      <PrayerFlags />
      {/* The monastery is far down the page: stream it in without holding up the summit. */}
      <Suspense fallback={null}>
        <Monastery />
      </Suspense>
    </>
  )
}

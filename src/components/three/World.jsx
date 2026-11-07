'use client'

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
      <Monastery />
    </>
  )
}

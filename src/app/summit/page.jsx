import HomePage from '@/components/site/HomePage'
import { person } from '@/content/site'

export const metadata = {
  title: 'The summit',
  description: `The top of ${person.firstName}'s mountain: pull the register's lever to be counted, and leave a note on the board for whoever climbs next.`,
}

// The summit: the home page, arrived at already on top, so a reload or a shared
// link lands here and the way back leads down onto the mountain.
export default function SummitPage() {
  return <HomePage start="summit" />
}

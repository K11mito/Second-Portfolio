import HomePage from '@/components/site/HomePage'
import { experience, person } from '@/content/site'

export const metadata = {
  title: 'Experience',
  description: `Where ${person.firstName} has worked, and the ventures and wins along the way: ${experience.map((e) => e.org).join(', ')}. Turn the prayer wheel to read them.`,
}

// The prayer-wheel temple: the home page, arrived at already inside it, so a
// reload or a shared link lands here and the way back leads out onto the mountain.
export default function ExperiencePage() {
  return <HomePage start="temple" />
}

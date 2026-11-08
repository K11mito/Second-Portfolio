import Archive from '@/components/archive/Archive'
import { person, projects } from '@/content/site'

export const metadata = {
  title: 'Projects',
  description: `Everything ${person.firstName} has built: ${projects.length} projects, from AI agents and computer vision to hardware and the web, newest first.`,
}

export default function ProjectsPage() {
  return <Archive />
}

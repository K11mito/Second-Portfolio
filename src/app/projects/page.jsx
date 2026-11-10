import Link from 'next/link'
import Library from '@/components/library/Library'
import ProjectsIndex from '@/components/library/ProjectsIndex'
import { person, projects } from '@/content/site'
import s from '@/components/library/library.module.css'

export const metadata = {
  title: 'Projects',
  description: `Every project ${person.firstName} has built, wrapped like Tibetan texts and shelved in a monastery library: ${projects.length} projects, from AI agents and computer vision to hardware and the web, newest first.`,
}

export const viewport = {
  themeColor: '#0a0504',
}

// The library: every project wrapped as a pecha on a monastery bookcase. The
// header and the plain list below are rendered here, on the server; the list
// is what search engines, screen readers and browsers without WebGL get. On the
// home page the same library opens over the mountain when you fly to its door.
export default function ProjectsPage() {
  // the way out on the left (back to the mountain's "Where to now?"); the page's name in the top middle
  const intro = (
    <header className={s.intro}>
      <Link href="/#destinations" className={s.back}>
        <span aria-hidden="true">←</span>
        The mountain
      </Link>
      <h1 className={s.eyebrow}>
        <span className={s.tib} lang="bo" aria-hidden="true">
          དཔེ་ཆ།
        </span>
        <span>Projects · {projects.length} texts</span>
      </h1>
    </header>
  )

  return (
    <Library projects={projects} intro={intro}>
      <ProjectsIndex projects={projects} />
    </Library>
  )
}

'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { FaGithub, FaExternalLinkAlt } from 'react-icons/fa'
import { PROJECTS } from '@/data/content'
import { TibetanCorner } from './About'

const ease = [0.16, 1, 0.3, 1]

function ProjectCard({ project, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 70 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.9, ease, delay: index * 0.15 }}
      whileHover={{ y: -10 }}
      className="glass rounded-2xl overflow-hidden group relative block"
    >
      {project.liveLink && (
        <a
          href={project.liveLink}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${project.title} — live site`}
          className="absolute inset-0 z-10 cursor-pointer"
        />
      )}
      <TibetanCorner src="/images/decorations/tibetan-corner-small.png" className="w-12 h-12 md:w-14 md:h-14 top-0 left-0 -translate-x-1 -translate-y-1 z-20" />
      <TibetanCorner src="/images/decorations/tibetan-corner-small.png" className="w-12 h-12 md:w-14 md:h-14 top-0 right-0 translate-x-1 -translate-y-1 rotate-90 z-20" />
      <TibetanCorner src="/images/decorations/tibetan-corner-small.png" className="w-12 h-12 md:w-14 md:h-14 bottom-0 right-0 translate-x-1 translate-y-1 rotate-180 z-20" />
      <TibetanCorner src="/images/decorations/tibetan-corner-small.png" className="w-12 h-12 md:w-14 md:h-14 bottom-0 left-0 -translate-x-1 translate-y-1 -rotate-90 z-20" />

      <div className="relative h-48 overflow-hidden">
        <Image
          src={project.image}
          alt={project.title}
          fill
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/80 to-transparent" />
        {project.liveLink && (
          <div className="absolute top-4 right-4 text-white/0 group-hover:text-white/80 transition-colors duration-500">
            <FaExternalLinkAlt size={14} />
          </div>
        )}
      </div>

      <div className="p-6">
        <h3 className="text-xl font-bold text-white mb-2">{project.title}</h3>
        <p className="text-white/70 text-sm mb-4 leading-relaxed">{project.description}</p>
        <div className="flex flex-wrap gap-2">
          {project.tags.map((tag) => (
            <span key={tag} className="px-3 py-1 text-xs bg-gold/15 border border-gold/20 rounded-full text-amber-100/90">
              {tag}
            </span>
          ))}
        </div>
      </div>

      {project.githubLink && (
        <div className="absolute bottom-6 right-6 z-30">
          <a
            href={project.githubLink}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${project.title} on GitHub`}
            className="text-white/60 hover:text-white transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <FaGithub size={24} />
          </a>
        </div>
      )}
    </motion.div>
  )
}

export default function Projects() {
  return (
    <section id="projects" className="min-h-[170vh] w-full flex items-center justify-center px-4 py-24">
      <div className="max-w-6xl mx-auto w-full">
        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease }}
          className="font-tibetan text-4xl md:text-5xl text-white text-center mb-16 text-shadow"
        >
          {PROJECTS.heading}
        </motion.h2>
        <div className="grid md:grid-cols-3 gap-8">
          {PROJECTS.items.map((project, i) => (
            <ProjectCard key={project.title} project={project} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}

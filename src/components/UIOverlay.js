'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { FaGithub } from 'react-icons/fa'

const fadeInUp = {
  initial: { opacity: 0, y: 60 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: 'easeOut' }
}

const TibetanCorner = ({ className, style, src = "/images/tibetan-corner.png" }) => (
  <div className={`absolute pointer-events-none transition-all duration-500 opacity-40 group-hover:opacity-100 group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] ${className}`} style={style}>
    <Image
      src={src}
      alt="Tibetan Corner"
      fill
      className="object-contain"
    />
  </div>
)

function HeroSection() {
  return (
    <section className="h-screen w-full flex flex-col items-center justify-start pt-32 md:pt-40 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, ease: 'easeOut' }}
        className="text-center"
      >
        {/* Tibetan Knot */}
        <div className="relative w-40 h-40 md:w-56 md:h-56 mx-auto mb-8">
          <Image
            src="/images/knott.png"
            alt="Endless Knot"
            fill
            className="object-contain"
          />
        </div>
        <h1 className="text-6xl md:text-8xl font-bold text-white text-shadow mb-4 font-tibetan">
          Welcome
        </h1>
        <p className="text-xl md:text-2xl text-white/80 text-shadow mb-8">
          Scroll down to begin the journey
        </p>
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-white/60"
        >
          <svg
            className="w-8 h-8 mx-auto"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </motion.div>
      </motion.div>
    </section>
  )
}

function AboutSection() {
  return (
    <section className="min-h-screen w-full flex items-center justify-center px-4 py-20">
      <motion.div
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, margin: '-100px' }}
        className="max-w-5xl mx-auto relative p-8 md:p-16 group transition-colors duration-500"
      >
        {/* Main Fancy Border Container */}
        <div className="absolute inset-0 border border-white/5 rounded-3xl bg-black/20 backdrop-blur-sm -z-10 transition-all duration-500 group-hover:border-white/20 group-hover:bg-black/30" />

        {/* Tibetan Decorative Corners */}
        <TibetanCorner className="w-20 h-20 md:w-28 md:h-28 top-0 left-0 -translate-x-3 -translate-y-3" />
        <TibetanCorner className="w-20 h-20 md:w-28 md:h-28 top-0 right-0 translate-x-3 -translate-y-3 rotate-90" />
        <TibetanCorner className="w-20 h-20 md:w-28 md:h-28 bottom-0 right-0 translate-x-3 translate-y-3 rotate-180" />
        <TibetanCorner className="w-20 h-20 md:w-28 md:h-28 bottom-0 left-0 -translate-x-3 translate-y-3 -rotate-90" />

        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Profile Image - Now a Box */}
          <motion.div
            variants={fadeInUp}
            className="relative"
          >
            <div className="relative w-64 h-64 md:w-80 md:h-80 mx-auto">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl blur-2xl opacity-30" />
              <div className="relative w-full h-full rounded-3xl overflow-hidden border border-white/20 glass shadow-2xl">
                <Image
                  src="/images/ary.JPG"
                  alt="Profile"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          </motion.div>

          {/* About Text */}
          <motion.div
            variants={fadeInUp}
            transition={{ delay: 0.2 }}
            className="text-center md:text-left"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 text-shadow font-tibetan">
              Yo I'm Aryendra
            </h2>
            <p className="text-lg text-white/80 mb-4 leading-relaxed">
              I&apos;m a creative entrepreneur and technologist driven by curiosity across disciplines and a constant drive to learn
            </p>
            <ul className="text-lg text-white/80 mb-6 leading-relaxed list-disc list-inside space-y-2">
              <li>Majoring in Finance @ Mahidol University.</li>
              <li>Interned at Fuse Machines</li>
              <li>Always working on something new</li>
            </ul>

            {/* Experience Badges */}
            <div className="flex flex-wrap gap-4 justify-center md:justify-start">
              <div className="inline-flex items-center gap-3 glass rounded-full px-6 py-3 border border-white/10 transition-transform hover:scale-105">
                <div className="relative w-10 h-10">
                  <Image
                    src="/images/Mahidollogo.png"
                    alt="Mahidol University"
                    fill
                    className="object-contain"
                  />
                </div>
                <span className="text-white/90 font-medium">Mahidol University</span>
              </div>

              <div className="inline-flex items-center gap-3 glass rounded-full px-6 py-3 border border-white/10 transition-transform hover:scale-105">
                <div className="relative w-10 h-10">
                  <Image
                    src="/images/fusemachines.png"
                    alt="Fuse Machines"
                    fill
                    className="object-contain"
                  />
                </div>
                <span className="text-white/90 font-medium">Fuse Machines</span>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  )
}

function ProjectsSection() {
  const projects = [
    {
      title: 'Get Shit Done',
      description: 'Daily goal setting and productivity app',
      image: '/images/getshitdone.png',
      tags: ['Next.js', 'Three.js', 'Tailwind'],
      githubLink: 'https://github.com/K11mito/Goal-tracking-and-daily-routine-app',
    },
    {
      title: 'Food and Macro tracking app',
      description: 'Uses realtime Object-detction to track and log macro details',
      image: '/images/foodmacro.png',
      tags: ['Yolo.v8', 'React', 'Vite'],
      githubLink: 'https://github.com/K11mito',
    },
    {
      title: '3D illusion engine',
      description: 'An engine that creates the illusion of depth behind your monitor and creates a depth map of any image you upload',
      image: '/images/illusion.png',
      tags: ['Transformers.js', 'MediaPipe', 'Three.js', 'Tailwind'],
      githubLink: 'https://github.com/K11mito',
    },
  ]

  return (
    <section className="min-h-screen w-full flex items-center justify-center px-4 py-20">
      <div className="max-w-6xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-4xl md:text-5xl font-bold text-white text-center mb-16 text-shadow font-tibetan"
        >
          Few cool things I built
        </motion.h2>

        <div className="grid md:grid-cols-3 gap-8">
          {projects.map((project, index) => (
            <motion.div
              key={project.title}
              initial={{ opacity: 0, y: 60 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2 }}
              whileHover={{ y: -10, scale: 1.02 }}
              className="glass rounded-2xl overflow-hidden group cursor-pointer relative"
            >
              {/* Tibetan Decorative Corners - Smaller for cards */}
              <TibetanCorner src="/images/tibetan-corner-small.png" className="w-12 h-12 md:w-16 md:h-16 top-0 left-0 -translate-x-1 -translate-y-1 z-20" />
              <TibetanCorner src="/images/tibetan-corner-small.png" className="w-12 h-12 md:w-16 md:h-16 top-0 right-0 translate-x-1 -translate-y-1 rotate-90 z-20" />
              <TibetanCorner src="/images/tibetan-corner-small.png" className="w-12 h-12 md:w-16 md:h-16 bottom-0 right-0 translate-x-1 translate-y-1 rotate-180 z-20" />
              <TibetanCorner src="/images/tibetan-corner-small.png" className="w-12 h-12 md:w-16 md:h-16 bottom-0 left-0 -translate-x-1 translate-y-1 -rotate-90 z-20" />

              {/* Project Image */}
              <div className="relative h-48 overflow-hidden">
                <Image
                  src={project.image}
                  alt={project.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              </div>

              {/* Project Info */}
              <div className="p-6">
                <h3 className="text-xl font-bold text-white mb-2">
                  {project.title}
                </h3>
                <p className="text-white/70 text-sm mb-4">
                  {project.description}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-2">
                  {project.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 text-xs bg-white/10 rounded-full text-white/80"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* GitHub Link */}
              {project.githubLink && (
                <div className="absolute bottom-6 right-6 z-30">
                  <a
                    href={project.githubLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/60 hover:text-white transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <FaGithub size={24} />
                  </a>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section >
  )
}

function EnteringCloudsSection() {
  return (
    <section className="h-[60vh] w-full flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="text-center"
      >
        <h2 className="text-5xl md:text-7xl font-bold text-white text-shadow font-tibetan">
          Entering the clouds..
        </h2>
      </motion.div>
    </section>
  )
}

export default function UIOverlay() {
  return (
    <div className="relative w-full">
      {/* Hero Section - First screen */}
      <HeroSection />

      {/* About Section - 100vh */}
      <AboutSection />

      {/* Projects Section - 100vh */}
      <ProjectsSection />

      {/* Entering the Clouds Section - 100vh */}
      <EnteringCloudsSection />

      {/* Empty space for cloud transition and prayer wheel section */}
      <div className="h-[80vh]" />
      <div className="h-screen" />
      <div className="h-screen" />
    </div>
  )
}

'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import Image from 'next/image'

const fadeInUp = {
  initial: { opacity: 0, y: 60 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: 'easeOut' }
}

// Prayer flag curtains that drape from top
function PrayerFlagCurtains() {
  const { scrollYProgress } = useScroll()

  // Transform scroll progress to movement - flags move outward as you scroll
  const leftX = useTransform(scrollYProgress, [0, 0.15], ['0%', '-100%'])
  const rightX = useTransform(scrollYProgress, [0, 0.15], ['0%', '100%'])
  const flagsOpacity = useTransform(scrollYProgress, [0, 0.12], [1, 0])

  return (
    <>
      {/* Left prayer flag curtain */}
      <motion.div
        className="fixed top-0 left-0 h-screen w-[35%] md:w-[28%] z-50 pointer-events-none"
        style={{ x: leftX, opacity: flagsOpacity }}
      >
        <div className="relative w-full h-full">
          <Image
            src="/images/prayerflags.png"
            alt="Prayer Flags"
            fill
            className="object-cover object-right-top"
            priority
          />
        </div>
      </motion.div>

      {/* Right prayer flag curtain */}
      <motion.div
        className="fixed top-0 right-0 h-screen w-[35%] md:w-[28%] z-50 pointer-events-none"
        style={{ x: rightX, opacity: flagsOpacity }}
      >
        <div className="relative w-full h-full scale-x-[-1]">
          <Image
            src="/images/prayerflags.png"
            alt="Prayer Flags"
            fill
            className="object-cover object-right-top"
            priority
          />
        </div>
      </motion.div>
    </>
  )
}

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
        className="max-w-4xl mx-auto grid md:grid-cols-2 gap-12 items-center"
      >
        {/* Profile Image */}
        <motion.div
          variants={fadeInUp}
          className="relative"
        >
          <div className="relative w-64 h-64 md:w-80 md:h-80 mx-auto">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full blur-2xl opacity-30" />
            <div className="relative w-full h-full rounded-full overflow-hidden border-4 border-white/20 glass">
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
            About Me
          </h2>
          <p className="text-lg text-white/80 mb-4 leading-relaxed">
            I&apos;m a creative developer passionate about building immersive digital experiences
            that blend art and technology.
          </p>
          <p className="text-lg text-white/80 mb-6 leading-relaxed">
            With a background in both design and engineering, I craft websites and applications
            that are not just functional, but memorable.
          </p>

          {/* Education Badge */}
          <div className="inline-flex items-center gap-3 glass rounded-full px-6 py-3">
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
        </motion.div>
      </motion.div>
    </section>
  )
}

function ProjectsSection() {
  const projects = [
    {
      title: 'Project One',
      description: 'A stunning web application built with modern technologies.',
      image: '/images/knott.png',
      tags: ['React', 'Three.js', 'WebGL'],
    },
    {
      title: 'Project Two',
      description: 'Mobile-first design with seamless user experience.',
      image: '/images/prayerflags.png',
      tags: ['Next.js', 'Tailwind', 'Framer'],
    },
    {
      title: 'Project Three',
      description: 'Full-stack application with real-time features.',
      image: '/images/stupa.png',
      tags: ['Node.js', 'MongoDB', 'Socket.io'],
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
          Featured Projects
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
              className="glass rounded-2xl overflow-hidden group cursor-pointer"
            >
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
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

function EnteringCloudsSection() {
  return (
    <section className="h-screen w-full flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="text-center"
      >
        <h2 className="text-5xl md:text-7xl font-bold text-white text-shadow font-tibetan">
          Entering the clouds
        </h2>
      </motion.div>
    </section>
  )
}

export default function UIOverlay() {
  return (
    <div className="relative w-full">
      {/* Prayer flag curtains draping from sides */}
      <PrayerFlagCurtains />

      {/* Hero Section - First screen */}
      <HeroSection />

      {/* About Section - 100vh */}
      <AboutSection />

      {/* Projects Section - 100vh */}
      <ProjectsSection />

      {/* Entering the Clouds Section - 100vh */}
      <EnteringCloudsSection />

      {/* Empty space for cloud transition and prayer wheel section */}
      <div className="h-screen" />
      <div className="h-screen" />
    </div>
  )
}

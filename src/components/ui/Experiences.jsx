'use client'

import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import Image from 'next/image'
import { EXPERIENCES } from '@/data/content'

const ease = [0.16, 1, 0.3, 1]

function ExperienceCard({ item, className = '' }) {
  return (
    <div className={`glass rounded-2xl overflow-hidden relative shrink-0 ${className}`}>
      <div className="relative h-44 md:h-48 bg-ink/50 flex items-center justify-center overflow-hidden">
        <Image src={item.image} alt={item.title} fill className="object-contain p-6" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent" />
      </div>
      <div className="p-6">
        <div className="flex items-baseline justify-between gap-2 mb-1 flex-wrap">
          <h3 className="text-xl font-bold text-white">{item.title}</h3>
          <span className="text-gold/90 text-xs uppercase tracking-widest">{item.org}</span>
        </div>
        <p className="text-white/70 text-sm leading-relaxed mb-4">{item.description}</p>
        <div className="flex flex-wrap gap-2">
          {item.tags.map((tag) => (
            <span key={tag} className="px-3 py-1 text-xs bg-maroon/25 border border-maroon/30 rounded-full text-rose-100/85">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Experiences() {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const x = useTransform(scrollYProgress, [0.08, 0.92], ['4vw', '-118vw'])

  return (
    <>
      {/* desktop: pinned horizontal walk through the valley */}
      <section ref={ref} id="experience" className="relative h-[260vh] w-full hidden md:block">
        <div className="sticky top-0 h-screen overflow-hidden flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, ease }}
            className="text-center mb-10 px-4"
          >
            <h2 className="font-tibetan text-4xl md:text-6xl text-white text-shadow-strong">{EXPERIENCES.heading}</h2>
            <p className="text-white/75 mt-3 text-shadow">{EXPERIENCES.subtitle}</p>
          </motion.div>
          <motion.div style={{ x }} className="flex gap-8 pl-[8vw] w-max items-stretch">
            {EXPERIENCES.items.map((item) => (
              <ExperienceCard key={item.title} item={item} className="w-[30rem] max-w-[80vw]" />
            ))}
          </motion.div>
        </div>
      </section>

      {/* mobile: vertical walk */}
      <section id="experience-m" className="md:hidden w-full px-4 py-24">
        <div className="text-center mb-12">
          <h2 className="font-tibetan text-4xl text-white text-shadow-strong">{EXPERIENCES.heading}</h2>
          <p className="text-white/75 mt-3 text-shadow text-sm">{EXPERIENCES.subtitle}</p>
        </div>
        <div className="flex flex-col gap-8 max-w-md mx-auto">
          {EXPERIENCES.items.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.8, ease, delay: (i % 2) * 0.08 }}
            >
              <ExperienceCard item={item} />
            </motion.div>
          ))}
        </div>
      </section>
    </>
  )
}

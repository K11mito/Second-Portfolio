'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { FaGithub, FaInstagram, FaLinkedin, FaEnvelope } from 'react-icons/fa'
import { ABOUT, SITE } from '@/data/content'

export const TibetanCorner = ({ className, src = '/images/decorations/tibetan-corner.png' }) => (
  <div
    className={`absolute pointer-events-none transition-all duration-700 opacity-35 group-hover:opacity-90 group-hover:drop-shadow-[0_0_10px_rgba(217,164,65,0.65)] ${className}`}
  >
    <Image src={src} alt="" fill className="object-contain" />
  </div>
)

const ease = [0.16, 1, 0.3, 1]

const SOCIALS = [
  { href: SITE.socials.instagram, icon: FaInstagram, label: 'Instagram' },
  { href: SITE.socials.linkedin, icon: FaLinkedin, label: 'LinkedIn' },
  { href: SITE.socials.github, icon: FaGithub, label: 'GitHub' },
  { href: `mailto:${SITE.email}`, icon: FaEnvelope, label: 'Email' },
]

export default function About() {
  return (
    <section id="about" className="min-h-[130vh] w-full flex items-center justify-center px-4 py-24">
      <motion.div
        initial={{ opacity: 0, y: 70 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-120px' }}
        transition={{ duration: 1, ease }}
        className="max-w-5xl mx-auto relative p-8 md:p-16 group"
      >
        <div className="absolute inset-0 border border-white/10 rounded-3xl bg-ink/35 backdrop-blur-md -z-10 transition-all duration-700 group-hover:border-gold/30 group-hover:bg-ink/45" />

        <TibetanCorner className="w-20 h-20 md:w-28 md:h-28 top-0 left-0 -translate-x-3 -translate-y-3" />
        <TibetanCorner className="w-20 h-20 md:w-28 md:h-28 top-0 right-0 translate-x-3 -translate-y-3 rotate-90" />
        <TibetanCorner className="w-20 h-20 md:w-28 md:h-28 bottom-0 right-0 translate-x-3 translate-y-3 rotate-180" />
        <TibetanCorner className="w-20 h-20 md:w-28 md:h-28 bottom-0 left-0 -translate-x-3 translate-y-3 -rotate-90" />

        <div className="grid md:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, ease, delay: 0.15 }}
            className="relative"
          >
            <div className="relative w-64 h-64 md:w-80 md:h-80 mx-auto">
              <div className="absolute inset-0 bg-gradient-to-br from-gold/50 to-maroon/60 rounded-3xl blur-2xl opacity-35" />
              <div className="relative w-full h-full rounded-3xl overflow-hidden border border-white/20 shadow-2xl">
                <Image src={ABOUT.photo} alt="Aryendra Shrestha" fill className="object-cover" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, ease, delay: 0.3 }}
            className="text-center md:text-left"
          >
            <h2 className="font-tibetan text-4xl md:text-5xl text-white mb-6 text-shadow">{ABOUT.heading}</h2>
            <p className="text-lg text-white/85 mb-4 leading-relaxed">{ABOUT.intro}</p>
            <ul className="text-lg text-white/85 mb-6 leading-relaxed list-disc list-inside space-y-2">
              {ABOUT.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>

            <div className="flex flex-wrap gap-4 justify-center md:justify-start mb-5">
              <div className="inline-flex items-center gap-3 glass rounded-full px-6 py-3 transition-transform hover:scale-105">
                <div className="relative w-10 h-10">
                  <Image src={ABOUT.badge.logo} alt={ABOUT.badge.label} fill className="object-contain" />
                </div>
                <span className="text-white/90 font-medium">{ABOUT.badge.label}</span>
              </div>
            </div>

            <div className="flex gap-3 justify-center md:justify-start">
              {SOCIALS.map(({ href, icon: Icon, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="inline-flex items-center justify-center w-12 h-12 glass rounded-full transition-all hover:scale-110 hover:border-gold/50 text-white/70 hover:text-gold"
                >
                  <Icon size={20} />
                </a>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  )
}

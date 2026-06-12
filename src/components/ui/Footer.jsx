'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { FaGithub, FaInstagram, FaLinkedin } from 'react-icons/fa'
import { SITE, HERO } from '@/data/content'

const ease = [0.16, 1, 0.3, 1]

export default function Footer() {
  return (
    <section id="contact" className="min-h-screen w-full flex flex-col items-center justify-center px-4 relative">
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 1, ease }}
        className="text-center max-w-2xl"
      >
        <div className="relative w-16 h-16 mx-auto mb-8 opacity-80">
          <Image src={HERO.knot} alt="" fill className="object-contain" />
        </div>
        <h2 className="font-tibetan text-5xl md:text-7xl text-white text-shadow-strong mb-6">
          Let&apos;s build something
        </h2>
        <p className="text-white/80 text-lg mb-10 text-shadow">
          The journey ends here — but a new one can always begin.
        </p>
        <motion.a
          href={`mailto:${SITE.email}`}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.98 }}
          className="inline-block glass-strong rounded-full px-10 py-4 text-white text-lg font-medium border border-gold/40 hover:border-gold/80 hover:text-gold transition-colors"
        >
          {SITE.email}
        </motion.a>

        <div className="flex gap-4 justify-center mt-10">
          {[
            { href: SITE.socials.instagram, icon: FaInstagram, label: 'Instagram' },
            { href: SITE.socials.linkedin, icon: FaLinkedin, label: 'LinkedIn' },
            { href: SITE.socials.github, icon: FaGithub, label: 'GitHub' },
          ].map(({ href, icon: Icon, label }) => (
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

      <div className="absolute bottom-6 inset-x-0 text-center text-white/50 text-sm text-shadow">
        © 2026 {SITE.name} · Built among the mountains
      </div>
    </section>
  )
}

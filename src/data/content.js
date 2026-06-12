// ── Single source of truth: site content (preserved verbatim from v2) ──

export const SITE = {
  name: 'Aryendra Shrestha',
  title: 'Aryendra Shrestha | Portfolio',
  description:
    'Creative entrepreneur and technologist — a journey through the Himalayas and my work.',
  email: 'aryendrashrestha@gmail.com',
  socials: {
    instagram: 'https://www.instagram.com/aryendrashrestha/?hl=en',
    linkedin: 'https://www.linkedin.com/in/aryendra-shrestha-199913303/',
    github: 'https://github.com/K11mito',
  },
}

export const HERO = {
  title: 'Welcome',
  subtitle: 'Scroll down to begin the journey',
  knot: '/images/decorations/knott.png',
}

export const ABOUT = {
  heading: "Yo I'm Aryendra",
  intro:
    "I'm a creative entrepreneur and technologist driven by curiosity across disciplines and a constant drive to learn",
  bullets: [
    'Majoring in Finance @ Mahidol University.',
    'Interned at Fuse Machines',
    'Always working on something new',
  ],
  photo: '/images/profile/ary.JPG',
  badge: { label: 'Mahidol University', logo: '/images/logos/Mahidollogo.png' },
}

export const PROJECTS = {
  heading: 'Few cool things I built',
  items: [
    {
      title: 'Get Shit Done',
      description:
        'Daily goal setting and productivity app, Breaking large goals into everyday tasks',
      image: '/images/projects/getshitdone.png',
      tags: ['Next.js', 'Three.js', 'Tailwind'],
      githubLink: 'https://github.com/K11mito/Goal-tracking-and-daily-routine-app',
    },
    {
      title: 'Food and Macro tracking app',
      description: 'Uses realtime Object-detction to track and log macro details',
      image: '/images/projects/foodmacro.png',
      tags: ['Yolo.v8', 'React', 'Vite'],
      githubLink: 'https://github.com/K11mito',
    },
    {
      title: 'Vessel',
      description:
        'A solution to having multiple agentic terminals open at once. Helps manage multiple terminal windows at once.',
      image: '/images/projects/vessel-preview.png',
      tags: ['Three.js', 'Typescript', 'Electron'],
      liveLink: 'https://vessel-landing-one.vercel.app/#',
      githubLink: 'https://github.com/AryaShrestha05/vessel/tree/Frontend-test',
    },
  ],
}

export const CLOUDS_LINE = 'Entering the clouds..'

export const EXPERIENCES = {
  heading: 'Experiences',
  subtitle: 'A walk through the valley of things I have done',
  items: [
    {
      title: 'Data Intelligence Intern',
      org: 'Fuse Machines',
      description:
        'Worked on GEO & AEO related projects. Created Agents to manage GA4 and Clarity Analytics.',
      image: '/images/logos/fusemachines4.png',
      tags: ['Python', 'AI', 'Data Science'],
    },
    {
      title: 'Founder',
      org: 'Gaming Accessory Store',
      description:
        'Launched and scaled a gaming accessory store to generate over $10k in revenue. Averaged a 4.2x ROAS',
      image: '/images/logos/Esports.png',
      tags: ['React Native', 'Expo'],
    },
    {
      title: 'Co-Founder',
      org: 'Sajilo',
      description:
        'Started an online store to buy and sell furniture targeting people moving in and out of homes. Worked with companies like ArtMaya to offer larger offering',
      image: '/images/logos/Sajilo.png',
      tags: ['Next.js', 'Framer'],
    },
    {
      title: 'Perp-Trading Group',
      org: 'Seize',
      description:
        'Founded a crypto trading group to gather information and trade together. Mainly traded ETH, BTC, SOL',
      image: '/images/logos/seize2.png',
      tags: ['Python', 'Perp Trading', 'Crypto'],
    },
    {
      title: 'Basketball',
      org: 'College & High School',
      description:
        'Played basketball at the College & High School level. Won the school championship in 2024.',
      image: '/images/profile/basketball.jpg',
      tags: ['Mapbox', 'Node.js'],
    },
  ],
}

export const NAV_LINKS = [
  { id: 'about', label: 'About' },
  { id: 'projects', label: 'Projects' },
  { id: 'experience', label: 'Experience' },
  { id: 'contact', label: 'Contact' },
]

// ── The single scroll timeline: content sections & world beats together ──
// Fractions of total document scroll (0..1). DOM section heights in
// page.jsx are sized so the section tops land near these marks.
export const SCROLL = {
  hero: [0.0, 0.15],
  about: [0.15, 0.34],
  projects: [0.34, 0.59],
  clouds: [0.55, 0.71], // whiteout overlaps end of projects → start of valley
  experience: [0.71, 0.95],
  contact: [0.95, 1.0],
}

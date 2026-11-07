// All copy and links for the site live here, so content edits never require
// touching layout or 3D code.

export const person = {
  name: 'Aryendra Shrestha',
  firstName: 'Aryendra',
  lastName: 'Shrestha',
  role: 'Creative entrepreneur & technologist',
  lede: 'A creative entrepreneur and technologist, driven by curiosity across disciplines and a constant drive to learn.',
  email: 'aryendrashrestha@gmail.com',
  photo: {
    src: '/images/profile/ary.JPG',
    alt: 'Aryendra on a Himalayan trail, snow-capped peaks behind him',
  },
}

export const socials = [
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/aryendra-shrestha-199913303/' },
  { label: 'GitHub', href: 'https://github.com/K11mito' },
  { label: 'Instagram', href: 'https://www.instagram.com/aryendrashrestha/' },
]

export const about = {
  statement: ['I study ', 'finance', ', build ', 'software', ', and start ', 'ventures', '.'],
  body: [
    'I’m Aryendra — a creative entrepreneur and technologist, driven by curiosity across disciplines and a constant drive to learn.',
    'I’ve founded and co-founded small businesses, interned in data intelligence at Fusemachines, and I’m always working on something new.',
  ],
  facts: [
    { term: 'Studying', detail: 'Finance, Mahidol University' },
    { term: 'Previously', detail: 'Data Intelligence Intern, Fusemachines' },
    { term: 'Ventures', detail: 'Esports Garage, Sajilo Deals, Seize' },
    { term: 'Off the clock', detail: 'Basketball, mountains, markets' },
  ],
}

// Each project can also take `video: '/videos/projects/name.mp4'` for a looping
// preview (muted, plays while on screen); `image` is then used as its poster.
export const projects = [
  {
    title: 'Vessel',
    kind: 'Desktop app',
    description:
      'A home for multi-agent work. Run many agentic terminals side by side, then manage and create agents in one place with hero-mode or grid-view.',
    image: '/images/projects/vessel-preview.png',
    imageAlt: 'Vessel landing page: the word Vessel over flowing rainbow light',
    focus: '30% 50%',
    tags: ['Electron', 'TypeScript', 'Three.js'],
    links: [
      { label: 'Visit site', href: 'https://vessel-landing-one.vercel.app/' },
      { label: 'Source', href: 'https://github.com/AryaShrestha05/vessel/tree/Frontend-test' },
    ],
  },
  {
    title: 'Get Shit Done',
    kind: 'Productivity app',
    description:
      'Daily goal-setting that breaks big goals into everyday tasks, with a daily protocol, progress tracking and a chat assistant.',
    image: '/images/projects/getshitdone.png',
    imageAlt: 'Get Shit Done dashboard with goal, daily protocol and chat panels',
    focus: '50% 0%',
    tags: ['Next.js', 'Three.js', 'Tailwind'],
    links: [{ label: 'Source', href: 'https://github.com/K11mito/Goal-tracking-and-daily-routine-app' }],
  },
  {
    title: 'Food & Macro Tracker',
    kind: 'Computer vision',
    description:
      'Track calories and macros by simply taking a photo of your food. Real-time object detection finds the food and logs the nutrition.',
    image: '/images/projects/foodmacro.png',
    imageAlt: 'Food and macro tracker detecting a water bottle in a live camera feed',
    focus: '50% 55%',
    tags: ['YOLOv8', 'React', 'Vite'],
    links: [{ label: 'GitHub', href: 'https://github.com/K11mito' }],
  },
]

export const experience = [
  {
    org: 'Fusemachines',
    role: 'Data Intelligence Intern',
    description:
      'Worked on GEO and AEO projects, and built AI agents to manage GA4 and Clarity analytics.',
    image: '/images/logos/fusemachines4.png',
    imageAlt: 'Fusemachines logo',
    tags: ['Python', 'AI', 'Data Science'],
  },
  {
    org: 'Esports Garage',
    role: 'Founder',
    description:
      'Launched and scaled a gaming accessories store to over $10k in revenue, averaging a 4.2× return on ad spend.',
    image: '/images/logos/Esports.png',
    imageAlt: 'Esports Garage logo',
    tags: ['E-commerce', 'Paid ads', 'Growth'],
  },
  {
    org: 'Sajilo Deals',
    role: 'Co-founder',
    description:
      'An online store for buying and selling furniture, built for people moving in and out of homes. Partnered with companies like ArtMaya to widen the range.',
    image: '/images/logos/Sajilo.png',
    imageAlt: 'Sajilo Deals logo: two hands shaking',
    tags: ['Marketplace', 'Partnerships'],
  },
  {
    org: 'Seize Investment Group',
    role: 'Founder',
    description:
      'Founded a crypto trading group to share research and trade together — mainly perpetuals on ETH, BTC and SOL.',
    image: '/images/logos/seize2.png',
    imageAlt: 'Seize Investment Group logo over a leaping snow leopard',
    tags: ['Python', 'Perp trading', 'Crypto'],
  },
  {
    org: 'Basketball',
    role: 'High school & college',
    description:
      'Played basketball at the high school and college level. Won the school championship in 2024.',
    image: '/images/profile/basketball.jpg',
    imageAlt: 'The championship-winning basketball team posing with their trophy',
    tags: ['Champions, 2024'],
  },
]

export const nav = [
  { label: 'About', href: '#about' },
  { label: 'Work', href: '#work' },
  { label: 'Experience', href: '#experience' },
  { label: 'Contact', href: '#contact' },
]

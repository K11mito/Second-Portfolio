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
  // The big line, then the rest of the sentence in smaller type. In each list
  // the second, fourth… entries are the emphasised words (in saffron).
  statement: ['I’m a ', 'techno-optimist'],
  statementMore: ['and ', 'entrepreneur', ' who loves to ', 'build', '.'],
  body: [
    'I’m Aryendra — a creative entrepreneur and technologist, driven by curiosity across disciplines and a constant drive to learn.',
    'I’ve founded and co-founded small businesses, built AI agents at Jagota and Fusemachines, and I’m always working on something new.',
  ],
  facts: [
    { term: 'Studying', detail: 'Finance, Mahidol University' },
    { term: 'Previously', detail: 'AI Agent Engineer, Jagota' },
    { term: 'Ventures', detail: 'Esports Garage, Sajilo Deals, Seize' },
    { term: 'Off the clock', detail: 'Basketball, mountains, markets' },
  ],
}

// Every project, newest first, shelved in the library (/projects, and opened
// over the mountain from its monastery). Those with `featured` (1, 2, 3...) are
// the precious texts, wrapped in yellow silk. New ones go at the top; the shelf
// re-lays itself. `when` is 'YYYY-MM' (only the year is shown).
// `private: true` marks a private repository: no source link is shown.
// `short` is the title inked on the bundle's tag in the library, for titles too
// long to fit; without it the full title is used.
export const projects = [
  {
    title: 'This site',
    when: '2026-11',
    kind: 'Website',
    description:
      'The site you’re on: a Himalayan summit above a sea of clouds, with two monasteries built in code to fly to. One is a library where every project is a Tibetan book; the other is a temple with a prayer wheel you turn by hand. Cloth prayer flags really blow in the wind, and the sky follows the time in Bangkok.',
    tags: ['Next.js', 'three.js', 'GLSL'],
    links: [{ label: 'Source', href: 'https://github.com/K11mito/Second-Portfolio' }],
  },
  {
    title: 'SEIZE',
    when: '2026-11',
    kind: 'Website',
    description: 'The website for Seize Investment Group, the crypto trading group I founded.',
    image: '/images/projects/seize.webp',
    imageAlt: 'SEIZE Investment Group landing page: huge white letters over a pale blue sky',
    tags: ['HTML', 'CSS', 'JavaScript'],
    links: [{ label: 'Visit site', href: 'https://seize-silk.vercel.app' }],
    private: true,
  },
  {
    title: 'U-Reach',
    when: '2026-10',
    kind: 'AI agent',
    note: 'Won U-Hackathon 2026 · 750K baht',
    description:
      'A WhatsApp sales assistant that answers in its owner’s voice. A lead sends a message, and about ten seconds later gets a voice note in his cloned voice that greets them by name and answers their question. One Go binary runs WhatsApp, the speech → Claude → ElevenLabs pipeline and a live dashboard that rates every lead cold, warm or hot.',
    tags: ['Go', 'React', 'Claude', 'ElevenLabs'],
    links: [{ label: 'Source', href: 'https://github.com/K11mito/u-reach' }],
  },
  {
    title: 'Vellum',
    when: '2026-09',
    kind: 'Accounting software',
    note: 'In progress',
    description: 'Making accounting easier, sturdier and hassle-free.',
    tags: ['Python'],
    links: [],
    private: true,
  },
  {
    title: 'Munch',
    when: '2026-08',
    featured: 3,
    kind: 'AI content platform',
    note: 'Internship at Jagota',
    description:
      'An AI content platform I built as an intern at Jagota. It studies the reels and memes that win, makes its own versions and schedules them, all from one chat.',
    image: '/images/projects/munch.webp',
    imageAlt: 'Munch’s home screen: a chat box for asking the agent to make something, above the Extractor, Factory and Gen Content stages',
    focus: '0% 0%',
    tags: ['Python', 'FastAPI', 'Gemini', 'AI agents'],
    links: [],
    private: true,
  },
  {
    title: 'Tintin’s Journey',
    short: 'Tintin',
    when: '2026-08',
    kind: 'Archive',
    description:
      'A preserved archive of the travelogue of Tintin, who cycles across Tibet: 16 journeys, 891 posts and 3,201 full-resolution photos, some rescued from the Wayback Machine, rebuilt as a browsable site so it outlives the original.',
    tags: ['Python', 'WordPress API', 'HTML'],
    links: [{ label: 'Source', href: 'https://github.com/K11mito/Tintin-Journey' }],
  },
  {
    title: 'Startup funding speed',
    short: 'Funding',
    when: '2026-07',
    kind: 'Research',
    description:
      'Does how quickly a startup lands its first funding round predict whether it goes on to raise a Series B? A statistics study: data cleaning, sampling and a logistic regression.',
    tags: ['Python', 'Statistics'],
    links: [{ label: 'Source', href: 'https://github.com/K11mito/BusStatProject---Startup-funding-speed.' }],
  },
  {
    title: 'ODTS',
    when: '2026-06',
    featured: 2,
    kind: 'Hardware · vision',
    description:
      'A face-tracking turret made of cardboard, two servos and a webcam: YOLOv8 spots the target and an Arduino keeps it on the crosshair. The build log shows anyone how to make one.',
    image: '/images/projects/odts.webp',
    imageAlt: 'ODTS v0.5: a cardboard turret with a webcam strapped on by a rubber band, a doodled face, and its name written on the box below',
    focus: '50% 45%',
    tags: ['Python', 'YOLOv8', 'Arduino', 'Electron'],
    links: [
      { label: 'Build log', href: 'https://arybuilds.vercel.app' },
      { label: 'Source', href: 'https://github.com/K11mito/ODTS' },
    ],
  },
  {
    title: 'Bangkok Silicon, reimagined',
    short: 'B. Silicon',
    when: '2026-04',
    kind: 'Redesign concept',
    description: 'An unsolicited redesign of Bangkok Silicon’s website: more modern, cleaner, with a little 3D.',
    tags: ['React', 'Three.js', 'GSAP', 'TypeScript'],
    links: [{ label: 'Source', href: 'https://github.com/K11mito/Bangkok-Silicon-NEW-SITE-CONCEPT' }],
  },
  {
    title: 'Project Manager',
    short: 'Manager',
    when: '2026-04',
    kind: 'Desktop app',
    description:
      'A war room for my side projects: it reads every repo and file, tracks where each one stands and suggests what to do next. Also an excuse to try an Evangelion-style interface.',
    tags: ['Electron', 'React', 'SQLite', 'Claude'],
    links: [{ label: 'Source', href: 'https://github.com/K11mito/Project-Manager' }],
  },
  {
    title: 'Majordomo',
    when: '2026-03',
    kind: 'AI assistant',
    description: 'An AI assistant for Airbnb and Booking.com hosts.',
    tags: ['Python'],
    links: [],
    private: true,
  },
  {
    title: 'Vessel',
    when: '2026-02',
    featured: 1,
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
    title: 'WhatsApp chatbot',
    short: 'WhatsApp',
    when: '2026-02',
    kind: 'Chatbot',
    description: 'A chatbot that handles guest requests on WhatsApp, with a two-layer memory system.',
    tags: ['TypeScript'],
    links: [],
    private: true,
  },
  {
    title: 'Get Shit Done',
    short: 'GSD',
    when: '2025-12',
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
    title: 'Window into 3D',
    short: 'Window 3D',
    when: '2025-11',
    kind: 'Experiment',
    description: 'Tracks your head through the webcam so the screen behaves like a window into a 3D space behind it.',
    image: '/images/projects/illusion.webp',
    imageAlt: 'A glassy sphere inside a wireframe, floating in a starfield between the words Observe and Parallax',
    tags: ['TypeScript', 'WebGL', 'Face tracking'],
    links: [],
    private: true,
  },
  {
    title: 'Food & Macro Tracker',
    short: 'Macros',
    when: '2025-11',
    kind: 'Computer vision',
    description:
      'Track calories and macros by simply taking a photo of your food. Real-time object detection finds the food and logs the nutrition.',
    image: '/images/projects/foodmacro.png',
    imageAlt: 'Food and macro tracker detecting a water bottle in a live camera feed',
    focus: '50% 55%',
    tags: ['YOLOv8', 'React', 'Vite'],
    links: [{ label: 'Source', href: 'https://github.com/K11mito/Realtime-food-macro-tracking' }],
  },
]

export const experience = [
  {
    org: 'Jagota',
    role: 'AI Agent Engineer Intern',
    description:
      'Built Munch, an AI agent that studies what wins on short-form video, then makes and schedules the posts.',
    image: '/images/logos/jagota.webp',
    imageAlt: 'Jagota logo',
    tags: ['AI agents', 'Python', 'Content'],
  },
  {
    org: 'U-Hackathon',
    role: 'Winner, 2026',
    // shown as a badge on the card
    highlight: 'Won 750K baht',
    description:
      'Built U-Reach: a WhatsApp sales agent that answers every lead with a voice note in its owner’s cloned voice.',
    image: '/images/logos/u-hackathon.webp',
    imageAlt: 'The U-Reach logo inside a laurel wreath',
    tags: ['Go', 'Claude', 'ElevenLabs'],
  },
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
      'An online store for buying and selling furniture, built for people moving home. Partnered with companies like ArtMaya.',
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

// `dest`: a destination on the mountain; on the home page the camera flies there
export const nav = [
  { label: 'About', href: '#about' },
  { label: 'Projects', href: '/projects', dest: 'library' },
  { label: 'Experience', href: '/experience', dest: 'temple' },
  { label: 'Contact', href: '#contact' },
]

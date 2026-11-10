import { Inter, DM_Mono } from 'next/font/google'
import localFont from 'next/font/local'
import { Analytics } from '@vercel/analytics/next'
import { person } from '@/content/site'
import './globals.css'

const sans = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' })
// The big type: Amita, a Latin drawn with an ink pen in the Devanagari
// calligraphic tradition, which sits well beside Tibetan. Its own capital A is a
// cursive form that reads as a small a, so this copy carries the A from Kurale
// (same designer, same pen) instead; see fonts/OFL.txt. It has no italic.
const serif = localFont({ src: './fonts/amita-display.woff2', weight: '400', style: 'normal', variable: '--font-serif', display: 'swap' })
const mono = DM_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-mono', display: 'swap' })

const description =
  'Aryendra Shrestha: techno-optimist and entrepreneur who likes making cool things. Finance at Mahidol University, founder of ventures, builder of software.'

export const metadata = {
  // where the site lives: social cards and links resolve against it
  metadataBase: new URL('https://aryendra.com'),
  title: { default: `${person.name} — ${person.role}`, template: `%s — ${person.name}` },
  description,
  applicationName: person.name,
  authors: [{ name: person.name }],
  creator: person.name,
  openGraph: {
    type: 'website',
    title: person.name,
    description,
    siteName: person.name,
    locale: 'en_US',
  },
  twitter: { card: 'summary_large_image', title: person.name, description },
}

// The time of day in Bangkok (or the one asked for with ?sky=), in four broad
// bands that match the posters. Close enough for a still shown for a second or two.
const skyScript = `(function(){try{
var d=document.documentElement,m=/[?&]sky=(dawn|day|sunset|night|local)\\b/.exec(location.search),n=new Date(),h;
function band(x){return x<5.75||x>=19.1?'night':x<7.4?'dawn':x<16.8?'day':'sunset'}
if(m&&m[1]!=='local')d.dataset.tod=m[1];
else{h=m?n.getHours()+n.getMinutes()/60:(n.getTime()/36e5+7)%24;d.dataset.tod=band(h)}
if(location.pathname!=='/')return;
var l=document.createElement('link');l.rel='preload';l.as='image';l.setAttribute('fetchpriority','high');
l.href='/images/posters/'+d.dataset.tod+'-'+(matchMedia('(max-aspect-ratio: 1/1)').matches?'tall':'wide')+'.webp';
document.head.appendChild(l)}catch(e){}})()`

export const viewport = {
  themeColor: '#0b1f3d',
  colorScheme: 'dark',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        {/* Marks JS as available before first paint, so reveal animations never hide content without it */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
        {/* Picks the loading poster for the hour the live sky will show, and starts fetching it */}
        <script dangerouslySetInnerHTML={{ __html: skyScript }} />
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}

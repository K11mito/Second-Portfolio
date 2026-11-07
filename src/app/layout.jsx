import { Inter, Instrument_Serif, DM_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { person } from '@/content/site'
import './globals.css'

const sans = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' })
const serif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
})
const mono = DM_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-mono', display: 'swap' })

const description =
  'Aryendra Shrestha — creative entrepreneur and technologist. Finance at Mahidol University, founder of small ventures, builder of software.'

export const metadata = {
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
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}

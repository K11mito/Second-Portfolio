import { Inter, Yatra_One } from 'next/font/google'
import './globals.css'
import { Analytics } from '@vercel/analytics/next'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const yatraOne = Yatra_One({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-tibetan',
  display: 'swap',
})

export const metadata = {
  title: 'Aryendra Shrestha | Portfolio',
  description:
    'Creative entrepreneur and technologist. Finance student at Mahidol University. Projects in 3D, hardware, and product.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="preload"
          href="/models/snowy_mountain.glb"
          as="fetch"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/images/backgrounds/background6.jpg"
          as="image"
          crossOrigin="anonymous"
        />
      </head>
      <body className={`${inter.variable} ${yatraOne.variable} font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}

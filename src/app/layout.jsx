import { Inter, Yatra_One } from 'next/font/google'
import './globals.css'
import { Analytics } from '@vercel/analytics/next'
import SmoothScroll from '@/lib/SmoothScroll'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const yatraOne = Yatra_One({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-tibetan',
})

export const metadata = {
  title: 'Aryendra Shrestha | Portfolio',
  description:
    'Creative entrepreneur and technologist — a journey through the Himalayas and my work.',
}

export const viewport = {
  themeColor: '#0e1626',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${yatraOne.variable} font-sans antialiased`}>
        <SmoothScroll>{children}</SmoothScroll>
        <Analytics />
      </body>
    </html>
  )
}

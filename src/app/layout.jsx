import { Inter, Yatra_One } from 'next/font/google'
import './globals.css'
import { Analytics } from '@vercel/analytics/next'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const yatraOne = Yatra_One({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-tibetan'
})

export const metadata = {
  title: 'Aryendra Shrestha | Portfolio',
  description: 'A sideproject to test UI/UX',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${yatraOne.variable} font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}

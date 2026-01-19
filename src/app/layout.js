import { Inter, Yatra_One } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const yatraOne = Yatra_One({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-tibetan'
})

export const metadata = {
  title: '3D Portfolio | Mountain Journey',
  description: 'An immersive 3D portfolio experience',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${yatraOne.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  )
}

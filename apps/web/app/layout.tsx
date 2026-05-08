import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Terrain Poster Configurator',
  description: 'Create your personal terrain poster from a GPX route',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className={`${inter.className} bg-surface text-ink antialiased`}>
        {children}
      </body>
    </html>
  )
}

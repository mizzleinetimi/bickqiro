import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { NavShell } from '@/components/layout/NavShell'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'Bickqr - Discover & Share Short Audio Clips',
    template: '%s | Bickqr',
  },
  description: 'SEO-first library of short audio clips. Search trending sounds, play instantly, and share rich links.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <NavShell />
        <main className="mx-auto max-w-7xl px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  )
}

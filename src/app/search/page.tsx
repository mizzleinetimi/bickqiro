import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Search',
  description: 'Search for audio clips on Bickqr.',
  robots: 'noindex,follow',
}

export default function SearchPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Search</h1>
      <p className="text-gray-600">Search functionality coming soon.</p>
    </div>
  )
}

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Trending',
  description: 'Discover trending audio clips on Bickqr.',
}

export default function TrendingPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Trending</h1>
      <p className="text-gray-600">Trending bicks will appear here.</p>
    </div>
  )
}

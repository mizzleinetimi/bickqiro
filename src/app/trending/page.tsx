import type { Metadata } from 'next'
import { getTrendingBicks } from '@/lib/supabase/queries';
import { BickCard } from '@/components/bick/BickCard';

export const metadata: Metadata = {
  title: 'Trending',
  description: 'Discover trending audio clips on Bickqr.',
}

export default async function TrendingPage() {
  const bicks = await getTrendingBicks(20);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Trending</h1>
      <p className="text-gray-600 mb-6">The most popular sounds right now.</p>
      
      {bicks.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {bicks.map((bick) => (
            <BickCard key={bick.id} bick={bick} />
          ))}
        </div>
      ) : (
        <p className="text-gray-500">No trending sounds yet.</p>
      )}
    </div>
  )
}

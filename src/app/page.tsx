import Link from 'next/link';
import { getTopTrendingBicks } from '@/lib/supabase/queries';
import { BickCard } from '@/components/bick/BickCard';
import { SearchInput } from '@/components/search';
import { PopularTags } from '@/components/tags/PopularTags';

export default async function HomePage() {
  const bicks = await getTopTrendingBicks(6);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Welcome to Bickqr</h1>
        <p className="text-gray-600 mb-8 text-lg">
          Discover and share short audio clips.
        </p>
        
        <div className="max-w-xl mx-auto">
          <SearchInput placeholder="Search for sounds..." />
        </div>
      </div>
      
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Trending Sounds</h2>
          <Link 
            href="/trending" 
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            View all →
          </Link>
        </div>
        
        {bicks.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {bicks.map((bick) => (
              <BickCard key={bick.id} bick={bick} />
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">
            No sounds yet. Be the first to upload!
          </p>
        )}
      </section>
      
      {/* Popular Tags Section */}
      <PopularTags limit={12} title="Popular Tags" />
    </div>
  );
}

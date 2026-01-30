import type { Metadata } from 'next';
import { SearchInput, SearchResults } from '@/components/search';
import { searchBicks } from '@/lib/supabase/queries';

export const metadata: Metadata = {
  title: 'Search | Bickqr',
  description: 'Search for audio clips on Bickqr.',
  robots: 'noindex,follow',
};

interface SearchPageProps {
  searchParams: Promise<{ q?: string; cursor?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = params.q?.trim() || '';
  
  let initialBicks: Awaited<ReturnType<typeof searchBicks>>['bicks'] = [];
  let initialCursor: string | null = null;
  
  if (query) {
    const result = await searchBicks({ query, limit: 20 });
    initialBicks = result.bicks;
    initialCursor = result.nextCursor;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-white mb-8">
          <span className="text-[#FCD34D]">Search</span> Sounds
        </h1>
        
        <div className="mb-8 max-w-2xl">
          <SearchInput defaultValue={query} autoFocus={!query} />
        </div>
        
        {query ? (
          <SearchResults
            initialBicks={initialBicks}
            initialCursor={initialCursor}
            query={query}
          />
        ) : (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">Enter a search term to find sounds</p>
          </div>
        )}
      </div>
    </div>
  );
}

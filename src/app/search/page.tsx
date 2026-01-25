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
  
  // Fetch initial results if query is provided
  let initialBicks: Awaited<ReturnType<typeof searchBicks>>['bicks'] = [];
  let initialCursor: string | null = null;
  
  if (query) {
    const result = await searchBicks({ query, limit: 20 });
    initialBicks = result.bicks;
    initialCursor = result.nextCursor;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Search</h1>
      
      <div className="mb-8">
        <SearchInput defaultValue={query} autoFocus={!query} />
      </div>
      
      {query ? (
        <SearchResults
          initialBicks={initialBicks}
          initialCursor={initialCursor}
          query={query}
        />
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500">Enter a search term to find sounds</p>
        </div>
      )}
    </div>
  );
}

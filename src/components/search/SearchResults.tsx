'use client';

import { useState } from 'react';
import { BickCard } from '@/components/bick/BickCard';
import type { BickWithAssets } from '@/types/database.types';

interface SearchResultsProps {
  initialBicks: BickWithAssets[];
  initialCursor: string | null;
  query: string;
}

export function SearchResults({ initialBicks, initialCursor, query }: SearchResultsProps) {
  const [bicks, setBicks] = useState<BickWithAssets[]>(initialBicks);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loading, setLoading] = useState(false);

  const loadMore = async () => {
    if (!cursor || loading) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams({ q: query, cursor });
      const response = await fetch(`/api/search?${params}`);
      if (!response.ok) throw new Error('Failed to load more results');
      
      const data = await response.json();
      setBicks(prev => [...prev, ...data.bicks]);
      setCursor(data.nextCursor);
    } catch (error) {
      console.error('Error loading more results:', error);
    } finally {
      setLoading(false);
    }
  };

  if (bicks.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No results found for &quot;{query}&quot;</p>
        <p className="text-sm text-gray-400 mt-2">Try different keywords</p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {bicks.map((bick) => (
          <BickCard key={bick.id} bick={bick} />
        ))}
      </div>
      
      {cursor && (
        <div className="mt-8 text-center">
          <button
            onClick={loadMore}
            disabled={loading}
            className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
}

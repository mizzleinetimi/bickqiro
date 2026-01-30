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
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#1e1e1e] flex items-center justify-center">
          <svg className="w-8 h-8 text-[#a0a0a0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-[#a0a0a0] text-lg">No results found for &quot;{query}&quot;</p>
        <p className="text-sm text-[#666666] mt-2">Try different keywords</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-[#a0a0a0] mb-6">{bicks.length}+ results for &quot;{query}&quot;</p>
      
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {bicks.map((bick) => (
          <BickCard key={bick.id} bick={bick} />
        ))}
      </div>
      
      {cursor && (
        <div className="mt-8 text-center">
          <button
            onClick={loadMore}
            disabled={loading}
            className="px-6 py-3 bg-[#1e1e1e] hover:bg-[#2a2a2a] text-[#f5f5f5] rounded-full font-medium border border-[#2a2a2a] transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
}

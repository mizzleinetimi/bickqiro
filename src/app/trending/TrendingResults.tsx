'use client';

import { useState } from 'react';
import { BickCard } from '@/components/bick/BickCard';
import type { BickWithAssets } from '@/types/database.types';

interface TrendingResultsProps {
  initialBicks: BickWithAssets[];
  initialCursor: string | null;
}

export function TrendingResults({ initialBicks, initialCursor }: TrendingResultsProps) {
  const [bicks, setBicks] = useState<BickWithAssets[]>(initialBicks);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loading, setLoading] = useState(false);

  const loadMore = async () => {
    if (!cursor || loading) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({ cursor });
      const response = await fetch(`/api/trending?${params}`);
      if (!response.ok) throw new Error('Failed to load more');

      const data = await response.json();
      setBicks(prev => [...prev, ...data.bicks]);
      setCursor(data.nextCursor);
    } catch (error) {
      console.error('Error loading more trending:', error);
    } finally {
      setLoading(false);
    }
  };

  if (bicks.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface border border-surface-border flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
        <p className="text-gray-400 text-lg">No trending sounds yet.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {bicks.map((bick) => (
          <BickCard key={bick.id} bick={bick} />
        ))}
      </div>

      {cursor && (
        <div className="mt-12 text-center">
          <button
            onClick={loadMore}
            disabled={loading}
            className="px-8 py-3 bg-surface hover:bg-surface-hover text-white rounded-full font-bold border border-surface-border transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
}

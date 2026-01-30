'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { BickCard } from '@/components/bick/BickCard';
import { SearchInput } from '@/components/search';
import { PopularTags } from '@/components/tags/PopularTags';
import type { TrendingBick } from '@/types/database.types';
import type { BickWithOwner } from '@/lib/supabase/queries';

const BICKS_PER_PAGE = 12;

interface HomeContentProps {
  initialLatestBicks: BickWithOwner[];
  initialTrendingBicks: TrendingBick[];
}

export function HomeContent({ initialLatestBicks, initialTrendingBicks }: HomeContentProps) {
  const [activeTab, setActiveTab] = useState<'latest' | 'trending'>('latest');
  // Deduplicate initial bicks to prevent React key warnings
  const deduplicateBicks = (bicks: BickWithOwner[]): BickWithOwner[] => {
    const seen = new Set<string>();
    return bicks.filter(b => {
      if (seen.has(b.id)) return false;
      seen.add(b.id);
      return true;
    });
  };
  const [bicks, setBicks] = useState<BickWithOwner[]>(() => deduplicateBicks(initialLatestBicks));
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(initialLatestBicks.length >= BICKS_PER_PAGE);

  // Switch tabs
  const handleTabChange = useCallback((tab: 'latest' | 'trending') => {
    if (tab === activeTab) return;
    
    setActiveTab(tab);
    setLoading(true);
    
    // Use initial data for instant switch (deduplicated)
    if (tab === 'latest') {
      setBicks(deduplicateBicks(initialLatestBicks));
      setHasMore(initialLatestBicks.length >= BICKS_PER_PAGE);
    } else {
      setBicks(deduplicateBicks(initialTrendingBicks));
      setHasMore(initialTrendingBicks.length >= BICKS_PER_PAGE);
    }
    setCursor(null);
    setLoading(false);
  }, [activeTab, initialLatestBicks, initialTrendingBicks]);

  // Load more bicks
  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    try {
      const endpoint = activeTab === 'trending' ? '/api/trending' : '/api/latest';
      const params = new URLSearchParams();
      if (cursor) params.set('cursor', cursor);
      params.set('limit', String(BICKS_PER_PAGE));
      
      const response = await fetch(`${endpoint}?${params}`);
      if (!response.ok) throw new Error('Failed to load more');
      
      const data = await response.json();
      // Filter out duplicates by ID
      setBicks(prev => {
        const existingIds = new Set(prev.map(b => b.id));
        const newBicks = (data.bicks as BickWithOwner[]).filter(b => !existingIds.has(b.id));
        return [...prev, ...newBicks];
      });
      setCursor(data.nextCursor);
      setHasMore(!!data.nextCursor);
    } catch (error) {
      console.error('Error loading more:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] relative">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-2 h-2 bg-brand-accent/20 rounded-full animate-pulse" />
        <div className="absolute top-40 right-20 w-1 h-1 bg-brand-primary/30 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-32 left-1/4 w-1.5 h-1.5 bg-brand-accent/15 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
        <div className="absolute bottom-20 right-10 w-1 h-1 bg-brand-primary/25 rounded-full animate-pulse" style={{ animationDelay: '0.7s' }} />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-gray-100 to-white bg-clip-text text-transparent">
            Explore{' '}
            <span className="bg-gradient-to-r from-brand-primary to-brand-accent bg-clip-text text-transparent">
              Bicks
            </span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Discover trending audio clips and find your next favorite sound
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="relative group">
            <SearchInput placeholder="Search for audio clips, tags, or keywords..." />
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-brand-primary/10 via-transparent to-brand-accent/10 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none" />
          </div>
        </div>

        {/* Tab Pills */}
        <div className="flex justify-center mb-8">
          <div className="flex gap-2 p-1 bg-surface/50 backdrop-blur-sm rounded-2xl border border-surface-border/30">
            <button
              onClick={() => handleTabChange('latest')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                activeTab === 'latest'
                  ? 'bg-gradient-to-r from-brand-primary to-brand-primary-hover text-white shadow-lg'
                  : 'text-gray-300 hover:text-white hover:bg-surface-hover/50'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Latest
            </button>
            <button
              onClick={() => handleTabChange('trending')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                activeTab === 'trending'
                  ? 'bg-gradient-to-r from-brand-primary to-brand-primary-hover text-white shadow-lg'
                  : 'text-gray-300 hover:text-white hover:bg-surface-hover/50'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              Trending
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-16">
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-surface/50 backdrop-blur-sm rounded-2xl border border-surface-border/30">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-primary" />
              <span className="text-gray-300">Loading amazing bicks...</span>
            </div>
          </div>
        )}

        {/* Bicks Grid */}
        {!loading && bicks.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {bicks.map((bick, index) => (
                <div
                  key={bick.id}
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <BickCard bick={bick} />
                </div>
              ))}
            </div>

            {/* Load More Button */}
            {hasMore && (
              <div className="text-center mt-12">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-brand-primary to-brand-accent text-white font-semibold rounded-2xl hover:shadow-lg hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {loadingMore ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Loading more bicks...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      Load More Bicks
                    </>
                  )}
                </button>
              </div>
            )}

            {/* End of results */}
            {!hasMore && bicks.length > 0 && (
              <div className="text-center mt-12 py-8">
                <div className="inline-flex items-center gap-2 px-6 py-3 bg-surface/30 backdrop-blur-sm rounded-2xl border border-surface-border/20">
                  <span className="text-gray-400">🎉</span>
                  <span className="text-gray-300">You've seen all the bicks!</span>
                </div>
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!loading && bicks.length === 0 && (
          <div className="text-center py-16">
            <div className="max-w-md mx-auto">
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-surface to-surface-hover rounded-full flex items-center justify-center">
                <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">No bicks found</h3>
              <p className="text-gray-400 mb-6">
                Be the first to create an amazing audio clip!
              </p>
              <Link
                href="/upload"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-brand-primary to-brand-accent text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-200"
              >
                Create the first one!
              </Link>
            </div>
          </div>
        )}

        {/* Popular Tags Section */}
        <div className="mt-16">
          <PopularTags limit={12} title="Popular Tags" />
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { BickCard } from '@/components/bick/BickCard';
import type { BickWithAssets, TrendingBick } from '@/types/database.types';

const BICKS_PER_PAGE = 12;

type TabType = 'latest' | 'trending';

interface ExploreContentProps {
  initialLatestBicks: BickWithAssets[];
  initialTrendingBicks: TrendingBick[];
}

export function ExploreContent({ initialLatestBicks, initialTrendingBicks }: ExploreContentProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('latest');
  const [bicks, setBicks] = useState<BickWithAssets[]>(initialLatestBicks);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  // Fetch bicks based on current state
  const fetchBicks = useCallback(async (isLoadMore = false) => {
    try {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setCursor(null);
      }
      setError(null);

      const params = new URLSearchParams();
      params.set('limit', BICKS_PER_PAGE.toString());

      if (isLoadMore && cursor) {
        params.set('cursor', cursor);
      }

      let url: string;
      if (searchQuery.trim()) {
        params.set('q', searchQuery.trim());
        url = `/api/search?${params}`;
      } else if (activeTab === 'trending') {
        url = `/api/trending?${params}`;
      } else {
        url = `/api/latest?${params}`;
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to load bicks');

      const data = await response.json();
      const newBicks = data.bicks || [];
      const nextCursor = data.nextCursor || null;

      if (isLoadMore) {
        setBicks(prev => [...prev, ...newBicks]);
      } else {
        setBicks(newBicks);
      }

      setCursor(nextCursor);
      setHasMore(!!nextCursor);
    } catch (err) {
      console.error('Error fetching bicks:', err);
      setError('Failed to load bicks');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [searchQuery, activeTab, cursor]);

  // Handle tab change
  const handleTabChange = (tab: TabType) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setSearchQuery('');
    setIsSearching(false);
    
    // Use initial data for immediate response
    if (tab === 'latest') {
      setBicks(initialLatestBicks);
    } else {
      setBicks(initialTrendingBicks);
    }
    setCursor(null);
    setHasMore(true);
  };

  // Handle search
  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    fetchBicks(false);
  };

  // Handle search input change with debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setIsSearching(false);
      // Reset to current tab data
      setBicks(activeTab === 'latest' ? initialLatestBicks : initialTrendingBicks);
      return;
    }

    const timer = setTimeout(() => {
      setIsSearching(true);
      // Trigger search fetch
      const doSearch = async () => {
        try {
          setLoading(true);
          setError(null);
          setCursor(null);

          const params = new URLSearchParams();
          params.set('limit', BICKS_PER_PAGE.toString());
          params.set('q', searchQuery.trim());

          const response = await fetch(`/api/search?${params}`);
          if (!response.ok) throw new Error('Failed to load bicks');

          const data = await response.json();
          setBicks(data.bicks || []);
          setCursor(data.nextCursor || null);
          setHasMore(!!data.nextCursor);
        } catch (err) {
          console.error('Error searching bicks:', err);
          setError('Failed to search bicks');
        } finally {
          setLoading(false);
        }
      };
      doSearch();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, activeTab, initialLatestBicks, initialTrendingBicks]);

  // Handle load more
  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchBicks(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-2 h-2 bg-brand-accent/20 rounded-full animate-pulse" />
        <div className="absolute top-40 right-20 w-1 h-1 bg-brand-primary/30 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-32 left-1/4 w-1.5 h-1.5 bg-brand-accent/15 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
        <div className="absolute bottom-20 right-10 w-1 h-1 bg-brand-primary/25 rounded-full animate-pulse" style={{ animationDelay: '0.7s' }} />
      </div>

      <div className="relative z-10 container mx-auto px-6 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
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
          <form onSubmit={handleSearch} className="relative mb-8 max-w-2xl mx-auto">
            <div className="relative group">
              <svg
                className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-brand-accent transition-colors duration-200"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search for audio clips, tags, or keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-gray-900/80 backdrop-blur-sm text-white rounded-2xl border border-gray-700/50 focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/20 transition-all duration-200 placeholder-gray-500"
              />
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-brand-primary/10 via-transparent to-brand-accent/10 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none" />
            </div>
          </form>

          {/* Tab Pills */}
          {!isSearching && (
            <div className="flex justify-center mb-8">
              <div className="flex gap-2 p-1 bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-700/30">
                <button
                  onClick={() => handleTabChange('latest')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                    activeTab === 'latest'
                      ? 'bg-gradient-to-r from-brand-primary to-brand-primary-hover text-white shadow-lg'
                      : 'text-gray-300 hover:text-white hover:bg-gray-800/50'
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
                      : 'text-gray-300 hover:text-white hover:bg-gray-800/50'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  Trending
                </button>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="text-center py-16">
              <div className="inline-flex items-center gap-3 px-6 py-3 bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-700/30">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-primary" />
                <span className="text-gray-300">Loading amazing bicks...</span>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-16">
              <div className="max-w-md mx-auto p-6 bg-red-900/20 backdrop-blur-sm border border-red-500/30 rounded-2xl">
                <p className="text-red-300 mb-4">{error}</p>
                <button
                  onClick={() => fetchBicks(false)}
                  className="px-6 py-2 bg-gradient-to-r from-brand-primary to-brand-primary-hover text-white rounded-xl hover:shadow-lg transition-all duration-200"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {/* Results */}
          {!loading && !error && (
            <>
              {/* Search Results Header */}
              {isSearching && searchQuery && (
                <div className="mb-8 p-4 bg-gray-900/30 backdrop-blur-sm rounded-2xl border border-gray-700/20">
                  <p className="text-gray-300">
                    <span className="font-semibold text-white">{bicks.length}</span> result
                    {bicks.length !== 1 ? 's' : ''} for{' '}
                    <span className="text-brand-accent font-semibold">&quot;{searchQuery}&quot;</span>
                  </p>
                </div>
              )}

              {/* Bicks Grid - 2 columns */}
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
              {hasMore && bicks.length > 0 && (
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

              {/* End of Results */}
              {!hasMore && bicks.length > 0 && (
                <div className="text-center mt-12 py-8">
                  <div className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900/30 backdrop-blur-sm rounded-2xl border border-gray-700/20">
                    <span className="text-gray-400">🎉</span>
                    <span className="text-gray-300">You&apos;ve seen all the bicks!</span>
                  </div>
                </div>
              )}

              {/* Empty State */}
              {bicks.length === 0 && (
                <div className="text-center py-16">
                  <div className="max-w-md mx-auto">
                    <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-gray-800 to-gray-900 rounded-full flex items-center justify-center">
                      <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-4">
                      {searchQuery ? `No bicks found for "${searchQuery}"` : 'No bicks found'}
                    </h3>
                    <p className="text-gray-400 mb-6">
                      {searchQuery
                        ? 'Try searching with different keywords or browse all bicks'
                        : 'Be the first to create an amazing audio clip!'}
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

              {/* Popular Tags Section - rendered from server component */}
            </>
          )}
        </div>
      </div>

      {/* Custom animations */}
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

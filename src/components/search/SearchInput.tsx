'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { SearchBick } from '@/types/database.types';

interface SearchInputProps {
  defaultValue?: string;
  onSearch?: (query: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function SearchInput({
  defaultValue = '',
  onSearch,
  placeholder = 'Search sounds...',
  autoFocus = false,
}: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [query, setQuery] = useState(defaultValue);
  const [results, setResults] = useState<SearchBick[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Live search as user types
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(trimmedQuery)}&limit=5`);
        if (response.ok) {
          const data = await response.json();
          setResults(data.bicks || []);
          setShowDropdown(true);
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    setShowDropdown(false);
    if (onSearch) {
      onSearch(trimmedQuery);
    } else {
      router.push(`/search?q=${encodeURIComponent(trimmedQuery)}`);
    }
  }, [query, onSearch, router]);

  const handleResultClick = () => {
    setShowDropdown(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            {isSearching ? (
              <svg className="animate-spin h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <input
            ref={inputRef}
            type="search"
            name="q"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setShowDropdown(true)}
            placeholder={placeholder}
            autoFocus={autoFocus}
            autoComplete="off"
            className="block w-full pl-12 pr-4 py-4 border border-surface-border rounded-full bg-surface text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all shadow-xl shadow-black/20"
            aria-label="Search"
          />
        </div>
      </form>

      {/* Live search results dropdown */}
      {showDropdown && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-surface-border rounded-2xl shadow-2xl shadow-black/50 overflow-hidden z-50">
          <ul className="py-2">
            {results.map((bick) => (
              <li key={bick.id}>
                <Link
                  href={`/bick/${bick.slug}-${bick.id}`}
                  onClick={handleResultClick}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-surface-hover transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-brand-primary" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{bick.title}</p>
                    {bick.description && (
                      <p className="text-xs text-gray-400 truncate">{bick.description}</p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <div className="border-t border-surface-border px-4 py-2">
            <button
              type="button"
              onClick={() => {
                setShowDropdown(false);
                router.push(`/search?q=${encodeURIComponent(query.trim())}`);
              }}
              className="text-sm text-brand-primary hover:text-brand-primary-hover transition-colors"
            >
              See all results for "{query.trim()}"
            </button>
          </div>
        </div>
      )}

      {/* No results message */}
      {showDropdown && query.trim().length >= 2 && results.length === 0 && !isSearching && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-surface-border rounded-2xl shadow-2xl shadow-black/50 overflow-hidden z-50">
          <div className="px-4 py-6 text-center">
            <p className="text-sm text-gray-400">No results found for "{query.trim()}"</p>
          </div>
        </div>
      )}
    </div>
  );
}

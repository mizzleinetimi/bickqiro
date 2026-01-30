'use client';

import { useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

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
  const router = useRouter();
  const [isSearching, setIsSearching] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const query = inputRef.current?.value.trim() || '';
    
    if (!query) return;
    
    if (onSearch) {
      onSearch(query);
    } else {
      setIsSearching(true);
      router.push(`/search?q=${encodeURIComponent(query)}`);
      setIsSearching(false);
    }
  }, [onSearch, router]);

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          {isSearching ? (
            <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg
              className="h-5 w-5 text-gray-500"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>
        <input
          ref={inputRef}
          type="search"
          name="q"
          defaultValue={defaultValue}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="block w-full pl-12 pr-4 py-4 border border-[#262626] rounded-full bg-[#141414] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#EF4444] focus:border-transparent transition-all"
          aria-label="Search"
        />
      </div>
    </form>
  );
}

'use client';

/**
 * TagAutocomplete Component
 * 
 * Provides tag suggestions as users type, querying the API for matching tags.
 * 
 * @requirements 1.2, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */

import { useState, useEffect, useCallback, useRef, KeyboardEvent } from 'react';

interface TagSuggestion {
  id: string;
  name: string;
  slug: string;
  bick_count: number;
}

interface TagAutocompleteProps {
  /** Current input value */
  query: string;
  /** Callback when a suggestion is selected */
  onSelect: (tag: TagSuggestion) => void;
  /** Callback when user wants to create a new tag */
  onCreateNew: (tagName: string) => void;
  /** Tags already selected (to exclude from suggestions) */
  excludeTags: string[];
  /** Whether the autocomplete is visible */
  isOpen: boolean;
  /** Callback to close the autocomplete */
  onClose: () => void;
}

export function TagAutocomplete({
  query,
  onSelect,
  onCreateNew,
  excludeTags,
  isOpen,
  onClose,
}: TagAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<TagSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch suggestions when query changes
  useEffect(() => {
    if (!isOpen || query.length < 2) {
      setSuggestions([]);
      setSelectedIndex(-1);
      return;
    }

    const fetchSuggestions = async () => {
      setLoading(true);
      try {
        const excludeSlugs = excludeTags.map(t => t.toLowerCase().replace(/\s+/g, '-'));
        const params = new URLSearchParams({
          q: query,
          exclude: excludeSlugs.join(','),
        });
        
        const response = await fetch(`/api/tags/search?${params}`);
        const data = await response.json();
        
        if (data.success) {
          setSuggestions(data.tags);
          setSelectedIndex(-1);
        }
      } catch (error) {
        console.error('Failed to fetch tag suggestions:', error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };

    // Debounce the fetch
    const timeoutId = setTimeout(fetchSuggestions, 200);
    return () => clearTimeout(timeoutId);
  }, [query, excludeTags, isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          onSelect(suggestions[selectedIndex]);
        } else if (query.trim()) {
          onCreateNew(query.trim());
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [isOpen, suggestions, selectedIndex, query, onSelect, onCreateNew, onClose]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  if (!isOpen || query.length < 2) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto"
      onKeyDown={handleKeyDown}
    >
      {loading ? (
        <div className="px-4 py-3 text-gray-500 text-sm">
          Loading...
        </div>
      ) : suggestions.length > 0 ? (
        <ul className="py-1">
          {suggestions.map((suggestion, index) => (
            <li key={suggestion.id}>
              <button
                type="button"
                onClick={() => onSelect(suggestion)}
                className={`w-full px-4 py-2 text-left hover:bg-gray-100 flex justify-between items-center ${
                  index === selectedIndex ? 'bg-blue-50' : ''
                }`}
              >
                <span className="font-medium">{suggestion.name}</span>
                <span className="text-xs text-gray-500">
                  {suggestion.bick_count} bick{suggestion.bick_count !== 1 ? 's' : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="px-4 py-3">
          <p className="text-sm text-gray-600">
            No matching tags found.
          </p>
          <button
            type="button"
            onClick={() => onCreateNew(query.trim())}
            className="mt-2 text-sm text-blue-600 hover:text-blue-800"
          >
            Create &quot;{query.trim()}&quot; as a new tag
          </button>
        </div>
      )}
    </div>
  );
}

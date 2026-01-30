'use client';

/**
 * TagAutocomplete Component - Dark Theme
 */

import { useState, useEffect, useCallback, useRef, KeyboardEvent } from 'react';

interface TagSuggestion {
  id: string;
  name: string;
  slug: string;
  bick_count: number;
}

interface TagAutocompleteProps {
  query: string;
  onSelect: (tag: TagSuggestion) => void;
  onCreateNew: (tagName: string) => void;
  excludeTags: string[];
  isOpen: boolean;
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

    const timeoutId = setTimeout(fetchSuggestions, 200);
    return () => clearTimeout(timeoutId);
  }, [query, excludeTags, isOpen]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => prev < suggestions.length - 1 ? prev + 1 : prev);
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

  if (!isOpen || query.length < 2) return null;

  return (
    <div
      ref={containerRef}
      className="absolute z-10 w-full mt-1 bg-[#1a1a1a] border border-[#262626] rounded-lg shadow-lg max-h-60 overflow-auto"
      onKeyDown={handleKeyDown}
    >
      {loading ? (
        <div className="px-4 py-3 text-gray-400 text-sm">Loading...</div>
      ) : suggestions.length > 0 ? (
        <ul className="py-1">
          {suggestions.map((suggestion, index) => (
            <li key={suggestion.id}>
              <button
                type="button"
                onClick={() => onSelect(suggestion)}
                className={`w-full px-4 py-2 text-left hover:bg-[#262626] flex justify-between items-center transition-colors ${
                  index === selectedIndex ? 'bg-[#262626]' : ''
                }`}
              >
                <span className="font-medium text-white">{suggestion.name}</span>
                <span className="text-xs text-gray-500">
                  {suggestion.bick_count} bick{suggestion.bick_count !== 1 ? 's' : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="px-4 py-3">
          <p className="text-sm text-gray-400">No matching tags found.</p>
          <button
            type="button"
            onClick={() => onCreateNew(query.trim())}
            className="mt-2 text-sm text-[#EF4444] hover:text-[#DC2626] transition-colors"
          >
            Create &quot;{query.trim()}&quot; as a new tag
          </button>
        </div>
      )}
    </div>
  );
}

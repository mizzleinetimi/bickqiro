'use client';

/**
 * TagInput Component - Dark Theme
 */

import { useState, useCallback, KeyboardEvent, useRef } from 'react';
import { TagAutocomplete } from './TagAutocomplete';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  maxTags?: number;
  disabled?: boolean;
  placeholder?: string;
  showAutocomplete?: boolean;
}

function isValidTagFormat(tag: string): boolean {
  return /^[a-zA-Z0-9\s-]+$/.test(tag) && tag.trim().length > 0;
}

export function TagInput({
  value,
  onChange,
  maxTags = 10,
  disabled = false,
  placeholder = 'Add tags...',
  showAutocomplete = false,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isAutocompleteOpen, setIsAutocompleteOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = useCallback((tagName: string) => {
    const trimmed = tagName.trim();
    setError(null);
    
    if (!trimmed) return;
    
    if (!isValidTagFormat(trimmed)) {
      setError('Tags can only contain letters, numbers, spaces, and hyphens');
      return;
    }
    
    const normalizedTag = trimmed.toLowerCase();
    if (value.some(t => t.toLowerCase() === normalizedTag)) {
      setInputValue('');
      return;
    }
    
    if (value.length >= maxTags) {
      setError(`Maximum ${maxTags} tags allowed`);
      return;
    }
    
    onChange([...value, trimmed]);
    setInputValue('');
  }, [value, onChange, maxTags]);

  const removeTag = useCallback((index: number) => {
    const newTags = [...value];
    newTags.splice(index, 1);
    onChange(newTags);
    setError(null);
  }, [value, onChange]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isAutocompleteOpen) {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeTag(value.length - 1);
    } else if (e.key === 'Escape') {
      setIsAutocompleteOpen(false);
    }
  }, [inputValue, addTag, removeTag, value.length, isAutocompleteOpen]);

  const handleAddClick = useCallback(() => {
    addTag(inputValue);
  }, [inputValue, addTag]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setError(null);
    if (showAutocomplete && newValue.length >= 2) {
      setIsAutocompleteOpen(true);
    } else {
      setIsAutocompleteOpen(false);
    }
  }, [showAutocomplete]);

  const handleAutocompleteSelect = useCallback((tag: { name: string; slug: string }) => {
    addTag(tag.name);
    setIsAutocompleteOpen(false);
    inputRef.current?.focus();
  }, [addTag]);

  const handleCreateNewTag = useCallback((tagName: string) => {
    addTag(tagName);
    setIsAutocompleteOpen(false);
    inputRef.current?.focus();
  }, [addTag]);

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((tag, index) => (
            <span
              key={`${tag}-${index}`}
              className="inline-flex items-center gap-1 px-3 py-1 bg-[#F97316]/20 text-[#F97316] rounded-full text-sm font-medium"
            >
              {tag}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeTag(index)}
                  className="hover:bg-[#F97316]/30 rounded-full p-0.5 transition-colors"
                  aria-label={`Remove ${tag}`}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (showAutocomplete && inputValue.length >= 2) {
                setIsAutocompleteOpen(true);
              }
            }}
            disabled={disabled || value.length >= maxTags}
            placeholder={value.length >= maxTags ? `Maximum ${maxTags} tags` : placeholder}
            className="flex-1 px-4 py-2 border border-[#262626] rounded-lg bg-[#1a1a1a] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#EF4444] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          />
          <button
            type="button"
            onClick={handleAddClick}
            disabled={disabled || !inputValue.trim() || value.length >= maxTags}
            className="px-4 py-2 bg-[#EF4444] text-white rounded-lg hover:bg-[#DC2626] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            Add
          </button>
        </div>

        {showAutocomplete && (
          <TagAutocomplete
            query={inputValue}
            onSelect={handleAutocompleteSelect}
            onCreateNew={handleCreateNewTag}
            excludeTags={value}
            isOpen={isAutocompleteOpen}
            onClose={() => setIsAutocompleteOpen(false)}
          />
        )}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <p className="text-xs text-gray-500">{value.length}/{maxTags} tags</p>
    </div>
  );
}

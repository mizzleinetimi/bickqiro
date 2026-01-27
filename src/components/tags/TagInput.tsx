'use client';

/**
 * TagInput Component
 * 
 * A reusable component for adding and managing tags.
 * Used in both upload flow and bick editing.
 * Supports optional autocomplete suggestions.
 * 
 * @requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
 */

import { useState, useCallback, KeyboardEvent, useRef } from 'react';
import { TagAutocomplete } from './TagAutocomplete';

interface TagInputProps {
  /** Currently selected tags */
  value: string[];
  /** Callback when tags change */
  onChange: (tags: string[]) => void;
  /** Maximum number of tags allowed */
  maxTags?: number;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Whether to show autocomplete suggestions */
  showAutocomplete?: boolean;
}

/**
 * Validate tag format - alphanumeric, hyphens, and spaces only
 */
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
    
    // Clear any previous error
    setError(null);
    
    // Validate tag
    if (!trimmed) {
      return;
    }
    
    if (!isValidTagFormat(trimmed)) {
      setError('Tags can only contain letters, numbers, spaces, and hyphens');
      return;
    }
    
    // Check for duplicates (case-insensitive)
    const normalizedTag = trimmed.toLowerCase();
    if (value.some(t => t.toLowerCase() === normalizedTag)) {
      setInputValue('');
      return; // Silently ignore duplicates
    }
    
    // Check max tags
    if (value.length >= maxTags) {
      setError(`Maximum ${maxTags} tags allowed`);
      return;
    }
    
    // Add the tag
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
    // Don't handle Enter if autocomplete is open (let it handle selection)
    if (e.key === 'Enter' && !isAutocompleteOpen) {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      // Remove last tag on backspace when input is empty
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
    // Open autocomplete when typing 2+ characters
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
      {/* Selected tags */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((tag, index) => (
            <span
              key={`${tag}-${index}`}
              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
            >
              {tag}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeTag(index)}
                  className="hover:bg-blue-200 rounded-full p-0.5"
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

      {/* Input field with autocomplete */}
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
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <button
            type="button"
            onClick={handleAddClick}
            disabled={disabled || !inputValue.trim() || value.length >= maxTags}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Add
          </button>
        </div>

        {/* Autocomplete dropdown */}
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

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {/* Tag count */}
      <p className="text-xs text-gray-500">
        {value.length}/{maxTags} tags
      </p>
    </div>
  );
}

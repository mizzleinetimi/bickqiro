/**
 * MetadataForm Component
 * 
 * Form for entering bick metadata: title, description, and tags.
 * Includes validation and character counts.
 * 
 * **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**
 */
'use client';

import { useState, useCallback } from 'react';
import { 
  validateTitle, 
  validateDescription, 
  validateTags,
  TITLE_MAX_LENGTH,
  DESCRIPTION_MAX_LENGTH,
  MAX_TAGS,
} from '@/lib/upload/validation';

export interface UploadMetadata {
  title: string;
  description?: string;
  tags?: string[];
}

interface MetadataFormProps {
  /** Initial values for the form */
  initialValues?: Partial<UploadMetadata>;
  /** Callback when form is submitted with valid data */
  onSubmit: (metadata: UploadMetadata) => void;
  /** Whether the form is in a loading/submitting state */
  isSubmitting?: boolean;
}

export function MetadataForm({ 
  initialValues, 
  onSubmit, 
  isSubmitting = false 
}: MetadataFormProps) {
  const [title, setTitle] = useState(initialValues?.title || '');
  const [description, setDescription] = useState(initialValues?.description || '');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(initialValues?.tags || []);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    const titleValidation = validateTitle(title);
    if (!titleValidation.valid) {
      newErrors.title = titleValidation.error!;
    }

    if (description) {
      const descValidation = validateDescription(description);
      if (!descValidation.valid) {
        newErrors.description = descValidation.error!;
      }
    }

    if (tags.length > 0) {
      const tagsValidation = validateTags(tags);
      if (!tagsValidation.valid) {
        newErrors.tags = tagsValidation.error!;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [title, description, tags]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined,
    });
  }, [title, description, tags, validateForm, onSubmit]);

  const handleAddTag = useCallback(() => {
    const tag = tagInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    
    if (!tag) return;
    if (tags.includes(tag)) {
      setTagInput('');
      return;
    }
    if (tags.length >= MAX_TAGS) {
      setErrors(prev => ({ ...prev, tags: `Maximum ${MAX_TAGS} tags allowed` }));
      return;
    }

    setTags(prev => [...prev, tag]);
    setTagInput('');
    setErrors(prev => {
      const { tags: _, ...rest } = prev;
      return rest;
    });
  }, [tagInput, tags]);

  const handleTagKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag();
    }
  }, [handleAddTag]);

  const handleRemoveTag = useCallback((tagToRemove: string) => {
    setTags(prev => prev.filter(t => t !== tagToRemove));
  }, []);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Give your bick a catchy title"
          maxLength={TITLE_MAX_LENGTH}
          disabled={isSubmitting}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 ${
            errors.title ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        <div className="flex justify-between mt-1">
          {errors.title ? (
            <p className="text-sm text-red-600">{errors.title}</p>
          ) : (
            <span />
          )}
          <span className="text-xs text-gray-500">
            {title.length}/{TITLE_MAX_LENGTH}
          </span>
        </div>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          Description <span className="text-gray-400">(optional)</span>
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add a description for your bick"
          maxLength={DESCRIPTION_MAX_LENGTH}
          rows={3}
          disabled={isSubmitting}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 resize-none ${
            errors.description ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        <div className="flex justify-between mt-1">
          {errors.description ? (
            <p className="text-sm text-red-600">{errors.description}</p>
          ) : (
            <span />
          )}
          <span className="text-xs text-gray-500">
            {description.length}/{DESCRIPTION_MAX_LENGTH}
          </span>
        </div>
      </div>

      {/* Tags */}
      <div>
        <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
          Tags <span className="text-gray-400">(optional)</span>
        </label>
        
        {/* Tag input */}
        <div className="flex gap-2">
          <input
            id="tags"
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            placeholder="Add tags (press Enter)"
            disabled={isSubmitting || tags.length >= MAX_TAGS}
            className={`flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 ${
              errors.tags ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          <button
            type="button"
            onClick={handleAddTag}
            disabled={isSubmitting || !tagInput.trim() || tags.length >= MAX_TAGS}
            className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Add
          </button>
        </div>

        {/* Tag list */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm"
              >
                #{tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  disabled={isSubmitting}
                  className="hover:text-indigo-900 disabled:cursor-not-allowed"
                  aria-label={`Remove tag ${tag}`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex justify-between mt-1">
          {errors.tags ? (
            <p className="text-sm text-red-600">{errors.tags}</p>
          ) : (
            <p className="text-xs text-gray-500">
              Use letters, numbers, and hyphens only
            </p>
          )}
          <span className="text-xs text-gray-500">
            {tags.length}/{MAX_TAGS}
          </span>
        </div>
      </div>

      {/* Submit button */}
      <button
        type="submit"
        disabled={isSubmitting || !title.trim()}
        className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle 
                className="opacity-25" 
                cx="12" cy="12" r="10" 
                stroke="currentColor" 
                strokeWidth="4" 
                fill="none" 
              />
              <path 
                className="opacity-75" 
                fill="currentColor" 
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" 
              />
            </svg>
            <span>Uploading...</span>
          </>
        ) : (
          <span>Upload Bick</span>
        )}
      </button>
    </form>
  );
}

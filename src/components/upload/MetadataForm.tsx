/**
 * MetadataForm Component - Dark Theme
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
import { TagInput } from '@/components/tags/TagInput';

export interface UploadMetadata {
  title: string;
  description?: string;
  tags?: string[];
}

interface MetadataFormProps {
  initialValues?: Partial<UploadMetadata>;
  onSubmit: (metadata: UploadMetadata) => void;
  isSubmitting?: boolean;
}

export function MetadataForm({ initialValues, onSubmit, isSubmitting = false }: MetadataFormProps) {
  const [title, setTitle] = useState(initialValues?.title || '');
  const [description, setDescription] = useState(initialValues?.description || '');
  const [tags, setTags] = useState<string[]>(initialValues?.tags || []);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    const titleValidation = validateTitle(title);
    if (!titleValidation.valid) newErrors.title = titleValidation.error!;

    if (description) {
      const descValidation = validateDescription(description);
      if (!descValidation.valid) newErrors.description = descValidation.error!;
    }

    if (tags.length > 0) {
      const tagsValidation = validateTags(tags);
      if (!tagsValidation.valid) newErrors.tags = tagsValidation.error!;
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

  const handleTagsChange = useCallback((newTags: string[]) => {
    setTags(newTags);
    setErrors(prev => {
      const { tags: _, ...rest } = prev;
      return rest;
    });
  }, []);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-1">
          Title <span className="text-[#EF4444]">*</span>
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Give your bick a catchy title"
          maxLength={TITLE_MAX_LENGTH}
          disabled={isSubmitting}
          className={`w-full px-4 py-3 border rounded-lg bg-[#1a1a1a] text-white placeholder-gray-500 focus:ring-2 focus:ring-[#EF4444] focus:border-transparent disabled:opacity-50 transition-colors ${
            errors.title ? 'border-red-500' : 'border-[#262626]'
          }`}
        />
        <div className="flex justify-between mt-1">
          {errors.title ? <p className="text-sm text-red-400">{errors.title}</p> : <span />}
          <span className="text-xs text-gray-500">{title.length}/{TITLE_MAX_LENGTH}</span>
        </div>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">
          Description <span className="text-gray-500">(optional)</span>
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add a description for your bick"
          maxLength={DESCRIPTION_MAX_LENGTH}
          rows={3}
          disabled={isSubmitting}
          className={`w-full px-4 py-3 border rounded-lg bg-[#1a1a1a] text-white placeholder-gray-500 focus:ring-2 focus:ring-[#EF4444] focus:border-transparent disabled:opacity-50 resize-none transition-colors ${
            errors.description ? 'border-red-500' : 'border-[#262626]'
          }`}
        />
        <div className="flex justify-between mt-1">
          {errors.description ? <p className="text-sm text-red-400">{errors.description}</p> : <span />}
          <span className="text-xs text-gray-500">{description.length}/{DESCRIPTION_MAX_LENGTH}</span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Tags <span className="text-gray-500">(optional)</span>
        </label>
        <TagInput
          value={tags}
          onChange={handleTagsChange}
          maxTags={MAX_TAGS}
          disabled={isSubmitting}
          placeholder="Add tags..."
          showAutocomplete
        />
        {errors.tags && <p className="text-sm text-red-400 mt-1">{errors.tags}</p>}
      </div>

      <button
        type="submit"
        disabled={isSubmitting || !title.trim()}
        className="w-full py-3 bg-[#EF4444] text-white rounded-full hover:bg-[#DC2626] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 font-medium"
      >
        {isSubmitting ? (
          <>
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
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

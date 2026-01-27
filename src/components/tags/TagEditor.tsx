'use client';

/**
 * TagEditor Component
 * 
 * Modal editor for managing tags on existing bicks.
 * Pre-populates with current tags and saves changes via API.
 * 
 * @requirements 2.2, 2.3, 2.4
 */

import { useState, useCallback } from 'react';
import { TagInput } from './TagInput';

interface TagEditorProps {
  /** Bick ID */
  bickId: string;
  /** Current tags */
  currentTags: Array<{ name: string; slug: string }>;
  /** Callback when editing is complete */
  onSave: () => void;
  /** Callback to cancel editing */
  onCancel: () => void;
}

export function TagEditor({
  bickId,
  currentTags,
  onSave,
  onCancel,
}: TagEditorProps) {
  const [tags, setTags] = useState<string[]>(currentTags.map(t => t.name));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/bicks/${bickId}/tags`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save tags');
      }

      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save tags');
    } finally {
      setSaving(false);
    }
  }, [bickId, tags, onSave]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-lg font-semibold mb-4">Edit Tags</h2>
        
        <TagInput
          value={tags}
          onChange={setTags}
          maxTags={10}
          disabled={saving}
          placeholder="Add tags..."
          showAutocomplete
        />

        {error && (
          <p className="text-sm text-red-600 mt-2">{error}</p>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving...
              </>
            ) : (
              'Save Tags'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

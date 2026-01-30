/**
 * UrlExtractor Component - Dark Theme
 */
'use client';

import { useState, useCallback } from 'react';
import { detectPlatform, isSupportedUrl, SUPPORTED_PLATFORM_NAMES } from '@/lib/audio/platform';

interface UrlExtractorProps {
  onExtracted: (audioUrl: string, sourceUrl: string, durationMs: number, title?: string, thumbnailUrl?: string) => void;
  onError?: (error: string) => void;
}

type ExtractionState = 'idle' | 'validating' | 'extracting' | 'error';

export function UrlExtractor({ onExtracted, onError }: UrlExtractorProps) {
  const [url, setUrl] = useState('');
  const [state, setState] = useState<ExtractionState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [detectedPlatform, setDetectedPlatform] = useState<string | null>(null);

  const handleUrlChange = useCallback((value: string) => {
    setUrl(value);
    setError(null);
    if (value.trim()) {
      const platform = detectPlatform(value);
      setDetectedPlatform(platform);
    } else {
      setDetectedPlatform(null);
    }
  }, []);

  const handleExtract = useCallback(async () => {
    const trimmedUrl = url.trim();
    
    if (!trimmedUrl) {
      setError('Please enter a URL');
      return;
    }

    if (!isSupportedUrl(trimmedUrl)) {
      setError(`Unsupported platform. We support: ${SUPPORTED_PLATFORM_NAMES.join(', ')}`);
      return;
    }

    setState('extracting');
    setError(null);

    try {
      const response = await fetch('/api/bicks/extract-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmedUrl }),
      });

      const data = await response.json();

      if (!data.success) throw new Error(data.error || 'Failed to extract audio');

      setState('idle');
      onExtracted(data.audioUrl, trimmedUrl, data.durationMs, data.sourceTitle, data.thumbnailUrl);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to extract audio';
      setError(message);
      setState('error');
      onError?.(message);
    }
  }, [url, onExtracted, onError]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleExtract();
    }
  }, [handleExtract]);

  const isExtracting = state === 'extracting';

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-300">Extract from URL</label>
      
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="url"
            value={url}
            onChange={(e) => handleUrlChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Paste YouTube, TikTok, Instagram, or Twitter/X URL"
            disabled={isExtracting}
            className="w-full px-4 py-3 border border-[#262626] rounded-lg bg-[#1a1a1a] text-white placeholder-gray-500 focus:ring-2 focus:ring-[#EF4444] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          />
          
          {detectedPlatform && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-[#EF4444] bg-[#EF4444]/20 px-2 py-1 rounded">
              {detectedPlatform}
            </span>
          )}
        </div>
        
        <button
          onClick={handleExtract}
          disabled={isExtracting || !url.trim()}
          className="px-6 py-3 bg-[#EF4444] text-white rounded-lg hover:bg-[#DC2626] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 font-medium"
        >
          {isExtracting ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>Extracting...</span>
            </>
          ) : (
            <span>Extract</span>
          )}
        </button>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <p className="text-xs text-gray-500">
        Supported: YouTube, TikTok, Instagram Reels, Twitter/X videos
      </p>
    </div>
  );
}

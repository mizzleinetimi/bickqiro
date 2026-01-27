'use client';

/**
 * CopyLinkButton Component
 * 
 * A button that copies a URL to the clipboard with visual feedback.
 * Uses the navigator.clipboard API with graceful error handling.
 * 
 * @requirements 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { useState, useCallback } from 'react';

export interface CopyLinkButtonProps {
  /** The URL to copy to clipboard */
  url: string;
  /** Optional callback when copy is triggered (for tracking) */
  onCopy?: () => void;
  /** Optional custom class name */
  className?: string;
}

/**
 * Duration in milliseconds to show "Copied!" feedback
 */
const FEEDBACK_DURATION_MS = 2000;

export function CopyLinkButton({ url, onCopy, className = '' }: CopyLinkButtonProps) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');

  const handleCopy = useCallback(async () => {
    try {
      // Check if clipboard API is available
      if (!navigator.clipboard) {
        throw new Error('Clipboard API not available');
      }

      await navigator.clipboard.writeText(url);
      
      // Trigger tracking callback
      onCopy?.();
      
      // Show success feedback
      setCopyState('copied');
      
      // Reset after feedback duration
      setTimeout(() => {
        setCopyState('idle');
      }, FEEDBACK_DURATION_MS);
    } catch (error) {
      // Handle clipboard errors gracefully
      setCopyState('error');
      
      // Reset after feedback duration
      setTimeout(() => {
        setCopyState('idle');
      }, FEEDBACK_DURATION_MS);
    }
  }, [url, onCopy]);

  const getButtonText = () => {
    switch (copyState) {
      case 'copied':
        return 'Copied!';
      case 'error':
        return 'Copy failed';
      default:
        return 'Copy Link';
    }
  };

  const getButtonStyles = () => {
    const baseStyles = 'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
    
    switch (copyState) {
      case 'copied':
        return `${baseStyles} bg-green-100 text-green-700 focus:ring-green-500`;
      case 'error':
        return `${baseStyles} bg-red-100 text-red-700 focus:ring-red-500`;
      default:
        return `${baseStyles} bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500`;
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`${getButtonStyles()} ${className}`}
      aria-label={copyState === 'copied' ? 'Link copied to clipboard' : 'Copy link to clipboard'}
      aria-live="polite"
    >
      {/* Link/Copy Icon */}
      {copyState === 'idle' && (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
          />
        </svg>
      )}
      
      {/* Checkmark Icon for success */}
      {copyState === 'copied' && (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      )}
      
      {/* Error Icon */}
      {copyState === 'error' && (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      )}
      
      <span>{getButtonText()}</span>
    </button>
  );
}

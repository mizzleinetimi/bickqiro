'use client';

/**
 * TwitterShareButton Component
 * 
 * A button that opens Twitter's share dialog with the bick URL and title pre-filled.
 * Opens in a new window/popup for better UX.
 * 
 * @requirements 4.1, 4.2, 4.4, 4.5
 */

import { useCallback } from 'react';

export interface TwitterShareButtonProps {
  /** The URL to share */
  url: string;
  /** The title/text to include in the tweet */
  title: string;
  /** Optional callback when share is triggered (for tracking) */
  onShare?: () => void;
  /** Optional custom class name */
  className?: string;
}

/**
 * Popup window dimensions for Twitter share dialog
 */
const POPUP_WIDTH = 550;
const POPUP_HEIGHT = 420;

/**
 * Generates a Twitter intent URL with the given URL and text
 */
export function generateTwitterShareUrl(url: string, text: string): string {
  const params = new URLSearchParams({
    url: url,
    text: text,
  });
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

/**
 * Opens a centered popup window
 */
function openPopup(url: string, width: number, height: number): Window | null {
  const left = Math.round((window.screen.width - width) / 2);
  const top = Math.round((window.screen.height - height) / 2);
  
  return window.open(
    url,
    'twitter-share',
    `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
  );
}

export function TwitterShareButton({ url, title, onShare, className = '' }: TwitterShareButtonProps) {
  const handleShare = useCallback(() => {
    const shareUrl = generateTwitterShareUrl(url, title);
    
    // Try to open popup
    const popup = openPopup(shareUrl, POPUP_WIDTH, POPUP_HEIGHT);
    
    // If popup was blocked, fall back to opening in new tab
    if (!popup || popup.closed) {
      window.open(shareUrl, '_blank', 'noopener,noreferrer');
    }
    
    // Trigger tracking callback
    onShare?.();
  }, [url, title, onShare]);

  return (
    <button
      type="button"
      onClick={handleShare}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors bg-[#1DA1F2] text-white hover:bg-[#1a8cd8] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1DA1F2] ${className}`}
      aria-label="Share on Twitter"
    >
      {/* Twitter/X Icon */}
      <svg
        className="w-5 h-5"
        fill="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
      <span>Tweet</span>
    </button>
  );
}

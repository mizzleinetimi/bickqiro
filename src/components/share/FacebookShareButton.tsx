'use client';

/**
 * FacebookShareButton Component
 * 
 * A button that opens Facebook's share dialog with the bick URL pre-filled.
 * Opens in a new window/popup for better UX.
 * 
 * @requirements 4.1, 4.3, 4.4, 4.5
 */

import { useCallback } from 'react';

export interface FacebookShareButtonProps {
  /** The URL to share */
  url: string;
  /** Optional callback when share is triggered (for tracking) */
  onShare?: () => void;
  /** Optional custom class name */
  className?: string;
}

/**
 * Popup window dimensions for Facebook share dialog
 */
const POPUP_WIDTH = 626;
const POPUP_HEIGHT = 436;

/**
 * Generates a Facebook share URL with the given URL
 */
export function generateFacebookShareUrl(url: string): string {
  const params = new URLSearchParams({
    u: url,
  });
  return `https://www.facebook.com/sharer/sharer.php?${params.toString()}`;
}

/**
 * Opens a centered popup window
 */
function openPopup(url: string, width: number, height: number): Window | null {
  const left = Math.round((window.screen.width - width) / 2);
  const top = Math.round((window.screen.height - height) / 2);
  
  return window.open(
    url,
    'facebook-share',
    `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
  );
}

export function FacebookShareButton({ url, onShare, className = '' }: FacebookShareButtonProps) {
  const handleShare = useCallback(() => {
    const shareUrl = generateFacebookShareUrl(url);
    
    // Try to open popup
    const popup = openPopup(shareUrl, POPUP_WIDTH, POPUP_HEIGHT);
    
    // If popup was blocked, fall back to opening in new tab
    if (!popup || popup.closed) {
      window.open(shareUrl, '_blank', 'noopener,noreferrer');
    }
    
    // Trigger tracking callback
    onShare?.();
  }, [url, onShare]);

  return (
    <button
      type="button"
      onClick={handleShare}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors bg-[#1877F2] text-white hover:bg-[#166fe5] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1877F2] ${className}`}
      aria-label="Share on Facebook"
    >
      {/* Facebook Icon */}
      <svg
        className="w-5 h-5"
        fill="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"
          clipRule="evenodd"
        />
      </svg>
      <span>Share</span>
    </button>
  );
}

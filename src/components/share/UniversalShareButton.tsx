'use client';

/**
 * UniversalShareButton Component
 * 
 * Uses the Web Share API to show the native share sheet on supported devices.
 * Shares the MP4 video file directly along with the link when available.
 * Falls back to showing a modal with share options on unsupported browsers.
 */

import { useState, useCallback } from 'react';

export interface UniversalShareButtonProps {
  /** The URL to share */
  url: string;
  /** The title of the content */
  title: string;
  /** Optional description text */
  text?: string;
  /** Optional MP4 video URL to share as a file */
  videoUrl?: string;
  /** Callback when share is triggered (for tracking) */
  onShare?: () => void;
  /** Optional custom class name */
  className?: string;
}

export function UniversalShareButton({ 
  url, 
  title, 
  text, 
  videoUrl,
  onShare, 
  className = '' 
}: UniversalShareButtonProps) {
  const [showFallback, setShowFallback] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');
  const [isLoading, setIsLoading] = useState(false);

  const handleShare = useCallback(async () => {
    // Check if Web Share API is available
    if (navigator.share) {
      try {
        setIsLoading(true);
        
        // Prepare share data
        const shareData: ShareData = {
          title,
          text: text || `Check out "${title}" on Bickqr\n${url}`,
        };

        // If video URL is available and file sharing is supported, fetch and share the video
        if (videoUrl && navigator.canShare) {
          try {
            const response = await fetch(videoUrl);
            const blob = await response.blob();
            const fileName = `${title.replace(/[^a-zA-Z0-9]/g, '_')}.mp4`;
            const file = new File([blob], fileName, { type: 'video/mp4' });
            
            // Check if we can share files
            if (navigator.canShare({ files: [file] })) {
              shareData.files = [file];
            }
          } catch (error) {
            console.warn('Could not fetch video for sharing:', error);
            // Continue without the file
          }
        }

        // If no files, include the URL in the share data
        if (!shareData.files) {
          shareData.url = url;
        }

        await navigator.share(shareData);
        onShare?.();
      } catch (error) {
        // User cancelled or share failed - that's okay
        if ((error as Error).name !== 'AbortError') {
          console.error('Share failed:', error);
        }
      } finally {
        setIsLoading(false);
      }
    } else {
      // Show fallback modal
      setShowFallback(true);
    }
  }, [url, title, text, videoUrl, onShare]);

  const handleCopyInFallback = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopyState('copied');
      onShare?.();
      setTimeout(() => setCopyState('idle'), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  }, [url, onShare]);

  const closeFallback = () => {
    setShowFallback(false);
    setCopyState('idle');
  };

  return (
    <>
      <button
        type="button"
        onClick={handleShare}
        disabled={isLoading}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-purple-600 text-white hover:bg-purple-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-wait ${className}`}
        aria-label="Share this bick"
      >
        {/* Share Icon or Loading Spinner */}
        {isLoading ? (
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : (
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
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
            />
          </svg>
        )}
        <span>{isLoading ? 'Loading...' : 'Share'}</span>
      </button>

      {/* Fallback Modal for browsers without Web Share API */}
      {showFallback && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50"
          onClick={closeFallback}
        >
          <div 
            className="bg-white w-full sm:w-96 sm:rounded-lg rounded-t-2xl p-6 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Share</h3>
              <button
                type="button"
                onClick={closeFallback}
                className="p-1 hover:bg-gray-100 rounded-full"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4 truncate">{title}</p>

            {/* Share Options */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              {/* Twitter/X */}
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out "${title}" on Bickqr`)}&url=${encodeURIComponent(url)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onShare?.()}
                className="flex flex-col items-center gap-1 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </div>
                <span className="text-xs">X</span>
              </a>

              {/* Facebook */}
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onShare?.()}
                className="flex flex-col items-center gap-1 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </div>
                <span className="text-xs">Facebook</span>
              </a>

              {/* WhatsApp */}
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Check out "${title}" on Bickqr: ${url}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onShare?.()}
                className="flex flex-col items-center gap-1 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </div>
                <span className="text-xs">WhatsApp</span>
              </a>

              {/* Email */}
              <a
                href={`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`Check out "${title}" on Bickqr: ${url}`)}`}
                onClick={() => onShare?.()}
                className="flex flex-col items-center gap-1 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="text-xs">Email</span>
              </a>
            </div>

            {/* Copy Link */}
            <button
              type="button"
              onClick={handleCopyInFallback}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            >
              {copyState === 'copied' ? (
                <>
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-green-600">Copied!</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  <span>Copy Link</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.2s ease-out;
        }
      `}</style>
    </>
  );
}

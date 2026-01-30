'use client';

/**
 * SharePanel Component
 * 
 * A container component that composes CopyLinkButton and social share buttons.
 * Integrates share tracking with 60-second debounce.
 * 
 * @requirements 2.1, 2.2, 2.3
 */

import { useTrackingDebounce } from '@/hooks/useTrackingDebounce';
import { CopyLinkButton } from './CopyLinkButton';
import { TwitterShareButton } from './TwitterShareButton';
import { FacebookShareButton } from './FacebookShareButton';

export interface SharePanelProps {
  /** The ID of the bick being shared (for tracking) */
  bickId: string;
  /** The canonical URL of the bick */
  bickUrl: string;
  /** The title of the bick (for social share text) */
  bickTitle: string;
  /** Optional custom class name */
  className?: string;
}

export function SharePanel({ bickId, bickUrl, bickTitle, className = '' }: SharePanelProps) {
  // Share tracking hook with 60-second debounce
  const { track: trackShare } = useTrackingDebounce({
    bickId,
    eventType: 'share',
    debounceMs: 60000, // 60-second debounce window for share events
  });

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      <CopyLinkButton 
        url={bickUrl} 
        onCopy={trackShare}
      />
      <TwitterShareButton 
        url={bickUrl} 
        title={bickTitle}
        onShare={trackShare}
      />
      <FacebookShareButton 
        url={bickUrl}
        onShare={trackShare}
      />
    </div>
  );
}

// Re-export sub-components for convenience
export { CopyLinkButton } from './CopyLinkButton';
export { TwitterShareButton } from './TwitterShareButton';
export { FacebookShareButton } from './FacebookShareButton';
export { DownloadButton } from './DownloadButton';
export { UniversalShareButton } from './UniversalShareButton';

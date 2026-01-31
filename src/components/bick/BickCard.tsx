'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import type { Bick, Tag, BickAsset } from '@/types/database.types';
import { TagDisplay } from '@/components/tags/TagDisplay';
import { Bookmark, Share2 } from 'lucide-react';

interface BickCardProps {
  bick: Bick & { tags?: Tag[]; assets?: BickAsset[]; owner?: { username?: string; display_name?: string | null } | null };
  variant?: 'default' | 'featured';
  showTrending?: boolean;
}

function formatDuration(ms: number | null): string {
  if (!ms) return '0s';
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatPlayCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

const DEFAULT_THUMBNAIL = '/brand-thumb.jpg';

export function BickCard({ bick, variant = 'default', showTrending = false }: BickCardProps) {
  const router = useRouter();
  const isFeatured = variant === 'featured';
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Check if bick is favorited on mount (device-based, no auth)
  useEffect(() => {
    fetch(`/api/favorites/${bick.id}`)
      .then(res => res.json())
      .then(data => setIsSaved(data.favorited))
      .catch(() => {});
  }, [bick.id]);
  
  // Get audio URL from assets - check both 'audio' and 'original' types
  const audioAsset = bick.assets?.find(a => a.asset_type === 'audio' || a.asset_type === 'original');
  const audioUrl = audioAsset?.cdn_url;
  
  // Get thumbnail URL - priority: thumbnail asset > og_image > default
  const thumbnailAsset = bick.assets?.find(a => a.asset_type === 'thumbnail');
  const ogImageAsset = bick.assets?.find(a => a.asset_type === 'og_image');
  const thumbnailUrl = thumbnailAsset?.cdn_url || ogImageAsset?.cdn_url || DEFAULT_THUMBNAIL;
  const isDefaultThumbnail = thumbnailUrl === DEFAULT_THUMBNAIL;

  // Handle audio time updates
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handleCardClick = () => {
    router.push(`/bick/${bick.slug}-${bick.id}`);
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!audioUrl) return;

    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.addEventListener('timeupdate', () => {
        if (audioRef.current?.duration) {
          setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
        }
      });
      audioRef.current.addEventListener('ended', () => {
        setIsPlaying(false);
        setProgress(0);
      });
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      // Track play count
      fetch(`/api/bicks/${bick.id}/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventType: 'play' }),
      }).catch(() => {});
      
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleSaveClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSaving) return;
    
    const newSavedState = !isSaved;
    setIsSaved(newSavedState);
    setIsSaving(true);

    try {
      const response = newSavedState
        ? await fetch('/api/favorites', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bickId: bick.id }),
          })
        : await fetch(`/api/favorites/${bick.id}`, { method: 'DELETE' });
      
      if (!response.ok) {
        setIsSaved(!newSavedState);
      }
    } catch {
      setIsSaved(!newSavedState);
    } finally {
      setIsSaving(false);
    }
  };

  // Get teaser MP4 URL for sharing
  const teaserAsset = bick.assets?.find(a => a.asset_type === 'teaser_mp4');
  const teaserUrl = teaserAsset?.cdn_url;

  const handleShareClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/bick/${bick.slug}-${bick.id}`;
    
    if (navigator.share) {
      try {
        // Try to share MP4 video directly if available
        if (teaserUrl && navigator.canShare) {
          try {
            const response = await fetch(teaserUrl);
            const blob = await response.blob();
            const fileName = `${bick.title.replace(/[^a-zA-Z0-9]/g, '_')}.mp4`;
            const file = new File([blob], fileName, { type: 'video/mp4' });
            
            if (navigator.canShare({ files: [file] })) {
              await navigator.share({
                title: bick.title,
                text: bick.description || `Check out "${bick.title}" on Bickqr`,
                files: [file],
              });
              return;
            }
          } catch {
            // Fall through to URL sharing
          }
        }
        
        // Fallback to URL sharing
        await navigator.share({
          title: bick.title,
          text: bick.description || `Check out "${bick.title}" on Bickqr`,
          url: shareUrl,
        });
      } catch (err) {
        // User cancelled or share failed, fallback to clipboard
        if ((err as Error).name !== 'AbortError') {
          await navigator.clipboard.writeText(shareUrl);
        }
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(shareUrl);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleCardClick()}
      className={`group flex gap-4 p-4 bg-surface rounded-xl border border-surface-border hover:border-surface-border/80 hover:bg-surface-hover transition-all duration-300 relative overflow-hidden cursor-pointer ${
        isFeatured ? 'ring-2 ring-brand-accent/30' : ''
      }`}
    >
      {/* Progress bar when playing */}
      {isPlaying && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800">
          <div 
            className="h-full bg-gradient-to-r from-brand-primary to-brand-accent transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Thumbnail with Play Button Overlay */}
      <div className={`relative flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden ${isDefaultThumbnail ? 'bg-[#1a1a1a]' : 'bg-gray-800'}`}>
        <Image
          src={thumbnailUrl}
          alt={bick.title}
          fill
          className={isDefaultThumbnail ? "object-contain p-2" : "object-cover"}
          sizes="(max-width: 640px) 80px, 96px"
        />
        
        {/* Play Button Overlay */}
        <button
          type="button"
          onClick={handlePlayClick}
          disabled={!audioUrl}
          className={`absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 disabled:cursor-not-allowed ${
            isPlaying ? 'opacity-100' : ''
          }`}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-brand-yellow-from to-brand-yellow-to flex items-center justify-center shadow-lg transition-transform duration-200 hover:scale-110 ${
            isPlaying ? 'ring-2 ring-white/50' : ''
          }`}>
            {isPlaying ? (
              <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 20 20">
                <rect x="6" y="5" width="3" height="10" rx="1" />
                <rect x="11" y="5" width="3" height="10" rx="1" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-black ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
              </svg>
            )}
          </div>
        </button>

        {/* Trending Badge */}
        {showTrending && (
          <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-brand-primary/90 rounded text-[10px] font-bold text-white">
            🔥
          </div>
        )}

        {/* Duration Badge */}
        <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/70 rounded text-[10px] font-medium text-white">
          {formatDuration(bick.duration_ms)}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        {/* Top: Title, Username & Action Buttons */}
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-white text-sm sm:text-base leading-tight line-clamp-2 group-hover:text-brand-primary transition-colors">
              {bick.title}
            </h3>
          </div>
          
          {/* Share & Save Buttons */}
          <div className="flex flex-col gap-1 flex-shrink-0 -mt-1 -mr-1">
            <button
              type="button"
              onClick={handleShareClick}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors"
              aria-label="Share"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleSaveClick}
              data-favorite-bick={JSON.stringify({
                id: bick.id,
                slug: bick.slug,
                title: bick.title,
                description: bick.description,
                duration_ms: bick.duration_ms,
                play_count: bick.play_count,
                assets: bick.assets?.map(a => ({
                  id: a.id,
                  bick_id: a.bick_id,
                  asset_type: a.asset_type,
                  cdn_url: a.cdn_url,
                  mime_type: a.mime_type,
                  size_bytes: a.size_bytes,
                })) || [],
              })}
              className={`p-1.5 rounded-full transition-colors ${
                isSaved 
                  ? 'text-brand-accent bg-brand-accent/20' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
              aria-label={isSaved ? 'Unsave' : 'Save'}
            >
              <Bookmark className="w-4 h-4" fill={isSaved ? 'currentColor' : 'none'} />
            </button>
          </div>
        </div>

        {/* Tags (if any) */}
        {bick.tags && bick.tags.length > 0 && (
          <div className="mt-2 hidden sm:block">
            <TagDisplay tags={bick.tags} maxVisible={2} size="xs" theme="orange" asSpan />
          </div>
        )}

        {/* Bottom: Stats */}
        <div className="flex items-center gap-3 text-xs text-gray-500">
          {/* Play Count */}
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
            </svg>
            {formatPlayCount(bick.play_count)}
          </span>

          {/* Playing indicator */}
          {isPlaying && (
            <span className="flex items-center gap-1 text-brand-accent">
              <span className="flex gap-0.5">
                <span className="w-0.5 h-2.5 bg-brand-accent rounded-full animate-pulse" />
                <span className="w-0.5 h-2.5 bg-brand-accent rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                <span className="w-0.5 h-2.5 bg-brand-accent rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
              </span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

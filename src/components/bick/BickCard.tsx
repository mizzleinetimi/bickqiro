import Link from 'next/link';
import type { Bick, Tag } from '@/types/database.types';
import { TagDisplay } from '@/components/tags/TagDisplay';

interface BickCardProps {
  bick: Bick & { tags?: Tag[] };
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

export function BickCard({ bick, variant = 'default', showTrending = false }: BickCardProps) {
  const isFeatured = variant === 'featured';
  
  return (
    <Link
      href={`/bick/${bick.slug}-${bick.id}`}
      className={`group block p-5 bg-surface rounded-xl border border-surface-border hover:border-surface-border/80 hover:bg-surface-hover transition-all duration-300 relative overflow-hidden ${
        isFeatured ? 'ring-2 ring-brand-accent/30' : ''
      }`}
    >
      {/* Trending Badge */}
      {showTrending && (
        <div className="absolute top-3 right-3 px-2 py-1 bg-brand-primary/20 rounded-full">
          <span className="text-xs font-bold text-brand-primary">🔥 Trending</span>
        </div>
      )}

      {/* Top Row: Title & Play Button */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <h3 className="font-bold text-white text-lg leading-tight line-clamp-2 group-hover:text-brand-primary transition-colors flex-1">
          {bick.title}
        </h3>

        {/* Play Button (Yellow/Orange Gradient) */}
        <div className="flex-shrink-0 w-11 h-11 rounded-full bg-gradient-to-br from-brand-yellow-from to-brand-yellow-to flex items-center justify-center shadow-lg shadow-brand-accent/20 group-hover:scale-110 group-hover:shadow-brand-accent/40 transition-all duration-300">
          <svg className="w-5 h-5 text-black ml-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
          </svg>
        </div>
      </div>

      {/* Middle: Tags */}
      {bick.tags && bick.tags.length > 0 && (
        <div className="mb-4">
          <TagDisplay tags={bick.tags} maxVisible={3} size="xs" theme="orange" asSpan />
        </div>
      )}

      {/* Bottom: Stats */}
      <div className="flex items-center gap-4 text-xs text-gray-500 font-medium">
        {/* View/Play Count */}
        <span className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          {bick.play_count.toLocaleString()}
        </span>

        {/* Duration */}
        <span className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          </svg>
          {formatDuration(bick.duration_ms)}
        </span>
      </div>
    </Link>
  );
}

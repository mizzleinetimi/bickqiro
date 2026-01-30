import Link from 'next/link';
import type { Bick, Tag } from '@/types/database.types';
import { TagDisplay } from '@/components/tags/TagDisplay';

interface BickCardProps {
  bick: Bick & { tags?: Tag[] };
}

function formatDuration(ms: number | null): string {
  if (!ms) return '0:00';
  const seconds = Math.floor(ms / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function BickCard({ bick }: BickCardProps) {
  return (
    <Link
      href={`/bick/${bick.slug}-${bick.id}`}
      className="group block p-4 bg-[#141414] rounded-xl border border-[#262626] hover:border-[#404040] hover:bg-[#1a1a1a] transition-all"
    >
      {/* Play button overlay area */}
      <div className="relative mb-3">
        <div className="w-full aspect-video bg-[#1a1a1a] rounded-lg flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-[#EF4444] flex items-center justify-center group-hover:bg-[#DC2626] transition-colors">
            <svg className="w-5 h-5 text-white ml-1" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
            </svg>
          </div>
        </div>
      </div>
      
      <h3 className="font-semibold text-white truncate">{bick.title}</h3>
      
      {bick.description && (
        <p className="mt-1 text-sm text-gray-400 line-clamp-2">{bick.description}</p>
      )}
      
      {/* Tags display - max 3 visible */}
      {bick.tags && bick.tags.length > 0 && (
        <div className="mt-3" onClick={(e) => e.stopPropagation()}>
          <TagDisplay tags={bick.tags} maxVisible={3} size="sm" />
        </div>
      )}
      
      <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {bick.play_count.toLocaleString()}
        </span>
        <span>{formatDuration(bick.duration_ms)}</span>
      </div>
    </Link>
  );
}

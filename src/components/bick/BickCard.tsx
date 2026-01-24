import Link from 'next/link';
import type { Bick } from '@/types/database.types';

interface BickCardProps {
  bick: Bick;
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
      className="block p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
    >
      <h3 className="font-semibold text-gray-900 truncate">{bick.title}</h3>
      {bick.description && (
        <p className="mt-1 text-sm text-gray-600 line-clamp-2">{bick.description}</p>
      )}
      <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
        <span>{formatDuration(bick.duration_ms)}</span>
        <span>{bick.play_count.toLocaleString()} plays</span>
      </div>
    </Link>
  );
}

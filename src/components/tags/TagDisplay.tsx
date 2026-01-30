/**
 * TagDisplay Component
 * 
 * Renders tags as clickable links, used on bick cards and detail pages.
 */

import Link from 'next/link';

interface Tag {
  name: string;
  slug: string;
}

interface TagDisplayProps {
  tags: Tag[];
  maxVisible?: number;
  size?: 'sm' | 'md';
  showAll?: boolean;
}

// Tag color palette for variety
const tagColors = [
  'bg-[#3B82F6]/20 text-[#60A5FA] hover:bg-[#3B82F6]/30', // blue
  'bg-[#8B5CF6]/20 text-[#A78BFA] hover:bg-[#8B5CF6]/30', // purple
  'bg-[#EC4899]/20 text-[#F472B6] hover:bg-[#EC4899]/30', // pink
  'bg-[#10B981]/20 text-[#34D399] hover:bg-[#10B981]/30', // green
  'bg-[#F59E0B]/20 text-[#FBBF24] hover:bg-[#F59E0B]/30', // amber
  'bg-[#EF4444]/20 text-[#F87171] hover:bg-[#EF4444]/30', // red
];

function getTagColor(index: number): string {
  return tagColors[index % tagColors.length];
}

export function TagDisplay({
  tags,
  maxVisible = 3,
  size = 'sm',
  showAll = false,
}: TagDisplayProps) {
  if (!tags || tags.length === 0) {
    return null;
  }

  const visibleTags = showAll ? tags : tags.slice(0, maxVisible);
  const remainingCount = showAll ? 0 : Math.max(0, tags.length - maxVisible);

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {visibleTags.map((tag, index) => (
        <Link
          key={tag.slug}
          href={`/tag/${tag.slug}`}
          className={`${sizeClasses[size]} ${getTagColor(index)} rounded-full transition-colors`}
        >
          {tag.name}
        </Link>
      ))}
      {remainingCount > 0 && (
        <span className={`${sizeClasses[size]} bg-[#2a2a2a] text-[#666666] rounded-full`}>
          +{remainingCount}
        </span>
      )}
    </div>
  );
}

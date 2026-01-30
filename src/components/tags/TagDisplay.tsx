/**
 * TagDisplay Component
 * 
 * Renders tags as clickable links or spans, used on bick cards and detail pages.
 * Use asSpan={true} when inside another link to avoid nested <a> tags.
 */

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Tag {
  name: string;
  slug: string;
}

interface TagDisplayProps {
  tags: Tag[];
  maxVisible?: number;
  size?: 'xs' | 'sm' | 'md';
  showAll?: boolean;
  theme?: 'default' | 'orange';
  /** Render as spans instead of links (use when inside a parent Link) */
  asSpan?: boolean;
}

// Tag color palette for variety
const defaultColors = [
  'bg-white/5 text-gray-300 hover:bg-white/10',
];

const orangeColors = [
  'bg-brand-primary/10 text-brand-primary border border-brand-primary/20 hover:bg-brand-primary/20',
  'bg-brand-accent/10 text-brand-accent border border-brand-accent/20 hover:bg-brand-accent/20',
];

function getTagColor(index: number, theme: 'default' | 'orange'): string {
  if (theme === 'orange') {
    return orangeColors[index % orangeColors.length];
  }
  return defaultColors[index % defaultColors.length];
}

export function TagDisplay({
  tags,
  maxVisible = 3,
  size = 'sm',
  showAll = false,
  theme = 'default',
  asSpan = false,
}: TagDisplayProps) {
  const router = useRouter();

  if (!tags || tags.length === 0) {
    return null;
  }

  const visibleTags = showAll ? tags : tags.slice(0, maxVisible);
  const remainingCount = showAll ? 0 : Math.max(0, tags.length - maxVisible);

  const sizeClasses = {
    xs: 'px-2 py-1 text-[10px] font-bold rounded-md',
    sm: 'px-2 py-1 text-xs font-medium rounded-full',
    md: 'px-3 py-1.5 text-sm font-medium rounded-full',
  };

  const handleTagClick = (e: React.MouseEvent, slug: string) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/tag/${slug}`);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {visibleTags.map((tag, index) => 
        asSpan ? (
          <span
            key={tag.slug}
            onClick={(e) => handleTagClick(e, tag.slug)}
            className={`${sizeClasses[size]} ${getTagColor(index, theme)} transition-colors cursor-pointer`}
          >
            #{tag.name}
          </span>
        ) : (
          <Link
            key={tag.slug}
            href={`/tag/${tag.slug}`}
            className={`${sizeClasses[size]} ${getTagColor(index, theme)} transition-colors`}
          >
            #{tag.name}
          </Link>
        )
      )}
      {remainingCount > 0 && (
        <span className={`${sizeClasses[size]} bg-surface-border text-gray-500 rounded-md`}>
          +{remainingCount}
        </span>
      )}
    </div>
  );
}

/**
 * TagDisplay Component
 * 
 * Renders tags as clickable links, used on bick cards and detail pages.
 * 
 * @requirements 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3
 */

import Link from 'next/link';

interface Tag {
  name: string;
  slug: string;
}

interface TagDisplayProps {
  /** Tags to display */
  tags: Tag[];
  /** Maximum tags to show (rest shown as count) */
  maxVisible?: number;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Show all tags (for detail page) */
  showAll?: boolean;
}

export function TagDisplay({
  tags,
  maxVisible = 3,
  size = 'sm',
  showAll = false,
}: TagDisplayProps) {
  // Return nothing for empty tags array
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
      {visibleTags.map((tag) => (
        <Link
          key={tag.slug}
          href={`/tag/${tag.slug}`}
          className={`${sizeClasses[size]} bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors`}
        >
          {tag.name}
        </Link>
      ))}
      {remainingCount > 0 && (
        <span className={`${sizeClasses[size]} bg-gray-50 text-gray-500 rounded-full`}>
          +{remainingCount} more
        </span>
      )}
    </div>
  );
}

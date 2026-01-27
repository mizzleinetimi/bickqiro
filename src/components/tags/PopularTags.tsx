/**
 * PopularTags Component
 * 
 * Displays a grid of popular tags for discovery.
 * Server component that fetches popular tags.
 * 
 * @requirements 6.1, 6.2, 6.3, 6.4
 */

import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

interface PopularTagsProps {
  /** Maximum number of tags to display */
  limit?: number;
  /** Title for the section */
  title?: string;
}

interface PopularTag {
  id: string;
  name: string;
  slug: string;
  bick_count: number;
}

export async function PopularTags({
  limit = 12,
  title = 'Popular Tags',
}: PopularTagsProps) {
  const supabase = await createClient();
  
  // Fetch popular tags using the RPC function
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)('get_popular_tags', {
    result_limit: limit,
  });
  
  if (error) {
    console.error('Failed to fetch popular tags:', error);
    return null;
  }
  
  const tags = (data || []) as PopularTag[];
  
  // Return nothing when no tags with count > 0
  if (tags.length === 0) {
    return null;
  }
  
  return (
    <section className="py-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">{title}</h2>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <Link
            key={tag.id}
            href={`/tag/${tag.slug}`}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-sm transition-colors flex items-center gap-1.5"
          >
            <span>{tag.name}</span>
            <span className="text-xs text-gray-500">({tag.bick_count})</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/**
 * PopularTags Component
 * 
 * Displays a grid of popular tags for discovery.
 */

import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

interface PopularTagsProps {
  limit?: number;
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
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)('get_popular_tags', {
    result_limit: limit,
  });
  
  if (error) {
    console.error('Failed to fetch popular tags:', error);
    return null;
  }
  
  const tags = (data || []) as PopularTag[];
  
  if (tags.length === 0) {
    return null;
  }
  
  return (
    <section className="py-8 border-t border-[#262626]">
      <h2 className="text-lg font-semibold text-white mb-4">{title}</h2>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <Link
            key={tag.id}
            href={`/tag/${tag.slug}`}
            className="px-4 py-2 bg-[#F97316]/20 hover:bg-[#F97316]/30 text-[#F97316] rounded-full text-sm font-medium transition-colors flex items-center gap-2"
          >
            <span>{tag.name}</span>
            <span className="text-xs opacity-70">({tag.bick_count})</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

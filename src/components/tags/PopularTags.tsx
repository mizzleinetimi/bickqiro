/**
 * PopularTags Component
 * 
 * Displays a grid of popular tags for discovery.
 * Client component that fetches tags via API.
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

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

export function PopularTags({
  limit = 12,
  title = 'Popular Tags',
}: PopularTagsProps) {
  const [tags, setTags] = useState<PopularTag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTags() {
      try {
        const response = await fetch(`/api/tags/popular?limit=${limit}`);
        if (response.ok) {
          const data = await response.json();
          setTags(data.tags || []);
        }
      } catch (error) {
        console.error('Failed to fetch popular tags:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchTags();
  }, [limit]);

  if (loading) {
    return (
      <section className="py-8 border-t border-[#262626]">
        <h2 className="text-lg font-semibold text-white mb-4">{title}</h2>
        <div className="flex flex-wrap gap-2">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-10 w-24 bg-surface/50 rounded-full animate-pulse"
            />
          ))}
        </div>
      </section>
    );
  }

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

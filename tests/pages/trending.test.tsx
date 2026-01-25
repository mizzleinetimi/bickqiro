/**
 * Trending page integration tests
 * **Validates: Requirements 4.1, 4.3, 4.4**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';

// Mock the getTrendingBicksPaginated function
vi.mock('../../src/lib/supabase/queries', () => ({
  getTrendingBicksPaginated: vi.fn().mockResolvedValue({
    bicks: [],
    nextCursor: null,
  }),
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('Trending Page', () => {
  it('has correct title in metadata', async () => {
    const { metadata } = await import('../../src/app/trending/page');
    
    expect(metadata.title).toBe('Trending | Bickqr');
  });

  it('has description in metadata', async () => {
    const { metadata } = await import('../../src/app/trending/page');
    
    expect(metadata.description).toBeDefined();
    expect(typeof metadata.description).toBe('string');
  });

  it('does not have noindex (should be indexed)', async () => {
    const { metadata } = await import('../../src/app/trending/page');
    
    // Trending page should be indexed, so robots should not be 'noindex'
    expect(metadata.robots).not.toBe('noindex,follow');
  });
});

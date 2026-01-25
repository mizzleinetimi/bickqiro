/**
 * Search page integration tests
 * **Validates: Requirements 2.1, 2.2, 2.5**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';

// Mock the searchBicks function
vi.mock('../../src/lib/supabase/queries', () => ({
  searchBicks: vi.fn().mockResolvedValue({
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

describe('Search Page', () => {
  it('has noindex meta tag in metadata export', async () => {
    // Import the metadata from the page
    const { metadata } = await import('../../src/app/search/page');
    
    expect(metadata.robots).toBe('noindex,follow');
  });

  it('has correct title in metadata', async () => {
    const { metadata } = await import('../../src/app/search/page');
    
    expect(metadata.title).toBe('Search | Bickqr');
  });

  it('has description in metadata', async () => {
    const { metadata } = await import('../../src/app/search/page');
    
    expect(metadata.description).toBeDefined();
    expect(typeof metadata.description).toBe('string');
  });
});

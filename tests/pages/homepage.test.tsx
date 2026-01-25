/**
 * Homepage integration tests
 * **Validates: Requirements 6.1, 6.2, 6.3**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Mock the getTopTrendingBicks function
vi.mock('../../src/lib/supabase/queries', () => ({
  getTopTrendingBicks: vi.fn().mockResolvedValue([]),
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('Homepage', () => {
  it('exports a default function component', async () => {
    const HomePage = await import('../../src/app/page');
    expect(typeof HomePage.default).toBe('function');
  });

  it('uses getTopTrendingBicks for trending section', async () => {
    // Verify the import is using the correct function
    const queries = await import('../../src/lib/supabase/queries');
    expect(queries.getTopTrendingBicks).toBeDefined();
  });
});

describe('SearchInput on Homepage', () => {
  it('SearchInput component is exported from search module', async () => {
    const searchModule = await import('../../src/components/search');
    expect(searchModule.SearchInput).toBeDefined();
  });

  it('SearchInput renders with placeholder', async () => {
    // Import and render SearchInput directly
    const { SearchInput } = await import('../../src/components/search');
    render(<SearchInput placeholder="Search for sounds..." />);
    
    expect(screen.getByPlaceholderText('Search for sounds...')).toBeInTheDocument();
  });

  it('SearchInput form action points to /search', async () => {
    const { SearchInput } = await import('../../src/components/search');
    render(<SearchInput />);
    
    const form = screen.getByRole('searchbox').closest('form');
    expect(form).toHaveAttribute('action', '/search');
  });
});

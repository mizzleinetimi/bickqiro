/**
 * Search component tests
 * Tests for SearchInput and SearchResults components
 * **Validates: Requirements 2.1, 2.3, 2.4**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { SearchInput } from '../../src/components/search/SearchInput';
import { SearchResults } from '../../src/components/search/SearchResults';
import type { BickWithAssets } from '../../src/types/database.types';

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('SearchInput', () => {
  it('renders with placeholder text', () => {
    render(<SearchInput />);
    expect(screen.getByPlaceholderText('Search sounds...')).toBeInTheDocument();
  });

  it('renders with custom placeholder', () => {
    render(<SearchInput placeholder="Find audio clips..." />);
    expect(screen.getByPlaceholderText('Find audio clips...')).toBeInTheDocument();
  });

  it('renders with default value', () => {
    render(<SearchInput defaultValue="test query" />);
    expect(screen.getByDisplayValue('test query')).toBeInTheDocument();
  });

  it('calls onSearch callback on form submit', () => {
    const onSearch = vi.fn();
    render(<SearchInput onSearch={onSearch} defaultValue="my search" />);
    
    const form = screen.getByRole('searchbox').closest('form')!;
    fireEvent.submit(form);
    
    expect(onSearch).toHaveBeenCalledWith('my search');
  });

  it('has search icon', () => {
    render(<SearchInput />);
    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('form action points to /search', () => {
    render(<SearchInput />);
    const form = screen.getByRole('searchbox').closest('form')!;
    expect(form).toHaveAttribute('action', '/search');
  });
});

describe('SearchResults', () => {
  const mockBicks: BickWithAssets[] = [
    {
      id: 'test-id-1',
      slug: 'test-bick-1',
      title: 'Test Bick One',
      description: 'A test description',
      status: 'live',
      duration_ms: 5000,
      original_duration_ms: 5000,
      play_count: 100,
      share_count: 10,
      owner_id: null,
      original_filename: null,
      source_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      published_at: new Date().toISOString(),
      assets: [],
    },
    {
      id: 'test-id-2',
      slug: 'test-bick-2',
      title: 'Test Bick Two',
      description: null,
      status: 'live',
      duration_ms: 3000,
      original_duration_ms: 3000,
      play_count: 50,
      share_count: 5,
      owner_id: null,
      original_filename: null,
      source_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      published_at: new Date().toISOString(),
      assets: [],
    },
  ];

  it('renders bick cards for each result', () => {
    render(<SearchResults initialBicks={mockBicks} initialCursor={null} query="test" />);
    
    expect(screen.getByText('Test Bick One')).toBeInTheDocument();
    expect(screen.getByText('Test Bick Two')).toBeInTheDocument();
  });

  it('shows empty state when no results', () => {
    render(<SearchResults initialBicks={[]} initialCursor={null} query="nonexistent" />);
    
    expect(screen.getByText(/No results found/)).toBeInTheDocument();
    expect(screen.getByText(/nonexistent/)).toBeInTheDocument();
  });

  it('shows Load More button when cursor exists', () => {
    render(<SearchResults initialBicks={mockBicks} initialCursor="next-cursor" query="test" />);
    
    expect(screen.getByText('Load More')).toBeInTheDocument();
  });

  it('hides Load More button when no cursor', () => {
    render(<SearchResults initialBicks={mockBicks} initialCursor={null} query="test" />);
    
    expect(screen.queryByText('Load More')).not.toBeInTheDocument();
  });

  it('displays bick descriptions when available', () => {
    render(<SearchResults initialBicks={mockBicks} initialCursor={null} query="test" />);
    
    expect(screen.getByText('A test description')).toBeInTheDocument();
  });
});

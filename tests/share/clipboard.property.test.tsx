/**
 * @vitest-environment jsdom
 * 
 * Property-based tests for clipboard URL functionality
 * 
 * Feature: play-share-tracking
 * 
 * **Property 5: Clipboard receives correct URL**
 * *For any* bick, when the copy link button is clicked, the clipboard SHALL contain
 * the exact canonical URL of that bick.
 * 
 * **Validates: Requirements 3.2**
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { CopyLinkButton } from '@/components/share/CopyLinkButton';

// ============================================================================
// CUSTOM ARBITRARIES
// ============================================================================

/**
 * Generates valid bick IDs (UUIDs)
 */
const bickIdArbitrary = fc.uuid();

/**
 * Generates valid bick slugs (URL-safe strings)
 */
const bickSlugArbitrary = fc.stringMatching(/^[a-z0-9][a-z0-9-]{0,48}[a-z0-9]$/)
  .filter(s => s.length >= 2 && !s.includes('--'));

/**
 * Generates valid base URLs
 */
const baseUrlArbitrary = fc.constantFrom(
  'https://bickqr.com',
  'https://www.bickqr.com',
  'https://staging.bickqr.com',
  'https://localhost:3000',
  'http://localhost:3000',
);

/**
 * Generates canonical bick URLs in the format: ${baseUrl}/bick/${slug}-${id}
 */
const canonicalUrlArbitrary = fc.tuple(
  baseUrlArbitrary,
  bickSlugArbitrary,
  bickIdArbitrary
).map(([baseUrl, slug, id]) => `${baseUrl}/bick/${slug}-${id}`);

/**
 * Generates URLs with special characters that need proper handling
 */
const specialCharUrlArbitrary = fc.constantFrom(
  'https://bickqr.com/bick/test-sound-123e4567-e89b-12d3-a456-426614174000',
  'https://bickqr.com/bick/cool-beat-abc12345-def6-7890-ghij-klmnopqrstuv',
  'https://bickqr.com/bick/my-first-bick-00000000-0000-0000-0000-000000000000',
  'https://bickqr.com/bick/a1-ffffffff-ffff-ffff-ffff-ffffffffffff',
);

/**
 * Generates URLs with various path formats
 */
const pathVariationUrlArbitrary = fc.tuple(
  baseUrlArbitrary,
  fc.constantFrom(
    'simple-123e4567-e89b-12d3-a456-426614174000',
    'with-numbers-123-abc12345-def6-7890-ghij-klmnopqrstuv',
    'long-slug-name-here-00000000-0000-0000-0000-000000000000',
    'a-b-ffffffff-ffff-ffff-ffff-ffffffffffff',
  )
).map(([baseUrl, path]) => `${baseUrl}/bick/${path}`);

// ============================================================================
// TEST SETUP
// ============================================================================

let mockWriteText: ReturnType<typeof vi.fn>;
let capturedClipboardContent: string | null = null;

beforeEach(() => {
  vi.useFakeTimers();
  
  // Reset captured content
  capturedClipboardContent = null;
  
  // Create mock that captures the written content
  mockWriteText = vi.fn().mockImplementation((text: string) => {
    capturedClipboardContent = text;
    return Promise.resolve();
  });
  
  // Mock clipboard API
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: mockWriteText },
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

// ============================================================================
// PROPERTY TESTS
// ============================================================================

/**
 * Property 5: Clipboard receives correct URL
 * 
 * *For any* bick, when the copy link button is clicked, the clipboard SHALL contain
 * the exact canonical URL of that bick.
 * 
 * **Validates: Requirements 3.2**
 */
describe('Property 5: Clipboard receives correct URL', () => {
  /**
   * The clipboard should receive the exact URL that was passed to the component
   */
  it('clipboard receives exact URL passed to CopyLinkButton', async () => {
    await fc.assert(
      fc.asyncProperty(
        canonicalUrlArbitrary,
        async (url) => {
          // Reset state
          capturedClipboardContent = null;
          mockWriteText.mockClear();
          
          // Render component with the URL
          const { unmount } = render(<CopyLinkButton url={url} />);
          
          // Click the copy button
          const button = screen.getByRole('button', { name: /copy link/i });
          await act(async () => {
            fireEvent.click(button);
          });
          
          // Verify clipboard received exact URL
          expect(mockWriteText).toHaveBeenCalledTimes(1);
          expect(mockWriteText).toHaveBeenCalledWith(url);
          expect(capturedClipboardContent).toBe(url);
          
          // Cleanup
          unmount();
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * The clipboard content should be identical to the input URL (no modifications)
   */
  it('clipboard content is identical to input URL (no encoding/modification)', async () => {
    await fc.assert(
      fc.asyncProperty(
        specialCharUrlArbitrary,
        async (url) => {
          capturedClipboardContent = null;
          mockWriteText.mockClear();
          
          const { unmount } = render(<CopyLinkButton url={url} />);
          
          const button = screen.getByRole('button', { name: /copy link/i });
          await act(async () => {
            fireEvent.click(button);
          });
          
          // The clipboard should contain the exact same string
          expect(capturedClipboardContent).toBe(url);
          expect(capturedClipboardContent).toStrictEqual(url);
          
          unmount();
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Multiple clicks should always copy the same URL
   */
  it('multiple clicks always copy the same URL', async () => {
    await fc.assert(
      fc.asyncProperty(
        canonicalUrlArbitrary,
        fc.integer({ min: 2, max: 5 }),
        async (url, clickCount) => {
          mockWriteText.mockClear();
          
          const { unmount } = render(<CopyLinkButton url={url} />);
          
          const button = screen.getByRole('button', { name: /copy link/i });
          
          // Click multiple times
          for (let i = 0; i < clickCount; i++) {
            await act(async () => {
              fireEvent.click(button);
            });
            
            // Advance timers to reset button state
            await act(async () => {
              vi.advanceTimersByTime(2100);
            });
          }
          
          // All calls should have the same URL
          expect(mockWriteText).toHaveBeenCalledTimes(clickCount);
          mockWriteText.mock.calls.forEach((call) => {
            expect(call[0]).toBe(url);
          });
          
          unmount();
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * URL with various path formats should be copied exactly
   */
  it('URLs with various path formats are copied exactly', async () => {
    await fc.assert(
      fc.asyncProperty(
        pathVariationUrlArbitrary,
        async (url) => {
          capturedClipboardContent = null;
          mockWriteText.mockClear();
          
          const { unmount } = render(<CopyLinkButton url={url} />);
          
          const button = screen.getByRole('button', { name: /copy link/i });
          await act(async () => {
            fireEvent.click(button);
          });
          
          expect(capturedClipboardContent).toBe(url);
          
          unmount();
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * The URL should be a valid URL after being copied
   */
  it('copied URL is a valid URL', async () => {
    await fc.assert(
      fc.asyncProperty(
        canonicalUrlArbitrary,
        async (url) => {
          capturedClipboardContent = null;
          mockWriteText.mockClear();
          
          const { unmount } = render(<CopyLinkButton url={url} />);
          
          const button = screen.getByRole('button', { name: /copy link/i });
          await act(async () => {
            fireEvent.click(button);
          });
          
          // The copied content should be parseable as a URL
          expect(() => new URL(capturedClipboardContent!)).not.toThrow();
          
          // The parsed URL should have the correct structure
          const parsedUrl = new URL(capturedClipboardContent!);
          expect(parsedUrl.pathname).toMatch(/^\/bick\/.+/);
          
          unmount();
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * The canonical URL format should be preserved
   */
  it('canonical URL format is preserved (baseUrl/bick/slug-id)', async () => {
    await fc.assert(
      fc.asyncProperty(
        baseUrlArbitrary,
        bickSlugArbitrary,
        bickIdArbitrary,
        async (baseUrl, slug, id) => {
          const canonicalUrl = `${baseUrl}/bick/${slug}-${id}`;
          capturedClipboardContent = null;
          mockWriteText.mockClear();
          
          const { unmount } = render(<CopyLinkButton url={canonicalUrl} />);
          
          const button = screen.getByRole('button', { name: /copy link/i });
          await act(async () => {
            fireEvent.click(button);
          });
          
          // Verify the URL structure is preserved
          expect(capturedClipboardContent).toBe(canonicalUrl);
          
          const parsedUrl = new URL(capturedClipboardContent!);
          expect(parsedUrl.origin).toBe(baseUrl);
          expect(parsedUrl.pathname).toBe(`/bick/${slug}-${id}`);
          
          unmount();
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// EDGE CASE TESTS
// ============================================================================

describe('Clipboard URL - Edge cases', () => {
  it('handles URL with trailing slash', async () => {
    const url = 'https://bickqr.com/bick/test-123e4567-e89b-12d3-a456-426614174000/';
    
    render(<CopyLinkButton url={url} />);
    
    const button = screen.getByRole('button', { name: /copy link/i });
    await act(async () => {
      fireEvent.click(button);
    });
    
    expect(capturedClipboardContent).toBe(url);
  });

  it('handles URL with query parameters', async () => {
    const url = 'https://bickqr.com/bick/test-123e4567-e89b-12d3-a456-426614174000?ref=share';
    
    render(<CopyLinkButton url={url} />);
    
    const button = screen.getByRole('button', { name: /copy link/i });
    await act(async () => {
      fireEvent.click(button);
    });
    
    expect(capturedClipboardContent).toBe(url);
  });

  it('handles URL with hash fragment', async () => {
    const url = 'https://bickqr.com/bick/test-123e4567-e89b-12d3-a456-426614174000#player';
    
    render(<CopyLinkButton url={url} />);
    
    const button = screen.getByRole('button', { name: /copy link/i });
    await act(async () => {
      fireEvent.click(button);
    });
    
    expect(capturedClipboardContent).toBe(url);
  });

  it('handles very long slug', async () => {
    const longSlug = 'a'.repeat(50);
    const url = `https://bickqr.com/bick/${longSlug}-123e4567-e89b-12d3-a456-426614174000`;
    
    render(<CopyLinkButton url={url} />);
    
    const button = screen.getByRole('button', { name: /copy link/i });
    await act(async () => {
      fireEvent.click(button);
    });
    
    expect(capturedClipboardContent).toBe(url);
  });

  it('handles minimum length slug', async () => {
    const url = 'https://bickqr.com/bick/ab-123e4567-e89b-12d3-a456-426614174000';
    
    render(<CopyLinkButton url={url} />);
    
    const button = screen.getByRole('button', { name: /copy link/i });
    await act(async () => {
      fireEvent.click(button);
    });
    
    expect(capturedClipboardContent).toBe(url);
  });

  it('handles URL with port number', async () => {
    const url = 'https://localhost:3000/bick/test-123e4567-e89b-12d3-a456-426614174000';
    
    render(<CopyLinkButton url={url} />);
    
    const button = screen.getByRole('button', { name: /copy link/i });
    await act(async () => {
      fireEvent.click(button);
    });
    
    expect(capturedClipboardContent).toBe(url);
  });

  it('handles HTTP URL (development)', async () => {
    const url = 'http://localhost:3000/bick/test-123e4567-e89b-12d3-a456-426614174000';
    
    render(<CopyLinkButton url={url} />);
    
    const button = screen.getByRole('button', { name: /copy link/i });
    await act(async () => {
      fireEvent.click(button);
    });
    
    expect(capturedClipboardContent).toBe(url);
  });
});

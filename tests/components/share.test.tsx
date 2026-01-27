/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { CopyLinkButton } from '@/components/share/CopyLinkButton';
import { TwitterShareButton, generateTwitterShareUrl } from '@/components/share/TwitterShareButton';
import { FacebookShareButton, generateFacebookShareUrl } from '@/components/share/FacebookShareButton';
import { SharePanel } from '@/components/share/SharePanel';

// Mock the useTrackingDebounce hook
const mockTrack = vi.fn();
vi.mock('@/hooks/useTrackingDebounce', () => ({
  useTrackingDebounce: vi.fn(() => ({
    track: mockTrack,
    isTracking: false,
  })),
}));

import { useTrackingDebounce } from '@/hooks/useTrackingDebounce';

// Mock window.open
const mockWindowOpen = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  
  // Mock window.open
  Object.defineProperty(window, 'open', {
    configurable: true,
    value: mockWindowOpen,
  });
  
  // Mock window.screen for popup positioning
  Object.defineProperty(window, 'screen', {
    configurable: true,
    value: {
      width: 1920,
      height: 1080,
    },
  });
});

afterEach(() => {
  vi.useRealTimers();
});

// ============================================================================
// CopyLinkButton Tests
// ============================================================================

describe('CopyLinkButton', () => {
  describe('rendering', () => {
    it('renders with correct ARIA label', () => {
      render(<CopyLinkButton url="https://bickqr.com/bick/test-123" />);
      
      const button = screen.getByRole('button', { name: /copy link to clipboard/i });
      expect(button).toBeInTheDocument();
    });

    it('renders with "Copy Link" text initially', () => {
      render(<CopyLinkButton url="https://bickqr.com/bick/test-123" />);
      
      expect(screen.getByText('Copy Link')).toBeInTheDocument();
    });

    it('has aria-live attribute for accessibility', () => {
      render(<CopyLinkButton url="https://bickqr.com/bick/test-123" />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-live', 'polite');
    });

    it('applies custom className', () => {
      render(<CopyLinkButton url="https://bickqr.com/bick/test-123" className="custom-class" />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });
  });

  describe('copy functionality', () => {
    it('copies URL to clipboard when clicked', async () => {
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: mockWriteText },
      });

      render(<CopyLinkButton url="https://bickqr.com/bick/test-123" />);
      
      const button = screen.getByRole('button');
      await act(async () => {
        fireEvent.click(button);
      });
      
      expect(mockWriteText).toHaveBeenCalledWith('https://bickqr.com/bick/test-123');
    });

    it('shows "Copied!" feedback after successful copy', async () => {
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: mockWriteText },
      });

      render(<CopyLinkButton url="https://bickqr.com/bick/test-123" />);
      
      const button = screen.getByRole('button');
      await act(async () => {
        fireEvent.click(button);
      });
      
      expect(screen.getByText('Copied!')).toBeInTheDocument();
    });

    it('updates ARIA label after successful copy', async () => {
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: mockWriteText },
      });

      render(<CopyLinkButton url="https://bickqr.com/bick/test-123" />);
      
      const button = screen.getByRole('button');
      await act(async () => {
        fireEvent.click(button);
      });
      
      expect(button).toHaveAttribute('aria-label', 'Link copied to clipboard');
    });

    it('resets to initial state after 2 seconds', async () => {
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: mockWriteText },
      });

      render(<CopyLinkButton url="https://bickqr.com/bick/test-123" />);
      
      const button = screen.getByRole('button');
      await act(async () => {
        fireEvent.click(button);
      });
      
      expect(screen.getByText('Copied!')).toBeInTheDocument();
      
      // Fast-forward 2 seconds
      await act(async () => {
        vi.advanceTimersByTime(2000);
      });
      
      expect(screen.getByText('Copy Link')).toBeInTheDocument();
    });

    it('calls onCopy callback when copy succeeds', async () => {
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: mockWriteText },
      });
      
      const onCopy = vi.fn();
      render(<CopyLinkButton url="https://bickqr.com/bick/test-123" onCopy={onCopy} />);
      
      const button = screen.getByRole('button');
      await act(async () => {
        fireEvent.click(button);
      });
      
      expect(onCopy).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling', () => {
    it('shows error message when clipboard access fails', async () => {
      const mockWriteText = vi.fn().mockRejectedValue(new Error('Clipboard access denied'));
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: mockWriteText },
      });

      render(<CopyLinkButton url="https://bickqr.com/bick/test-123" />);
      
      const button = screen.getByRole('button');
      await act(async () => {
        fireEvent.click(button);
      });
      
      expect(screen.getByText('Copy failed')).toBeInTheDocument();
    });

    it('handles missing clipboard API gracefully', async () => {
      // Remove clipboard API
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: undefined,
      });

      render(<CopyLinkButton url="https://bickqr.com/bick/test-123" />);
      
      const button = screen.getByRole('button');
      await act(async () => {
        fireEvent.click(button);
      });
      
      expect(screen.getByText('Copy failed')).toBeInTheDocument();
    });

    it('resets error state after 2 seconds', async () => {
      const mockWriteText = vi.fn().mockRejectedValue(new Error('Clipboard access denied'));
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: mockWriteText },
      });

      render(<CopyLinkButton url="https://bickqr.com/bick/test-123" />);
      
      const button = screen.getByRole('button');
      await act(async () => {
        fireEvent.click(button);
      });
      
      expect(screen.getByText('Copy failed')).toBeInTheDocument();
      
      // Fast-forward 2 seconds
      await act(async () => {
        vi.advanceTimersByTime(2000);
      });
      
      expect(screen.getByText('Copy Link')).toBeInTheDocument();
    });

    it('does not call onCopy callback when copy fails', async () => {
      const mockWriteText = vi.fn().mockRejectedValue(new Error('Clipboard access denied'));
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: mockWriteText },
      });
      
      const onCopy = vi.fn();
      render(<CopyLinkButton url="https://bickqr.com/bick/test-123" onCopy={onCopy} />);
      
      const button = screen.getByRole('button');
      await act(async () => {
        fireEvent.click(button);
      });
      
      expect(onCopy).not.toHaveBeenCalled();
    });
  });
});

// ============================================================================
// TwitterShareButton Tests
// ============================================================================

describe('TwitterShareButton', () => {
  describe('rendering', () => {
    it('renders with correct ARIA label', () => {
      render(<TwitterShareButton url="https://bickqr.com/bick/test-123" title="Test Bick" />);
      
      const button = screen.getByRole('button', { name: /share on twitter/i });
      expect(button).toBeInTheDocument();
    });

    it('renders with "Tweet" text', () => {
      render(<TwitterShareButton url="https://bickqr.com/bick/test-123" title="Test Bick" />);
      
      expect(screen.getByText('Tweet')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(
        <TwitterShareButton 
          url="https://bickqr.com/bick/test-123" 
          title="Test Bick" 
          className="custom-class" 
        />
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });
  });

  describe('share functionality', () => {
    it('opens Twitter share dialog in popup when clicked', () => {
      mockWindowOpen.mockReturnValue({ closed: false });
      
      render(<TwitterShareButton url="https://bickqr.com/bick/test-123" title="Test Bick" />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(mockWindowOpen).toHaveBeenCalled();
      const callArgs = mockWindowOpen.mock.calls[0];
      expect(callArgs[0]).toContain('https://twitter.com/intent/tweet');
      expect(callArgs[1]).toBe('twitter-share');
    });

    it('generates correct Twitter share URL', () => {
      const url = 'https://bickqr.com/bick/test-123';
      const title = 'Test Bick';
      const shareUrl = generateTwitterShareUrl(url, title);
      
      expect(shareUrl).toContain('https://twitter.com/intent/tweet');
      expect(shareUrl).toContain('url=');
      expect(shareUrl).toContain('text=');
      
      const urlObj = new URL(shareUrl);
      expect(urlObj.searchParams.get('url')).toBe(url);
      expect(urlObj.searchParams.get('text')).toBe(title);
    });

    it('falls back to new tab if popup is blocked', () => {
      mockWindowOpen.mockReturnValue(null);
      
      render(<TwitterShareButton url="https://bickqr.com/bick/test-123" title="Test Bick" />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      // Should be called twice - once for popup, once for fallback
      expect(mockWindowOpen).toHaveBeenCalledTimes(2);
      const fallbackCall = mockWindowOpen.mock.calls[1];
      expect(fallbackCall[1]).toBe('_blank');
    });

    it('calls onShare callback when share is triggered', () => {
      mockWindowOpen.mockReturnValue({ closed: false });
      const onShare = vi.fn();
      
      render(
        <TwitterShareButton 
          url="https://bickqr.com/bick/test-123" 
          title="Test Bick" 
          onShare={onShare}
        />
      );
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(onShare).toHaveBeenCalledTimes(1);
    });
  });
});

// ============================================================================
// FacebookShareButton Tests
// ============================================================================

describe('FacebookShareButton', () => {
  describe('rendering', () => {
    it('renders with correct ARIA label', () => {
      render(<FacebookShareButton url="https://bickqr.com/bick/test-123" />);
      
      const button = screen.getByRole('button', { name: /share on facebook/i });
      expect(button).toBeInTheDocument();
    });

    it('renders with "Share" text', () => {
      render(<FacebookShareButton url="https://bickqr.com/bick/test-123" />);
      
      expect(screen.getByText('Share')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(
        <FacebookShareButton 
          url="https://bickqr.com/bick/test-123" 
          className="custom-class" 
        />
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });
  });

  describe('share functionality', () => {
    it('opens Facebook share dialog in popup when clicked', () => {
      mockWindowOpen.mockReturnValue({ closed: false });
      
      render(<FacebookShareButton url="https://bickqr.com/bick/test-123" />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(mockWindowOpen).toHaveBeenCalled();
      const callArgs = mockWindowOpen.mock.calls[0];
      expect(callArgs[0]).toContain('https://www.facebook.com/sharer/sharer.php');
      expect(callArgs[1]).toBe('facebook-share');
    });

    it('generates correct Facebook share URL', () => {
      const url = 'https://bickqr.com/bick/test-123';
      const shareUrl = generateFacebookShareUrl(url);
      
      expect(shareUrl).toContain('https://www.facebook.com/sharer/sharer.php');
      expect(shareUrl).toContain('u=');
      
      const urlObj = new URL(shareUrl);
      expect(urlObj.searchParams.get('u')).toBe(url);
    });

    it('falls back to new tab if popup is blocked', () => {
      mockWindowOpen.mockReturnValue(null);
      
      render(<FacebookShareButton url="https://bickqr.com/bick/test-123" />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      // Should be called twice - once for popup, once for fallback
      expect(mockWindowOpen).toHaveBeenCalledTimes(2);
      const fallbackCall = mockWindowOpen.mock.calls[1];
      expect(fallbackCall[1]).toBe('_blank');
    });

    it('calls onShare callback when share is triggered', () => {
      mockWindowOpen.mockReturnValue({ closed: false });
      const onShare = vi.fn();
      
      render(
        <FacebookShareButton 
          url="https://bickqr.com/bick/test-123" 
          onShare={onShare}
        />
      );
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(onShare).toHaveBeenCalledTimes(1);
    });
  });
});

// ============================================================================
// SharePanel Tests
// ============================================================================

describe('SharePanel', () => {
  describe('rendering', () => {
    it('renders all share buttons', () => {
      render(
        <SharePanel 
          bickId="test-123" 
          bickUrl="https://bickqr.com/bick/test-123" 
          bickTitle="Test Bick"
        />
      );
      
      expect(screen.getByRole('button', { name: /copy link/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /share on twitter/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /share on facebook/i })).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <SharePanel 
          bickId="test-123" 
          bickUrl="https://bickqr.com/bick/test-123" 
          bickTitle="Test Bick"
          className="custom-class"
        />
      );
      
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('tracking integration', () => {
    it('initializes tracking hook with correct parameters', () => {
      render(
        <SharePanel 
          bickId="test-123" 
          bickUrl="https://bickqr.com/bick/test-123" 
          bickTitle="Test Bick"
        />
      );
      
      expect(useTrackingDebounce).toHaveBeenCalledWith({
        bickId: 'test-123',
        eventType: 'share',
        debounceMs: 60000,
      });
    });

    it('tracks share when copy link is clicked', async () => {
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: mockWriteText },
      });

      render(
        <SharePanel 
          bickId="test-123" 
          bickUrl="https://bickqr.com/bick/test-123" 
          bickTitle="Test Bick"
        />
      );
      
      const copyButton = screen.getByRole('button', { name: /copy link/i });
      await act(async () => {
        fireEvent.click(copyButton);
      });
      
      expect(mockTrack).toHaveBeenCalledTimes(1);
    });

    it('tracks share when Twitter button is clicked', () => {
      mockWindowOpen.mockReturnValue({ closed: false });
      
      render(
        <SharePanel 
          bickId="test-123" 
          bickUrl="https://bickqr.com/bick/test-123" 
          bickTitle="Test Bick"
        />
      );
      
      const twitterButton = screen.getByRole('button', { name: /share on twitter/i });
      fireEvent.click(twitterButton);
      
      expect(mockTrack).toHaveBeenCalledTimes(1);
    });

    it('tracks share when Facebook button is clicked', () => {
      mockWindowOpen.mockReturnValue({ closed: false });
      
      render(
        <SharePanel 
          bickId="test-123" 
          bickUrl="https://bickqr.com/bick/test-123" 
          bickTitle="Test Bick"
        />
      );
      
      const facebookButton = screen.getByRole('button', { name: /share on facebook/i });
      fireEvent.click(facebookButton);
      
      expect(mockTrack).toHaveBeenCalledTimes(1);
    });
  });

  describe('props passing', () => {
    it('passes correct URL to CopyLinkButton', async () => {
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: mockWriteText },
      });

      render(
        <SharePanel 
          bickId="test-123" 
          bickUrl="https://bickqr.com/bick/test-123" 
          bickTitle="Test Bick"
        />
      );
      
      const copyButton = screen.getByRole('button', { name: /copy link/i });
      await act(async () => {
        fireEvent.click(copyButton);
      });
      
      expect(mockWriteText).toHaveBeenCalledWith('https://bickqr.com/bick/test-123');
    });

    it('passes correct URL and title to TwitterShareButton', () => {
      mockWindowOpen.mockReturnValue({ closed: false });
      
      render(
        <SharePanel 
          bickId="test-123" 
          bickUrl="https://bickqr.com/bick/test-123" 
          bickTitle="Test Bick"
        />
      );
      
      const twitterButton = screen.getByRole('button', { name: /share on twitter/i });
      fireEvent.click(twitterButton);
      
      const callArgs = mockWindowOpen.mock.calls[0];
      const shareUrl = callArgs[0];
      // Parse the URL to verify parameters correctly (URLSearchParams encodes spaces as +)
      const urlObj = new URL(shareUrl);
      expect(urlObj.searchParams.get('url')).toBe('https://bickqr.com/bick/test-123');
      expect(urlObj.searchParams.get('text')).toBe('Test Bick');
    });

    it('passes correct URL to FacebookShareButton', () => {
      mockWindowOpen.mockReturnValue({ closed: false });
      
      render(
        <SharePanel 
          bickId="test-123" 
          bickUrl="https://bickqr.com/bick/test-123" 
          bickTitle="Test Bick"
        />
      );
      
      const facebookButton = screen.getByRole('button', { name: /share on facebook/i });
      fireEvent.click(facebookButton);
      
      const callArgs = mockWindowOpen.mock.calls[0];
      const shareUrl = callArgs[0];
      expect(shareUrl).toContain(encodeURIComponent('https://bickqr.com/bick/test-123'));
    });
  });
});

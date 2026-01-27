/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { BickPlayer } from '@/components/bick/BickPlayer';

// Mock the useTrackingDebounce hook
const mockTrack = vi.fn();
vi.mock('@/hooks/useTrackingDebounce', () => ({
  useTrackingDebounce: vi.fn(() => ({
    track: mockTrack,
    isTracking: false,
  })),
}));

import { useTrackingDebounce } from '@/hooks/useTrackingDebounce';

// Mock HTMLMediaElement.play and pause
const mockPlay = vi.fn().mockResolvedValue(undefined);
const mockPause = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  
  // Mock HTMLMediaElement methods
  Object.defineProperty(HTMLMediaElement.prototype, 'play', {
    configurable: true,
    value: mockPlay,
  });
  Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
    configurable: true,
    value: mockPause,
  });
});

describe('BickPlayer', () => {
  describe('rendering', () => {
    it('renders with title and play button', () => {
      render(<BickPlayer title="Test Bick" audioUrl="https://example.com/audio.mp3" />);
      
      expect(screen.getByText('Test Bick')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /play test bick/i })).toBeInTheDocument();
    });

    it('renders disabled play button when no audio URL', () => {
      render(<BickPlayer title="Test Bick" />);
      
      const playButton = screen.getByRole('button', { name: /play test bick/i });
      expect(playButton).toBeDisabled();
    });

    it('renders in minimal mode without title', () => {
      render(<BickPlayer title="Test Bick" audioUrl="https://example.com/audio.mp3" minimal />);
      
      expect(screen.queryByText('Test Bick')).not.toBeInTheDocument();
    });

    it('displays formatted duration', () => {
      render(<BickPlayer title="Test Bick" audioUrl="https://example.com/audio.mp3" durationMs={65000} />);
      
      expect(screen.getByText('1:05')).toBeInTheDocument();
    });
  });

  describe('play tracking', () => {
    it('initializes tracking hook with correct parameters when bickId provided', () => {
      render(
        <BickPlayer 
          title="Test Bick" 
          audioUrl="https://example.com/audio.mp3" 
          bickId="test-bick-123"
        />
      );
      
      expect(useTrackingDebounce).toHaveBeenCalledWith({
        bickId: 'test-bick-123',
        eventType: 'play',
        debounceMs: 30000,
      });
    });

    it('initializes tracking hook with empty bickId when not provided', () => {
      render(
        <BickPlayer 
          title="Test Bick" 
          audioUrl="https://example.com/audio.mp3"
        />
      );
      
      expect(useTrackingDebounce).toHaveBeenCalledWith({
        bickId: '',
        eventType: 'play',
        debounceMs: 30000,
      });
    });

    it('fires tracking on first play when bickId is provided', async () => {
      render(
        <BickPlayer 
          title="Test Bick" 
          audioUrl="https://example.com/audio.mp3" 
          bickId="test-bick-123"
        />
      );
      
      const playButton = screen.getByRole('button', { name: /play test bick/i });
      fireEvent.click(playButton);
      
      await waitFor(() => {
        expect(mockTrack).toHaveBeenCalledTimes(1);
      });
    });

    it('does not fire tracking when bickId is not provided', async () => {
      render(
        <BickPlayer 
          title="Test Bick" 
          audioUrl="https://example.com/audio.mp3"
        />
      );
      
      const playButton = screen.getByRole('button', { name: /play test bick/i });
      fireEvent.click(playButton);
      
      await waitFor(() => {
        expect(mockPlay).toHaveBeenCalled();
      });
      
      expect(mockTrack).not.toHaveBeenCalled();
    });

    it('does not fire tracking on subsequent plays (resume after pause)', async () => {
      render(
        <BickPlayer 
          title="Test Bick" 
          audioUrl="https://example.com/audio.mp3" 
          bickId="test-bick-123"
        />
      );
      
      const playButton = screen.getByRole('button', { name: /play test bick/i });
      
      // First play
      fireEvent.click(playButton);
      await waitFor(() => {
        expect(mockTrack).toHaveBeenCalledTimes(1);
      });
      
      // Pause
      fireEvent.click(playButton);
      
      // Resume (second play)
      fireEvent.click(playButton);
      
      // Should still only have been called once
      expect(mockTrack).toHaveBeenCalledTimes(1);
    });

    it('does not block playback when tracking', async () => {
      render(
        <BickPlayer 
          title="Test Bick" 
          audioUrl="https://example.com/audio.mp3" 
          bickId="test-bick-123"
        />
      );
      
      const playButton = screen.getByRole('button', { name: /play test bick/i });
      fireEvent.click(playButton);
      
      // Both tracking and play should be called
      await waitFor(() => {
        expect(mockTrack).toHaveBeenCalled();
        expect(mockPlay).toHaveBeenCalled();
      });
    });

    it('tracks before play to ensure non-blocking behavior', async () => {
      const callOrder: string[] = [];
      
      mockTrack.mockImplementation(() => {
        callOrder.push('track');
      });
      
      mockPlay.mockImplementation(() => {
        callOrder.push('play');
        return Promise.resolve();
      });
      
      render(
        <BickPlayer 
          title="Test Bick" 
          audioUrl="https://example.com/audio.mp3" 
          bickId="test-bick-123"
        />
      );
      
      const playButton = screen.getByRole('button', { name: /play test bick/i });
      fireEvent.click(playButton);
      
      await waitFor(() => {
        expect(callOrder).toEqual(['track', 'play']);
      });
    });
  });

  describe('playback controls', () => {
    it('calls play on audio element when play button clicked', async () => {
      render(
        <BickPlayer 
          title="Test Bick" 
          audioUrl="https://example.com/audio.mp3"
        />
      );
      
      const playButton = screen.getByRole('button', { name: /play test bick/i });
      fireEvent.click(playButton);
      
      await waitFor(() => {
        expect(mockPlay).toHaveBeenCalled();
      });
    });

    it('calls pause on audio element when pause button clicked', async () => {
      render(
        <BickPlayer 
          title="Test Bick" 
          audioUrl="https://example.com/audio.mp3"
        />
      );
      
      const playButton = screen.getByRole('button', { name: /play test bick/i });
      
      // Start playing
      fireEvent.click(playButton);
      await waitFor(() => {
        expect(mockPlay).toHaveBeenCalled();
      });
      
      // Now pause
      const pauseButton = screen.getByRole('button', { name: /pause test bick/i });
      fireEvent.click(pauseButton);
      
      expect(mockPause).toHaveBeenCalled();
    });

    it('shows error message when playback fails', async () => {
      mockPlay.mockRejectedValueOnce(new Error('Playback failed'));
      
      render(
        <BickPlayer 
          title="Test Bick" 
          audioUrl="https://example.com/audio.mp3"
        />
      );
      
      const playButton = screen.getByRole('button', { name: /play test bick/i });
      fireEvent.click(playButton);
      
      await waitFor(() => {
        expect(screen.getByText('Playback failed')).toBeInTheDocument();
      });
    });
  });
});

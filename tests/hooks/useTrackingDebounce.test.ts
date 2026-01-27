/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTrackingDebounce, _testUtils } from '@/hooks/useTrackingDebounce';

const {
  getStorageKey,
  getLastTrackedTimestamp,
  setLastTrackedTimestamp,
  isDebounceWindowPassed,
  DEFAULT_DEBOUNCE_MS,
  STORAGE_KEY_PREFIX,
} = _testUtils;

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock navigator.sendBeacon
const mockSendBeacon = vi.fn();
Object.defineProperty(navigator, 'sendBeacon', {
  value: mockSendBeacon,
  writable: true,
});

describe('useTrackingDebounce', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    localStorage.clear();
    mockSendBeacon.mockReturnValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('utility functions', () => {
    describe('getStorageKey', () => {
      it('generates correct key for play events', () => {
        const key = getStorageKey('bick123', 'play');
        expect(key).toBe(`${STORAGE_KEY_PREFIX}bick123:play`);
      });

      it('generates correct key for share events', () => {
        const key = getStorageKey('bick456', 'share');
        expect(key).toBe(`${STORAGE_KEY_PREFIX}bick456:share`);
      });
    });

    describe('getLastTrackedTimestamp', () => {
      it('returns 0 when no timestamp is stored', () => {
        const timestamp = getLastTrackedTimestamp('bick123', 'play');
        expect(timestamp).toBe(0);
      });

      it('returns stored timestamp', () => {
        const key = getStorageKey('bick123', 'play');
        localStorage.setItem(key, '1234567890');
        
        const timestamp = getLastTrackedTimestamp('bick123', 'play');
        expect(timestamp).toBe(1234567890);
      });

      it('returns 0 for invalid stored value', () => {
        const key = getStorageKey('bick123', 'play');
        localStorage.setItem(key, 'invalid');
        
        const timestamp = getLastTrackedTimestamp('bick123', 'play');
        expect(timestamp).toBe(0);
      });
    });

    describe('setLastTrackedTimestamp', () => {
      it('stores timestamp in localStorage', () => {
        setLastTrackedTimestamp('bick123', 'play', 1234567890);
        
        const key = getStorageKey('bick123', 'play');
        expect(localStorage.getItem(key)).toBe('1234567890');
      });
    });

    describe('isDebounceWindowPassed', () => {
      it('returns true when no previous timestamp', () => {
        const result = isDebounceWindowPassed(0, 30000);
        expect(result).toBe(true);
      });

      it('returns false when within debounce window', () => {
        const now = Date.now();
        vi.setSystemTime(now);
        
        const lastTracked = now - 10000; // 10 seconds ago
        const result = isDebounceWindowPassed(lastTracked, 30000);
        expect(result).toBe(false);
      });

      it('returns true when debounce window has passed', () => {
        const now = Date.now();
        vi.setSystemTime(now);
        
        const lastTracked = now - 35000; // 35 seconds ago
        const result = isDebounceWindowPassed(lastTracked, 30000);
        expect(result).toBe(true);
      });

      it('returns true when exactly at debounce boundary', () => {
        const now = Date.now();
        vi.setSystemTime(now);
        
        const lastTracked = now - 30000; // Exactly 30 seconds ago
        const result = isDebounceWindowPassed(lastTracked, 30000);
        expect(result).toBe(true);
      });
    });
  });

  describe('default debounce times', () => {
    it('has 30 second default for play events', () => {
      expect(DEFAULT_DEBOUNCE_MS.play).toBe(30000);
    });

    it('has 60 second default for share events', () => {
      expect(DEFAULT_DEBOUNCE_MS.share).toBe(60000);
    });
  });

  describe('hook behavior', () => {
    it('returns track function and isTracking state', () => {
      const { result } = renderHook(() =>
        useTrackingDebounce({
          bickId: 'test-bick',
          eventType: 'play',
        })
      );

      expect(typeof result.current.track).toBe('function');
      expect(typeof result.current.isTracking).toBe('boolean');
      expect(result.current.isTracking).toBe(false);
    });

    it('fires tracking request on first call', () => {
      const { result } = renderHook(() =>
        useTrackingDebounce({
          bickId: 'test-bick',
          eventType: 'play',
        })
      );

      act(() => {
        result.current.track();
      });

      expect(mockSendBeacon).toHaveBeenCalledTimes(1);
      expect(mockSendBeacon).toHaveBeenCalledWith(
        '/api/bicks/test-bick/track',
        expect.any(Blob)
      );
    });

    it('does not fire tracking request within debounce window', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const { result } = renderHook(() =>
        useTrackingDebounce({
          bickId: 'test-bick',
          eventType: 'play',
        })
      );

      // First call
      act(() => {
        result.current.track();
      });

      expect(mockSendBeacon).toHaveBeenCalledTimes(1);

      // Advance time by 10 seconds (within 30s window)
      vi.setSystemTime(now + 10000);

      // Second call - should be debounced
      act(() => {
        result.current.track();
      });

      expect(mockSendBeacon).toHaveBeenCalledTimes(1);
    });

    it('fires tracking request after debounce window passes', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const { result } = renderHook(() =>
        useTrackingDebounce({
          bickId: 'test-bick',
          eventType: 'play',
        })
      );

      // First call
      act(() => {
        result.current.track();
      });

      expect(mockSendBeacon).toHaveBeenCalledTimes(1);

      // Advance time by 35 seconds (past 30s window)
      vi.setSystemTime(now + 35000);

      // Second call - should fire
      act(() => {
        result.current.track();
      });

      expect(mockSendBeacon).toHaveBeenCalledTimes(2);
    });

    it('uses custom debounce time when provided', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const { result } = renderHook(() =>
        useTrackingDebounce({
          bickId: 'test-bick',
          eventType: 'play',
          debounceMs: 5000, // 5 seconds
        })
      );

      // First call
      act(() => {
        result.current.track();
      });

      expect(mockSendBeacon).toHaveBeenCalledTimes(1);

      // Advance time by 6 seconds (past 5s custom window)
      vi.setSystemTime(now + 6000);

      // Second call - should fire
      act(() => {
        result.current.track();
      });

      expect(mockSendBeacon).toHaveBeenCalledTimes(2);
    });

    it('uses 60 second default for share events', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const { result } = renderHook(() =>
        useTrackingDebounce({
          bickId: 'test-bick',
          eventType: 'share',
        })
      );

      // First call
      act(() => {
        result.current.track();
      });

      expect(mockSendBeacon).toHaveBeenCalledTimes(1);

      // Advance time by 45 seconds (within 60s window)
      vi.setSystemTime(now + 45000);

      // Second call - should be debounced
      act(() => {
        result.current.track();
      });

      expect(mockSendBeacon).toHaveBeenCalledTimes(1);

      // Advance time to 65 seconds total (past 60s window)
      vi.setSystemTime(now + 65000);

      // Third call - should fire
      act(() => {
        result.current.track();
      });

      expect(mockSendBeacon).toHaveBeenCalledTimes(2);
    });

    it('persists debounce state to localStorage', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const { result } = renderHook(() =>
        useTrackingDebounce({
          bickId: 'test-bick',
          eventType: 'play',
        })
      );

      act(() => {
        result.current.track();
      });

      const key = getStorageKey('test-bick', 'play');
      const storedTimestamp = localStorage.getItem(key);
      expect(storedTimestamp).toBe(String(now));
    });

    it('respects localStorage timestamp from previous session', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      // Simulate previous session - set timestamp 10 seconds ago
      const key = getStorageKey('test-bick', 'play');
      localStorage.setItem(key, String(now - 10000));

      const { result } = renderHook(() =>
        useTrackingDebounce({
          bickId: 'test-bick',
          eventType: 'play',
        })
      );

      // First call - should be debounced due to localStorage
      act(() => {
        result.current.track();
      });

      expect(mockSendBeacon).not.toHaveBeenCalled();
    });

    it('does not track when bickId is empty', () => {
      const { result } = renderHook(() =>
        useTrackingDebounce({
          bickId: '',
          eventType: 'play',
        })
      );

      act(() => {
        result.current.track();
      });

      expect(mockSendBeacon).not.toHaveBeenCalled();
    });

    it('tracks different bicks independently', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const { result: result1 } = renderHook(() =>
        useTrackingDebounce({
          bickId: 'bick-1',
          eventType: 'play',
        })
      );

      const { result: result2 } = renderHook(() =>
        useTrackingDebounce({
          bickId: 'bick-2',
          eventType: 'play',
        })
      );

      // Track both bicks
      act(() => {
        result1.current.track();
        result2.current.track();
      });

      expect(mockSendBeacon).toHaveBeenCalledTimes(2);
    });

    it('tracks play and share events independently for same bick', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const { result: playResult } = renderHook(() =>
        useTrackingDebounce({
          bickId: 'test-bick',
          eventType: 'play',
        })
      );

      const { result: shareResult } = renderHook(() =>
        useTrackingDebounce({
          bickId: 'test-bick',
          eventType: 'share',
        })
      );

      // Track both events
      act(() => {
        playResult.current.track();
        shareResult.current.track();
      });

      expect(mockSendBeacon).toHaveBeenCalledTimes(2);
    });

    it('falls back to fetch when sendBeacon fails', () => {
      mockSendBeacon.mockReturnValue(false);
      mockFetch.mockResolvedValue({ ok: true });

      const { result } = renderHook(() =>
        useTrackingDebounce({
          bickId: 'test-bick',
          eventType: 'play',
        })
      );

      act(() => {
        result.current.track();
      });

      expect(mockSendBeacon).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/bicks/test-bick/track',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventType: 'play' }),
          keepalive: true,
        })
      );
    });

    it('sets isTracking to true briefly during tracking', async () => {
      const { result } = renderHook(() =>
        useTrackingDebounce({
          bickId: 'test-bick',
          eventType: 'play',
        })
      );

      expect(result.current.isTracking).toBe(false);

      act(() => {
        result.current.track();
      });

      expect(result.current.isTracking).toBe(true);

      // Advance timers to reset isTracking
      act(() => {
        vi.advanceTimersByTime(150);
      });

      expect(result.current.isTracking).toBe(false);
    });
  });
});

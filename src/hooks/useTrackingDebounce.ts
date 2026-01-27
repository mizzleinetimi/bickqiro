'use client';

/**
 * useTrackingDebounce Hook
 * 
 * A React hook that manages debounced tracking calls for play and share events.
 * Uses localStorage to persist debounce state across page reloads.
 * Fires non-blocking fetch requests to the tracking API.
 * 
 * @requirements 1.1, 1.2, 2.1, 2.3
 */

import { useCallback, useState, useRef } from 'react';

/**
 * Default debounce times in milliseconds
 */
const DEFAULT_DEBOUNCE_MS = {
  play: 30000,   // 30 seconds for play events
  share: 60000,  // 60 seconds for share events
} as const;

/**
 * LocalStorage key prefix for tracking timestamps
 */
const STORAGE_KEY_PREFIX = 'bickqr_tracking_';

/**
 * Options for the useTrackingDebounce hook
 */
export interface UseTrackingDebounceOptions {
  /** The ID of the bick being tracked */
  bickId: string;
  /** The type of event to track */
  eventType: 'play' | 'share';
  /** Custom debounce time in milliseconds (optional) */
  debounceMs?: number;
}

/**
 * Return type for the useTrackingDebounce hook
 */
export interface UseTrackingDebounceReturn {
  /** Function to call when tracking should occur */
  track: () => void;
  /** Whether a tracking request is currently in flight */
  isTracking: boolean;
}

/**
 * Generates a storage key for a specific bick/event combination
 */
function getStorageKey(bickId: string, eventType: 'play' | 'share'): string {
  return `${STORAGE_KEY_PREFIX}${bickId}:${eventType}`;
}

/**
 * Gets the last tracked timestamp from localStorage
 * Returns 0 if not found or if localStorage is unavailable
 */
function getLastTrackedTimestamp(bickId: string, eventType: 'play' | 'share'): number {
  if (typeof window === 'undefined') {
    return 0;
  }
  
  try {
    const key = getStorageKey(bickId, eventType);
    const stored = localStorage.getItem(key);
    if (stored) {
      const timestamp = parseInt(stored, 10);
      if (!isNaN(timestamp)) {
        return timestamp;
      }
    }
  } catch {
    // localStorage may be unavailable (e.g., private browsing)
    // Silently fail and return 0
  }
  
  return 0;
}

/**
 * Saves the current timestamp to localStorage
 */
function setLastTrackedTimestamp(bickId: string, eventType: 'play' | 'share', timestamp: number): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    const key = getStorageKey(bickId, eventType);
    localStorage.setItem(key, String(timestamp));
  } catch {
    // localStorage may be unavailable (e.g., private browsing)
    // Silently fail - tracking will still work, just won't persist
  }
}

/**
 * Checks if the debounce window has passed since the last tracked event
 */
function isDebounceWindowPassed(
  lastTracked: number,
  debounceMs: number
): boolean {
  const now = Date.now();
  return now - lastTracked >= debounceMs;
}

/**
 * Fires a non-blocking tracking request to the API
 * Uses fire-and-forget pattern - doesn't await the response
 */
function fireTrackingRequest(bickId: string, eventType: 'play' | 'share'): void {
  const url = `/api/bicks/${bickId}/track`;
  const body = JSON.stringify({ eventType });
  
  // Try to use sendBeacon for reliability during page unload
  // Fall back to fetch for normal operation
  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    const blob = new Blob([body], { type: 'application/json' });
    const sent = navigator.sendBeacon(url, blob);
    
    // If sendBeacon fails (e.g., payload too large), fall back to fetch
    if (!sent) {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {
        // Silently ignore errors - tracking is non-critical
      });
    }
  } else {
    // Fallback for environments without sendBeacon
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {
      // Silently ignore errors - tracking is non-critical
    });
  }
}

/**
 * React hook for debounced tracking of play and share events
 * 
 * @param options - Configuration options for the hook
 * @returns Object containing track function and isTracking state
 * 
 * @example
 * ```tsx
 * const { track, isTracking } = useTrackingDebounce({
 *   bickId: 'abc123',
 *   eventType: 'play',
 * });
 * 
 * // Call track() when the user plays the audio
 * <button onClick={track}>Play</button>
 * ```
 */
export function useTrackingDebounce(
  options: UseTrackingDebounceOptions
): UseTrackingDebounceReturn {
  const { bickId, eventType, debounceMs } = options;
  
  // Use default debounce time if not provided
  const effectiveDebounceMs = debounceMs ?? DEFAULT_DEBOUNCE_MS[eventType];
  
  // Track whether a request is in flight (for UI feedback)
  const [isTracking, setIsTracking] = useState(false);
  
  // Use ref to track the last tracked timestamp in memory
  // This supplements localStorage for same-session tracking
  const lastTrackedRef = useRef<number>(0);
  
  const track = useCallback(() => {
    // Skip if bickId is empty
    if (!bickId) {
      return;
    }
    
    const now = Date.now();
    
    // Check in-memory timestamp first (faster)
    if (!isDebounceWindowPassed(lastTrackedRef.current, effectiveDebounceMs)) {
      return;
    }
    
    // Check localStorage timestamp (persists across page reloads)
    const storedTimestamp = getLastTrackedTimestamp(bickId, eventType);
    if (!isDebounceWindowPassed(storedTimestamp, effectiveDebounceMs)) {
      // Update in-memory ref to match localStorage
      lastTrackedRef.current = storedTimestamp;
      return;
    }
    
    // Debounce window has passed - fire the tracking request
    lastTrackedRef.current = now;
    setLastTrackedTimestamp(bickId, eventType, now);
    
    // Set tracking state for UI feedback
    setIsTracking(true);
    
    // Fire non-blocking request
    fireTrackingRequest(bickId, eventType);
    
    // Reset tracking state after a short delay
    // This is just for UI feedback, not for actual tracking logic
    setTimeout(() => {
      setIsTracking(false);
    }, 100);
  }, [bickId, eventType, effectiveDebounceMs]);
  
  return {
    track,
    isTracking,
  };
}

/**
 * Export utility functions for testing
 */
export const _testUtils = {
  getStorageKey,
  getLastTrackedTimestamp,
  setLastTrackedTimestamp,
  isDebounceWindowPassed,
  fireTrackingRequest,
  DEFAULT_DEBOUNCE_MS,
  STORAGE_KEY_PREFIX,
};

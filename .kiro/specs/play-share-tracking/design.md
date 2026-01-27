# Design Document: Play/Share Tracking & Copy Link

## Overview

This design implements play and share tracking for Bickqr bicks, along with user-facing share functionality. The system uses a fire-and-forget client-side tracking approach with server-side debouncing to ensure accurate counts without impacting user experience. The tracking data feeds into the existing trending algorithm.

Key design decisions:
- **Client-side debouncing**: Prevents spam from rapid interactions
- **Fire-and-forget tracking**: Non-blocking API calls that don't affect playback
- **Server-side atomic updates**: Uses Supabase RPC for safe count increments
- **Progressive enhancement**: Share buttons work even if tracking fails

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (Browser)                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐  │
│  │ BickPlayer  │    │ SharePanel  │    │ useTrackingDebounce │  │
│  │ (play hook) │    │ (copy/share)│    │     (shared hook)   │  │
│  └──────┬──────┘    └──────┬──────┘    └──────────┬──────────┘  │
│         │                  │                      │              │
│         └──────────────────┴──────────────────────┘              │
│                            │                                     │
│                    Fire-and-forget POST                          │
└────────────────────────────┼────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Next.js API Routes                           │
├─────────────────────────────────────────────────────────────────┤
│  POST /api/bicks/[id]/track                                      │
│  - Validates bick exists                                         │
│  - Rate limiting (100 req/min per IP)                            │
│  - Calls Supabase RPC for atomic increment                       │
└─────────────────────────────┼────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Supabase                                  │
├─────────────────────────────────────────────────────────────────┤
│  increment_play_count(bick_id) → play_count + 1                  │
│  increment_share_count(bick_id) → share_count + 1                │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Tracking Hook (`useTrackingDebounce`)

A shared React hook that manages debounced tracking calls.

```typescript
interface UseTrackingDebounceOptions {
  bickId: string;
  eventType: 'play' | 'share';
  debounceMs: number;
}

interface UseTrackingDebounceReturn {
  track: () => void;
  isTracking: boolean;
}

function useTrackingDebounce(options: UseTrackingDebounceOptions): UseTrackingDebounceReturn;
```

**Behavior**:
- Maintains a `lastTracked` timestamp per bick/event combination
- Ignores calls within the debounce window
- Fires non-blocking fetch to tracking API
- Uses `navigator.sendBeacon` as fallback for page unload scenarios

### 2. BickPlayer Enhancement

Extends the existing `BickPlayer` component to track plays.

```typescript
interface BickPlayerProps {
  audioUrl?: string | null;
  title: string;
  durationMs?: number | null;
  minimal?: boolean;
  bickId?: string;  // NEW: Required for tracking
}
```

**Play tracking trigger**:
- Fires on first `play` event (not on subsequent seeks/resumes within session)
- Uses 30-second debounce window
- Does not block audio playback

### 3. SharePanel Component

New component containing copy link and social share buttons.

```typescript
interface SharePanelProps {
  bickId: string;
  bickUrl: string;
  bickTitle: string;
}

function SharePanel({ bickId, bickUrl, bickTitle }: SharePanelProps): JSX.Element;
```

**Sub-components**:
- `CopyLinkButton`: Copies URL to clipboard with visual feedback
- `TwitterShareButton`: Opens Twitter share intent
- `FacebookShareButton`: Opens Facebook share dialog

### 4. Tracking API Route

```typescript
// POST /api/bicks/[id]/track
interface TrackingRequest {
  eventType: 'play' | 'share';
}

interface TrackingResponse {
  success: boolean;
  newCount?: number;
}
```

**Validation**:
- Bick must exist (404 if not)
- Event type must be valid (400 if not)
- Rate limited to 100 req/min per IP (429 if exceeded)

### 5. Supabase RPC Functions

```sql
-- Atomic increment functions to prevent race conditions
CREATE FUNCTION increment_play_count(bick_id UUID)
RETURNS INTEGER AS $$
  UPDATE bicks SET play_count = play_count + 1 
  WHERE id = bick_id 
  RETURNING play_count;
$$ LANGUAGE SQL;

CREATE FUNCTION increment_share_count(bick_id UUID)
RETURNS INTEGER AS $$
  UPDATE bicks SET share_count = share_count + 1 
  WHERE id = bick_id 
  RETURNING share_count;
$$ LANGUAGE SQL;
```

## Data Models

### Tracking Event (Client-Side State)

```typescript
interface TrackingState {
  // Map of "bickId:eventType" -> lastTrackedTimestamp
  lastTracked: Map<string, number>;
}
```

### Rate Limit State (Server-Side)

```typescript
interface RateLimitEntry {
  ip: string;
  count: number;
  windowStart: number;
}
```

Rate limiting uses in-memory storage for simplicity. For production scale, this could be moved to Redis.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Play event triggers tracking

*For any* bick with a valid ID, when audio playback is initiated, the tracking hook SHALL call the tracking API with event type "play".

**Validates: Requirements 1.1**

### Property 2: Share event triggers tracking

*For any* bick with a valid ID, when a share action (copy link or social share) is performed, the tracking hook SHALL call the tracking API with event type "share".

**Validates: Requirements 2.1, 2.2**

### Property 3: Debounce prevents duplicate events

*For any* sequence of tracking events for the same bick and event type, if two events occur within the debounce window (30s for play, 60s for share), only the first event SHALL result in an API call.

**Validates: Requirements 1.2, 2.3**

### Property 4: Atomic count increment

*For any* valid tracking request, the corresponding count (play_count or share_count) SHALL increase by exactly 1, regardless of concurrent requests.

**Validates: Requirements 1.3, 2.4**

### Property 5: Clipboard receives correct URL

*For any* bick, when the copy link button is clicked, the clipboard SHALL contain the exact canonical URL of that bick.

**Validates: Requirements 3.2**

### Property 6: Social share URLs are correctly formatted

*For any* bick with a title and URL, the generated Twitter share URL SHALL contain the encoded bick URL and title as query parameters, and the Facebook share URL SHALL contain the encoded bick URL.

**Validates: Requirements 4.2, 4.3**

### Property 7: Rate limiting enforces threshold

*For any* IP address, after 100 requests within a 60-second window, subsequent requests SHALL receive a 429 status code until the window resets.

**Validates: Requirements 5.1**

## Error Handling

### Client-Side Errors

| Error | Handling |
|-------|----------|
| Tracking API failure | Silently ignore - tracking is non-critical |
| Clipboard access denied | Show error toast, keep button functional |
| Network offline | Queue events for retry (optional enhancement) |

### Server-Side Errors

| Error | Response |
|-------|----------|
| Invalid bick ID | 404 Not Found |
| Invalid event type | 400 Bad Request with message |
| Rate limit exceeded | 429 Too Many Requests with Retry-After header |
| Database error | 500 Internal Server Error (logged) |

### Graceful Degradation

- If tracking fails, playback and sharing still work
- If clipboard fails, show URL in a selectable text field as fallback
- If social share popup is blocked, provide direct link

## Testing Strategy

### Unit Tests

Unit tests verify specific examples and edge cases:

1. **Debounce hook tests**
   - First event within window triggers API call
   - Second event within window is ignored
   - Event after window expires triggers new API call

2. **API route tests**
   - Valid play event increments play_count
   - Valid share event increments share_count
   - Non-existent bick returns 404
   - Invalid event type returns 400
   - Rate limit returns 429 after threshold

3. **Component tests**
   - CopyLinkButton renders with correct ARIA labels
   - SharePanel renders all buttons
   - Visual feedback appears after copy

### Property-Based Tests

Property tests use **fast-check** library for TypeScript. Each test runs minimum 100 iterations.

1. **Debounce property test**
   - Generate random sequences of timestamps
   - Verify only events outside debounce window trigger calls

2. **Increment property test**
   - Generate random initial counts and concurrent increments
   - Verify final count equals initial + number of increments

3. **URL generation property test**
   - Generate random bick titles and IDs
   - Verify generated URLs are valid and contain correct parameters

4. **Rate limit property test**
   - Generate random request counts
   - Verify 429 returned exactly when count > 100

### Integration Tests

1. **End-to-end play tracking**
   - Load bick page, play audio, verify count incremented in database

2. **End-to-end share tracking**
   - Load bick page, click copy, verify count incremented in database

3. **Trending integration**
   - Track plays/shares, run trending calculator, verify scores updated


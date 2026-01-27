/**
 * POST /api/bicks/[id]/track
 * 
 * Tracks play and share events for bicks.
 * Increments the appropriate counter using atomic Supabase RPC functions.
 * Includes rate limiting to prevent abuse.
 * 
 * @requirements 1.3, 1.4, 2.4, 2.5, 5.1, 5.2
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

/**
 * Valid event types for tracking
 */
type EventType = 'play' | 'share';

/**
 * Request body for tracking endpoint
 */
interface TrackingRequest {
  eventType: EventType;
}

/**
 * Success response for tracking endpoint
 */
interface TrackingSuccessResponse {
  success: true;
  newCount: number;
}

/**
 * Error response for tracking endpoint
 */
interface TrackingErrorResponse {
  success: false;
  error: string;
}

type TrackingResponse = TrackingSuccessResponse | TrackingErrorResponse;

/**
 * Validates the event type
 */
function isValidEventType(eventType: unknown): eventType is EventType {
  return eventType === 'play' || eventType === 'share';
}

/**
 * Validates the request body
 */
function validateRequest(body: unknown): {
  valid: true;
  data: TrackingRequest;
} | {
  valid: false;
  error: string;
} {
  if (typeof body !== 'object' || body === null) {
    return { valid: false, error: 'Request body is required' };
  }

  const data = body as Record<string, unknown>;

  // Validate eventType (required)
  if (!isValidEventType(data.eventType)) {
    return { 
      valid: false, 
      error: 'Invalid event type. Must be "play" or "share"' 
    };
  }

  return {
    valid: true,
    data: {
      eventType: data.eventType,
    },
  };
}

/**
 * Route segment config
 */
interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST handler for tracking play/share events
 * 
 * @param request - The incoming request
 * @param context - Route context with params
 * @returns JSON response with new count or error
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<TrackingResponse>> {
  try {
    // Check rate limit first
    const clientIp = getClientIp(request);
    const rateLimitResult = checkRateLimit(clientIp);
    
    if (!rateLimitResult.success) {
      const retryAfter = Math.max(1, rateLimitResult.resetAt - Math.floor(Date.now() / 1000));
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
        },
        { 
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
            'X-RateLimit-Limit': '100',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(rateLimitResult.resetAt),
          },
        }
      );
    }

    // Get bick ID from route params
    const { id: bickId } = await context.params;

    if (!bickId || bickId.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Bick ID is required',
        },
        { status: 400 }
      );
    }

    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON in request body',
        },
        { status: 400 }
      );
    }

    // Validate request
    const validation = validateRequest(body);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error,
        },
        { status: 400 }
      );
    }

    const { eventType } = validation.data;

    // Create Supabase client
    const supabase = await createClient();

    // Check if bick exists
    const { data: bick, error: fetchError } = await supabase
      .from('bicks')
      .select('id')
      .eq('id', bickId)
      .single();

    if (fetchError || !bick) {
      return NextResponse.json(
        {
          success: false,
          error: 'Bick not found',
        },
        { status: 404 }
      );
    }

    // Call the appropriate RPC function based on event type
    const rpcFunction = eventType === 'play' 
      ? 'increment_play_count' 
      : 'increment_share_count';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: newCount, error: rpcError } = await (supabase.rpc as any)(rpcFunction, { bick_id: bickId });

    if (rpcError) {
      console.error(`Error calling ${rpcFunction}:`, rpcError);
      return NextResponse.json(
        {
          success: false,
          error: `Failed to update count: ${rpcError.message || rpcError.code || 'Unknown error'}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        newCount: newCount ?? 0,
      },
      {
        headers: {
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': String(rateLimitResult.resetAt),
        },
      }
    );
  } catch (error) {
    console.error('Tracking error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

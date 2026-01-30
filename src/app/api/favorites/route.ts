/**
 * GET /api/favorites
 * POST /api/favorites { bickId }
 * 
 * Device-based favorites using cookies (no auth required)
 * For hackathon demo - stores favorites per device ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

const DEVICE_ID_COOKIE = 'bickqr_device_id';

// Get or create device ID
async function getDeviceId(): Promise<string> {
  const cookieStore = await cookies();
  let deviceId = cookieStore.get(DEVICE_ID_COOKIE)?.value;
  
  if (!deviceId) {
    deviceId = crypto.randomUUID();
  }
  
  return deviceId;
}

// GET - List all favorites for this device
export async function GET(request: NextRequest): Promise<NextResponse> {
  const deviceId = await getDeviceId();
  const supabase = await createClient();
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: favorites, error } = await (supabase as any)
    .from('device_favorites')
    .select(`
      bick_id,
      created_at,
      bicks (
        id,
        slug,
        title,
        description,
        duration_ms,
        play_count,
        assets (
          id,
          bick_id,
          asset_type,
          cdn_url,
          mime_type,
          size_bytes
        )
      )
    `)
    .eq('device_id', deviceId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching favorites:', error);
    return NextResponse.json({ error: 'Failed to fetch favorites' }, { status: 500 });
  }

  // Transform to match expected format
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bicks = (favorites || [])
    .map((f: { bicks: unknown }) => f.bicks)
    .filter(Boolean);

  const response = NextResponse.json({ bicks, deviceId });
  
  // Set device ID cookie if new
  response.cookies.set(DEVICE_ID_COOKIE, deviceId, {
    httpOnly: false, // Allow JS access for iOS app
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: '/',
  });

  return response;
}

// POST - Add a favorite
export async function POST(request: NextRequest): Promise<NextResponse> {
  const deviceId = await getDeviceId();
  
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { bickId } = body;
  if (!bickId) {
    return NextResponse.json({ error: 'bickId is required' }, { status: 400 });
  }

  const supabase = await createClient();
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('device_favorites')
    .insert({ device_id: deviceId, bick_id: bickId });

  if (error) {
    if (error.code === '23505') {
      // Already favorited
      return NextResponse.json({ favorited: true, deviceId });
    }
    console.error('Error adding favorite:', error);
    return NextResponse.json({ error: 'Failed to add favorite' }, { status: 500 });
  }

  const response = NextResponse.json({ favorited: true, deviceId });
  response.cookies.set(DEVICE_ID_COOKIE, deviceId, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
  });

  return response;
}

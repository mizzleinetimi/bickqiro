/**
 * GET /api/favorites/[id] - Check if bick is favorited
 * DELETE /api/favorites/[id] - Remove favorite
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

const DEVICE_ID_COOKIE = 'bickqr_device_id';

async function getDeviceId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(DEVICE_ID_COOKIE)?.value || null;
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET - Check if favorited
export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const { id: bickId } = await context.params;
  const deviceId = await getDeviceId();
  
  if (!deviceId) {
    return NextResponse.json({ favorited: false });
  }

  const supabase = await createClient();
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('device_favorites')
    .select('id')
    .eq('device_id', deviceId)
    .eq('bick_id', bickId)
    .single();

  return NextResponse.json({ favorited: !!data });
}

// DELETE - Remove favorite
export async function DELETE(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const { id: bickId } = await context.params;
  const deviceId = await getDeviceId();
  
  if (!deviceId) {
    return NextResponse.json({ error: 'No device ID' }, { status: 400 });
  }

  const supabase = await createClient();
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('device_favorites')
    .delete()
    .eq('device_id', deviceId)
    .eq('bick_id', bickId);

  if (error) {
    console.error('Error removing favorite:', error);
    return NextResponse.json({ error: 'Failed to remove favorite' }, { status: 500 });
  }

  return NextResponse.json({ favorited: false });
}

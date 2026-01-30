/**
 * POST/DELETE /api/bicks/[id]/save
 * 
 * Save or unsave a bick for the authenticated user.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// Save a bick
export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const { id: bickId } = await context.params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('saved_bicks') as any)
    .insert({ user_id: user.id, bick_id: bickId });

  if (error) {
    if (error.code === '23505') {
      // Already saved
      return NextResponse.json({ saved: true });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ saved: true });
}

// Unsave a bick
export async function DELETE(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const { id: bickId } = await context.params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('saved_bicks') as any)
    .delete()
    .eq('user_id', user.id)
    .eq('bick_id', bickId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ saved: false });
}

// Check if bick is saved
export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const { id: bickId } = await context.params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ saved: false });
  }

  const { data } = await supabase
    .from('saved_bicks')
    .select('id')
    .eq('user_id', user.id)
    .eq('bick_id', bickId)
    .single();

  return NextResponse.json({ saved: !!data });
}

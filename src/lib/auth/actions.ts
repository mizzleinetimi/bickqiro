'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import type { Profile } from '@/types/database.types';

/**
 * Sign in with Google OAuth
 */
export async function signInWithGoogle(redirectTo?: string): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient();
  const headersList = await headers();
  
  // Use NEXT_PUBLIC_APP_URL for production, fallback to origin header, then localhost
  const origin = process.env.NEXT_PUBLIC_APP_URL 
    || headersList.get('origin') 
    || 'http://localhost:3000';
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback${redirectTo ? `?next=${encodeURIComponent(redirectTo)}` : ''}`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { url: data.url };
}

/**
 * Sign up with email and password
 */
export async function signUp(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Sign in with email and password
 */
export async function signIn(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Sign out current user and clear session
 */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/');
}

/**
 * Get current authenticated user (server-side)
 */
export async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Get current user's profile with username
 * Pass userId to avoid redundant auth calls
 */
export async function getUserProfile(userId?: string): Promise<Profile | null> {
  const supabase = await createClient();
  
  // Use provided userId or fetch user (avoid double fetch when possible)
  let uid = userId;
  if (!uid) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    uid = user.id;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', uid)
    .single();

  return profile as Profile | null;
}

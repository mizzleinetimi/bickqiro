import { createClient } from '@/lib/supabase/server';
import { getOrCreateProfile } from '@/lib/auth/profile';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as 'email' | 'recovery' | null;
  const next = searchParams.get('next') ?? '/';

  const supabase = await createClient();

  // Handle OAuth code exchange (Google, etc.)
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      console.error('OAuth error:', error);
      return NextResponse.redirect(`${origin}/auth/sign-in?error=auth_failed`);
    }

    // Ensure profile exists for OAuth users
    if (data.user) {
      try {
        await getOrCreateProfile(data.user.id, data.user.email || '');
      } catch (profileError) {
        console.error('Failed to create profile:', profileError);
      }
    }

    return NextResponse.redirect(`${origin}${next}`);
  }

  // Handle OTP/magic link verification (legacy)
  if (token_hash) {
    if (type !== 'email') {
      return NextResponse.redirect(`${origin}/auth/sign-in?error=invalid_type`);
    }

    const { data, error } = await supabase.auth.verifyOtp({
      token_hash,
      type,
    });

    if (error) {
      const errorCode = error.message.includes('expired')
        ? 'expired_token'
        : 'invalid_token';
      return NextResponse.redirect(`${origin}/auth/sign-in?error=${errorCode}`);
    }

    if (data.user) {
      try {
        await getOrCreateProfile(data.user.id, data.user.email || '');
      } catch (profileError) {
        console.error('Failed to create profile:', profileError);
      }
    }

    return NextResponse.redirect(`${origin}${next}`);
  }

  // No code or token_hash provided
  return NextResponse.redirect(`${origin}/auth/sign-in?error=missing_token`);
}

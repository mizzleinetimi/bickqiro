import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * Generate username from email prefix
 * Extracts the part before @ and sanitizes it
 */
export function generateUsername(email: string): string {
  const prefix = email.split('@')[0] || 'user';
  // Remove special characters, keep alphanumeric and underscores
  const sanitized = prefix.toLowerCase().replace(/[^a-z0-9_]/g, '');
  // Ensure it's not empty
  return sanitized || 'user';
}

/**
 * Generate a random suffix for username uniqueness
 */
function generateSuffix(): string {
  return Math.random().toString(36).substring(2, 6);
}

/**
 * Ensure username is unique, append suffix if needed
 */
export async function ensureUniqueUsername(baseUsername: string): Promise<string> {
  const supabase = createAdminClient();
  let username = baseUsername;
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single();

    if (!existing) {
      return username;
    }

    username = `${baseUsername}_${generateSuffix()}`;
    attempts++;
  }

  // Fallback: use timestamp
  return `${baseUsername}_${Date.now()}`;
}

/**
 * Create profile for new user with generated username
 */
export async function createProfile(userId: string, email: string) {
  const supabase = createAdminClient();
  
  const baseUsername = generateUsername(email);
  const username = await ensureUniqueUsername(baseUsername);
  const displayName = email.split('@')[0] || 'User';

  const { data: profile, error } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      username,
      display_name: displayName,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create profile: ${error.message}`);
  }

  return profile;
}

/**
 * Get or create profile for user (on-demand creation)
 */
export async function getOrCreateProfile(userId: string, email: string) {
  const supabase = await createClient();

  // Try to get existing profile
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (existingProfile) {
    return existingProfile;
  }

  // Create new profile if doesn't exist
  return createProfile(userId, email);
}

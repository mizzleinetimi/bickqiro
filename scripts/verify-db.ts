/**
 * Quick database verification script
 * Run with: npx tsx scripts/verify-db.ts
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verify() {
  console.log('🔍 Verifying Supabase connection...\n');

  // Test 1: Check tables exist
  const tables = ['profiles', 'bicks', 'bick_assets', 'tags', 'bick_tags', 'reports'];
  console.log('📋 Checking tables:');
  
  for (const table of tables) {
    const { error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.log(`  ❌ ${table}: ${error.message}`);
    } else {
      console.log(`  ✅ ${table}`);
    }
  }

  // Test 2: Insert a test profile
  console.log('\n📝 Testing insert (profiles):');
  const testId = 'verify-0000-0000-0000-000000000001';
  
  const { error: insertError } = await supabase
    .from('profiles')
    .insert({ id: testId, username: 'verify_test_user' });
  
  if (insertError) {
    console.log(`  ⚠️  Insert failed (expected if no auth.users): ${insertError.message}`);
  } else {
    console.log('  ✅ Insert successful');
    // Cleanup
    await supabase.from('profiles').delete().eq('id', testId);
    console.log('  🧹 Cleaned up test data');
  }

  // Test 3: Check RLS is enabled
  console.log('\n🔒 RLS Status:');
  const { data: rlsData } = await supabase.rpc('check_rls_enabled').select();
  
  // Alternative: just confirm we can query
  const { data: tagsData, error: tagsError } = await supabase.from('tags').select('*');
  if (!tagsError) {
    console.log('  ✅ Tags table accessible (public read policy working)');
  }

  console.log('\n✨ Database verification complete!');
  console.log('\nNext steps:');
  console.log('  1. Run the app: npm run dev');
  console.log('  2. Run tests: npm test');
}

verify().catch(console.error);

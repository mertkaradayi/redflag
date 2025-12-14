// Script to clear cached analysis for testing
import 'dotenv/config';
import { supabase } from './lib/supabase';

const PACKAGE_ID = '0xb29d83c26cdd2a64959263abbcfc4a6937f0c9fccaf98580ca56faded65be244';
const NETWORK = 'mainnet';

async function clearCache() {
  console.log('🗑️  Clearing cached analysis...');
  console.log(`   Package: ${PACKAGE_ID}`);
  console.log(`   Network: ${NETWORK}\n`);

  if (!supabase) {
    console.error('❌ Supabase not initialized. Check env vars.');
    process.exit(1);
  }

  const { error } = await supabase
    .from('contract_analyses')
    .delete()
    .eq('package_id', PACKAGE_ID)
    .eq('network', NETWORK);

  if (error) {
    console.error('❌ Failed to delete:', error.message);
    process.exit(1);
  }

  console.log('✅ Cache cleared successfully!\n');
  console.log('Run: yarn tsx src/test-real-contract.ts');
}

clearCache();

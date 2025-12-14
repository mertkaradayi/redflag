// Debug test for specific contract
import 'dotenv/config';
import { SuiClient } from '@mysten/sui/client';
import { runFullAnalysisChain } from './lib/llm-analyzer';
import { supabase } from './lib/supabase';

const PACKAGE_ID = '0x110764d360f55e6e27df1ca3a65b3f78de9493a43a2229549fb6d42c6684039c';
const NETWORK = 'mainnet';
const RPC_URL = 'https://fullnode.mainnet.sui.io:443';

async function debugContract() {
  console.log('🔍 Debug Test - Analyzing Contract');
  console.log('═'.repeat(70));
  console.log(`📦 Package: ${PACKAGE_ID}`);
  console.log(`🌐 Network: ${NETWORK}\n`);

  // Clear cache first
  console.log('🗑️  Clearing cache...');
  if (supabase) {
    await supabase
      .from('contract_analyses')
      .delete()
      .eq('package_id', PACKAGE_ID)
      .eq('network', NETWORK);
    console.log('✅ Cache cleared\n');
  }

  const suiClient = new SuiClient({ url: RPC_URL });

  try {
    const result = await runFullAnalysisChain(PACKAGE_ID, NETWORK, suiClient);

    console.log('\n✅ Analysis succeeded!');
    console.log(`Risk Score: ${result.risk_score}/100`);
    console.log(`Risk Level: ${result.risk_level}`);
    console.log(`Summary: ${result.summary}`);

  } catch (error) {
    console.error('\n❌ Analysis failed with error:');
    console.error(error);
  }
}

debugContract();

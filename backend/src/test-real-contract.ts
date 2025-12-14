// Test script for real Sui contract analysis
import 'dotenv/config';
import { SuiClient } from '@mysten/sui/client';
import { runFullAnalysisChain } from './lib/llm-analyzer';

const PACKAGE_ID = '0xb29d83c26cdd2a64959263abbcfc4a6937f0c9fccaf98580ca56faded65be244';
const NETWORK = 'mainnet'; // Try mainnet first
const RPC_URL = 'https://fullnode.mainnet.sui.io:443';

async function testRealContract() {
  console.log('🔍 RedFlag Smart Contract Analyzer - Live Test');
  console.log('═══════════════════════════════════════════════\n');
  console.log(`📦 Package ID: ${PACKAGE_ID}`);
  console.log(`🌐 Network: ${NETWORK}`);
  console.log(`🔗 RPC URL: ${RPC_URL}`);
  console.log(`🤖 Model: meta-llama/llama-3.3-70b-instruct (all 3 agents)`);
  console.log(`💰 Estimated Cost: ~$0.001\n`);
  console.log('Starting analysis...\n');

  const startTime = Date.now();

  try {
    // Create Sui client
    const suiClient = new SuiClient({ url: RPC_URL });

    // Run full analysis
    const result = await runFullAnalysisChain(PACKAGE_ID, NETWORK, suiClient);

    const duration = Date.now() - startTime;

    console.log('\n═══════════════════════════════════════════════');
    console.log('✅ ANALYSIS COMPLETE');
    console.log('═══════════════════════════════════════════════\n');

    console.log(`⏱️  Duration: ${(duration / 1000).toFixed(2)}s`);
    console.log(`📊 Risk Score: ${result.risk_score}/100`);
    console.log(`🎯 Risk Level: ${result.risk_level.toUpperCase()}`);
    console.log(`\n📝 Summary:\n${result.summary}\n`);

    if (result.risky_functions && result.risky_functions.length > 0) {
      console.log(`⚠️  Risky Functions (${result.risky_functions.length}):`);
      result.risky_functions.forEach((fn, i) => {
        console.log(`\n${i + 1}. ${fn.function_name}`);
        console.log(`   └─ ${fn.reason}`);
      });
    }

    if (result.rug_pull_indicators && result.rug_pull_indicators.length > 0) {
      console.log(`\n🚨 Rug Pull Indicators (${result.rug_pull_indicators.length}):`);
      result.rug_pull_indicators.forEach((indicator, i) => {
        console.log(`\n${i + 1}. ${indicator.pattern_name}`);
        console.log(`   └─ ${indicator.evidence}`);
      });
    }

    console.log(`\n💡 Impact on User:\n${result.impact_on_user}`);
    console.log(`\n🎯 One-liner: ${result.why_risky_one_liner}\n`);

    if (result.technical_findings) {
      console.log(`\n🔬 Technical Findings (${result.technical_findings.length}):`);
      result.technical_findings.forEach((finding: any, i: number) => {
        console.log(`\n${i + 1}. ${finding.function_name} [${finding.severity}]`);
        console.log(`   Pattern: ${finding.matched_pattern_id}`);
        console.log(`   Reason: ${finding.technical_reason}`);
        if (finding.contextual_notes && finding.contextual_notes.length > 0) {
          console.log(`   Context: ${finding.contextual_notes.join(', ')}`);
        }
      });
    }

    console.log('\n═══════════════════════════════════════════════');
    console.log('💾 Result saved to database');
    console.log('═══════════════════════════════════════════════\n');

    return result;

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('\n❌ ANALYSIS FAILED');
    console.error(`⏱️  Failed after: ${(duration / 1000).toFixed(2)}s`);
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
    throw error;
  }
}

// Run the test
testRealContract()
  .then(() => {
    console.log('✅ Test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });

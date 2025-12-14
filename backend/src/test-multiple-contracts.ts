// Test script for multiple real Sui contracts
import 'dotenv/config';
import { SuiClient } from '@mysten/sui/client';
import { runFullAnalysisChain } from './lib/llm-analyzer';

const CONTRACTS = [
  '0x2c8d603bc51326b8c13cef9dd07031a408a48dddb541963357661df5d3204809',
  '0xdeeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a284d026b7946c270',
  '0xaed19c8a4b17431568a11965ae08830d3b9b5a4ce3f62c0a5165e04a08132c47',
  '0x8b449b4dc0f8c5f996734eaf23d36a5f6724e02e312a7e4af34bd0bb74de7b17',
  '0xd02012c71c1a6a221e540c36c37c81e0224907fe1ee05bfe250025654ff17103',
  '0x91bfbc386a41afcfd9b2533058d7e915a1d3829089cc268ff4333d54d6339ca1',
];

const NETWORK = 'mainnet';
const RPC_URL = 'https://fullnode.mainnet.sui.io:443';

interface AnalysisResult {
  packageId: string;
  success: boolean;
  riskScore?: number;
  riskLevel?: string;
  summary?: string;
  riskyFunctions?: number;
  rugPullIndicators?: number;
  duration?: number;
  error?: string;
}

async function analyzeContract(packageId: string, suiClient: SuiClient): Promise<AnalysisResult> {
  const startTime = Date.now();

  try {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`📦 Analyzing: ${packageId}`);
    console.log('='.repeat(70));

    const result = await runFullAnalysisChain(packageId, NETWORK, suiClient);
    const duration = Date.now() - startTime;

    console.log(`\n✅ Analysis complete in ${(duration / 1000).toFixed(2)}s`);
    console.log(`📊 Risk Score: ${result.risk_score}/100`);
    console.log(`🎯 Risk Level: ${result.risk_level.toUpperCase()}`);
    console.log(`📝 Summary: ${result.summary.substring(0, 150)}...`);

    if (result.risky_functions && result.risky_functions.length > 0) {
      console.log(`⚠️  Risky Functions: ${result.risky_functions.length}`);
    }

    return {
      packageId,
      success: true,
      riskScore: result.risk_score,
      riskLevel: result.risk_level,
      summary: result.summary,
      riskyFunctions: result.risky_functions?.length || 0,
      rugPullIndicators: result.rug_pull_indicators?.length || 0,
      duration,
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`\n❌ Analysis failed after ${(duration / 1000).toFixed(2)}s`);
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);

    return {
      packageId,
      success: false,
      duration,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function testMultipleContracts() {
  console.log('🔍 RedFlag Smart Contract Analyzer - Batch Test');
  console.log('═══════════════════════════════════════════════════════════════════\n');
  console.log(`🌐 Network: ${NETWORK}`);
  console.log(`🔗 RPC URL: ${RPC_URL}`);
  console.log(`🤖 Model: meta-llama/llama-3.3-70b-instruct (all 3 agents)`);
  console.log(`📊 Testing ${CONTRACTS.length} contracts`);
  console.log(`💰 Estimated Total Cost: ~$${(0.001 * CONTRACTS.length).toFixed(4)}\n`);

  const suiClient = new SuiClient({ url: RPC_URL });
  const results: AnalysisResult[] = [];

  // Analyze each contract
  for (let i = 0; i < CONTRACTS.length; i++) {
    console.log(`\n[${i + 1}/${CONTRACTS.length}] Processing contract ${i + 1}...`);
    const result = await analyzeContract(CONTRACTS[i], suiClient);
    results.push(result);

    // Brief pause between analyses to avoid rate limits
    if (i < CONTRACTS.length - 1) {
      console.log('\n⏳ Waiting 2 seconds before next analysis...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Print summary
  console.log('\n\n' + '='.repeat(70));
  console.log('📊 BATCH ANALYSIS SUMMARY');
  console.log('='.repeat(70) + '\n');

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`✅ Successful: ${successful.length}/${CONTRACTS.length}`);
  console.log(`❌ Failed: ${failed.length}/${CONTRACTS.length}`);

  if (successful.length > 0) {
    console.log('\n📈 Risk Distribution:');
    const critical = successful.filter(r => r.riskLevel === 'critical').length;
    const high = successful.filter(r => r.riskLevel === 'high').length;
    const moderate = successful.filter(r => r.riskLevel === 'moderate').length;
    const low = successful.filter(r => r.riskLevel === 'low').length;

    if (critical > 0) console.log(`   🔴 Critical: ${critical}`);
    if (high > 0) console.log(`   🟠 High: ${high}`);
    if (moderate > 0) console.log(`   🟡 Moderate: ${moderate}`);
    if (low > 0) console.log(`   🟢 Low: ${low}`);

    console.log('\n📋 Detailed Results:');
    successful.forEach((result, idx) => {
      const riskEmoji =
        result.riskLevel === 'critical' ? '🔴' :
        result.riskLevel === 'high' ? '🟠' :
        result.riskLevel === 'moderate' ? '🟡' : '🟢';

      console.log(`\n${idx + 1}. ${riskEmoji} ${result.packageId.substring(0, 20)}...`);
      console.log(`   Risk Score: ${result.riskScore}/100 (${result.riskLevel?.toUpperCase()})`);
      console.log(`   Risky Functions: ${result.riskyFunctions}`);
      console.log(`   Duration: ${((result.duration || 0) / 1000).toFixed(2)}s`);
    });

    const totalDuration = successful.reduce((sum, r) => sum + (r.duration || 0), 0);
    const avgDuration = totalDuration / successful.length;

    console.log('\n⏱️  Performance:');
    console.log(`   Total Time: ${(totalDuration / 1000).toFixed(2)}s`);
    console.log(`   Average Time: ${(avgDuration / 1000).toFixed(2)}s per contract`);
    console.log(`   Actual Cost: ~$${(0.00013 * successful.length).toFixed(5)}`);
  }

  if (failed.length > 0) {
    console.log('\n❌ Failed Analyses:');
    failed.forEach((result, idx) => {
      console.log(`\n${idx + 1}. ${result.packageId.substring(0, 20)}...`);
      console.log(`   Error: ${result.error}`);
    });
  }

  console.log('\n' + '='.repeat(70) + '\n');
}

// Run the test
testMultipleContracts()
  .then(() => {
    console.log('✅ Batch test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Batch test failed:', error);
    process.exit(1);
  });

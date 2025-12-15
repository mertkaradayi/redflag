/**
 * Cross-Module Analyzer - Two-Pass Capability Flow Detection
 *
 * Detects security risks that span multiple modules:
 * - AdminCap transferred in Module A affects all modules using AdminCap
 * - Capability chains through multiple modules
 * - Shared objects modified inconsistently across modules
 */

import type { StaticFinding, PublicFunction } from './static-analyzer';

// ================================================================
// TYPES
// ================================================================

export interface CapabilityDefinition {
  name: string;           // e.g., "AdminCap"
  module: string;         // e.g., "admin"
  fullType: string;       // e.g., "0x123::admin::AdminCap"
  hasStore: boolean;      // Can be transferred
  hasKey: boolean;        // Is an object
  hasCopy: boolean;       // Can be copied
  hasDrop: boolean;       // Can be dropped
}

export interface CapabilityUsage {
  capability: string;     // Capability name
  fullType: string;       // Full type path
  module: string;         // Module where used
  function_name: string;  // Function using it
  usage_type: 'parameter' | 'created' | 'transferred' | 'destroyed' | 'borrowed_mut' | 'borrowed_imm';
}

export interface CapabilityFlow {
  capability: string;
  fullType: string;
  from_module: string;
  to: string;             // Module name or 'external_address'
  via_function: string;
  flow_type: 'internal' | 'external_transfer' | 'public_share';
  risk_level: 'safe' | 'risky' | 'critical';
}

export interface CrossModuleRisk {
  pattern_id: string;
  severity: 'Critical' | 'High' | 'Medium';
  affected_modules: string[];
  source_module: string;
  source_function: string;
  description: string;
  evidence: string;
}

export interface CrossModuleAnalysisResult {
  capabilities: CapabilityDefinition[];
  usages: CapabilityUsage[];
  flows: CapabilityFlow[];
  risks: CrossModuleRisk[];
  analysis_time_ms: number;
}

// ================================================================
// CAPABILITY PATTERNS
// ================================================================

// Known capability suffixes that indicate privileged access
const CAPABILITY_PATTERNS = [
  'AdminCap',
  'OwnerCap',
  'TreasuryCap',
  'UpgradeCap',
  'MintCap',
  'BurnCap',
  'PauseCap',
  'FreezeCap',
  'ConfigCap',
  'ManagerCap',
  'AuthorityCap',
  'GovernanceCap',
  'WithdrawCap',
  'ControllerCap',
];

// Patterns indicating a capability is being transferred externally
const EXTERNAL_TRANSFER_PATTERNS = [
  /transfer::public_transfer/,
  /transfer::transfer/,
  /sui::transfer::public_transfer/,
  /sui::transfer::transfer/,
];

// Patterns indicating a capability is being shared
const SHARE_PATTERNS = [
  /transfer::public_share_object/,
  /transfer::share_object/,
];

// ================================================================
// PASS 1: CAPABILITY EXTRACTION
// ================================================================

/**
 * Extract capability definitions from bytecode
 */
function extractCapabilityDefinitions(
  disassembledCode: Record<string, string>
): CapabilityDefinition[] {
  const capabilities: CapabilityDefinition[] = [];

  for (const [moduleName, bytecode] of Object.entries(disassembledCode)) {
    // Look for struct definitions that match capability patterns
    // In bytecode, structs are defined with abilities like: struct AdminCap has key, store { ... }

    for (const capPattern of CAPABILITY_PATTERNS) {
      // Check if this capability name appears in the module
      const capRegex = new RegExp(`\\b${capPattern}\\b`, 'g');
      if (capRegex.test(bytecode)) {
        // Try to extract the full type
        // Look for patterns like: "0x...::module::AdminCap" or "module::AdminCap"
        const typeRegex = new RegExp(`([0-9a-fx]+::)?${moduleName}::${capPattern}`, 'i');
        const typeMatch = bytecode.match(typeRegex);

        // Check for abilities (store, key, copy, drop)
        // In disassembled bytecode, look for struct definitions
        const hasStore = bytecode.includes(`${capPattern}`) &&
                        (bytecode.includes('store') || bytecode.includes('public_transfer'));
        const hasKey = bytecode.includes(`${capPattern}`) && bytecode.includes('key');

        capabilities.push({
          name: capPattern,
          module: moduleName,
          fullType: typeMatch ? typeMatch[0] : `${moduleName}::${capPattern}`,
          hasStore,
          hasKey,
          hasCopy: false, // Capabilities typically don't have copy
          hasDrop: false, // Capabilities typically don't have drop
        });
      }
    }

    // Also look for custom capabilities ending in "Cap" or "Authority"
    const customCapRegex = /struct\s+(\w+(?:Cap|Authority))\b/g;
    let match;
    while ((match = customCapRegex.exec(bytecode)) !== null) {
      const capName = match[1];
      if (!CAPABILITY_PATTERNS.includes(capName)) {
        capabilities.push({
          name: capName,
          module: moduleName,
          fullType: `${moduleName}::${capName}`,
          hasStore: bytecode.includes('public_transfer') || bytecode.includes('store'),
          hasKey: true,
          hasCopy: false,
          hasDrop: false,
        });
      }
    }
  }

  // Deduplicate
  const seen = new Set<string>();
  return capabilities.filter(cap => {
    const key = `${cap.module}::${cap.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Extract capability usages from public functions and bytecode
 */
function extractCapabilityUsages(
  disassembledCode: Record<string, string>,
  publicFunctions: PublicFunction[],
  capabilities: CapabilityDefinition[]
): CapabilityUsage[] {
  const usages: CapabilityUsage[] = [];
  const capNames = new Set(capabilities.map(c => c.name));

  // Check public function parameters
  for (const func of publicFunctions) {
    for (const param of func.params) {
      // Check if parameter type contains a capability
      const paramStr = JSON.stringify(param);

      for (const capName of capNames) {
        if (paramStr.includes(capName)) {
          const isMutable = paramStr.includes('MutableReference') || paramStr.includes('&mut');
          const isRef = paramStr.includes('Reference') || paramStr.includes('&');

          usages.push({
            capability: capName,
            fullType: `${func.module}::${capName}`,
            module: func.module,
            function_name: func.name,
            usage_type: isMutable ? 'borrowed_mut' : (isRef ? 'borrowed_imm' : 'parameter'),
          });
        }
      }
    }
  }

  // Check bytecode for capability operations
  for (const [moduleName, bytecode] of Object.entries(disassembledCode)) {
    for (const cap of capabilities) {
      // Look for capability transfers
      for (const transferPattern of EXTERNAL_TRANSFER_PATTERNS) {
        if (transferPattern.test(bytecode) && bytecode.includes(cap.name)) {
          // Find the function containing this transfer
          const funcMatch = findContainingFunction(bytecode, cap.name, 'transfer');

          usages.push({
            capability: cap.name,
            fullType: cap.fullType,
            module: moduleName,
            function_name: funcMatch || 'unknown',
            usage_type: 'transferred',
          });
        }
      }

      // Look for capability creation (Pack operations)
      if (bytecode.includes(`Pack`) && bytecode.includes(cap.name)) {
        const funcMatch = findContainingFunction(bytecode, cap.name, 'Pack');

        usages.push({
          capability: cap.name,
          fullType: cap.fullType,
          module: moduleName,
          function_name: funcMatch || 'init', // Often in init functions
          usage_type: 'created',
        });
      }
    }
  }

  return usages;
}

/**
 * Helper to find the function containing a specific operation
 */
function findContainingFunction(bytecode: string, capName: string, operation: string): string | null {
  const lines = bytecode.split('\n');
  let currentFunction = '';

  for (const line of lines) {
    // Look for function definitions (varies by disassembler format)
    const funcMatch = line.match(/(?:public\s+)?(?:entry\s+)?fun\s+(\w+)/);
    if (funcMatch) {
      currentFunction = funcMatch[1];
    }

    // Also check for function labels in bytecode format
    const labelMatch = line.match(/^(\w+):/);
    if (labelMatch && !line.includes('B') && !line.includes('L')) {
      currentFunction = labelMatch[1];
    }

    if (line.includes(capName) && line.includes(operation)) {
      return currentFunction;
    }
  }

  return null;
}

// ================================================================
// PASS 2: FLOW ANALYSIS
// ================================================================

/**
 * Analyze capability flows between modules
 */
function analyzeCapabilityFlows(
  disassembledCode: Record<string, string>,
  capabilities: CapabilityDefinition[],
  usages: CapabilityUsage[]
): CapabilityFlow[] {
  const flows: CapabilityFlow[] = [];
  const moduleNames = Object.keys(disassembledCode);

  for (const cap of capabilities) {
    const capUsages = usages.filter(u => u.capability === cap.name);

    // Find transfers
    const transfers = capUsages.filter(u => u.usage_type === 'transferred');

    for (const transfer of transfers) {
      const bytecode = disassembledCode[transfer.module] || '';

      // Check if transfer goes to an address parameter (external)
      const isExternalTransfer = EXTERNAL_TRANSFER_PATTERNS.some(p => p.test(bytecode)) &&
                                 (bytecode.includes('address') || bytecode.includes('Arg'));

      // Check if it's shared
      const isShared = SHARE_PATTERNS.some(p => p.test(bytecode));

      if (isExternalTransfer) {
        flows.push({
          capability: cap.name,
          fullType: cap.fullType,
          from_module: transfer.module,
          to: 'external_address',
          via_function: transfer.function_name,
          flow_type: 'external_transfer',
          risk_level: 'critical',
        });
      } else if (isShared) {
        flows.push({
          capability: cap.name,
          fullType: cap.fullType,
          from_module: transfer.module,
          to: 'shared_object',
          via_function: transfer.function_name,
          flow_type: 'public_share',
          risk_level: 'critical',
        });
      }
    }

    // Detect cross-module usage
    // If capability is defined in module A but used in module B
    const definedIn = cap.module;
    const usedInModules = new Set(capUsages.map(u => u.module));

    for (const usedIn of usedInModules) {
      if (usedIn !== definedIn) {
        flows.push({
          capability: cap.name,
          fullType: cap.fullType,
          from_module: definedIn,
          to: usedIn,
          via_function: 'cross_module_import',
          flow_type: 'internal',
          risk_level: 'safe', // Internal flows are generally safe
        });
      }
    }
  }

  return flows;
}

// ================================================================
// RISK DETECTION
// ================================================================

/**
 * Detect cross-module security risks
 */
function detectCrossModuleRisks(
  capabilities: CapabilityDefinition[],
  usages: CapabilityUsage[],
  flows: CapabilityFlow[]
): CrossModuleRisk[] {
  const risks: CrossModuleRisk[] = [];

  // Risk 1: Capability transferred externally affects ALL modules using it
  const externalTransfers = flows.filter(f => f.flow_type === 'external_transfer');

  for (const transfer of externalTransfers) {
    // Find all modules that use this capability
    const affectedUsages = usages.filter(u => u.capability === transfer.capability);
    const affectedModules = [...new Set(affectedUsages.map(u => u.module))];

    if (affectedModules.length > 1) {
      risks.push({
        pattern_id: 'CROSS-MODULE-CAP-TRANSFER',
        severity: 'Critical',
        affected_modules: affectedModules,
        source_module: transfer.from_module,
        source_function: transfer.via_function,
        description: `${transfer.capability} is transferred to an external address in ${transfer.from_module}::${transfer.via_function}, ` +
                    `but is also used in ${affectedModules.length} modules. If transferred to a malicious address, ` +
                    `ALL functionality depending on this capability is compromised.`,
        evidence: `External transfer in ${transfer.from_module}::${transfer.via_function}, ` +
                 `affects modules: ${affectedModules.join(', ')}`,
      });
    }
  }

  // Risk 2: AdminCap or TreasuryCap shared as object
  const sharedFlows = flows.filter(f => f.flow_type === 'public_share');

  for (const shared of sharedFlows) {
    const criticalCaps = ['AdminCap', 'TreasuryCap', 'UpgradeCap', 'MintCap'];
    if (criticalCaps.some(c => shared.capability.includes(c))) {
      const affectedUsages = usages.filter(u => u.capability === shared.capability);
      const affectedModules = [...new Set(affectedUsages.map(u => u.module))];

      risks.push({
        pattern_id: 'CROSS-MODULE-CAP-SHARED',
        severity: 'Critical',
        affected_modules: affectedModules,
        source_module: shared.from_module,
        source_function: shared.via_function,
        description: `Critical capability ${shared.capability} is shared as a public object in ${shared.from_module}::${shared.via_function}. ` +
                    `Anyone can access this capability, compromising all ${affectedModules.length} modules that depend on it.`,
        evidence: `Shared object in ${shared.from_module}::${shared.via_function}`,
      });
    }
  }

  // Risk 3: Capability used across modules without proper access control
  const crossModuleFlows = flows.filter(f => f.flow_type === 'internal');
  const capabilityUsageCount = new Map<string, number>();

  for (const flow of crossModuleFlows) {
    const count = (capabilityUsageCount.get(flow.capability) || 0) + 1;
    capabilityUsageCount.set(flow.capability, count);
  }

  for (const [capName, count] of capabilityUsageCount) {
    if (count >= 3) { // Used across 3+ modules
      const affectedModules = crossModuleFlows
        .filter(f => f.capability === capName)
        .map(f => f.to)
        .filter((m): m is string => m !== 'external_address' && m !== 'shared_object');

      // Check if any module has external transfer for this cap
      const hasExternalTransfer = flows.some(
        f => f.capability === capName && f.flow_type === 'external_transfer'
      );

      if (hasExternalTransfer) {
        risks.push({
          pattern_id: 'CROSS-MODULE-WIDE-IMPACT',
          severity: 'High',
          affected_modules: affectedModules,
          source_module: 'multiple',
          source_function: 'multiple',
          description: `Capability ${capName} is used across ${count} modules and can be transferred externally. ` +
                      `A single transfer compromises functionality across the entire package.`,
          evidence: `${capName} used in: ${affectedModules.join(', ')}`,
        });
      }
    }
  }

  return risks;
}

/**
 * Convert cross-module risks to static findings format
 */
function risksToStaticFindings(risks: CrossModuleRisk[]): StaticFinding[] {
  return risks.map(risk => ({
    pattern_id: risk.pattern_id,
    severity: risk.severity,
    function_name: risk.source_function,
    module_name: risk.source_module,
    evidence: risk.evidence,
    description: risk.description,
    confidence: 'likely' as const,
  }));
}

// ================================================================
// MAIN ANALYSIS FUNCTION
// ================================================================

/**
 * Run two-pass cross-module analysis
 */
export function runCrossModuleAnalysis(
  disassembledCode: Record<string, string>,
  publicFunctions: PublicFunction[]
): CrossModuleAnalysisResult {
  const startTime = Date.now();

  // Pass 1: Extract capabilities
  const capabilities = extractCapabilityDefinitions(disassembledCode);
  console.log(`[Cross-Module] Found ${capabilities.length} capabilities`);

  // Pass 1b: Extract usages
  const usages = extractCapabilityUsages(disassembledCode, publicFunctions, capabilities);
  console.log(`[Cross-Module] Found ${usages.length} capability usages`);

  // Pass 2: Analyze flows
  const flows = analyzeCapabilityFlows(disassembledCode, capabilities, usages);
  console.log(`[Cross-Module] Detected ${flows.length} capability flows`);

  // Detect risks
  const risks = detectCrossModuleRisks(capabilities, usages, flows);
  console.log(`[Cross-Module] Identified ${risks.length} cross-module risks`);

  const analysisTime = Date.now() - startTime;

  return {
    capabilities,
    usages,
    flows,
    risks,
    analysis_time_ms: analysisTime,
  };
}

/**
 * Get cross-module findings as StaticFindings for integration
 */
export function getCrossModuleFindings(
  disassembledCode: Record<string, string>,
  publicFunctions: PublicFunction[]
): StaticFinding[] {
  const result = runCrossModuleAnalysis(disassembledCode, publicFunctions);
  return risksToStaticFindings(result.risks);
}

/**
 * Format cross-module analysis for LLM prompt
 */
export function formatCrossModuleForPrompt(result: CrossModuleAnalysisResult): string {
  if (result.risks.length === 0) {
    return 'No cross-module capability risks detected.';
  }

  const lines: string[] = [
    `Cross-Module Analysis: ${result.risks.length} risks found`,
    '',
  ];

  for (const risk of result.risks) {
    lines.push(`[${risk.severity}] ${risk.pattern_id}`);
    lines.push(`  Source: ${risk.source_module}::${risk.source_function}`);
    lines.push(`  Affected: ${risk.affected_modules.join(', ')}`);
    lines.push(`  ${risk.description}`);
    lines.push('');
  }

  // Add capability summary
  if (result.capabilities.length > 0) {
    lines.push('Capabilities tracked:');
    for (const cap of result.capabilities.slice(0, 5)) {
      lines.push(`  - ${cap.module}::${cap.name}`);
    }
    if (result.capabilities.length > 5) {
      lines.push(`  ... and ${result.capabilities.length - 5} more`);
    }
  }

  return lines.join('\n');
}

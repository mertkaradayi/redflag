// LLM Contract Analyzer - LangChain 3-Agent Chain with Database Persistence
// Architecture: Analyzer → Scorer → Reporter
// Uses dual OpenRouter support: fal.ai OpenRouter + Official OpenRouter

import { SuiClient } from '@mysten/sui/client';
import riskPatterns from './risk-patterns';
import { saveAnalysisResult, getAnalysisResult, type SafetyCard } from './supabase';
import { runLangChainAnalysisWithFallback } from './langchain-analyzer';
import { runStaticAnalysis, countFindingsBySeverity, type StaticAnalysisResult } from './static-analyzer';
import { runCrossModuleAnalysis } from './cross-module-analyzer';
import { analyzeDependencies, calculateDependencyRiskModifier } from './dependency-analyzer';
import { updateAnalysisDependencySummary } from './supabase';
import { AuditTrailCollector } from './audit-trail';

// Function to validate API keys at startup
export function validateApiKeys() {
  if (!process.env.OPEN_ROUTER_KEY) {
    throw new Error('[LLM] OPEN_ROUTER_KEY is required. Set it in your .env file.');
  }
}

// ----------------------------------------------------------------
// HELPER FUNCTIONS
// ----------------------------------------------------------------

/**
 * Extracts public functions, dependencies, and disassembled code from Sui modules
 */
export function extractPackageData(modules: any, modulesContent: any, packageId?: string) {
    const functions: any[] = [];
    const dependencySet = new Set<string>();

    if (!modules) return { publicFunctions: functions, dependencies: [], disassembledCode: modulesContent || {} };

    try {
        for (const [moduleName, module] of Object.entries(modules)) {
            if ((module as any).exposedFunctions) {
                for (const funcName in (module as any).exposedFunctions) {
                    const func = (module as any).exposedFunctions[funcName];
                    if (func.visibility === 'Public') {
                        const paramTypes = func.parameters.map((param: any) => normalizeMoveType(param));

                        functions.push({
                            module: moduleName,
                            name: funcName,
                            params: paramTypes
                        });
                    }
                }
            }

            // Extract dependencies from module's friends (external packages it exposes to)
            if ((module as any).friends) {
                for (const friend of (module as any).friends) {
                    if (friend.address && friend.address !== packageId) {
                        dependencySet.add(friend.address);
                    }
                }
            }
        }

        // Extract dependencies from disassembled bytecode
        // Look for external package addresses in the bytecode
        if (modulesContent) {
            const bytecodeStr = typeof modulesContent === 'string'
                ? modulesContent
                : JSON.stringify(modulesContent);

            // Match package addresses in bytecode
            // Format 1: 0x followed by hex characters, then :: (e.g., 0x2::transfer)
            // Format 2: Full 64-char hex address without 0x, then :: (e.g., 0000...0002::clock)
            const patterns = [
                /\b(0x[a-fA-F0-9]+)::/g,                    // Short form: 0x2::
                /\buse ([a-fA-F0-9]{64})::/g,              // Full form in 'use' statements
                /\b([a-fA-F0-9]{64})::[a-zA-Z_]/g         // Full form in code
            ];

            const normalizedPackageId = packageId?.toLowerCase().replace(/^0x/, '').padStart(64, '0');

            for (const pattern of patterns) {
                let match;
                while ((match = pattern.exec(bytecodeStr)) !== null) {
                    let addr = match[1].toLowerCase();
                    // Normalize to 0x format for consistency
                    if (!addr.startsWith('0x')) {
                        // Convert full 64-char to short form (strip leading zeros)
                        addr = '0x' + addr.replace(/^0+/, '') || '0x0';
                    }
                    // Exclude the current package itself
                    const normalizedAddr = addr.replace(/^0x/, '').padStart(64, '0');
                    if (normalizedPackageId && normalizedAddr === normalizedPackageId) continue;
                    dependencySet.add(addr);
                }
            }
        }
    } catch (e) {
        console.error("Error extracting package data:", e);
    }

    return {
        publicFunctions: functions,
        dependencies: Array.from(dependencySet),
        disassembledCode: modulesContent || {}
    };
}

function normalizeMoveType(param: any): any {
    if (typeof param === 'string') {
        return { kind: 'primitive', type: param };
    }

    if (typeof param !== 'object' || param === null) {
        return { kind: 'unknown', value: JSON.stringify(param) };
    }

    if (param.MutableReference) {
        return normalizeReferenceType(param.MutableReference, true);
    }

    if (param.Reference) {
        return normalizeReferenceType(param.Reference, false);
    }

    if (param.Struct) {
        const structInfo = normalizeStructType(param.Struct);
        return { kind: 'struct', value: structInfo.identifier, typeArgs: structInfo.typeArguments };
    }

    if (param.Vector) {
        return { kind: 'vector', value: normalizeMoveType(param.Vector) };
    }

    if (param.TypeParameter !== undefined) {
        return { kind: 'type-parameter', value: param.TypeParameter };
    }

    return { kind: 'unknown', value: JSON.stringify(param) };
}

function normalizeReferenceType(innerType: any, mutable: boolean) {
    if (typeof innerType === 'string') {
        return { kind: 'reference', type: innerType, mutable };
    }

    if (typeof innerType !== 'object' || innerType === null) {
        return { kind: 'reference', type: 'unknown', value: JSON.stringify(innerType), mutable };
    }

    if (innerType.Struct) {
        const structInfo = normalizeStructType(innerType.Struct);
        return {
            kind: 'reference',
            type: 'struct',
            value: structInfo.identifier,
            typeArgs: structInfo.typeArguments,
            mutable
        };
    }

    if (innerType.Vector) {
        return {
            kind: 'reference',
            type: 'vector',
            value: normalizeMoveType(innerType.Vector),
            mutable
        };
    }

    if (innerType.MutableReference || innerType.Reference) {
        const nested = innerType.MutableReference ?? innerType.Reference;
        const nestedMutable = !!innerType.MutableReference || mutable;
        return normalizeReferenceType(nested, nestedMutable);
    }

    return { kind: 'reference', type: 'unknown', value: JSON.stringify(innerType), mutable };
}

function normalizeStructType(struct: any) {
    const identifier = `${struct.address}::${struct.module}::${struct.name}`;
    const typeArguments = (struct.typeArguments || []).map((arg: any) => {
        if (typeof arg === 'string') return arg;
        if (arg && typeof arg === 'object') {
            if (arg.Struct) {
                const nested = normalizeStructType(arg.Struct);
                return nested.identifier;
            }
            if (arg.Address) return `Address(${arg.Address})`;
            if (arg.Vector) {
                const vector = normalizeMoveType(arg.Vector);
                return typeof vector === 'string' ? `vector<${vector}>` : `vector`;
            }
        }
        return JSON.stringify(arg);
    });

    return { identifier, typeArguments };
}

// Removed callGemini function - replaced with LangChain

/**
 * Validates and finalizes the safety card by adding risk_level
 */
function validateAndFinalize(safetyCard: any): SafetyCard {
    // Normalize risk_score to number
    let score = 0;
    if (safetyCard.risk_score !== undefined && safetyCard.risk_score !== null) {
        const parsed = typeof safetyCard.risk_score === 'string' 
            ? parseFloat(safetyCard.risk_score) 
            : safetyCard.risk_score;
        
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
            score = Math.round(parsed);
        } else {
            console.warn(`[VALIDATE] Invalid risk_score: ${safetyCard.risk_score}, defaulting to 50`);
            score = 50; // Default to moderate risk instead of 0
        }
    } else {
        console.warn('[VALIDATE] Missing risk_score, defaulting to 50');
        score = 50;
    }
    
    let level: 'low' | 'moderate' | 'high' | 'critical' = 'low';
    if (score >= 70) level = 'critical';
    else if (score >= 50) level = 'high';
    else if (score >= 30) level = 'moderate';
    
    return {
        ...safetyCard,
        risk_score: score,
        risk_level: level
    };
}

// ----------------------------------------------------------------
// AGENT RESPONSE SCHEMAS & PROMPTS - Now in LangChain modules
// ----------------------------------------------------------------
// Removed Gemini schemas and prompt builders
// See: langchain-schemas.ts, langchain-prompts.ts, langchain-analyzer.ts

// ----------------------------------------------------------------
// MAIN ANALYSIS CHAIN (3 Agents)
// ----------------------------------------------------------------

/**
 * Full Analysis Chain - Orchestrates 3 agents with database persistence
 */
export async function runFullAnalysisChain(packageId: string, network: string, suiClient: SuiClient, force: boolean = false) {
    console.log(`[ANALYSIS ${network}] Starting for ${packageId}...`);

    // Initialize audit trail collector
    const audit = new AuditTrailCollector(packageId, network);
    audit.startTimer();
    audit.setVersion('v1');

    // 0. Validate API keys before starting
    validateApiKeys();

    // 1. Check database for existing analysis (unless forced to skip)
    if (!force) {
        console.log('[1/6] Checking database for cached analysis...');
        const cachedResult = await getAnalysisResult(packageId, network);
        if (cachedResult.success && cachedResult.analysis) {
            console.log(`[DATABASE] Hit! Returning stored result for ${packageId}`);
            // Don't save audit for cache hits
            return cachedResult.analysis;
        }
    } else {
        console.log('[1/6] Force mode - skipping cache check');
    }

    // Wrap entire analysis in try-catch to save failed status for any error
    // (including early errors like bytecode fetch failures)
    let failureAlreadySaved = false;
    try {

    // 2. Fetch package data from Sui
    console.log(`[2/6] Fetching package object from Sui ${network}...`);
    const packageObject = await suiClient.getObject({
        id: packageId,
        options: { showContent: true, showOwner: true, showType: true }
    });
    
    const modulesContent = packageObject?.data?.content?.dataType === 'package' 
        ? (packageObject.data.content as any).disassembled 
        : null;
    
    if (!modulesContent) {
        throw new Error('Could not retrieve package content or disassembled bytecode.');
    }
    
    const owner = packageObject?.data?.owner;
    const publisherAddress = owner && typeof owner === 'object' && 'AddressOwner' in owner ? owner.AddressOwner : 'Unknown';
    console.log(`[2/6] Publisher: ${publisherAddress}`);
    
    const modules = await suiClient.getNormalizedMoveModulesByPackage({ package: packageId });
    
    // 3. Extract functions and structs
    const { publicFunctions, dependencies, disassembledCode } = extractPackageData(modules, modulesContent, packageId);
    console.log(`[3/6] Found ${publicFunctions.length} public functions, ${dependencies.length} dependencies`);

    // 3.5 Run static analysis (deterministic, pre-LLM)
    console.log('[3.5/6] Running static pattern analysis...');
    const staticFindings = runStaticAnalysis(disassembledCode, publicFunctions);
    const severityCounts = countFindingsBySeverity(staticFindings);
    console.log(`[3.5/6] Static analysis: ${staticFindings.findings.length} findings (${severityCounts.Critical}C/${severityCounts.High}H/${severityCounts.Medium}M/${severityCounts.Low}L) in ${staticFindings.analysis_time_ms}ms`);
    audit.recordStaticFindings(staticFindings.findings.length);

    // 3.6 Run cross-module analysis (capability flow tracking)
    console.log('[3.6/6] Running cross-module capability analysis...');
    const crossModuleAnalysis = runCrossModuleAnalysis(disassembledCode, publicFunctions);
    console.log(`[3.6/6] Cross-module: ${crossModuleAnalysis.capabilities.length} capabilities, ${crossModuleAnalysis.flows.length} flows, ${crossModuleAnalysis.risks.length} risks in ${crossModuleAnalysis.analysis_time_ms}ms`);
    audit.recordCrossModuleRisks(crossModuleAnalysis.risks.length);

    // 3.7 Run dependency analysis (check dependency risks)
    console.log('[3.7/6] Running dependency risk analysis...');
    const dependencyAnalysis = await analyzeDependencies(dependencies as string[], network, packageId);
    console.log(`[3.7/6] Dependencies: ${dependencyAnalysis.summary.total_dependencies} total, ${dependencyAnalysis.summary.audited_count} audited, ${dependencyAnalysis.summary.unaudited_count} unaudited, ${dependencyAnalysis.warnings.length} warnings in ${dependencyAnalysis.analysis_time_ms}ms`);

    // Fast lane: No public functions
    if (publicFunctions.length === 0) {
        console.log('[FAST LANE] No public functions - library package');
        const safeCard: SafetyCard = {
            summary: "This package contains no public entry functions. It is likely a library or utility package with no direct user interaction.",
            risky_functions: [],
            rug_pull_indicators: [],
            impact_on_user: "No direct impact as there are no callable functions.",
            why_risky_one_liner: "No risk detected - library package",
            risk_score: 0,
            risk_level: 'low'
        };
        await saveAnalysisResult(packageId, network, safeCard);

        // Save audit for fast lane (no LLM needed)
        audit.stopTimer();
        audit.recordRiskResult(0, 'low');
        audit.recordModuleStats(Object.keys(disassembledCode).length, Object.keys(disassembledCode).length);
        audit.recordFunctionStats(0, 0);
        audit.addWarning('fast_lane', 'No public functions - skipped LLM analysis');
        await audit.save();

        return safeCard;
    }

    // Extract struct definitions
    console.log('[3/6] Extracting struct definitions...');
    const uniqueStructs = new Set<string>();
    for (const func of publicFunctions) {
        for (const param of func.params) {
            if (param.kind === 'struct' && param.value) uniqueStructs.add(param.value);
            if (param.kind === 'reference' && param.type === 'struct' && param.value) uniqueStructs.add(param.value);
        }
    }
    
    const structDefinitions: any = {};
    for (const structId of uniqueStructs) {
        try {
            const parts = (structId as string).split('::');
            if (parts.length === 3) {
                const [packageAddr, moduleName, structName] = parts;
                const structDef = await suiClient.getNormalizedMoveStruct({
                    package: packageAddr,
                    module: moduleName,
                    struct: structName
                });
                if (structDef && structDef.fields) {
                    structDefinitions[structId] = structDef.fields.map((f: any) => ({
                        name: f.name,
                        type: typeof f.type === 'string' ? f.type : JSON.stringify(f.type)
                    }));
                }
            }
        } catch (error) {
            console.log(`[3/6] Warning: Could not fetch struct ${structId}`);
            structDefinitions[structId] = [{ name: 'unknown', type: 'unknown' }];
        }
    }

    // ============================================================
    // RUN LANGCHAIN 3-AGENT ANALYSIS
    // ============================================================
    console.log('[4/6] Running LangChain 3-agent analysis...');
    console.log('[4/6] Using: nvidia/nemotron-3-nano-30b-a3b:free via Nvidia');

    // Record module and function stats for audit
    const moduleCount = Object.keys(disassembledCode).length;
    audit.recordModuleStats(moduleCount, moduleCount);
    audit.recordFunctionStats(publicFunctions.length, publicFunctions.length);
    audit.recordModel('nvidia/nemotron-3-nano-30b-a3b:free');

    try {
        const safetyCard = await runLangChainAnalysisWithFallback({
            publicFunctions,
            structDefinitions,
            disassembledCode,
            riskPatterns,
            staticFindings,
            crossModuleAnalysis
        });

        // Save to database with 'completed' status
        console.log('[COMPLETE] Saving successful analysis to database...');
        await saveAnalysisResult(packageId, network, safetyCard, 'completed');

        // Update dependency summary in database
        if (dependencyAnalysis.summary.total_dependencies > 0) {
            await updateAnalysisDependencySummary(packageId, network, dependencyAnalysis.summary);
            console.log(`[DATABASE] Saved dependency summary for ${packageId}`);
        }

        // Record audit metrics from safetyCard
        audit.stopTimer();
        audit.recordRiskResult(safetyCard.risk_score, safetyCard.risk_level);
        if (safetyCard.technical_findings) {
            audit.recordLLMFindings(safetyCard.technical_findings.length);
        }
        if (safetyCard.validation_summary) {
            audit.recordValidatedFindings(safetyCard.validation_summary.validated);
        }
        if (safetyCard.analysis_quality?.truncation_occurred) {
            audit.recordTruncation();
        }

        // Save audit trail
        await audit.save();
        console.log(`[DATABASE] Saved completed analysis for ${packageId} on ${network}`);
        return safetyCard;

    } catch (analysisError) {
        // Analysis failed - save as failed status
        const errorMsg = analysisError instanceof Error ? analysisError.message : String(analysisError);
        console.error(`[FAILED] Analysis failed for ${packageId}:`, errorMsg);

        // Record error in audit
        audit.stopTimer();
        audit.addError('langchain_analysis', errorMsg);

        // Create minimal failed card (for structure only, marked as failed in DB)
        const failedCard: SafetyCard = {
            summary: "Analysis failed due to technical error. This contract needs manual review.",
            risky_functions: [],
            rug_pull_indicators: [],
            impact_on_user: "Unable to complete automated analysis.",
            why_risky_one_liner: "Analysis failed - manual review required",
            risk_score: 0,  // 0 indicates failed, not analyzed
            risk_level: 'low', // Not meaningful for failed analyses
        };

        // Save as FAILED status - will be excluded from UI
        await saveAnalysisResult(packageId, network, failedCard, 'failed', errorMsg);

        // Save audit trail even for failures (for debugging)
        await audit.save();
        console.log(`[DATABASE] Saved FAILED analysis for ${packageId} on ${network}`);

        // Mark as saved so outer catch doesn't save again
        failureAlreadySaved = true;

        // Re-throw error so caller knows it failed
        throw analysisError;
    }

    } catch (outerError) {
        // Outer catch for early failures (bytecode fetch, RPC errors, etc.)
        // that happen before the inner LangChain try-catch
        //
        // If failureAlreadySaved is true, the inner catch already handled this
        // error and saved to DB, so we just re-throw without saving again
        if (failureAlreadySaved) {
            throw outerError;
        }

        const errorMsg = outerError instanceof Error ? outerError.message : String(outerError);
        console.error(`[FAILED] Early analysis failure for ${packageId}:`, errorMsg);

        // Stop audit timer and record error
        audit.stopTimer();
        audit.addError('early_failure', errorMsg);

        // Create minimal failed card
        const failedCard: SafetyCard = {
            summary: "Analysis failed during data retrieval. This contract needs manual review.",
            risky_functions: [],
            rug_pull_indicators: [],
            impact_on_user: "Unable to retrieve contract data for analysis.",
            why_risky_one_liner: "Analysis failed - data retrieval error",
            risk_score: 0,
            risk_level: 'low',
        };

        // Save as FAILED status - prevents infinite retry loop
        await saveAnalysisResult(packageId, network, failedCard, 'failed', errorMsg);
        await audit.save();
        console.log(`[DATABASE] Saved FAILED analysis for ${packageId} on ${network} (early failure)`);

        // Re-throw so caller knows it failed
        throw outerError;
    }
}

/**
 * Get analysis result from database (replaces cache lookup)
 */
export async function getAnalysis(packageId: string, network: string) {
    const result = await getAnalysisResult(packageId, network);
    return result.analysis;
}

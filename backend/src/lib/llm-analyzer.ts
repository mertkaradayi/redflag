// LLM Contract Analyzer - LangChain 3-Agent Chain with Database Persistence
// Architecture: Analyzer → Scorer → Reporter
// Uses dual OpenRouter support: fal.ai OpenRouter + Official OpenRouter

import { SuiClient } from '@mysten/sui/client';
import riskPatterns from './risk-patterns';
import { saveAnalysisResult, getAnalysisResult, type SafetyCard } from './supabase';
import { runLangChainAnalysisWithFallback } from './langchain-analyzer';

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
export function extractPackageData(modules: any, modulesContent: any) {
    const functions: any[] = [];
    const dependencySet = new Set();
    
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
            
            if ((module as any).dependencies) {
                for (const depId of (module as any).dependencies) {
                    dependencySet.add(depId);
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

    // 0. Validate API keys before starting
    validateApiKeys();

    // 1. Check database for existing analysis (unless forced to skip)
    if (!force) {
        console.log('[1/6] Checking database for cached analysis...');
        const cachedResult = await getAnalysisResult(packageId, network);
        if (cachedResult.success && cachedResult.analysis) {
            console.log(`[DATABASE] Hit! Returning stored result for ${packageId}`);
            return cachedResult.analysis;
        }
    } else {
        console.log('[1/6] Force mode - skipping cache check');
    }
    
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
    const { publicFunctions, dependencies, disassembledCode } = extractPackageData(modules, modulesContent);
    console.log(`[3/6] Found ${publicFunctions.length} public functions, ${dependencies.length} dependencies`);
    
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
    console.log('[4/6] Using: openai/gpt-oss-120b via DeepInfra (99.98% uptime)');

    try {
        const safetyCard = await runLangChainAnalysisWithFallback({
            publicFunctions,
            structDefinitions,
            disassembledCode,
            riskPatterns
        });

        // Save to database with 'completed' status
        console.log('[COMPLETE] Saving successful analysis to database...');
        await saveAnalysisResult(packageId, network, safetyCard, 'completed');

        console.log(`[DATABASE] Saved completed analysis for ${packageId} on ${network}`);
        return safetyCard;

    } catch (analysisError) {
        // Analysis failed - save as failed status
        const errorMsg = analysisError instanceof Error ? analysisError.message : String(analysisError);
        console.error(`[FAILED] Analysis failed for ${packageId}:`, errorMsg);

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
        console.log(`[DATABASE] Saved FAILED analysis for ${packageId} on ${network}`);

        // Re-throw error so caller knows it failed
        throw analysisError;
    }
}

/**
 * Get analysis result from database (replaces cache lookup)
 */
export async function getAnalysis(packageId: string, network: string) {
    const result = await getAnalysisResult(packageId, network);
    return result.analysis;
}

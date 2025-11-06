// LLM Contract Analyzer - Simplified 3-Agent Chain with Database Persistence
// Architecture: Analyzer → Scorer → Reporter

import { GoogleGenerativeAI, SchemaType, type Schema } from '@google/generative-ai';
import { SuiClient } from '@mysten/sui/client';
import riskPatterns from './risk-patterns';
import { saveAnalysisResult, getAnalysisResult, type SafetyCard } from './supabase';

// Initialize Gemini AI with fallback support
const primaryApiKey = process.env.GOOGLE_API_KEY || '';
const fallbackApiKeyEnv = process.env.GOOGLE_API_KEY_FALLBACK || '';
let currentApiKey = primaryApiKey || fallbackApiKeyEnv;
let fallbackApiKey = fallbackApiKeyEnv;
let genAI: GoogleGenerativeAI | null = currentApiKey ? new GoogleGenerativeAI(currentApiKey) : null;

// Function to validate API keys at startup
export function validateApiKeys() {
  if (!process.env.GOOGLE_API_KEY && !process.env.GOOGLE_API_KEY_FALLBACK) {
    throw new Error('[LLM] No Google API keys configured. Set GOOGLE_API_KEY or GOOGLE_API_KEY_FALLBACK');
  }
}

// Function to switch to fallback API key
function switchToFallbackApiKey() {
    if (fallbackApiKey && fallbackApiKey !== currentApiKey) {
        console.log('[API KEY] Switching to fallback API key due to quota limit');
        currentApiKey = fallbackApiKey;
        genAI = new GoogleGenerativeAI(currentApiKey);
        
        // Schedule reset to primary key after 1 hour (quota resets daily)
        setTimeout(() => {
            if (process.env.GOOGLE_API_KEY && process.env.GOOGLE_API_KEY !== currentApiKey) {
                console.log('[API KEY] Resetting back to primary API key');
                currentApiKey = process.env.GOOGLE_API_KEY;
                genAI = new GoogleGenerativeAI(currentApiKey);
            }
        }, 60 * 60 * 1000); // 1 hour
        
        return true;
    }
    return false;
}

function isQuotaError(error: unknown) {
    const status = (error as { status?: number })?.status;
    if (status === 429) return true;

    const message = (error instanceof Error && error.message) ? error.message : String(error ?? '');
    const lowerMessage = message.toLowerCase();

    if (message.includes('429')) return true;

    return lowerMessage.includes('quota exceeded') || lowerMessage.includes('resource has been exhausted') || lowerMessage.includes('rate limit');
}

function getGenAI() {
    if (!currentApiKey) {
        throw new Error('[LLM] No active Google API key available for Gemini client');
    }
    if (!genAI) {
        genAI = new GoogleGenerativeAI(currentApiKey);
    }
    return genAI;
}

// Function to add exponential backoff delay
function getRetryDelay(attempt: number): number {
    const baseDelay = 2000; // 2 seconds
    const maxDelay = 30000; // 30 seconds
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    return delay + Math.random() * 1000; // Add jitter
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

/**
 * Generic LLM Helper - Calls Gemini with any prompt and fallback API key support
 */
type GeminiCallOptions = {
    expectsJson?: boolean;
    responseSchema?: Schema;
    retryWithFallback?: boolean;
};

async function callGemini(
    prompt: string,
    options: GeminiCallOptions = {},
    attempt = 0
) {
    console.log(` > [Gemini Call] Firing agent... (attempt ${attempt + 1})`);
    const { expectsJson = false, responseSchema, retryWithFallback = true } = options;
    
    try {
        const model = getGenAI().getGenerativeModel({ 
            // model: "gemini-2.5-flash"
            model: "gemini-2.5-flash-lite"
        });

        const generationConfig = expectsJson
            ? {
                responseMimeType: "application/json",
                ...(responseSchema ? { responseSchema } : {})
            }
            : undefined;

        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            ...(generationConfig ? { generationConfig } : {})
        });

        const response = result.response;
        if (!response || !response.text) {
          throw new Error('Gemini returned empty or blocked response');
        }
        const rawText = response.text();
        
        if (expectsJson) {
            try {
                // Look for JSON object in the response
                const jsonMatch = rawText.match(/\{[\s\S]*\}/);
                const jsonText = jsonMatch ? jsonMatch[0] : rawText;
                return JSON.parse(jsonText);
            } catch (jsonError) {
                console.warn('[Gemini Call] JSON parsing failed, trying to fix...');
                
                // Try to fix common JSON issues
                const fixedJson = rawText
                    .replace(/,(\s*[}\]])/g, '$1')
                    .replace(/([{,]\s*)(\w+):/g, '$1"$2":')
                    .replace(/:\s*([^",{\[\s][^,}\]]*?)(\s*[,\}])/g, ': "$1"$2');
                
                try {
                    return JSON.parse(fixedJson);
                } catch (fixError) {
                    console.error('[Gemini Call] JSON parsing failed:', rawText);
                    return {
                        error: 'JSON parsing failed',
                        raw_response: rawText,
                        fallback: true
                    };
                }
            }
        }
        return rawText;
    } catch (error) {
        const errorMessage = (error as Error).message;
        console.error('[Gemini Call] Error:', errorMessage);
        
        // Check if it's a quota limit error
        if (isQuotaError(error)) {
            
            // Try switching to fallback API key if we haven't already
            if (retryWithFallback && switchToFallbackApiKey()) {
                console.log('[API KEY] Retrying with fallback API key...');
                const delay = getRetryDelay(attempt);
                console.log(`[API KEY] Waiting ${Math.round(delay)}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                
                // Retry with fallback API key (but don't retry again if this fails)
                return callGemini(prompt, { ...options, retryWithFallback: false }, attempt + 1);
            }
            
            // If we can't switch to fallback or already tried, wait and retry with current key
            if (attempt < 3) { // Max 3 retries
                const delay = getRetryDelay(attempt);
                console.log(`[API KEY] Quota exceeded, waiting ${Math.round(delay)}ms before retry ${attempt + 1}/3...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                
                return callGemini(prompt, options, attempt + 1);
            }
        }
        
        throw error;
    }
}

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
// AGENT RESPONSE SCHEMAS & PROMPT BUILDERS (3-Agent Chain)
// ----------------------------------------------------------------

const analyzerResponseSchema: Schema = {
    type: SchemaType.OBJECT,
    properties: {
        technical_findings: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    function_name: { type: SchemaType.STRING },
                    technical_reason: { type: SchemaType.STRING },
                    matched_pattern_id: { type: SchemaType.STRING },
                    severity: { type: SchemaType.STRING },
                    contextual_notes: {
                        type: SchemaType.ARRAY,
                        items: { type: SchemaType.STRING }
                    },
                    evidence_code_snippet: { type: SchemaType.STRING }
                },
                required: ['function_name', 'technical_reason', 'matched_pattern_id', 'severity']
            }
        }
    },
    required: ['technical_findings']
};

const scorerResponseSchema: Schema = {
    type: SchemaType.OBJECT,
    properties: {
        risk_score: { type: SchemaType.NUMBER },
        justification: { type: SchemaType.STRING },
        confidence: { type: SchemaType.STRING }
    },
    required: ['risk_score', 'justification', 'confidence']
};

const reporterResponseSchema: Schema = {
    type: SchemaType.OBJECT,
    properties: {
        summary: { type: SchemaType.STRING },
        risky_functions: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    function_name: { type: SchemaType.STRING },
                    reason: { type: SchemaType.STRING }
                },
                required: ['function_name', 'reason']
            }
        },
        rug_pull_indicators: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    pattern_name: { type: SchemaType.STRING },
                    evidence: { type: SchemaType.STRING }
                },
                required: ['pattern_name', 'evidence']
            }
        },
        impact_on_user: { type: SchemaType.STRING },
        why_risky_one_liner: { type: SchemaType.STRING }
    },
    required: ['summary', 'risky_functions', 'rug_pull_indicators', 'impact_on_user', 'why_risky_one_liner']
};

/**
 * Agent 1: Analyzer - Comprehensive technical analysis in single pass
 */
function buildAnalyzerPrompt(publicFunctions: any[], structDefinitions: any, disassembledCode: any) {
    return `
You are a Senior Sui/Move Security Auditor performing comprehensive contract analysis.

Your task: Analyze ALL public functions and identify security risks using the Knowledge Base patterns.

---KNOWLEDGE BASE (Security Patterns)---
${riskPatterns}
---END KNOWLEDGE BASE---

---PUBLIC FUNCTIONS---
${JSON.stringify(publicFunctions, null, 2)}
---END PUBLIC FUNCTIONS---

---STRUCT DEFINITIONS---
${JSON.stringify(structDefinitions, null, 2)}
---END STRUCT DEFINITIONS---

---DISASSEMBLED CODE (For Evidence)---
${JSON.stringify(disassembledCode, null, 2)}
---END DISASSEMBLED CODE---

ANALYSIS REQUIREMENTS:
1. Examine each public function for security risks
2. Match risks to specific Pattern IDs from Knowledge Base (e.g., CRITICAL-01, HIGH-02)
3. Extract Severity from the matched pattern
4. Find evidence in disassembled code that proves the vulnerability
5. Note contextual factors (mitigations, complexity, access controls)

CONTEXTUAL OBSERVATIONS TO INCLUDE:
- "Function requires specific Capability object" (AdminCap, TreasuryCap, etc.)
- "Function emits relevant events" (transparency)
- "Logic seems simple/direct" or "Logic is complex/conditional"
- "Checks for Timelock detected" or "Multi-sig check seems present"
- "No obvious mitigations detected"
- "Function can be called by anyone"
- "Can withdraw any Coin type (generic)"
- "Affects core user funds"

GOLDEN RULE: Return ONLY valid JSON. No markdown, no explanations, no extra text.

Return JSON schema:
{
  "technical_findings": [
    {
      "function_name": "string",
      "technical_reason": "Detailed technical explanation",
      "matched_pattern_id": "string (e.g., CRITICAL-01)",
      "severity": "string (Critical, High, Medium, or Low)",
      "contextual_notes": ["observation1", "observation2"],
      "evidence_code_snippet": "string (relevant code from disassembled)"
    }
  ]
}
`;
}

/**
 * Agent 2: Scorer - Calculate numeric risk score
 */
function buildScorerPrompt(technicalFindings: any[]) {
    const findingsSummary = technicalFindings.map(f => {
        const context = f.contextual_notes ? ` | Context: ${f.contextual_notes.join(', ')}` : '';
        return `- Func: ${f.function_name}, Pattern: ${f.matched_pattern_id} (${f.severity})${context}`;
    }).join('\n');

    return `
You are a Sui Smart Contract Quantitative Risk Assessor. Calculate a precise risk score (0-100).

---TECHNICAL FINDINGS---
${findingsSummary}
---END FINDINGS---

---SCORING ALGORITHM---
1. Base Scores:
   - Critical findings: +50 points each
   - High findings: +20 points each
   - Medium findings: +5 points each
   - Low findings: +1 point each

2. Apply Modifiers from contextual_notes:
   - Mitigations (Timelock, Multi-sig, Internal-only): -10 to -30 points
   - Aggravations (Generic drain, No checks, Arbitrary recipient): +5 to +10 points

3. Combination Effects:
   - Score >= 90: Add +5 (critical mass)
   - 3+ High findings (no Critical): Add +10
   - Pause + (Fee/Withdraw/Mint): Add +5

4. Cap at 100, round to integer

5. Confidence:
   - High: Clear Critical/High findings with simple logic
   - Medium: Complex logic or many modifiers
   - Low: Uncertain evidence

GOLDEN RULE: Return ONLY valid JSON.

Return JSON schema:
{
  "risk_score": 0,
  "justification": "Step-by-step calculation with all modifiers explained",
  "confidence": "string (High, Medium, Low)"
}
`;
}

/**
 * Agent 3: Reporter - User-friendly translation
 */
function buildReporterPrompt(technicalFindings: any[], riskScoreReport: any) {
    return `
You are a Security Communicator. Translate technical analysis into user-friendly JSON.

TECHNICAL FINDINGS:
${JSON.stringify(technicalFindings, null, 2)}

RISK SCORE:
${JSON.stringify(riskScoreReport, null, 2)}

RULES:
- Do NOT make up new facts
- Do NOT change the score
- Translate technical language to plain language
- Be clear and direct about risks
- Include evidence snippets in risky_functions reasons

GOLDEN RULE: Return ONLY valid JSON.

Return JSON schema:
{
  "summary": "1-2 sentence summary of contract risk profile",
  "risky_functions": [
    {
      "function_name": "...",
      "reason": "User-friendly explanation with evidence"
    }
  ],
  "rug_pull_indicators": [
    {
      "pattern_name": "owner_can_withdraw_all",
      "evidence": "Specific function/parameter proof"
    }
  ],
  "impact_on_user": "Clear explanation of user impact",
  "why_risky_one_liner": "One sentence main risk"
}
`;
}

// ----------------------------------------------------------------
// MAIN ANALYSIS CHAIN (3 Agents)
// ----------------------------------------------------------------

/**
 * Full Analysis Chain - Orchestrates 3 agents with database persistence
 */
export async function runFullAnalysisChain(packageId: string, network: string, suiClient: SuiClient) {
    console.log(`[ANALYSIS ${network}] Starting for ${packageId}...`);
    
    // 0. Validate API keys before starting
    validateApiKeys();
    
    // 1. Check database for existing analysis
    console.log('[1/6] Checking database for cached analysis...');
    const cachedResult = await getAnalysisResult(packageId, network);
    if (cachedResult.success && cachedResult.analysis) {
        console.log(`[DATABASE] Hit! Returning stored result for ${packageId}`);
        return cachedResult.analysis;
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
    // AGENT 1: ANALYZER
    // ============================================================
    console.log('[4/6] Agent 1: Analyzer - Comprehensive technical analysis...');
    const analyzerPrompt = buildAnalyzerPrompt(publicFunctions, structDefinitions, disassembledCode);
    const analyzerResult = await callGemini(analyzerPrompt, {
        expectsJson: true,
        responseSchema: analyzerResponseSchema
    });
    
    // Validate response structure
    if (analyzerResult.fallback || !analyzerResult.technical_findings || !Array.isArray(analyzerResult.technical_findings)) {
        console.warn('[4/6] Analyzer returned invalid structure, using fallback');
        const fallbackCard: SafetyCard = {
            summary: "Analysis incomplete due to AI response error. Manual review recommended.",
            risky_functions: [],
            rug_pull_indicators: [],
            impact_on_user: "Unable to complete analysis due to technical issues.",
            why_risky_one_liner: "Analysis incomplete - manual review required",
            risk_score: 50,
            risk_level: 'moderate'
        };
        await saveAnalysisResult(packageId, network, fallbackCard);
        return fallbackCard;
    }
    
    // Additional validation: check array has valid objects
    if (analyzerResult.technical_findings.length > 0) {
        const firstFinding = analyzerResult.technical_findings[0];
        if (!firstFinding || typeof firstFinding !== 'object' || !firstFinding.function_name) {
            console.warn('[4/6] Analyzer findings malformed, using fallback');
            const fallbackCard: SafetyCard = {
                summary: "Analysis incomplete due to AI response error. Manual review recommended.",
                risky_functions: [],
                rug_pull_indicators: [],
                impact_on_user: "Unable to complete analysis due to technical issues.",
                why_risky_one_liner: "Analysis incomplete - manual review required",
                risk_score: 50,
                risk_level: 'moderate'
            };
            await saveAnalysisResult(packageId, network, fallbackCard);
            return fallbackCard;
        }
    }
    
    const technicalFindings = analyzerResult.technical_findings;
    console.log(`[4/6] Analyzer complete. Found ${technicalFindings.length} findings.`);

    // Fast lane: No risks found
    if (technicalFindings.length === 0) {
        console.log('[FAST LANE] No risks detected');
        const safeCard: SafetyCard = {
            summary: "This contract passed security analysis with no suspicious patterns detected.",
            risky_functions: [],
            rug_pull_indicators: [],
            impact_on_user: "No significant risks identified in the analysis.",
            why_risky_one_liner: "Low risk - no suspicious patterns detected",
            risk_score: 5,
            risk_level: 'low'
        };
        await saveAnalysisResult(packageId, network, safeCard);
        return safeCard;
    }

    // ============================================================
    // AGENT 2: SCORER
    // ============================================================
    console.log('[5/6] Agent 2: Scorer - Calculating risk score...');
    const scorerPrompt = buildScorerPrompt(technicalFindings);
    const scorerResult = await callGemini(scorerPrompt, {
        expectsJson: true,
        responseSchema: scorerResponseSchema
    });
    
    // Validate scorer response
    if (scorerResult.fallback || typeof scorerResult !== 'object' || scorerResult.risk_score === undefined) {
        console.warn('[5/6] Scorer returned invalid response, using fallback');
        const fallbackCard: SafetyCard = {
            summary: "Risk scoring failed due to AI response error. Manual review recommended.",
            risky_functions: [],
            rug_pull_indicators: [],
            impact_on_user: "Unable to complete risk scoring.",
            why_risky_one_liner: "Scoring incomplete - manual review required",
            risk_score: 50,
            risk_level: 'moderate'
        };
        await saveAnalysisResult(packageId, network, fallbackCard);
        return fallbackCard;
    }
    
    console.log(`[5/6] Scorer complete. Score: ${scorerResult.risk_score}`);

    // ============================================================
    // AGENT 3: REPORTER
    // ============================================================
    console.log('[6/6] Agent 3: Reporter - Generating user-friendly report...');
    const reporterPrompt = buildReporterPrompt(technicalFindings, scorerResult);
    const reporterResult = await callGemini(reporterPrompt, {
        expectsJson: true,
        responseSchema: reporterResponseSchema
    });
    
    // Validate reporter response
    if (reporterResult.fallback || typeof reporterResult !== 'object' || !reporterResult.summary) {
        console.warn('[6/6] Reporter returned invalid response, using fallback');
        const fallbackCard: SafetyCard = {
            summary: "Report generation failed due to AI response error. Manual review recommended.",
            risky_functions: [],
            rug_pull_indicators: [],
            impact_on_user: "Unable to generate user-friendly report.",
            why_risky_one_liner: "Report generation incomplete - manual review required",
            risk_score: scorerResult.risk_score || 50,
            risk_level: 'moderate'
        };
        await saveAnalysisResult(packageId, network, fallbackCard);
        return fallbackCard;
    }

    // Assemble final safety card
    const draftSafetyCard = {
        ...reporterResult,
        risk_score: scorerResult.risk_score,
        technical_findings: technicalFindings
    };

    // Finalize and save to database
    console.log('[COMPLETE] Finalizing and saving to database...');
    const finalSafetyCard = validateAndFinalize(draftSafetyCard);
    await saveAnalysisResult(packageId, network, finalSafetyCard);
    
    console.log(`[DATABASE] Saved analysis for ${packageId} on ${network}`);
    return finalSafetyCard;
}

/**
 * Get analysis result from database (replaces cache lookup)
 */
export async function getAnalysis(packageId: string, network: string) {
    const result = await getAnalysisResult(packageId, network);
    return result.analysis;
}

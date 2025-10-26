// server.js (ESM Module System - 4-Agent + 1-Critic Chain Architecture - No Simulation)

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { SuiClient } from '@mysten/sui/client';
import riskPatterns from './risk_patterns.js';

// 1. Initialize all clients at the top (global)
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const app = express();
app.use(express.json());
app.use(cors());

// In-memory cache for analysis results (network-aware: key format is "packageId@network")
const analysisCache = new Map();

// ----------------------------------------------------------------
// HELPER FUNCTIONS
// ----------------------------------------------------------------

/**
 * Extracts public functions, dependencies, and disassembled code from Sui modules
 * @param {Object} modules - Normalized modules from Sui
 * @param {Object} modulesContent - Disassembled bytecode content
 * @returns {Object} - { publicFunctions, dependencies, disassembledCode }
 */
function extractPackageData(modules, modulesContent) {
    const functions = [];
    const dependencySet = new Set();
    
    if (!modules) return { publicFunctions: functions, dependencies: [], disassembledCode: modulesContent || {} };

    try {
        for (const [moduleName, module] of Object.entries(modules)) {
            // Sui SDK uses camelCase: exposedFunctions
            if (module.exposedFunctions) {
                for (const funcName in module.exposedFunctions) {
                    const func = module.exposedFunctions[funcName];
                    // visibility comes as "Public" (capitalized)
                    if (func.visibility === 'Public') {
                        // Map parameters to rich type objects
                        const paramTypes = func.parameters.map(param => {
                            // Check for reference types first (&T or &mut T)
                            if (typeof param === 'object' && param.Reference) {
                                let innerType = param.Reference;
                                let mutable = false;
                                
                                // Check if it's a mutable reference
                                if (typeof innerType === 'object' && innerType.MutableReference) {
                                    innerType = innerType.MutableReference;
                                    mutable = true;
                                }
                                
                                // Resolve the inner type
                                if (typeof innerType === 'string') {
                                    return { kind: 'reference', type: innerType, mutable: mutable };
                                }
                                if (typeof innerType === 'object' && innerType.Struct) {
                                    const structId = `${innerType.Struct.address}::${innerType.Struct.module}::${innerType.Struct.name}`;
                                    return { kind: 'reference', type: 'struct', value: structId, mutable: mutable };
                                }
                                if (typeof innerType === 'object' && innerType.Vector) {
                                    return { kind: 'reference', type: 'vector', value: '...', mutable: mutable };
                                }
                            }
                            
                            // Handle non-reference types
                            if (typeof param === 'string') {
                                return { kind: 'primitive', type: param }; // e.g., "U64", "Address"
                            }
                            
                            if (typeof param === 'object' && param.Struct) {
                                const structId = `${param.Struct.address}::${param.Struct.module}::${param.Struct.name}`;
                                // Check for generics like Coin<T>
                                const typeArgs = param.Struct.type_arguments?.map(arg => {
                                    if (typeof arg === 'string') return arg;
                                    if (typeof arg === 'object' && arg.Struct) {
                                        return `${arg.Struct.address}::${arg.Struct.module}::${arg.Struct.name}`;
                                    }
                                    return 'TypeArg';
                                }) || [];
                                return { kind: 'struct', value: structId, typeArgs: typeArgs };
                            }
                            
                            if (typeof param === 'object' && param.Vector) {
                                return { kind: 'vector', value: '...' };
                            }
                            
                            return { kind: 'unknown', value: JSON.stringify(param) };
                        });
                        
                        functions.push({
                            module: moduleName,
                            name: funcName,
                            params: paramTypes
                        });
                    }
                }
            }
            
            // Extract dependencies (imported packages)
            if (module.dependencies) {
                for (const depId of module.dependencies) {
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

/**
 * Generic LLM Helper - Calls Gemini with any prompt
 */
async function callGemini(prompt, isJson = false) {
    console.log(' > [Gemini Call] Firing agent...');
    
    try {
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash"
        });

        const generationConfig = isJson 
            ? { responseMimeType: "application/json" }
            : {};

        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig
        });

        const response = result.response;
        
        // Defensive JSON parsing
        try {
            const rawText = response.text();
            if (isJson) {
                return JSON.parse(rawText);
            }
            return rawText;
        } catch (e) {
            console.error('[Gemini Call] FAILED TO PARSE JSON.');
            console.error('The AI returned this non-JSON text:');
            console.error('----------------- AI RESPONSE START -----------------');
            console.error(response.text());
            console.error('------------------ AI RESPONSE END ------------------');
            throw new Error('AI agent returned invalid JSON, stopping analysis chain.');
        }
    } catch (error) {
        console.error('[Gemini Call] Error:', error.message);
        throw error;
    }
}

/**
 * Validates and finalizes the safety card by adding risk_level
 */
function validateAndFinalize(safetyCard) {
    const score = safetyCard.risk_score || 0;
    let level = 'low';
    if (score >= 70) level = 'critical';
    else if (score >= 50) level = 'high';
    else if (score >= 30) level = 'moderate';
    
    return {
        ...safetyCard,
        risk_level: level
    };
}

// ----------------------------------------------------------------
// AGENT PROMPT BUILDERS
// ----------------------------------------------------------------

/**
 * Agent 1: Triage - Identify potentially risky functions
 */
function buildTriagePrompt(publicFunctions, structDefinitions, dependencyRisks) {
    return `
You are a Junior Security Auditor performing initial triage.

Your task: Scan the following list of public functions and flag any that MIGHT be risky based on:
1. Function names (e.g., 'withdraw', 'mint', 'pause', 'upgrade', 'destroy')
2. Parameters (e.g., TreasuryCap, AdminCap, Coin, Balance)
3. Struct field details (e.g., a struct with 'balance' or 'supply' fields)
4. Inherited risks from dependencies

---PUBLIC FUNCTIONS---
${JSON.stringify(publicFunctions, null, 2)}
---END PUBLIC FUNCTIONS---

---STRUCT DEFINITIONS (for context)---
${JSON.stringify(structDefinitions, null, 2)}
---END STRUCT DEFINITIONS---

---DEPENDENCY RISKS (Inherited from imported packages)---
${JSON.stringify(dependencyRisks, null, 2)}
---END DEPENDENCY RISKS---

IMPORTANT:
- Flag functions that could allow admin control, fund withdrawal, minting, pausing, or upgrading.
- If dependencyRisks exist, consider that this contract inherits those risks.
- Be cautious but not overly paranoid. Standard library functions (0x1::, 0x2::) are usually safe.

--- GOLDEN RULE: Your response MUST be ONLY the valid JSON object described in the schema. Do NOT add any other text, explanations, markdown, or introductory phrases like "Here is the JSON:". Your response must start with { and end with }. ---

Return only a JSON object with this schema:
{
  "potentially_risky_functions": ["function_name_1", "function_name_2"]
}
`;
}

/**
 * Agent 2: Technical Analyst - Deep analysis of flagged functions (with Chain of Evidence)
 */
function buildTechAnalysisPrompt(publicFunctions, riskyFunctionNames, structDefinitions, dependencyRisks, disassembledCode) {
    return `
You are a Senior Sui/Move Technical Security Auditor with forensic code analysis expertise.

A junior auditor has flagged these functions as potentially risky based on names/params: ${JSON.stringify(riskyFunctionNames)}

Your task is to perform a deep technical analysis on ONLY these flagged functions.

Use the detailed KNOWLEDGE BASE (v2 - Scoring Focused) below, the FULL FUNCTION LIST (with parameters and struct definitions), and the DISASSEMBLED CODE provided for forensic evidence.

For each flagged function, determine:
1. What is the technical risk? (e.g., allows admin withdrawal, vulnerable to oracle manipulation, potential integer overflow)
2. Which specific pattern from the KNOWLEDGE BASE does it match?
3. What is the PATTERN ID (e.g., CRITICAL-01, HIGH-02, MEDIUM-03, LOW-01)?
4. What is the SEVERITY LEVEL extracted from that pattern's definition in the Knowledge Base?
5. What parameters or struct fields reveal the vulnerability?
6. How do DEPENDENCY RISKS amplify the danger (if applicable)?
7. What CONTEXTUAL OBSERVATIONS can you make about this function that might affect risk scoring?

---KNOWLEDGE BASE (v2 - Security Patterns with IDs and Scoring Hints)---
${riskPatterns}
---END KNOWLEDGE BASE---

---FULL FUNCTION LIST (Context)---
Public Functions: ${JSON.stringify(publicFunctions, null, 2)}

Struct Definitions: ${JSON.stringify(structDefinitions, null, 2)}

Dependency Risks: ${JSON.stringify(dependencyRisks, null, 2)}
---END FULL FUNCTION LIST---

---DISASSEMBLED CODE (For Evidence Extraction)---
${JSON.stringify(disassembledCode, null, 2)}
---END DISASSEMBLED CODE---

---FLAGGED FUNCTIONS FOR DEEP ANALYSIS---
${JSON.stringify(riskyFunctionNames)}
---END FLAGGED FUNCTIONS---

IMPORTANT ANALYSIS GUIDELINES:
- Match each function to a SPECIFIC pattern ID from the Knowledge Base
- Pattern IDs to use:
  * CRITICAL-01: Admin Drain / Unrestricted Withdraw
  * CRITICAL-02: Unrestricted Code Upgrade
  * HIGH-01: Unlimited Token Minting
  * HIGH-02: Contract Pausing / Freezing
  * HIGH-03: Arbitrary Fee Manipulation
  * HIGH-04: Centralized Access Control / Role Bypass
  * MEDIUM-01: Oracle Manipulation Risk
  * MEDIUM-02: Timestamp Dependence
  * MEDIUM-03: Reentrancy Potential
  * MEDIUM-04: Flash Loan Logic Exploit Risk
  * LOW-01: Integer Overflow/Underflow Risk
  * LOW-02: Denial of Service (DoS) Potential
  * LOW-03: Misleading Event Emission / Lack of Events
- Extract the Severity field from the matched pattern's definition in the Knowledge Base
- Explain the ROOT CAUSE using struct field details (e.g., "TreasuryCap contains 'total_supply' field enabling unlimited minting")
- Reference specific parameters that create the vulnerability
- Consider how dependency risks compound the threat

CHAIN OF EVIDENCE REQUIREMENT:
- When you identify a risk (matched_pattern_id), you MUST find the relevant lines or instructions in the provided DISASSEMBLED CODE that serve as evidence for this risk
- Extract the specific code snippet that demonstrates the vulnerability (e.g., function signature, key instructions, dangerous operations)
- Include this code snippet in the evidence_code_snippet field
- The snippet should be concise but sufficient to prove the risk exists
- If the disassembled code is not available or the evidence is unclear, state "Evidence not found in disassembled code" in the snippet field

CONTEXTUAL OBSERVATIONS TO REPORT:
For each finding, provide a list of contextual_notes that may affect risk scoring:
- "Function is internal-only (not public entry)" - If the function is not directly callable by users
- "Function emits relevant events" - If event::emit calls are present for transparency
- "Logic seems simple/direct" - If the function has straightforward, minimal logic
- "Logic is complex/conditional" - If the function has multiple branches or complex conditions
- "Requires specific Capability object" - If parameters include AdminCap, TreasuryCap, UpgradeCap, etc.
- "Checks for Timelock detected" - If timelock-related keywords or structs appear in context
- "Multi-sig check seems present" - If multi-signature verification logic is evident
- "No obvious mitigations detected" - If no protective measures are visible
- "Function can be called by anyone" - If there are no capability/permission checks
- "Multiple withdrawal functions exist" - If there are several similar risky functions
- "Can withdraw any Coin type (generic)" - If the function uses generic types for coins
- "Affects core user funds" - If the function directly impacts user balances
- Any other relevant observations that would influence the Score Modifiers from the Knowledge Base

--- GOLDEN RULE: Your response MUST be ONLY the valid JSON object described in the schema. Do NOT add any other text, explanations, markdown, or introductory phrases like "Here is the JSON:". Your response must start with { and end with }. ---

Return only a JSON object with this schema:
{
  "technical_findings": [
    {
      "function_name": "string",
      "technical_reason": "Detailed technical explanation of the risk",
      "matched_pattern_id": "string (e.g., CRITICAL-01, HIGH-02, MEDIUM-03)",
      "severity": "string (Critical, High, Medium, or Low - extracted from the Knowledge Base)",
      "contextual_notes": ["string", "string", "..."], // List of observations about mitigations, complexity, access control, etc.
      "evidence_code_snippet": "string (Relevant disassembled code lines that prove this vulnerability exists)"
    }
  ]
}
`;
}

/**
 * Builds the prompt for Agent 3: Risk Scorer (Hyper-Precise Version)
 * @param {Array<object>} technicalFindings - Findings from Agent 2, including severity and contextual_notes.
 * @returns {string} - The prompt for Gemini.
 */
function buildScoringPrompt(technicalFindings) {
    // Prepare findings for the prompt, including context
    const findingsSummary = technicalFindings.map(f => {
        const context = f.contextual_notes ? ` | Context: ${f.contextual_notes.join(', ')}` : '';
        return `- Func: ${f.function_name}, Pattern: ${f.matched_pattern_id} (${f.severity})${context}, Reason: ${f.technical_reason}`;
    }).join('\n');

    const jsonSchema = `
{
  "risk_score": 0, // Final score (0-100)
  "justification": "Extremely detailed step-by-step calculation: Base scores, all adjustments (+/- points with reasons referencing context/combinations), final capped score.",
  "confidence": "string (High, Medium, Low)" // How confident are you in this score given the available info?
}
`;

    // New HYPER-PRECISE scoring instructions
    return `
You are a meticulous and expert Sui Smart Contract Quantitative Risk Assessor. Your task is to calculate a hyper-precise numeric risk score (0-100) based only on the technical findings below, using the provided Knowledge Base excerpts and scoring algorithm. Provide a detailed step-by-step justification and your confidence level.

--- TECHNICAL FINDINGS (Includes Contextual Notes) ---
${findingsSummary}
--- END FINDINGS ---

--- KNOWLEDGE BASE (v3 - Quantitative Scoring - For Reference) ---
${riskPatterns}
--- END KNOWLEDGE BASE ---

--- HYPER-PRECISE SCORING ALGORITHM ---

1. Initialize Score: Start current_score = 0.

2. Iterate Through Findings: For each finding in technical_findings:
   a. Retrieve Base Score: Get the Base_Score from the Knowledge Base using matched_pattern_id.
   b. Calculate Initial Contribution: Start finding_contribution = Base_Score.
   c. Apply Contextual Modifiers (from contextual_notes and KB Score_Modifiers):
      * Mitigation: If notes mention Timelock (> 24h), Multi-sig, or Internal-only for Critical/High risks, 
        apply the negative point modifier specified in the KB (e.g., finding_contribution -= 30).
      * Aggravation: If notes mention Generic Type Drain, Arbitrary Recipient, Instant Upgrade, 
        apply the positive point modifier specified in the KB (e.g., finding_contribution += 10).
      * Capability Check: If notes mention "Requires specific Capability object" and the finding is Critical/High, 
        slightly increase confidence in the finding (but don't change score yet unless KB specifies).
      * Simplicity vs Complexity: If notes mention "Logic seems simple/direct" for a Critical/High risk, 
        slightly increase the contribution (e.g., finding_contribution += 5). 
        If "Logic is complex/conditional", slightly decrease (e.g., finding_contribution -= 5) as exploit might be harder.
   d. Add to Total: Add the adjusted finding_contribution to current_score.

3. Apply Combination / Synergy Effects (After iterating all findings):
   * Critical Mass: If current_score >= 90 (due to one or more Criticals): 
     current_score = Math.min(100, current_score + 5). (Solidify critical score).
   * High Risk Cluster: If number of High severity findings >= 3 AND no Critical findings: 
     current_score = Math.min(100, current_score + 10). (Multiple high risks are worse together).
   * Pausable + X: If a HIGH-02 (Pause) finding exists AND another High/Critical finding (like Fee Manip, Withdraw, Mint) exists: 
     current_score = Math.min(100, current_score + 5). (Pause enables other exploits).

4. Final Score Capping: final_score = Math.max(0, Math.min(100, Math.round(current_score))).

5. Determine Confidence:
   * If score is high (>=75) AND supported by clear Critical/High findings with simple logic: Confidence = "High".
   * If score relies heavily on Medium findings, complex logic, or many negative modifiers were applied: Confidence = "Medium".
   * If score is low (<25) AND findings are only Low severity or mitigated: Confidence = "High".
   * Otherwise: Confidence = "Medium".

6. Write Justification: Provide a step-by-step breakdown: 
   Initial base scores summed, list every single modifier applied (+/- points and why, referencing contextual notes or combinations), 
   the score before capping, the final capped score, and the reasoning for the confidence level.

--- REQUIRED JSON SCHEMA ---
${jsonSchema}

GOLDEN RULE: Your response MUST be ONLY the valid JSON object described in the schema. Do NOT add any other text, explanations, markdown, or introductory phrases. Your response must start with { and end with }.
`;
}

/**
 * Agent 4: Report Writer - Translate technical findings to user-friendly report
 */
function buildReportPrompt(technicalFindings, riskScoreReport, dependencyRisks) {
    return `
You are a Security Communicator. Your job is to translate the following technical report and score into a user-friendly JSON.

TECHNICAL FINDINGS:
${JSON.stringify(technicalFindings, null, 2)}

RISK SCORE REPORT:
${JSON.stringify(riskScoreReport, null, 2)}

DEPENDENCY RISKS (Inherited risks from imported packages):
${JSON.stringify(dependencyRisks, null, 2)}

IMPORTANT RULES:
- Do NOT make up new facts
- Do NOT change the score
- Only translate technical language to user-friendly language
- Be clear and direct about risks
- If dependencyRisks exist, mention inherited risks in the summary and impact_on_user (e.g., "This contract depends on X risky packages, which amplifies the overall risk")

CHAIN OF EVIDENCE INTEGRATION:
- When generating the risky_functions list, include the evidence_code_snippet provided by the technical analyst in the reason field
- Format the evidence nicely within the reason (e.g., "This function allows admin withdrawal. Evidence: [code snippet]")
- Make the code snippet readable and informative for users
- If no evidence snippet is available, omit it from the reason

--- GOLDEN RULE: Your response MUST be ONLY the valid JSON object described in the schema. Do NOT add any other text, explanations, markdown, or introductory phrases like "Here is the JSON:". Your response must start with { and end with }. ---

Return only a JSON object with this schema:
{
  "summary": "1-2 sentence summary of the contract's risk profile",
  "risky_functions": [
    {
      "function_name": "...",
      "reason": "User-friendly explanation"
    }
  ],
  "rug_pull_indicators": [
    {
      "pattern_name": "owner_can_withdraw_all",
      "evidence": "Specific function/parameter that proves this pattern"
    }
  ],
  "impact_on_user": "Clear explanation of how users are affected",
  "why_risky_one_liner": "One sentence explaining the main risk"
}
`;
}

/**
 * Agent 5: Critic - Validate consistency between technical facts and report
 */
function buildCriticPrompt(technicalFindings, finalReportDraft) {
    return `
You are a Quality Assurance Critic. Your only job is to validate consistency.

TECHNICAL FINDINGS (The Facts):
${JSON.stringify(technicalFindings, null, 2)}

FINAL REPORT DRAFT:
${JSON.stringify(finalReportDraft, null, 2)}

VALIDATION QUESTIONS:
1. Does the summary accurately reflect the severity of the technical findings?
2. Are all critical findings mentioned in the report?
3. Does the risk score match the severity described in the summary?
4. Is the impact_on_user consistent with the identified patterns?
5. Are the rug_pull_indicators backed by actual evidence from the technical findings?

--- GOLDEN RULE: Your response MUST be ONLY the valid JSON object described in the schema. Do NOT add any other text, explanations, markdown, or introductory phrases like "Here is the JSON:". Your response must start with { and end with }. ---

Return only a JSON object with this schema:
{
  "is_consistent": true,
  "feedback": "If inconsistent, explain what needs to be fixed. If consistent, say 'Report is accurate.'"
}
`;
}

/**
 * Agent 4 (Re-run): Correction - Rewrite report based on critic feedback
 */
function buildCorrectionPrompt(finalReportDraft, criticFeedback) {
    return `
You are a Security Communicator. The Quality Assurance team has provided feedback on your report.

ORIGINAL REPORT:
${JSON.stringify(finalReportDraft, null, 2)}

FEEDBACK FROM QA:
${criticFeedback}

Your task: Rewrite the report to address the feedback. Keep the same schema structure.

--- GOLDEN RULE: Your response MUST be ONLY the valid JSON object described in the schema. Do NOT add any other text, explanations, markdown, or introductory phrases like "Here is the JSON:". Your response must start with { and end with }. ---

Return only a JSON object with this schema:
{
  "summary": "...",
  "risky_functions": [...],
  "rug_pull_indicators": [...],
  "impact_on_user": "...",
  "why_risky_one_liner": "..."
}
`;
}

// ----------------------------------------------------------------
// MAIN ANALYSIS CHAIN
// ----------------------------------------------------------------

/**
 * Full Analysis Chain - Orchestrates all agents
 * This function is reusable by both the /analyze endpoint and the Live Threat Feed
 */
async function runFullAnalysisChain(packageId, network, suiClient, cacheKey) {
    console.log(`[CACHE-DB ${network}] Miss! Calling full analysis chain for ${cacheKey}...`);
    
    // 2. Fetch detailed package data from Sui (including disassembled code)
    console.log(`[2/5] Fetching detailed package object from Sui ${network}...`);
    const packageObject = await suiClient.getObject({
        id: packageId,
        options: { showContent: true, showOwner: true, showType: true }
    });
    
    // Extract disassembled code for evidence
    const modulesContent = packageObject?.data?.content?.dataType === 'package' 
        ? packageObject.data.content.disassembled 
        : null;
    
    if (!modulesContent) {
        throw new Error('Could not retrieve package content or disassembled bytecode.');
    }
    
    console.log('[2/5] Package content retrieved. Extracting disassembled code...');
    
    // Extract publisher address
    const publisherAddress = packageObject?.data?.owner?.AddressOwner;
    console.log(`[2/5] Publisher address identified: ${publisherAddress || 'Unknown'}`);
    
    // Also fetch normalized modules for structured data
    const modules = await suiClient.getNormalizedMoveModulesByPackage({ package: packageId });
    
    // 3. Extract functions, dependencies, and disassembled code
    const { publicFunctions, dependencies, disassembledCode } = extractPackageData(modules, modulesContent);
    console.log(`[3/5] Found ${publicFunctions.length} public functions and ${dependencies.length} dependencies.`);
    
    // Fast Lane: No public functions
    if (publicFunctions.length === 0) {
        console.log('[CHAIN] No public functions found. Bypassing analysis.');
        const safeCard = {
            summary: "This package contains no public entry functions. It is likely a library or utility package with no direct user interaction.",
            risky_functions: [],
            rug_pull_indicators: [],
            impact_on_user: "No direct impact as there are no callable functions.",
            why_risky_one_liner: "No risk detected - library package",
            risk_score: 0
        };
        const finalCard = validateAndFinalize(safeCard);
        analysisCache.set(cacheKey, finalCard);
        return finalCard;
    }

    // ============================================================
    // CHAIN 2.5: EXTRACT STRUCT DEFINITIONS (DEEP ANALYSIS)
    // ============================================================
    console.log('[CHAIN 2.5/5] Extracting unique struct types...');
    const uniqueStructs = new Set();
    
    // Collect all unique struct types from function parameters
    for (const func of publicFunctions) {
        for (const param of func.params) {
            if (param.kind === 'struct' && param.value) {
                uniqueStructs.add(param.value);
            }
            if (param.kind === 'reference' && param.type === 'struct' && param.value) {
                uniqueStructs.add(param.value);
            }
        }
    }
    
    console.log(`[CHAIN 2.5/5] Fetching definitions for ${uniqueStructs.size} structs...`);
    const structDefinitions = {};
    
    // Fetch struct definitions from Sui
    for (const structId of uniqueStructs) {
        try {
            // Parse structId: "0x2::coin::Coin" -> package, module, struct
            const parts = structId.split('::');
            if (parts.length === 3) {
                const [packageAddr, moduleName, structName] = parts;
                
                const structDef = await suiClient.getNormalizedMoveStruct({
                    package: packageAddr,
                    module: moduleName,
                    struct: structName
                });
                
                // Extract field names and types
                if (structDef && structDef.fields) {
                    structDefinitions[structId] = structDef.fields.map(f => ({
                        name: f.name,
                        type: typeof f.type === 'string' ? f.type : JSON.stringify(f.type)
                    }));
                }
            }
        } catch (error) {
            console.log(`[CHAIN 2.5/5] Warning: Could not fetch struct ${structId}: ${error.message}`);
            structDefinitions[structId] = [{ name: 'unknown', type: 'unknown' }];
        }
    }
    
    console.log(`[CHAIN 2.5/5] Struct extraction complete. Fetched ${Object.keys(structDefinitions).length} definitions.`);

    // ============================================================
    // CHAIN 2.6: CHECK DEPENDENCY RISKS
    // ============================================================
    console.log('[CHAIN 2.6/5] Checking cache for inherited dependency risks...');
    const dependencyRisks = dependencies
        .map(depId => {
            if (analysisCache.has(depId)) {
                const cachedCard = analysisCache.get(depId);
                return { id: depId, risk_score: cachedCard.risk_score, level: cachedCard.risk_level };
            }
            return null;
        })
        .filter(dep => dep !== null && (dep.level === 'high' || dep.level === 'moderate'));
    
    if (dependencyRisks.length > 0) {
        console.log(`[CHAIN 2.6/5] WARNING: Found ${dependencyRisks.length} risky dependencies.`);
    } else {
        console.log(`[CHAIN 2.6/5] No risky dependencies detected in cache.`);
    }

    // ============================================================
    // CHAIN 1: TRIAGE
    // ============================================================
    console.log('[CHAIN 1/5] Performing Triage...');
    const triagePrompt = buildTriagePrompt(publicFunctions, structDefinitions, dependencyRisks);
    const triageResult = await callGemini(triagePrompt, true);
    const riskyFunctionNames = triageResult.potentially_risky_functions || [];
    console.log(`[CHAIN 1/5] Triage complete. Found ${riskyFunctionNames.length} potential risks.`);

    // Fast Lane: Clean contract
    if (riskyFunctionNames.length === 0) {
        console.log('[CHAIN] Triage found 0 risks. Analysis complete.');
        const safeCard = {
            summary: "This contract passed initial triage with no suspicious functions detected.",
            risky_functions: [],
            rug_pull_indicators: [],
            impact_on_user: "No significant risks identified in the initial analysis.",
            why_risky_one_liner: "Low risk - no suspicious patterns detected",
            risk_score: 5
        };
        const finalCard = validateAndFinalize(safeCard);
        analysisCache.set(cacheKey, finalCard);
        return finalCard;
    }

    // ============================================================
    // CHAIN 2: TECHNICAL ANALYSIS (with Chain of Evidence)
    // ============================================================
    console.log('[CHAIN 2/5] Performing Technical Analysis with Evidence Extraction...');
    const techPrompt = buildTechAnalysisPrompt(publicFunctions, riskyFunctionNames, structDefinitions, dependencyRisks, disassembledCode);
    const techResult = await callGemini(techPrompt, true);
    console.log('[CHAIN 2/5] Technical Analysis complete with evidence snippets.');

    // ============================================================
    // CHAIN 3: RISK SCORING
    // ============================================================
    console.log('[CHAIN 3/5] Performing Risk Scoring...');
    const scoringPrompt = buildScoringPrompt(techResult.technical_findings);
    const scoringResult = await callGemini(scoringPrompt, true);
    console.log(`[CHAIN 3/5] Scoring complete. Score: ${scoringResult.risk_score}`);

    // ============================================================
    // CHAIN 4: REPORT GENERATION
    // ============================================================
    console.log('[CHAIN 4/5] Generating Initial Report...');
    const reportPrompt = buildReportPrompt(techResult.technical_findings, scoringResult, dependencyRisks);
    let reportResult = await callGemini(reportPrompt, true);

    // Assemble draft
    let draftSafetyCard = {
        ...reportResult,
        risk_score: scoringResult.risk_score
    };

    // ============================================================
    // CHAIN 5: CRITIC VALIDATION
    // ============================================================
    console.log('[CHAIN 5/5] Performing Critic Validation...');
    const criticPrompt = buildCriticPrompt(techResult.technical_findings, draftSafetyCard);
    const criticResult = await callGemini(criticPrompt, true);
    console.log(`[CHAIN 5/5] Critic validation complete. Consistent: ${criticResult.is_consistent}`);

    // ============================================================
    // SELF-CORRECTION LOOP
    // ============================================================
    if (!criticResult.is_consistent) {
        console.log(`[CORRECTION] Critic found inconsistency: ${criticResult.feedback}. Re-running writer...`);
        const correctionPrompt = buildCorrectionPrompt(draftSafetyCard, criticResult.feedback);
        reportResult = await callGemini(correctionPrompt, true);
        draftSafetyCard = {
            ...reportResult,
            risk_score: scoringResult.risk_score
        };
    }

    // ============================================================
    // FINALIZE
    // ============================================================
    console.log('[COMPLETE] Finalizing card.');
    const finalSafetyCard = validateAndFinalize(draftSafetyCard);
    console.log(`[CACHE-DB ${network}] Saving new result for ${cacheKey}...`);
    analysisCache.set(cacheKey, finalSafetyCard);
    
    return finalSafetyCard;
}

// ----------------------------------------------------------------
// MAIN ENDPOINT - THE ORCHESTRATOR
// ----------------------------------------------------------------

app.post('/analyze', async (req, res) => {
    try {
        const { package_id, network } = req.body;
        
        // Validate network parameter
        const validatedNetwork = (network === 'testnet') ? 'testnet' : 'mainnet'; // Default to mainnet
        
        console.log(`[1/5] Analyzing package_id: ${package_id} on ${validatedNetwork}`);
        
        // Define RPC URL based on network
        const rpcUrl = validatedNetwork === 'testnet' 
            ? 'https://fullnode.testnet.sui.io:443' 
            : 'https://fullnode.mainnet.sui.io:443';
        console.log(`Using RPC URL: ${rpcUrl}`);
        
        // Create local Sui client for this request
        const suiClient = new SuiClient({ url: rpcUrl });
        
        // Define network-specific cache key
        const cacheKey = `${package_id}@${validatedNetwork}`;
        
        // Check cache with network-specific key
        if (analysisCache.has(cacheKey)) {
            console.log(`[CACHE-DB ${validatedNetwork}] Hit! Returning stored result for ${cacheKey}`);
            const cachedCard = analysisCache.get(cacheKey);
            return res.status(200).json({
                message: `Analysis successful (from cache - ${validatedNetwork})`,
                safetyCard: cachedCard
            });
        }
        
        // Run full analysis chain with network-specific client
        const finalSafetyCard = await runFullAnalysisChain(package_id, validatedNetwork, suiClient, cacheKey);
        
        return res.status(200).json({
            message: `Analysis successful (${validatedNetwork})`,
            safetyCard: finalSafetyCard
        });
        
    } catch (error) {
        console.error('[ERROR]', error.message);
        return res.status(500).json({
            error: "Analysis failed",
            details: error.message
        });
    }
});

// ----------------------------------------------------------------
// LIVE THREAT FEED (Optional - Auto-analyze new packages)
// ----------------------------------------------------------------

async function startLiveThreatFeed() {
    console.log('📡 [LIVE] Starting Live Threat Feed... Subscribing to new packages on Mainnet...');
    
    // Create dedicated Mainnet Sui client for Live Threat Feed
    const mainnetSuiClient = new SuiClient({ url: 'https://fullnode.mainnet.sui.io:443' });
    
    try {
        await mainnetSuiClient.subscribeEvent({
            filter: { MoveEventType: '0x2::package::Publish' },
            onMessage: async (event) => {
                try {
                    const packageId = event.packageId;
                    console.log(`[LIVE] New package published: ${packageId}`);
                    
                    // Network-specific cache key (mainnet)
                    const cacheKey = `${packageId}@mainnet`;
                    
                    // Check cache with network-specific key
                    if (analysisCache.has(cacheKey)) {
                        console.log(`[LIVE] Package ${cacheKey} already in cache. Skipping.`);
                        return;
                    }
                    
                    // Analyze new package on mainnet
                    console.log(`[LIVE] New package is not in cache. Starting analysis...`);
                    await runFullAnalysisChain(packageId, 'mainnet', mainnetSuiClient, cacheKey);
                    console.log(`[LIVE] Analysis for ${cacheKey} complete and cached.`);
                    
                } catch (error) {
                    console.error(`[LIVE] Error analyzing package: ${error.message}`);
                }
            }
        });
    } catch (error) {
        console.error('[LIVE] Failed to start threat feed:', error.message);
    }
}

// ----------------------------------------------------------------
// START SERVER
// ----------------------------------------------------------------

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Sui Contract Analyzer server running on port ${PORT}`);
    console.log(`📡 4-Agent + 1-Critic Chain Architecture`);
    console.log(`📡 Ready to analyze contracts at http://localhost:${PORT}/analyze`);
});

// Start live threat feed
startLiveThreatFeed();

const riskPatterns = `
# SUI/MOVE SECURITY PATTERNS KNOWLEDGE BASE (v2 - Scoring Focused)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                            CRITICAL SEVERITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ID: CRITICAL-01
Name: Admin Drain / Unrestricted Withdraw
Severity: Critical

Description:
Allows an admin/owner to unilaterally withdraw all or significant user/protocol 
funds (native SUI, bridged assets, valuable NFTs) from the contract. This is 
the most direct rug pull mechanism.

Indicators:
• Functions taking admin Capability (e.g., AdminCap, TreasuryCap, OwnerCap)
• Interacting with Balance<T> or Coin<T> state
• Calling transfer::public_transfer or internal balance logic without user 
  permission checks
• Keywords: withdraw, emergency_withdraw, drain, sweep, collect_all_fees, 
  migrate_funds, rescue_funds
• Look for functions named ambiguously (e.g., maintain, cleanup) that operate 
  on core balance objects

Base Score Hint: 90-100

Score Modifiers:
(+) If multiple withdrawal functions exist
(+) If function can withdraw any Coin type (generic)
(-) If withdrawal is subject to a mandatory, non-bypassable Timelock 
    (Reduce significantly, potentially to Medium/High)
(-) If withdrawal requires multi-sig approval verified on-chain 
    (Reduce significantly)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ID: CRITICAL-02
Name: Unrestricted Code Upgrade
Severity: Critical

Description:
Allows an admin to change the contract's code arbitrarily and instantly without 
governance or delay. Can introduce backdoors, change rules, or steal funds.

Indicators:
• Functions taking UpgradeCap
• Calling package::authorize_upgrade, package::commit_upgrade
• Similar system functions related to package upgrades
• Controlled solely by an admin
• Keywords: upgrade, update_version, migrate, set_implementation

Base Score Hint: 95-100

Score Modifiers:
(-) If upgrade requires on-chain multi-sig approval (Reduce significantly)
(-) If upgrade is subject to a mandatory, non-bypassable Timelock 
    (Reduce significantly)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                              HIGH SEVERITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ID: HIGH-01
Name: Unlimited Token Minting
Severity: High

Description:
Allows an admin to mint unlimited amounts of a primary protocol token or 
reward token, destroying its value or enabling unfair distribution/theft.

Indicators:
• Minting functions (coin::mint, coin::mint_and_transfer)
• Controlled by an admin Capability (e.g., TreasuryCap)
• Without verifiable checks on total supply or emission schedules
• Keywords: mint, issue, emission, reward

Base Score Hint: 70-90

Score Modifiers:
(+) If minting can be directed to an arbitrary address
(+) If applied to the main governance/utility token
(-) If minting is clearly for rewards and tied to a fixed/controlled emission 
    schedule (potentially Medium)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ID: HIGH-02
Name: Contract Pausing / Freezing
Severity: High

Description:
Allows an admin to halt all or critical contract functions (transfers, 
withdrawals, swaps), trapping user funds indefinitely.

Indicators:
• A global bool state (e.g., is_paused) checked in critical functions
• Changeable only by an admin
• Keywords: pause, unpause, paused, freeze, halt, emergency_stop

Base Score Hint: 65-85

Score Modifiers:
(+) If pausing affects core withdrawal/transfer functions
(-) If pausing only affects secondary features (e.g., new deposits, 
    rewards claiming)
(-) If there's a clear, non-admin controlled unpause mechanism (e.g., time-based)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ID: HIGH-03
Name: Arbitrary Fee Manipulation
Severity: High

Description:
Allows an admin to arbitrarily change critical fee parameters (e.g., swap fees, 
withdrawal fees, protocol fees) to excessive levels, siphoning user funds or 
making the protocol unusable.

Indicators:
• Functions controlled by admin capability that modify fee rate variables 
  (u64, u128, percentages)
• Used in core financial logic without reasonable limits
• Keywords: set_fee, update_rate, protocol_fee, admin_fee, fee_percent

Base Score Hint: 60-80

Score Modifiers:
(+) If fees can be set to 100% or extremely high values
(+) If applied to core functions like swapping or withdrawing
(-) If changes are subject to a Timelock (potentially Medium)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ID: HIGH-04
Name: Centralized Access Control / Role Bypass
Severity: High

Description:
Flaws allowing admins to grant themselves or others excessive power, remove 
other admins, bypass multi-sig, or gain unauthorized access.

Indicators:
• Functions allowing adding/removing admins (add_role, remove_member)
• Setting arbitrary roles (set_roles)
• Role assignment logic errors
• Lack of multi-sig checks for critical admin actions
• Keywords: role, admin, owner, grant, revoke, acl, require_admin, is_owner

Base Score Hint: 60-85

Score Modifiers:
(+) If a single admin can remove other admins or bypass multi-sig
(+) If roles grant access to Critical functions (Withdraw, Upgrade)
(-) If roles are granular and follow least privilege principle

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                             MEDIUM SEVERITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ID: MEDIUM-01
Name: Oracle Manipulation Risk
Severity: Medium

Description:
Protocol relies on potentially manipulable price oracles for critical operations.

Indicators:
• Use of single-source DEX pool prices (sqrt_price)
• Especially from low-liquidity pools
• Without TWAP or multiple oracle validation
• Keywords: oracle, price, feed, get_price

Base Score Hint: 30-60

Score Modifiers:
(+) If used for liquidations or high-value swaps
(-) If using reputable oracle providers (e.g., Pyth, Switchboard) correctly
(-) If using robust TWAP mechanisms

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ID: MEDIUM-02
Name: Timestamp Dependence
Severity: Medium

Description:
Critical logic relies directly on block timestamps.

Indicators:
• Logic based directly on sui::clock::timestamp_ms()
• Keywords: timestamp, clock, now

Base Score Hint: 20-40

Score Modifiers:
(+) If used for unlocking large funds or critical state changes
(-) If used for non-critical things like reward calculations over short periods

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ID: MEDIUM-03
Name: Reentrancy Potential (Move Context)
Severity: Medium

Description:
Potential for re-entry attacks via external calls before state updates, 
especially with shared objects or complex callbacks.

Indicators:
• Pattern: Read state -> Call external -> Write state
• Especially involving receive-style functions or shared object mutations
• Keywords: External calls, shared objects, callbacks

Base Score Hint: 25-55

Score Modifiers:
(+) If the external call is to an arbitrary/untrusted address
(-) If Move's object ownership model inherently prevents the specific 
    reentrancy vector

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ID: MEDIUM-04
Name: Flash Loan Logic Exploit Risk
Severity: Medium

Description:
Internal logic within flash loan callbacks might be exploitable.

Indicators:
• Complex state changes, price calculations, or balance updates inside flash 
  loan execution paths
• Keywords: flash_loan, flash_swap, repay, Receipt

Base Score Hint: 30-60

Score Modifiers:
(+) If exploitable logic involves core price or balance calculations
(-) If logic is simple and only involves basic checks/repayment

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                              LOW SEVERITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ID: LOW-01
Name: Integer Overflow/Underflow Risk (Potential)
Severity: Low

Description:
Potential for math errors in complex calculations if safe math isn't used. 
(Move is generally safe).

Indicators:
• Highly complex arithmetic logic
• Especially if not using standard libraries
• Keywords: balance, amount, complex formulas

Base Score Hint: 5-15

Score Modifiers:
(+) If complex math involves critical financial calculations
(-) If standard safe math practices are clearly used

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ID: LOW-02
Name: Denial of Service (DoS) Potential
Severity: Low

Description:
Potential for users/attackers to block or impede contract usage for others.

Indicators:
• Unbounded loops
• Unbounded vector pushes based on user input
• Gas-heavy operations exploitable by attackers
• Keywords: vector, loop, while

Base Score Hint: 5-20

Score Modifiers:
(+) If DoS can block critical functions like withdrawals
(-) If DoS only affects minor features or is easily mitigated

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ID: LOW-03
Name: Misleading Event Emission / Lack of Events
Severity: Low

Description:
Events emitted might be inaccurate, misleading, or missing for critical state 
changes, hindering off-chain monitoring.

Indicators:
• Critical actions (admin changes, fund movements) happen without 
  corresponding event::emit
• Event data doesn't match state changes
• Keywords: event::emit

Base Score Hint: 5-10

Score Modifiers:
(+) If missing events hide critical fund movements

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                          PATTERN MATCHING GUIDE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When analyzing contracts, use these IDs to reference patterns:

CRITICAL PATTERNS:
• CRITICAL-01: owner_can_withdraw_all, admin_drain, unrestricted_withdraw
• CRITICAL-02: unrestricted_upgrade, malicious_upgrade, proxy_upgradeability

HIGH PATTERNS:
• HIGH-01: unlimited_minting, infinite_mint
• HIGH-02: can_pause_contract, pausable_contract, contract_freezing
• HIGH-03: fee_manipulation, arbitrary_fees, unfair_fees
• HIGH-04: access_control_bypass, role_bypass, centralized_control

MEDIUM PATTERNS:
• MEDIUM-01: oracle_manipulation_risk, price_feed_risk
• MEDIUM-02: timestamp_dependence, block_time_risk
• MEDIUM-03: reentrancy_risk, reentrancy_potential
• MEDIUM-04: flash_loan_logic_exploit, flash_loan_risk

LOW PATTERNS:
• LOW-01: integer_overflow_underflow_risk, math_safety
• LOW-02: denial_of_service_risk, dos_potential
• LOW-03: event_emission_issues, missing_events

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                          SCORING METHODOLOGY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BASE SCORING SYSTEM:
• Critical Findings: +50 points each
• High Findings: +20 points each
• Medium Findings: +5 points each
• Low Findings: +1 point each
• Maximum Score: 100 (cap)

SCORE MODIFIERS:
Apply the modifiers listed in each pattern to adjust the base score.
Consider context, mitigations (Timelock, multi-sig), and severity of impact.

EXAMPLE CALCULATIONS:

Scenario 1: Rug Pull Risk
• 1 Critical (CRITICAL-01: admin_drain) = 50 points
• 1 High (HIGH-01: unlimited_minting) = 20 points
• Total = 70 points
• Justification: "Critical risk: 1 admin drain vulnerability + 1 unlimited 
  minting capability"

Scenario 2: Maximum Risk
• 2 Critical (CRITICAL-01 + CRITICAL-02) = 100 points
• 1 High (HIGH-02) = 20 points (would be 120, capped at 100)
• Total = 100 points (capped)
• Justification: "Maximum risk: 2 Critical vulnerabilities (admin drain + 
  unrestricted upgrade)"

Scenario 3: Moderate Risk
• 2 High (HIGH-02 + HIGH-03) = 40 points
• 3 Medium (MEDIUM-01 + MEDIUM-02 + MEDIUM-04) = 15 points
• Total = 55 points
• Justification: "High risk: 2 High findings (pausing + fee manipulation) + 
  3 Medium findings"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                          ANALYSIS BEST PRACTICES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. PRIORITIZE CRITICAL AND HIGH PATTERNS
   Focus analysis efforts on detecting the most dangerous vulnerabilities first.

2. LOOK FOR PATTERN COMBINATIONS
   Multiple patterns compound risk (e.g., admin_drain + unlimited_minting).

3. CONSIDER CONTEXT
   DeFi protocols have higher oracle/flash loan risks.
   NFT projects have different risk profiles.

4. CHECK FOR MITIGATIONS
   Timelocks, multi-sig, governance mechanisms significantly reduce risk.

5. EXAMINE STRUCT FIELDS
   Hidden capabilities in struct fields (balance, supply, paused state).

6. REVIEW DEPENDENCIES
   Inherited risks from imported packages.

7. VALIDATE SCORING MODIFIERS
   Apply (+) and (-) modifiers based on actual code analysis.

8. USE PATTERN IDs
   Reference patterns by ID (e.g., CRITICAL-01) for clarity and consistency.
`;

export default riskPatterns;

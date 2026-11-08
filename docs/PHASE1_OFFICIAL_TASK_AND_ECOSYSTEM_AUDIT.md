# Phase 1: Official Task & Ecosystem Audit Report

**Product:** Pharos PayPilot — Natural-Language Payment Agent  
**Suggested Repository:** `pharos-natural-language-payment-agent`  
**Workspace:** `C:\Users\NO GO NO\PharosBuild\skills\pharos-natural-language-payment-agent`  
**Task URL:** https://pharos-agent-arena.vercel.app/tasks/natural-language-payment-agent  
**Pharos AI Hub:** https://ai.pharos.xyz/  
**Pharos Docs:** https://docs.pharos.xyz/  
**x402 Docs:** https://docs.pharos.xyz/developer-guide/x402  
**Date of Audit:** 2026-11-08T05:05:00Z  

---

## 1. Official Task Verification & Requirements

Inspection of the live task page (`https://pharos-agent-arena.vercel.app/tasks/natural-language-payment-agent`) verifies the following canonical specifications:

- **Task Title**: Natural-Language Payment Agent
- **Tier**: Medium
- **Category**: Payments
- **Points Awarded**: 100 points (+50 points with video demonstration)
- **Core Objective**: "An agent that turns a plain-language instruction like 'send 100 USDC to alice.eth' into a fully prepared transaction for the user to review and sign. This generalizes Harbor's action pattern."
- **Mandatory Requirements**:
  - **Requirement 01**: Parses amount, token, and recipient from free text, and asks a follow-up when anything is ambiguous.
  - **Requirement 02**: Validates the request: recipient format, token contract, sufficient balance.
  - **Requirement 03**: Shows a human-readable summary before producing the unsigned transaction.
  - **Requirement 04**: Never signs or sends on its own. Output is an unsigned transaction or a wallet signing request.
- **Reviewer Evaluation Criteria**: Reviewers score strictly against items 01–04. Missing items incur partial point deductions.
- **Accepted Proof Link Formats**:
  1. A deployed, accessible demo URL.
  2. A public repository link containing source code and documentation.
  3. A share link from `ai.pharos.xyz` or an on-chain transaction hash where applicable.
  4. Optional: A walkthrough video for the +50 points bonus.

---

## 2. Harbor Action Pattern Analysis & Generalization

### 2.1 The Core Harbor Pattern
In the Pharos ecosystem, the Harbor action pattern pioneered the separation of intent preparation from transaction signing:
1. **Natural-Language Understanding**: Converts ambiguous human language into a strongly typed, deterministic data structure.
2. **Deterministic Pre-Flight Validation**: Validates recipient syntax, verified token contracts, and sufficient on-chain balances *prior* to wallet invocation.
3. **Interactive Ambiguity Resolution**: If any critical field (`amount`, `token`, `recipient`, `chain`) is absent or conflicting, the agent transitions into a conversational clarification flow rather than guessing.
4. **Structured Review Card**: Renders an explicit, human-readable summary with all fees, amounts, and destination parameters clearly visible.
5. **Separation of Preparation & Signing**: The agent **only** constructs an unsigned transaction payload. Signing and broadcasting are strictly delegated to the user's browser wallet (e.g., MetaMask, Rabby, Wagmi) following an explicit user click.

### 2.2 Generalization for Pharos PayPilot
We generalize this pattern across:
- **Multiple Networks**: Pharos Pacific Mainnet (`1672`), Pharos Atlantic Testnet (`688689`), and Base Mainnet (`8453`) for cross-network verification.
- **Multiple Asset Classes**: Native gas currency (`PROS`), standard ERC-20 tokens (`USDC`, `USDT`, `WBTC`, `WETH`, `WPROS`), and x402 payment requests.
- **State Machine Integrity**: An explicit 7-stage lifecycle preventing state skipping or premature wallet prompting.

---

## 3. Pharos AI Hub & MCP Tooling Audit

- **AI Hub URL**: `https://ai.pharos.xyz/`
- **Architecture**: AI.Pharos serves as the central hub for agent-ready documentation, network configuration, and Model Context Protocol (MCP) integrations (`/llms-txt`, `/network-info`, `/pharos-mcp`, `/build-tools`, `/skill-engine`).
- **MCP Endpoints**:
  - Pharos Chain MCP: `https://mcp.pharos.xyz/mcp` (Chain status, block telemetry, RPC routing)
  - Pharos Docs MCP: `https://docs.pharos.xyz/~gitbook/mcp` (Developer documentation search)
- **Role in PayPilot**: PayPilot utilizes Pharos MCP queries for real-time chain verification and documentation-grounded token parameters while running an autonomous non-custodial browser client.

---

## 4. Official Network & Token Configuration

Verified against `docs.pharos.xyz/getting-started/network` and `docs.pharos.xyz/getting-started/token-registry`:

### 4.1 Pharos Pacific Mainnet
- **Chain ID**: `1672`
- **Network Name**: Pharos Pacific Mainnet
- **Native Gas Asset**: `PROS` (18 decimals)
- **Public RPC**: `https://rpc.pharos.xyz`
- **Block Explorer**: `https://www.pharosscan.xyz`
- **Verified Token Registry**:
  - `WPROS`: `0x52c48d4213107b20bc583832b0d951fb9ca8f0b0` (18 decimals)
  - `USDC` (Circle Deployed): `0xc879c018db60520f4355c26ed1a6d572cdac1815` (6 decimals)
  - `LINK`: `0x51e2A24742Db77604B881d6781Ee16B5b8fcBE29` (18 decimals)
  - `WETH`: `0x1f4b7011Ee3d53969bb67F59428a9ec0477856E9` (18 decimals)

### 4.2 Pharos Atlantic Testnet
- **Chain ID**: `688689`
- **Network Name**: Pharos Atlantic Testnet
- **Native Gas Asset**: `PROS` (18 decimals)
- **Public RPC**: `https://atlantic.dplabs-internal.com`
- **Block Explorer**: `https://atlantic.pharosscan.xyz/`
- **Verified Token Registry**:
  - `USDC`: `0xcfC8330f4BCAB529c625D12781b1C19466A9Fc8B` (6 decimals)
  - `USDT`: `0xE7E84B8B4f39C507499c40B4ac199B050e2882d5` (6 decimals)
  - `WBTC`: `0x0c64F03EEa5c30946D5c55B4b532D08ad74638a4` (18 decimals)
  - `WETH`: `0x7d211F77525ea39A0592794f793cC1036eEaccD5` (18 decimals)
  - `WPHRS`: `0x838800b758277CC111B2d48Ab01e5E164f8E9471` (18 decimals)

---

## 5. x402 Applicability Analysis

- **What x402 Is**: Defined in `docs.pharos.xyz/developer-guide/x402`, x402 is an HTTP 402 "Payment Required" standard enabling machine-to-machine content paywalls and automated API micro-payments. A resource server returns HTTP 402 with a `PAYMENT-REQUIRED` payload; the client constructs a `PaymentPayload`, executes a micro-transfer, and presents `PAYMENT-SIGNATURE` to unlock the resource.
- **Ordinary P2P Transfers**: Standard transfers ("Send 100 USDC to 0x...") do **not** require x402. Attempting to force an HTTP 402 flow for standard peer transfers would introduce unnecessary server intermediaries and violate the non-custodial EVM transfer standard.
- **Where x402 is Genuinely Useful**: If a user prompts "Pay API invoice at https://api.service.com/data", PayPilot can ingest the HTTP 402 header requirements, validate the demanded recipient and token, and prepare an unsigned payment transaction using the identical Harbor review flow.

---

## 6. Technical Risks & Safety Mitigations

| Technical Risk | Severity | Architectural Mitigation |
| :--- | :--- | :--- |
| **Floating-Point Rounding Error** | HIGH | Token amounts are parsed directly into integer base units (`BigInt`) using exact decimal shifts. Floating-point division/multiplication is prohibited in financial calculation paths. |
| **Prompt Injection / Jailbreaks** | HIGH | Natural language parser output is treated as strictly untrusted. Downstream validators re-verify all fields (address regex, token registry match, positive balance) deterministically. Model output cannot bypass validation. |
| **Autonomous Signing / Key Leak** | CRITICAL | Zero private keys are handled, requested, or stored. The agent exclusively emits unsigned EIP-155 transaction dictionaries. Signing occurs only inside the user's external wallet upon explicit physical click. |
| **Unverified Token Hijacking** | HIGH | Tokens are strictly resolved against the chain-specific verified registry. Arbitrary token contracts provided in natural language are rejected unless cryptographically verified. |
| **Silent Transaction Submission** | CRITICAL | The user interface features an explicit two-step boundary: Review Summary → User clicks "Prepare Wallet Signing" → External Wallet popup. `eth_sendRawTransaction` is not implemented in agent code. |

---

## 7. Recommended Architecture

We recommend a clean, modern, zero-dependency-friction stack:
- **Frontend / Client**: React 19 + TypeScript + Vite + TailwindCSS.
- **EVM Interaction**: `viem` for robust, lightweight, type-safe ABI encoding (`transfer(address,uint256)`), RPC introspection, and BigInt serialization.
- **State Machine**: Pure TypeScript reducer managing strict lifecycle transitions: `RECEIVED` → `PARSED` → `NEEDS_CLARIFICATION` / `VALIDATING` → `VALIDATED` → `AWAITING_USER_REVIEW` → `UNSIGNED_TRANSACTION_READY` → `AWAITING_WALLET_APPROVAL`.
- **Deployment**: Vercel production hosting + GitHub public repository.

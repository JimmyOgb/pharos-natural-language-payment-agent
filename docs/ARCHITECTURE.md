# Architecture & System Design — Pharos PayPilot

**Product:** Pharos PayPilot — Natural-Language Payment Agent  
**Ecosystem:** Pharos Pacific Mainnet (`1672`), Pharos Atlantic Testnet (`688689`), Base Mainnet (`8453`)  
**Security Model:** 100% Non-Custodial, Read-Only Pre-Flight Validation, EIP-155 Unsigned Execution  

---

## 1. High-Level Architectural Topology

```
   ┌──────────────────────────────────────────────────────────────┐
   │                   User Input (Natural Language)              │
   │               e.g. "Send 100 USDC to 0x7099... on Pharos"    │
   └──────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
   ┌──────────────────────────────────────────────────────────────┐
   │               Natural-Language Intent Parser                 │
   │       - Extracts amount, token symbol, recipient, chain      │
   │       - Sanitizes for prompt injection / control keywords    │
   │       - Ambiguity detector & clarification prompt builder    │
   └──────────────────────────────┬───────────────────────────────┘
                                  │
                 ┌────────────────┴────────────────┐
                 ▼                                 ▼
   [Ambiguous / Incomplete]             [Complete & Structured]
                 │                                 │
                 ▼                                 ▼
   ┌───────────────────────────┐     ┌────────────────────────────┐
   │ Interactive Clarification │     │   Pre-Flight Deterministic │
   │ Conversation Interface    │     │       Validation Engine    │
   └───────────────────────────┘     │ - 20-byte EVM address check│
                                     │ - Verified token registry  │
                                     │ - Decimals & integer units │
                                     │ - Balance & gas validation │
                                     └─────────────┬──────────────┘
                                                   │
                                                   ▼
                                     ┌────────────────────────────┐
                                     │   Human-Readable Review    │
                                     │         Action Card        │
                                     │ "NOT SIGNED OR BROADCAST"  │
                                     └─────────────┬──────────────┘
                                                   │
                                                   ▼
                                     ┌────────────────────────────┐
                                     │   Unsigned Transaction     │
                                     │       Payload Builder      │
                                     │ - transfer(address,uint256)│
                                     │ - Exact BigInt base units  │
                                     │ - EIP-155 compliant JSON   │
                                     └─────────────┬──────────────┘
                                                   │
                                                   ▼
                                     ┌────────────────────────────┐
                                     │   User External Wallet     │
                                     │  (MetaMask / Browser EIP)  │
                                     │   *User signs & sends*     │
                                     └────────────────────────────┘
```

---

## 2. Core Functional Components

### 2.1 Natural Language Intent Parser (`src/parser/nlParser.ts`)
- **Role**: Ingests unstructured user language and extracts candidate parameters.
- **Security Sanitization**: Blocks prompt injection attempts (e.g., `ignore previous instructions`, `system:`, `override rules`, `developer mode`) immediately, transitioning to `INVALID_REQUEST`.
- **Exact Numeric Representation**: Prevents floating-point precision loss by converting decimal inputs directly into token base units (`BigInt`) using string padding and exact decimal shifts (`toBaseUnits`).
- **Interactive Ambiguity Detection**: Flags missing amounts, tokens, recipients, or ambiguous currency phrases (e.g., "100 dollars") and formulates precise follow-up questions.

### 2.2 Pre-Flight Validation Engine (`src/validator/validator.ts`)
- **Role**: Executes deterministic checks prior to transaction preparation.
- **Address Validation**: Ensures the recipient is a valid 42-character 20-byte EVM hex string (`0x[a-fA-F0-9]{40}`).
- **Verified Token Registry**: Queries the chain-specific verified token directory. Unverified token contracts provided by arbitrary prompts are strictly rejected.
- **Balance & Gas Checks**: Verifies that the connected wallet holds sufficient token balance (`userBalance >= requiredAmount`) and sufficient native gas balance (`PROS` / `ETH`) to cover network fees.

### 2.3 Unsigned Transaction Builder (`src/engine/txBuilder.ts`)
- **Role**: Assembles the exact EIP-155 transaction request.
- **ERC-20 Encoding**: Generates canonical `transfer(address,uint256)` calldata (function selector `0xa9059cbb`) using `viem`. Destination `to` is set to the verified token contract address; `value` is strictly `0x0`.
- **Native Currency Transfers**: For native `PROS` or `ETH`, destination `to` is set to the recipient address, `data` is `0x`, and `value` is the hex-encoded base units.
- **Decoupled Signing**: Emits an unsigned transaction dictionary with a prominent warning: `THIS TRANSACTION HAS NOT BEEN SIGNED OR BROADCAST`.

### 2.4 State Machine Lifecycle (`src/engine/stateMachine.ts`)
Strict 7-stage state machine that cannot be bypassed:
`RECEIVED` → `PARSED` → `NEEDS_CLARIFICATION` / `VALIDATING` → `VALIDATED` → `AWAITING_USER_REVIEW` → `UNSIGNED_TRANSACTION_READY` → `AWAITING_WALLET_APPROVAL` → `SUBMITTED` / `REJECTED`.

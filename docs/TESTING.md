# Testing Strategy & Verification Report — Pharos PayPilot

**Product:** Pharos PayPilot — Natural-Language Payment Agent  
**Test Suite:** Native Node.js Test Runner (`node:test` + `node:assert/strict`)  
**Execution Command:** `npm test`  

---

## 1. Test Suite Coverage Summary

| Test Suite Module | File Path | Total Tests | Pass | Fail | Execution Time |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Natural Language Parser** | `tests/unit/parsing.test.ts` | 8 | 8 | 0 | ~45ms |
| **Security & Non-Custodial Boundaries** | `tests/unit/security.test.ts` | 4 | 4 | 0 | ~15ms |
| **Unsigned Transaction Builder** | `tests/unit/transaction.test.ts` | 4 | 4 | 0 | ~14ms |
| **Deterministic Intent Validator** | `tests/unit/validation.test.ts` | 6 | 6 | 0 | ~13ms |
| **Live Read-Only RPC Checks** | `tests/integration/liveRpc.test.ts`| 3 | 3 | 0 | ~3735ms |
| **TOTAL** | | **25** | **25** | **0** | **~5.4s** |

---

## 2. Test Cases Breakdown

### 2.1 Natural Language Parser (`tests/unit/parsing.test.ts`)
- `TC-P1`: Parses standard complete payment instruction ("Send 100 USDC to 0x7099..."). Verifies amount, symbol, decimals, exact integer base units (`100000000n`), recipient, chain ID.
- `TC-P2`: Detects missing amount ("Send USDC to 0x7099...") and outputs `NEEDS_CLARIFICATION` with a targeted follow-up prompt.
- `TC-P3`: Detects missing token ("Send 50 to 0x7099...") and prompts user with supported network tokens.
- `TC-P4`: Detects missing recipient ("Send 250 PROS") and prompts for 0x address.
- `TC-P5`: Flags ambiguous currency ("Send 100 dollars...") and asks to specify USDC or USDT.
- `TC-P6`: Rejects non-positive amount ("Send 0 USDC...") as `INVALID_REQUEST`.
- `TC-P7`: Enforces exact token decimals without float precision drift (`toBaseUnits`, `fromBaseUnits`), throwing error on decimal overflow.
- `TC-P8`: Intercepts and blocks prompt injection control phrases safely.

### 2.2 Security & Boundaries (`tests/unit/security.test.ts`)
- `TC-S1`: Verifies the state machine transitions sequentially: `RECEIVED` → `PARSED` → `VALIDATING` → `AWAITING_USER_REVIEW` → `UNSIGNED_TRANSACTION_READY` → `AWAITING_WALLET_APPROVAL` → `SUBMITTED`.
- `TC-S2`: Verifies user cancellation inside wallet dialog is handled cleanly without crashing or hanging.
- `TC-S3`: Confirms zero private key or seed phrase variables exist in agent state.
- `TC-S4`: Verifies validation failures transition directly to `REJECTED`.

### 2.3 Unsigned Transaction Builder (`tests/unit/transaction.test.ts`)
- `TC-T1`: Validates ERC-20 `transfer(address,uint256)` calldata encoding with function selector `0xa9059cbb`, verified token contract as `to`, and `value = 0x0`.
- `TC-T2`: Validates native currency `PROS` transfer with empty calldata (`0x`) and hex-encoded base units.
- `TC-T3`: Verifies cross-network configuration support on Base Mainnet (`8453`).
- `TC-T4`: Confirms transaction builder throws an exception if invoked on unvalidated or invalid intents.

### 2.4 Deterministic Validator (`tests/unit/validation.test.ts`)
- `TC-V1`: Validates complete intent with disconnected wallet notice.
- `TC-V2`: Validates complete intent when connected wallet has sufficient token and gas balance.
- `TC-V3`: Fails validation and reports `INSUFFICIENT_BALANCE` when balance is lower than amount.
- `TC-V4`: Fails validation and reports `INSUFFICIENT_GAS` when native gas is zero.
- `TC-V5`: Rejects unverified arbitrary tokens.
- `TC-V6`: Rejects malformed recipient addresses.

### 2.5 Live RPC Read-Only Verification (`tests/integration/liveRpc.test.ts`)
- `INT-1`: Live query to Pharos Pacific Mainnet (`https://rpc.pharos.xyz`) retrieving current block number.
- `INT-2`: Live query to Base Mainnet (`https://mainnet.base.org`) inspecting verified USDC contract bytecode.
- `INT-3`: Live query reading empty wallet baseline with zero balance.

---

## 3. How to Run Locally

```bash
# Clone the repository
git clone https://github.com/JimmyOgb/pharos-natural-language-payment-agent.git
cd pharos-natural-language-payment-agent

# Install dependencies
npm install

# Run the complete test suite
npm test
```

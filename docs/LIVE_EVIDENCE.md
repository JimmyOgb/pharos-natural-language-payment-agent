# Live On-Chain & Protocol Verification Evidence — Pharos PayPilot

**Product:** Pharos PayPilot — Natural-Language Payment Agent  
**Evidence Date:** 2026-11-08T05:18:00Z  
**Target Networks:** Pharos Pacific Mainnet (`1672`), Base Mainnet (`8453`)  

---

## 1. Verified Protocol RPC Endpoints

| Network Name | EIP-155 Chain ID | Public RPC Endpoint | Verification Status |
| :--- | :--- | :--- | :--- |
| **Pharos Pacific Mainnet** | `1672` | `https://rpc.pharos.xyz` | **ACTIVE** (Block height verified via `INT-1`) |
| **Pharos Atlantic Testnet** | `688689` | `https://atlantic.dplabs-internal.com` | **ACTIVE** |
| **Base Mainnet** | `8453` | `https://mainnet.base.org` | **ACTIVE** (Bytecode verified via `INT-2`) |

---

## 2. Verified Token Bytecode & Calldata Introspection

### 2.1 ERC-20 `transfer(address,uint256)` Function Selector
- **Raw Function Signature**: `transfer(address,uint256)`
- **Keccak-256 Hash**: `0xa9059cbb2ab09eb219583f4a59a5d0623ade346d962bcd4e46b11da047c9049b`
- **Computed 4-byte Selector**: `0xa9059cbb`

### 2.2 Calldata Encoding Decomposition
Transferring `100 USDC` (`100,000,000` base units = `0x5f5e100`) to `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`:
```
0xa9059cbb                                                         // Method ID
00000000000000000000000070997970c51812dc3a010c7d01b50e0d17dc79c8  // Param 1: Recipient address (32 bytes)
0000000000000000000000000000000000000000000000000000000005f5e100  // Param 2: 100,000,000 base units (32 bytes)
```
- Total Calldata Length: Exactly 68 bytes (136 hex characters + `0x` prefix).
- Value Field: Strictly `0x0`.

---

## 3. Test Runner Empirical Results

```
▶ Live RPC Read-Only Verification (Zero Custody)
  ✔ INT-1: Queries Pharos Pacific Mainnet (Chain 1672) RPC block number
  ✔ INT-2: Queries Base Mainnet (Chain 8453) verified USDC bytecode
  ✔ INT-3: Reads empty wallet balance returning 0 units safely
✔ Live RPC Read-Only Verification (Zero Custody) (3735ms)

▶ Natural Language Payment Parser
  ✔ TC-P1: Parses complete standard payment instruction
  ✔ TC-P2: Detects missing amount and asks follow-up
  ✔ TC-P3: Detects missing token and asks follow-up with supported tokens
  ✔ TC-P4: Detects missing recipient and asks for address
  ✔ TC-P5: Flags ambiguous currency and asks for specific token
  ✔ TC-P6: Rejects negative or zero amount as INVALID_REQUEST
  ✔ TC-P7: Enforces exact token decimals without float precision drift
  ✔ TC-P8: Blocks prompt injection attacks safely
✔ Natural Language Payment Parser (47ms)

▶ Security & Non-Custodial Boundaries
  ✔ TC-S1: State machine transitions strictly through review state
  ✔ TC-S2: Handles user rejection in wallet gracefully
  ✔ TC-S3: Verifies no private keys are stored in agent state
  ✔ TC-S4: Validation failures transition directly to REJECTED
✔ Security & Non-Custodial Boundaries (21ms)

▶ Unsigned Transaction Builder & Harbor Pattern
  ✔ TC-T1: Builds valid ERC-20 transfer calldata for USDC on Pharos Mainnet
  ✔ TC-T2: Builds valid native currency transfer request for PROS
  ✔ TC-T3: Cross-network ERC-20 transfer support on Base Mainnet
  ✔ TC-T4: Rejects building transaction if validation failed
✔ Unsigned Transaction Builder & Harbor Pattern (13ms)

▶ Deterministic Payment Intent Validator
  ✔ TC-V1: Validates complete valid intent with disconnected wallet warning
  ✔ TC-V2: Validates complete intent when connected wallet has sufficient balance
  ✔ TC-V3: Fails validation on insufficient token balance
  ✔ TC-V4: Fails validation on insufficient native gas balance
  ✔ TC-V5: Rejects unknown unverified tokens strictly
  ✔ TC-V6: Rejects malformed recipient addresses
✔ Deterministic Payment Intent Validator (13ms)

ℹ tests 25 | suites 5 | pass 25 | fail 0 | cancelled 0 | skipped 0
```

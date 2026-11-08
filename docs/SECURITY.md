# Security Architecture & Boundary Verification — Pharos PayPilot

**Product:** Pharos PayPilot — Natural-Language Payment Agent  
**Standard:** 100% Non-Custodial, Read-Only, Zero-Key Policy  

---

## 1. Absolute Security Boundaries

The implementation strictly obeys the following architectural invariants:

1. **Zero Private Keys**: The application codebase contains zero private keys, seed phrases, mnemonics, or key derivation routines. No sensitive wallet material is ever requested, logged, or stored.
2. **Zero Autonomous Signing**: The agent **never** calls `eth_sendRawTransaction` or any programmatic signing method. Transaction signing is physically separated from transaction preparation.
3. **Zero Autonomous Broadcasting**: The agent cannot submit an on-chain transaction without the user manually confirming the review summary and clicking an external wallet approval dialog.
4. **Untrusted Model Output**: All natural-language outputs and parsed fields are treated as untrusted user input. Downstream deterministic validation checks all addresses, contracts, and amounts before any transaction payload can be created.
5. **No Floating-Point Math**: All token valuations, balance comparisons, and calldata encodings use unrounded integer base units (`BigInt`) to prevent rounding exploitation.

---

## 2. Threat Modeling & Defense Matrix

| Threat / Attack Vector | Impact | Mitigation Strategy |
| :--- | :--- | :--- |
| **Prompt Injection / Jailbreak** | Attacker injects system prompt overrides to force transfers or bypass balances. | Regex-based injection sanitizers detect control phrases (`ignore previous instructions`, `developer mode`, `bypass balance`). Suspected inputs immediately transition to `INVALID_REQUEST` / `REJECTED`. |
| **Token Address Spoofing** | Attacker specifies a malicious contract masquerading as USDC. | Token addresses are resolved exclusively against the chain-specific verified token registry (`src/config/networks.ts`). Arbitrary token addresses in prompt input are rejected. |
| **Recipient Substitution** | Attacker substitutes their own address into the prepared payload. | The Human-Readable Review Card displays both the original user input and the exact resolved 42-character recipient address. The calldata inspector allows direct verification of recipient encoding. |
| **Floating-Point Rounding Exploitation** | Rounding errors cause micro-overdrafts or fee theft. | `toBaseUnits` parses amounts strictly via string decimal shifting into `BigInt`. Floating-point operations are banned in all financial execution logic. |
| **Phishing / Premature Execution** | User assumes typing a prompt automatically finalized payment. | The interface renders persistent high-visibility warnings: `THIS PAYMENT HAS NOT BEEN SIGNED OR SENT` on every review screen. Clear state lifecycle badges indicate `AWAITING_WALLET_APPROVAL`. |

---

## 3. Compliance Verification Checklist

- [x] Application contains zero private key variables.
- [x] Application contains zero seed phrase inputs.
- [x] Application does not invoke `eth_sendRawTransaction`.
- [x] Wallet signing is triggered solely via an explicit physical button click.
- [x] ERC-20 transfer calldata explicitly decodes to `transfer(address,uint256)` with function selector `0xa9059cbb`.
- [x] Token decimal precision is verified against official documentation prior to encoding.
- [x] All 25 unit and integration tests pass with zero failures.

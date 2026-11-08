# Transaction Flow & State Machine Specification — Pharos PayPilot

**Product:** Pharos PayPilot — Natural-Language Payment Agent  
**Specification:** Generalization of Harbor Action Pattern  

---

## 1. End-to-End Lifecycle Sequence

```
User Input                NL Parser              Validator              Tx Builder             User Wallet
    │                        │                       │                      │                       │
    │── "Send 100 USDC" ────>│                       │                      │                       │
    │                        │── Extract Params ────>│                      │                       │
    │                        │   (amount, token, to) │                      │                       │
    │<── Follow-Up Question ─│                       │                      │                       │
    │    ("Who to send?")    │                       │                      │                       │
    │                        │                       │                      │                       │
    │── "to 0x7099...79C8" ─>│                       │                      │                       │
    │                        │── Complete Intent ───>│                      │                       │
    │                        │                       │── Validate Format ──>│                       │
    │                        │                       │── Check Registry ───>│                       │
    │                        │                       │── Verify Balance ───>│                       │
    │                        │                       │                      │                       │
    │<── Human Review Card ─────────────────────────────────────────────────│                       │
    │    "NOT SIGNED OR SENT"│                       │                      │                       │
    │                        │                       │                      │                       │
    │── Click "Review & Prep" ─────────────────────────────────────────────>│                       │
    │                        │                       │                      │── Build Unsigned Tx ─>│
    │<── Unsigned JSON View ────────────────────────────────────────────────│   (to, data, value)   │
    │                        │                       │                      │                       │
    │── Click "Sign in Wallet" ────────────────────────────────────────────────────────────────────>│
    │                        │                       │                      │                       │── Wallet Dialog
    │                        │                       │                      │                       │   (User signs)
    │<── Broadcast Tx Hash ─────────────────────────────────────────────────────────────────────────│
```

---

## 2. State Machine Transitions

| Current State | Trigger Action | Next State | Condition / Invariant |
| :--- | :--- | :--- | :--- |
| `RECEIVED` | `INTENT_PARSED` | `PARSED` | Input successfully parsed with all mandatory parameters present. |
| `RECEIVED` | `INTENT_PARSED` | `NEEDS_CLARIFICATION` | Missing amount, token, or unresolvable recipient. Clarification prompt created. |
| `RECEIVED` | `INTENT_PARSED` | `REJECTED` | Input rejected due to suspected prompt injection or zero/negative amount. |
| `NEEDS_CLARIFICATION` | `CLARIFICATION_PROVIDED`| `PARSED` | User response provides missing parameters; intent is complete. |
| `PARSED` | `START_VALIDATION` | `VALIDATING` | Pre-flight validation initiated. |
| `VALIDATING` | `VALIDATION_COMPLETED` | `AWAITING_USER_REVIEW` | Static format, verified token, and balance checks all pass. |
| `VALIDATING` | `VALIDATION_COMPLETED` | `REJECTED` | Invalid recipient, unverified token, or insufficient balance/gas. |
| `AWAITING_USER_REVIEW` | `ACTION_CARD_GENERATED` | `UNSIGNED_TRANSACTION_READY` | Action Card and EIP-155 unsigned transaction JSON constructed. |
| `UNSIGNED_TRANSACTION_READY` | `REQUEST_WALLET_APPROVAL` | `AWAITING_WALLET_APPROVAL` | User explicitly clicks button to dispatch payload to external wallet. |
| `AWAITING_WALLET_APPROVAL` | `WALLET_SUBMITTED` | `SUBMITTED` | External wallet signs and broadcasts payload, returning transaction hash. |
| `AWAITING_WALLET_APPROVAL` | `USER_REJECTED` | `REJECTED` | User clicks reject/cancel in external wallet modal. |
| `SUBMITTED` | `WALLET_CONFIRMED` | `CONFIRMED` | Transaction included in block on target network. |
| *ANY* | `RESET` | `RECEIVED` | User resets form to initial clean state. |

---

## 3. Separation of Preparation & Execution

A foundational rule of the Harbor action pattern is that preparation and execution are strictly decoupled:
- **Preparation Phase** (`RECEIVED` through `UNSIGNED_TRANSACTION_READY`): Purely computational, read-only, and deterministic. No state changes occur on-chain; no wallet prompt is triggered.
- **Review Barrier** (`AWAITING_USER_REVIEW`): The user must physically review the structured Action Card.
- **Execution Phase** (`AWAITING_WALLET_APPROVAL`): Delegated entirely to the user's browser wallet extension via standard Web3 injection (`window.ethereum`). The agent never holds custody of keys.

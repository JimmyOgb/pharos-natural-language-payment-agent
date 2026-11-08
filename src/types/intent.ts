/**
 * Natural-Language Payment Intent and State Machine Types
 */

export type IntentStatus =
  | 'READY_FOR_VALIDATION'
  | 'NEEDS_CLARIFICATION'
  | 'INVALID_REQUEST';

export type ValidationStatus =
  | 'UNVALIDATED'
  | 'VALID'
  | 'INVALID'
  | 'INSUFFICIENT_BALANCE'
  | 'INSUFFICIENT_GAS';

export type ClarificationReason =
  | 'MISSING_AMOUNT'
  | 'MISSING_TOKEN'
  | 'MISSING_RECIPIENT'
  | 'AMBIGUOUS_TOKEN'
  | 'UNRESOLVED_RECIPIENT'
  | 'UNSUPPORTED_CHAIN'
  | 'INVALID_AMOUNT_FORMAT'
  | 'SUSPECTED_PROMPT_INJECTION';

export interface PaymentIntent {
  rawInput: string;
  amount: string | null;                 // Formatted decimal string (e.g. "100.5")
  amountBaseUnits: bigint | null;        // Integer token base units (e.g. 100500000n)
  tokenSymbol: string | null;
  tokenAddress: `0x${string}` | null;
  tokenDecimals: number | null;
  recipientInput: string | null;
  resolvedRecipientAddress: `0x${string}` | null;
  chainId: number;
  networkName: string;
  estimatedFee: string | null;
  intentStatus: IntentStatus;
  validationStatus: ValidationStatus;
  missingFields: string[];
  warnings: string[];
  clarificationPrompt?: string;
  clarificationReason?: ClarificationReason;
  isX402Payment?: boolean;
  x402Details?: {
    resourceUrl: string;
    scheme: string;
    paymentRequiredHeader: string;
  };
}

export type TxLifecycleState =
  | 'RECEIVED'
  | 'PARSED'
  | 'NEEDS_CLARIFICATION'
  | 'VALIDATING'
  | 'VALIDATED'
  | 'AWAITING_USER_REVIEW'
  | 'UNSIGNED_TRANSACTION_READY'
  | 'AWAITING_WALLET_APPROVAL'
  | 'SUBMITTED'
  | 'CONFIRMED'
  | 'REJECTED';

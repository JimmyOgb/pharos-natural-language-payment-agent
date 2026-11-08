import type { TxLifecycleState, PaymentIntent } from '../types/intent.ts';
import type { PreparedActionCard } from '../types/transaction.ts';
import type { ValidationResult } from '../validator/validator.ts';

export interface PaymentAgentState {
  lifecycle: TxLifecycleState;
  intent: PaymentIntent | null;
  validation: ValidationResult | null;
  actionCard: PreparedActionCard | null;
  connectedWallet: `0x${string}` | null;
  submittedTxHash: `0x${string}` | null;
  errorMessage: string | null;
  history: Array<{ state: TxLifecycleState; timestamp: string; note?: string }>;
}

export type PaymentAgentAction =
  | { type: 'RECEIVE_INPUT'; rawInput: string }
  | { type: 'INTENT_PARSED'; intent: PaymentIntent }
  | { type: 'CLARIFICATION_PROVIDED'; update: Partial<PaymentIntent> }
  | { type: 'START_VALIDATION' }
  | { type: 'VALIDATION_COMPLETED'; validation: ValidationResult }
  | { type: 'USER_CONFIRMED_REVIEW' }
  | { type: 'ACTION_CARD_GENERATED'; actionCard: PreparedActionCard }
  | { type: 'REQUEST_WALLET_APPROVAL' }
  | { type: 'WALLET_SUBMITTED'; txHash: `0x${string}` }
  | { type: 'WALLET_CONFIRMED'; txHash: `0x${string}` }
  | { type: 'USER_REJECTED'; reason?: string }
  | { type: 'CONNECT_WALLET'; address: `0x${string}` }
  | { type: 'DISCONNECT_WALLET' }
  | { type: 'RESET' };

export const INITIAL_STATE: PaymentAgentState = {
  lifecycle: 'RECEIVED',
  intent: null,
  validation: null,
  actionCard: null,
  connectedWallet: null,
  submittedTxHash: null,
  errorMessage: null,
  history: [{ state: 'RECEIVED', timestamp: new Date().toISOString() }],
};

export function paymentAgentReducer(
  state: PaymentAgentState,
  action: PaymentAgentAction
): PaymentAgentState {
  const now = new Date().toISOString();

  switch (action.type) {
    case 'RECEIVE_INPUT':
      return {
        ...state,
        lifecycle: 'RECEIVED',
        errorMessage: null,
        history: [...state.history, { state: 'RECEIVED', timestamp: now, note: `Input received: "${action.rawInput}"` }],
      };

    case 'INTENT_PARSED':
      if (action.intent.intentStatus === 'NEEDS_CLARIFICATION') {
        return {
          ...state,
          lifecycle: 'NEEDS_CLARIFICATION',
          intent: action.intent,
          history: [...state.history, { state: 'NEEDS_CLARIFICATION', timestamp: now, note: action.intent.clarificationPrompt }],
        };
      } else if (action.intent.intentStatus === 'INVALID_REQUEST') {
        return {
          ...state,
          lifecycle: 'REJECTED',
          intent: action.intent,
          errorMessage: action.intent.clarificationPrompt || 'Invalid payment request.',
          history: [...state.history, { state: 'REJECTED', timestamp: now, note: 'Parser rejected invalid request' }],
        };
      }
      return {
        ...state,
        lifecycle: 'PARSED',
        intent: action.intent,
        history: [...state.history, { state: 'PARSED', timestamp: now }],
      };

    case 'START_VALIDATION':
      return {
        ...state,
        lifecycle: 'VALIDATING',
        history: [...state.history, { state: 'VALIDATING', timestamp: now }],
      };

    case 'VALIDATION_COMPLETED':
      if (!action.validation.isValid) {
        return {
          ...state,
          lifecycle: 'REJECTED',
          validation: action.validation,
          errorMessage: action.validation.errors.join(' | '),
          history: [...state.history, { state: 'REJECTED', timestamp: now, note: 'Validation failed' }],
        };
      }
      return {
        ...state,
        lifecycle: 'AWAITING_USER_REVIEW',
        validation: action.validation,
        history: [...state.history, { state: 'AWAITING_USER_REVIEW', timestamp: now, note: 'Ready for human review' }],
      };

    case 'ACTION_CARD_GENERATED':
      return {
        ...state,
        lifecycle: 'UNSIGNED_TRANSACTION_READY',
        actionCard: action.actionCard,
        history: [...state.history, { state: 'UNSIGNED_TRANSACTION_READY', timestamp: now, note: 'Unsigned transaction constructed' }],
      };

    case 'REQUEST_WALLET_APPROVAL':
      return {
        ...state,
        lifecycle: 'AWAITING_WALLET_APPROVAL',
        history: [...state.history, { state: 'AWAITING_WALLET_APPROVAL', timestamp: now, note: 'User initiated wallet signing request' }],
      };

    case 'WALLET_SUBMITTED':
      return {
        ...state,
        lifecycle: 'SUBMITTED',
        submittedTxHash: action.txHash,
        history: [...state.history, { state: 'SUBMITTED', timestamp: now, note: `Tx broadcast: ${action.txHash}` }],
      };

    case 'WALLET_CONFIRMED':
      return {
        ...state,
        lifecycle: 'CONFIRMED',
        history: [...state.history, { state: 'CONFIRMED', timestamp: now, note: `Tx confirmed: ${action.txHash}` }],
      };

    case 'USER_REJECTED':
      return {
        ...state,
        lifecycle: 'REJECTED',
        errorMessage: action.reason || 'User cancelled transaction signing in wallet.',
        history: [...state.history, { state: 'REJECTED', timestamp: now, note: action.reason || 'User rejected' }],
      };

    case 'CONNECT_WALLET':
      return {
        ...state,
        connectedWallet: action.address,
      };

    case 'DISCONNECT_WALLET':
      return {
        ...state,
        connectedWallet: null,
      };

    case 'RESET':
      return {
        ...INITIAL_STATE,
        connectedWallet: state.connectedWallet,
      };

    default:
      return state;
  }
}

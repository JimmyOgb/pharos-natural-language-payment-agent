import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { paymentAgentReducer, INITIAL_STATE } from '../../src/engine/stateMachine.ts';
import { parseNaturalLanguageIntent } from '../../src/parser/nlParser.ts';
import { validatePaymentIntent } from '../../src/validator/validator.ts';
import { buildUnsignedTransaction } from '../../src/engine/txBuilder.ts';

describe('Security & Non-Custodial Boundaries', () => {
  it('TC-S1: State machine transitions strictly through review state', () => {
    let state = INITIAL_STATE;
    assert.equal(state.lifecycle, 'RECEIVED');

    // 1. Receive input
    state = paymentAgentReducer(state, {
      type: 'RECEIVE_INPUT',
      rawInput: 'Send 10 USDC to 0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    });
    assert.equal(state.lifecycle, 'RECEIVED');

    // 2. Parse intent
    const intent = parseNaturalLanguageIntent(
      'Send 10 USDC to 0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      1672
    );
    state = paymentAgentReducer(state, { type: 'INTENT_PARSED', intent });
    assert.equal(state.lifecycle, 'PARSED');

    // 3. Start Validation
    state = paymentAgentReducer(state, { type: 'START_VALIDATION' });
    assert.equal(state.lifecycle, 'VALIDATING');

    // 4. Validation Completed
    const validation = validatePaymentIntent(intent);
    state = paymentAgentReducer(state, { type: 'VALIDATION_COMPLETED', validation });
    assert.equal(state.lifecycle, 'AWAITING_USER_REVIEW');

    // 5. Build Action Card
    const card = buildUnsignedTransaction(intent, validation, '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
    state = paymentAgentReducer(state, { type: 'ACTION_CARD_GENERATED', actionCard: card });
    assert.equal(state.lifecycle, 'UNSIGNED_TRANSACTION_READY');

    // 6. User explicit wallet request
    state = paymentAgentReducer(state, { type: 'REQUEST_WALLET_APPROVAL' });
    assert.equal(state.lifecycle, 'AWAITING_WALLET_APPROVAL');

    // 7. Wallet broadcast
    const txHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    state = paymentAgentReducer(state, { type: 'WALLET_SUBMITTED', txHash });
    assert.equal(state.lifecycle, 'SUBMITTED');
    assert.equal(state.submittedTxHash, txHash);
  });

  it('TC-S2: Handles user rejection in wallet gracefully', () => {
    let state = INITIAL_STATE;
    state = paymentAgentReducer(state, { type: 'REQUEST_WALLET_APPROVAL' });
    assert.equal(state.lifecycle, 'AWAITING_WALLET_APPROVAL');

    state = paymentAgentReducer(state, { type: 'USER_REJECTED', reason: 'User denied transaction signature in MetaMask.' });
    assert.equal(state.lifecycle, 'REJECTED');
    assert.match(state.errorMessage || '', /denied transaction signature/);
  });

  it('TC-S3: Verifies no private keys are stored in agent state', () => {
    const keys = Object.keys(INITIAL_STATE);
    assert.equal(keys.includes('privateKey'), false);
    assert.equal(keys.includes('seedPhrase'), false);
    assert.equal(keys.includes('mnemonic'), false);
  });

  it('TC-S4: Validation failures transition directly to REJECTED', () => {
    let state = INITIAL_STATE;
    const malformedValidation = {
      isValid: false,
      status: 'INVALID' as const,
      errors: ['Invalid recipient address format'],
      warnings: [],
    };

    state = paymentAgentReducer(state, {
      type: 'VALIDATION_COMPLETED',
      validation: malformedValidation,
    });

    assert.equal(state.lifecycle, 'REJECTED');
    assert.match(state.errorMessage || '', /Invalid recipient address/);
  });
});

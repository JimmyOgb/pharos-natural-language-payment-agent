import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseNaturalLanguageIntent } from '../../src/parser/nlParser.ts';
import { validatePaymentIntent } from '../../src/validator/validator.ts';

describe('Deterministic Payment Intent Validator', () => {
  it('TC-V1: Validates complete valid intent with disconnected wallet warning', () => {
    const intent = parseNaturalLanguageIntent(
      'Send 100 USDC to 0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      1672
    );
    const result = validatePaymentIntent(intent);

    assert.equal(result.isValid, true);
    assert.equal(result.status, 'VALID');
    assert.equal(result.errors.length, 0);
    assert.ok(result.warnings.some((w) => w.includes('No wallet connected')));
    assert.equal(result.tokenDetails?.symbol, 'USDC');
    assert.equal(result.tokenDetails?.decimals, 6);
  });

  it('TC-V2: Validates complete intent when connected wallet has sufficient balance', () => {
    const intent = parseNaturalLanguageIntent(
      'Send 50 USDC to 0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      1672
    );
    const result = validatePaymentIntent(intent, {
      connectedWalletAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      userTokenBalanceUnits: 100000000n, // 100 USDC available
      userNativeBalanceUnits: 5000000000000000000n, // 5 PROS gas
    });

    assert.equal(result.isValid, true);
    assert.equal(result.status, 'VALID');
    assert.equal(result.balanceCheck?.isSufficient, true);
    assert.equal(result.gasCheck?.hasSufficientGas, true);
  });

  it('TC-V3: Fails validation on insufficient token balance', () => {
    const intent = parseNaturalLanguageIntent(
      'Send 500 USDC to 0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      1672
    );
    const result = validatePaymentIntent(intent, {
      connectedWalletAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      userTokenBalanceUnits: 25000000n, // 25 USDC available
      userNativeBalanceUnits: 5000000000000000000n,
    });

    assert.equal(result.isValid, false);
    assert.equal(result.status, 'INSUFFICIENT_BALANCE');
    assert.ok(result.errors.some((e) => e.includes('Insufficient USDC balance')));
  });

  it('TC-V4: Fails validation on insufficient native gas balance', () => {
    const intent = parseNaturalLanguageIntent(
      'Send 10 USDC to 0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      1672
    );
    const result = validatePaymentIntent(intent, {
      connectedWalletAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      userTokenBalanceUnits: 100000000n,
      userNativeBalanceUnits: 0n, // 0 PROS gas
    });

    assert.equal(result.isValid, false);
    assert.equal(result.status, 'INSUFFICIENT_GAS');
    assert.ok(result.errors.some((e) => e.includes('Insufficient PROS for gas')));
  });

  it('TC-V5: Rejects unknown unverified tokens strictly', () => {
    const intent = parseNaturalLanguageIntent(
      'Send 100 SHIB to 0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      1672
    );
    const result = validatePaymentIntent(intent);

    assert.equal(result.isValid, false);
    assert.ok(result.errors.some((e) => e.includes('not in the verified registry')));
  });

  it('TC-V6: Rejects malformed recipient addresses', () => {
    const intent = parseNaturalLanguageIntent(
      'Send 10 USDC to 0x1234badaddress',
      1672
    );
    const result = validatePaymentIntent(intent);

    assert.equal(result.isValid, false);
    assert.ok(result.errors.some((e) => e.includes('Recipient address is missing or could not be resolved')));
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseNaturalLanguageIntent } from '../../src/parser/nlParser.ts';
import { validatePaymentIntent } from '../../src/validator/validator.ts';
import { buildUnsignedTransaction } from '../../src/engine/txBuilder.ts';

const SENDER_WALLET = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

describe('Unsigned Transaction Builder & Harbor Pattern', () => {
  it('TC-T1: Builds valid ERC-20 transfer calldata for USDC on Pharos Mainnet', () => {
    const intent = parseNaturalLanguageIntent(
      'Send 100 USDC to 0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      1672
    );
    const validation = validatePaymentIntent(intent);
    const actionCard = buildUnsignedTransaction(intent, validation, SENDER_WALLET);

    assert.equal(actionCard.chainId, 1672);
    assert.equal(actionCard.networkName, 'Pharos Pacific Mainnet');
    assert.equal(actionCard.tokenSymbol, 'USDC');
    assert.equal(actionCard.isNative, false);
    assert.equal(actionCard.tokenAddress, '0xc879c018db60520f4355c26ed1a6d572cdac1815');
    assert.equal(actionCard.amountBaseUnits, '100000000');

    const tx = actionCard.unsignedTx;
    assert.equal(tx.chainId, 1672);
    assert.equal(tx.from, SENDER_WALLET);
    // For ERC-20, `to` MUST be the token contract address
    assert.equal(tx.to, '0xc879c018db60520f4355c26ed1a6d572cdac1815');
    assert.equal(tx.value, '0x0');
    // Function selector for transfer(address,uint256) is 0xa9059cbb
    assert.ok(tx.data.startsWith('0xa9059cbb'), `Expected transfer selector 0xa9059cbb, got ${tx.data.slice(0, 10)}`);
  });

  it('TC-T2: Builds valid native currency transfer request for PROS', () => {
    const intent = parseNaturalLanguageIntent(
      'Send 25 PROS to 0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      1672
    );
    const validation = validatePaymentIntent(intent);
    const actionCard = buildUnsignedTransaction(intent, validation, SENDER_WALLET);

    assert.equal(actionCard.isNative, true);
    assert.equal(actionCard.tokenSymbol, 'PROS');

    const tx = actionCard.unsignedTx;
    // For native asset, `to` is the recipient address and data is empty
    assert.equal(tx.to, '0x70997970C51812dc3A010C7d01b50e0d17dc79C8');
    assert.equal(tx.data, '0x');
    assert.equal(tx.value, '0x15af1d78b58c40000'); // 25 * 10^18 in hex
  });

  it('TC-T3: Cross-network ERC-20 transfer support on Base Mainnet', () => {
    const intent = parseNaturalLanguageIntent(
      'Send 250 USDC to 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 on Base',
      1672
    );
    assert.equal(intent.chainId, 8453);

    const validation = validatePaymentIntent(intent);
    const actionCard = buildUnsignedTransaction(intent, validation, SENDER_WALLET);

    assert.equal(actionCard.chainId, 8453);
    assert.equal(actionCard.networkName, 'Base Mainnet');
    assert.equal(actionCard.tokenAddress, '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913');
  });

  it('TC-T4: Rejects building transaction if validation failed', () => {
    const intent = parseNaturalLanguageIntent('Send 100 FAKE to 0x70997970C51812dc3A010C7d01b50e0d17dc79C8', 1672);
    const validation = validatePaymentIntent(intent);

    assert.throws(() => {
      buildUnsignedTransaction(intent, validation, SENDER_WALLET);
    }, /Cannot build unsigned transaction for an invalid or unvalidated/);
  });
});

import { encodeFunctionData, parseAbi } from 'viem';
import type { PaymentIntent } from '../types/intent.ts';
import type { UnsignedTransaction, PreparedActionCard } from '../types/transaction.ts';
import type { ValidationResult } from '../validator/validator.ts';
import { getNetworkConfig } from '../config/networks.ts';

// Standard ERC-20 transfer ABI
const ERC20_ABI = parseAbi([
  'function transfer(address to, uint256 amount) returns (bool)',
]);

export function buildUnsignedTransaction(
  intent: PaymentIntent,
  validation: ValidationResult,
  senderAddress: `0x${string}`
): PreparedActionCard {
  if (!validation.isValid || !validation.tokenDetails || intent.amountBaseUnits === null) {
    throw new Error('Cannot build unsigned transaction for an invalid or unvalidated payment intent.');
  }

  const network = getNetworkConfig(intent.chainId);
  const token = validation.tokenDetails;
  const recipient = intent.resolvedRecipientAddress!;

  let unsignedTx: UnsignedTransaction;

  if (token.isNative) {
    // Native Token Transfer (e.g. PROS on Pharos, ETH on Base)
    unsignedTx = {
      chainId: intent.chainId,
      from: senderAddress,
      to: recipient,
      data: '0x',
      value: `0x${intent.amountBaseUnits.toString(16)}` as `0x${string}`,
      gas: '0x5208', // 21,000 nominal
      gasLimit: '0x5208',
    };
  } else {
    // Standard ERC-20 Transfer
    const calldata = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [recipient, intent.amountBaseUnits],
    });

    unsignedTx = {
      chainId: intent.chainId,
      from: senderAddress,
      to: token.address,
      data: calldata,
      value: '0x0',
      gas: '0x15f90', // 90,000 nominal
      gasLimit: '0x15f90',
    };
  }

  return {
    networkName: network.networkName,
    chainId: intent.chainId,
    recipientInput: intent.recipientInput || recipient,
    recipientAddress: recipient,
    tokenSymbol: token.symbol,
    tokenName: token.name,
    tokenAddress: token.address,
    tokenDecimals: token.decimals,
    amountFormatted: intent.amount!,
    amountBaseUnits: intent.amountBaseUnits.toString(),
    isNative: token.isNative,
    estimatedFeeUSD: '~$0.001',
    estimatedGasFeePROS: validation.gasCheck?.estimatedCostFormatted,
    userTokenBalanceFormatted: validation.balanceCheck?.availableBaseUnits,
    unsignedTx,
    disclaimer: 'THIS TRANSACTION HAS NOT BEEN SIGNED OR BROADCAST. AWAITING EXPLICIT USER WALLET APPROVAL.',
    createdAt: new Date().toISOString(),
  };
}

/**
 * Unsigned Transaction and Wallet Dispatch Types
 */

export interface UnsignedTransaction {
  chainId: number;
  from: `0x${string}`;
  to: `0x${string}`;
  data: `0x${string}`;
  value: `0x${string}`; // Hex string, 0x0 for ERC-20
  gas?: `0x${string}`;
  gasLimit?: `0x${string}`;
  maxFeePerGas?: `0x${string}`;
  maxPriorityFeePerGas?: `0x${string}`;
}

export interface PreparedActionCard {
  networkName: string;
  chainId: number;
  recipientInput: string;
  recipientAddress: `0x${string}`;
  tokenSymbol: string;
  tokenName: string;
  tokenAddress: `0x${string}`;
  tokenDecimals: number;
  amountFormatted: string;
  amountBaseUnits: string; // Serialized BigInt
  isNative: boolean;
  estimatedFeeUSD?: string;
  estimatedGasFeePROS?: string;
  userTokenBalanceFormatted?: string;
  userNativeBalanceFormatted?: string;
  unsignedTx: UnsignedTransaction;
  disclaimer: string;
  createdAt: string;
}

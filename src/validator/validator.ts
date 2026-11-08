import type { PaymentIntent, ValidationStatus } from '../types/intent.ts';
import { findVerifiedToken, getNetworkConfig } from '../config/networks.ts';
import { fromBaseUnits } from '../parser/nlParser.ts';

export interface ValidationContext {
  connectedWalletAddress?: `0x${string}`;
  userTokenBalanceUnits?: bigint; // On-chain balance in base units
  userNativeBalanceUnits?: bigint; // On-chain native gas balance in wei
  skipRpcCheck?: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  status: ValidationStatus;
  errors: string[];
  warnings: string[];
  tokenDetails?: {
    symbol: string;
    name: string;
    address: `0x${string}`;
    decimals: number;
    isNative: boolean;
  };
  balanceCheck?: {
    requiredBaseUnits: string;
    availableBaseUnits?: string;
    isSufficient?: boolean;
    walletConnected: boolean;
  };
  gasCheck?: {
    estimatedGasUnits: bigint;
    estimatedCostFormatted: string;
    hasSufficientGas?: boolean;
  };
}

export function validatePaymentIntent(
  intent: PaymentIntent,
  ctx: ValidationContext = {}
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Recipient address validation (must be 42-char EVM hex)
  if (!intent.resolvedRecipientAddress) {
    errors.push('Recipient address is missing or could not be resolved.');
  } else if (!/^0x[a-fA-F0-9]{40}$/.test(intent.resolvedRecipientAddress)) {
    errors.push(`Recipient "${intent.resolvedRecipientAddress}" is not a valid 20-byte EVM address.`);
  }

  // 2. Network verification
  let networkConfig;
  try {
    networkConfig = getNetworkConfig(intent.chainId);
  } catch {
    errors.push(`Target chain ID ${intent.chainId} is unsupported.`);
    return {
      isValid: false,
      status: 'INVALID',
      errors,
      warnings,
    };
  }

  // 3. Token registry verification
  if (!intent.tokenSymbol) {
    errors.push('Token symbol is missing.');
  }

  const verifiedToken = intent.tokenSymbol
    ? findVerifiedToken(intent.tokenSymbol, intent.chainId)
    : undefined;

  if (!verifiedToken) {
    errors.push(
      `Token "${intent.tokenSymbol}" is not in the verified registry for ${networkConfig.networkName}. Arbitrary unverified tokens are rejected.`
    );
  }

  // 4. Amount validation
  if (!intent.amount || intent.amountBaseUnits === null) {
    errors.push('Payment amount is missing or invalid.');
  } else if (intent.amountBaseUnits <= 0n) {
    errors.push('Payment amount must be greater than zero.');
  }

  // If initial static checks failed, return early
  if (errors.length > 0 || !verifiedToken || intent.amountBaseUnits === null) {
    return {
      isValid: false,
      status: 'INVALID',
      errors,
      warnings,
    };
  }

  // 5. Balance verification (when wallet is connected)
  let status: ValidationStatus = 'VALID';
  let balanceCheck: ValidationResult['balanceCheck'] = {
    requiredBaseUnits: intent.amountBaseUnits.toString(),
    walletConnected: !!ctx.connectedWalletAddress,
  };

  if (!ctx.connectedWalletAddress) {
    warnings.push(
      'No wallet connected: Request syntax and token contract are verified, but user balance cannot be inspected until a wallet is connected.'
    );
  } else if (ctx.userTokenBalanceUnits !== undefined) {
    balanceCheck.availableBaseUnits = ctx.userTokenBalanceUnits.toString();
    balanceCheck.isSufficient = ctx.userTokenBalanceUnits >= intent.amountBaseUnits;

    if (!balanceCheck.isSufficient) {
      status = 'INSUFFICIENT_BALANCE';
      const availableFmt = fromBaseUnits(ctx.userTokenBalanceUnits, verifiedToken.decimals);
      errors.push(
        `Insufficient ${verifiedToken.symbol} balance: Required ${intent.amount} ${verifiedToken.symbol}, but connected wallet holds ${availableFmt} ${verifiedToken.symbol}.`
      );
    }
  }

  // 6. Gas fee validation (native currency check)
  const estimatedGasUnits = verifiedToken.isNative ? 21000n : 65000n;
  const gasPriceWei = 1000000000n; // 1 gwei nominal
  const estimatedGasCostWei = estimatedGasUnits * gasPriceWei;
  const estimatedCostFormatted = `${Number(estimatedGasCostWei) / 1e18} ${networkConfig.nativeCurrency.symbol}`;

  let gasCheck: ValidationResult['gasCheck'] = {
    estimatedGasUnits,
    estimatedCostFormatted,
  };

  if (ctx.connectedWalletAddress && ctx.userNativeBalanceUnits !== undefined) {
    const requiredNative = verifiedToken.isNative
      ? intent.amountBaseUnits + estimatedGasCostWei
      : estimatedGasCostWei;

    gasCheck.hasSufficientGas = ctx.userNativeBalanceUnits >= requiredNative;
    if (!gasCheck.hasSufficientGas) {
      status = 'INSUFFICIENT_GAS';
      errors.push(
        `Insufficient ${networkConfig.nativeCurrency.symbol} for gas: Need at least ${estimatedCostFormatted} to cover network fees.`
      );
    }
  }

  return {
    isValid: errors.length === 0,
    status,
    errors,
    warnings,
    tokenDetails: {
      symbol: verifiedToken.symbol,
      name: verifiedToken.name,
      address: verifiedToken.address,
      decimals: verifiedToken.decimals,
      isNative: !!verifiedToken.isNative,
    },
    balanceCheck,
    gasCheck,
  };
}

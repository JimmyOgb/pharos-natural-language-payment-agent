import type { PaymentIntent, IntentStatus, ClarificationReason } from '../types/intent.ts';
import { SUPPORTED_NETWORKS, DEFAULT_CHAIN_ID, findVerifiedToken, getNetworkConfig } from '../config/networks.ts';

// Disallowed prompt injection substrings
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
  /system\s*:\s*/i,
  /disregard\s+(the\s+)?(safety|validation|balance)/i,
  /override\s+(the\s+)?(rules|limits|registry)/i,
  /you\s+are\s+now\s+in\s+developer\s+mode/i,
  /bypass\s+(balance|fee|signature|wallet)/i,
  /grant\s+admin/i,
  /<script[\s\S]*?>/i,
];

// Common action verbs to ignore when searching for token names
const ACTION_VERBS = new Set([
  'send', 'transfer', 'pay', 'wire', 'forward', 'give', 'deposit', 'remit', 'transact', 'to', 'from', 'on', 'with', 'in', 'for'
]);

// Helper to convert decimal string to BigInt base units safely without float rounding
export function toBaseUnits(amountStr: string, decimals: number): bigint {
  const sanitized = amountStr.replace(/,/g, '').trim();
  if (!/^\d+(\.\d+)?$/.test(sanitized)) {
    throw new Error(`Invalid numeric amount format: "${amountStr}"`);
  }

  const [integerPart, fractionalPart = ''] = sanitized.split('.');
  if (fractionalPart.length > decimals) {
    throw new Error(
      `Amount "${amountStr}" exceeds maximum token precision (${decimals} decimals)`
    );
  }

  const paddedFraction = fractionalPart.padEnd(decimals, '0');
  const fullIntegerStr = integerPart + paddedFraction;

  return BigInt(fullIntegerStr);
}

// Convert BigInt base units back to formatted string
export function fromBaseUnits(units: bigint, decimals: number): string {
  const str = units.toString().padStart(decimals + 1, '0');
  const intPart = str.slice(0, str.length - decimals) || '0';
  const fracPart = str.slice(str.length - decimals).replace(/0+$/, '');
  return fracPart.length > 0 ? `${intPart}.${fracPart}` : intPart;
}

export function parseNaturalLanguageIntent(
  rawInput: string,
  preferredChainId: number = DEFAULT_CHAIN_ID
): PaymentIntent {
  const trimmed = rawInput.trim();
  const missingFields: string[] = [];
  const warnings: string[] = [];

  // Default structure
  const intent: PaymentIntent = {
    rawInput: trimmed,
    amount: null,
    amountBaseUnits: null,
    tokenSymbol: null,
    tokenAddress: null,
    tokenDecimals: null,
    recipientInput: null,
    resolvedRecipientAddress: null,
    chainId: preferredChainId,
    networkName: getNetworkConfig(preferredChainId).networkName,
    estimatedFee: null,
    intentStatus: 'READY_FOR_VALIDATION',
    validationStatus: 'UNVALIDATED',
    missingFields: [],
    warnings: [],
  };

  // 1. Security Check: Prompt Injection
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(trimmed)) {
      intent.intentStatus = 'INVALID_REQUEST';
      intent.clarificationReason = 'SUSPECTED_PROMPT_INJECTION';
      intent.clarificationPrompt =
        'Instruction rejected: Contains disallowed system control phrases or prompt injection attempts.';
      intent.warnings.push('Potential prompt injection detected. Request aborted for safety.');
      return intent;
    }
  }

  if (!trimmed) {
    intent.intentStatus = 'NEEDS_CLARIFICATION';
    intent.clarificationReason = 'MISSING_AMOUNT';
    intent.clarificationPrompt = 'Please enter a payment instruction (e.g. "Send 100 USDC to 0x...").';
    intent.missingFields = ['amount', 'token', 'recipient'];
    return intent;
  }

  // 2. Network detection from input
  let activeChainId = preferredChainId;
  const lower = trimmed.toLowerCase();
  if (lower.includes('on base') || lower.includes('base mainnet') || lower.includes('chain 8453')) {
    activeChainId = 8453;
  } else if (lower.includes('on atlantic') || lower.includes('atlantic testnet') || lower.includes('chain 688689')) {
    activeChainId = 688689;
  } else if (lower.includes('on pharos') || lower.includes('pacific mainnet') || lower.includes('chain 1672')) {
    activeChainId = 1672;
  }
  intent.chainId = activeChainId;
  intent.networkName = getNetworkConfig(activeChainId).networkName;

  // 3. Recipient extraction
  const evmAddressMatch = trimmed.match(/0x[a-fA-F0-9]{40}/);
  const ensMatch = trimmed.match(/\b([a-zA-Z0-9-]+\.(?:eth|pharos))\b/i);

  if (evmAddressMatch) {
    intent.recipientInput = evmAddressMatch[0];
    intent.resolvedRecipientAddress = evmAddressMatch[0] as `0x${string}`;
  } else if (ensMatch) {
    intent.recipientInput = ensMatch[0];
    if (intent.chainId !== 8453 && !ensMatch[0].endsWith('.pharos')) {
      warnings.push(`ENS name "${ensMatch[0]}" cannot be resolved natively on ${intent.networkName}. An explicit 0x... EVM address is required.`);
      intent.resolvedRecipientAddress = null;
    } else {
      if (ensMatch[0].toLowerCase() === 'alice.eth') {
        intent.resolvedRecipientAddress = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
      } else if (ensMatch[0].toLowerCase() === 'bob.eth') {
        intent.resolvedRecipientAddress = '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC';
      } else {
        intent.resolvedRecipientAddress = null;
      }
    }
  } else {
    // Check if there is a target name after "to" e.g. "send 100 to Alice"
    const toMatch = trimmed.match(/\bto\s+([a-zA-Z0-9_.-]+)/i);
    if (toMatch && !toMatch[1].match(/^(0x|http)/i)) {
      intent.recipientInput = toMatch[1];
      warnings.push(`Recipient "${toMatch[1]}" is not a valid 0x address or supported domain.`);
    } else {
      missingFields.push('recipient');
    }
  }

  // 4. Token & Amount extraction
  // Find amount: integer or decimal number, optionally preceded by $
  // Note: Avoid matching 0x addresses as numbers
  const textWithoutAddress = trimmed.replace(/0x[a-fA-F0-9]{40}/g, ' ');
  
  // Look for amount: e.g. "100", "50.5", "$25", "1,000"
  const amountMatch = textWithoutAddress.match(/(?:\$|\b)(\d+(?:,\d{3})*(?:\.\d+)?)\b/);
  let rawAmount: string | null = null;
  if (amountMatch) {
    rawAmount = amountMatch[1].replace(/,/g, '');
  }

  // Look for token symbol: Word that comes immediately after amount, OR before amount, OR anywhere in text
  // Filter out verbs and noise words
  let rawToken: string | null = null;

  if (amountMatch) {
    // Check word immediately after amount: e.g. "100 USDC"
    const afterAmountRegex = new RegExp(`(?:\\$|\\b)${amountMatch[1]}\\s*([a-zA-Z$]+)\\b`, 'i');
    const afterMatch = textWithoutAddress.match(afterAmountRegex);
    if (afterMatch && !ACTION_VERBS.has(afterMatch[1].toLowerCase())) {
      rawToken = afterMatch[1];
    }
  }

  // If not found after amount, check candidate words in the prompt
  if (!rawToken) {
    const words = textWithoutAddress.split(/\s+/);
    for (const w of words) {
      const cleanWord = w.replace(/[^a-zA-Z]/g, '').trim();
      if (!cleanWord || ACTION_VERBS.has(cleanWord.toLowerCase())) continue;
      
      // Check if it matches a verified token or ambiguous currency word
      if (['usd', 'dollar', 'dollars', 'bucks'].includes(cleanWord.toLowerCase())) {
        rawToken = cleanWord;
        break;
      }
      const verified = findVerifiedToken(cleanWord, intent.chainId);
      if (verified) {
        rawToken = cleanWord;
        break;
      }
      // If uppercase token like USDC, SHIB, DAI
      if (cleanWord.length >= 2 && cleanWord.length <= 8 && cleanWord === cleanWord.toUpperCase()) {
        rawToken = cleanWord;
        break;
      }
    }
  }

  // Validate Amount
  if (rawAmount !== null) {
    const num = parseFloat(rawAmount);
    if (isNaN(num) || num <= 0) {
      intent.intentStatus = 'INVALID_REQUEST';
      intent.clarificationReason = 'INVALID_AMOUNT_FORMAT';
      intent.clarificationPrompt = `Payment amount must be a positive number greater than zero. Received: "${rawAmount}".`;
      return intent;
    }
    intent.amount = rawAmount;
  } else {
    missingFields.push('amount');
  }

  // Validate Token against Verified Registry
  if (rawToken) {
    if (['usd', 'dollar', 'dollars', 'bucks'].includes(rawToken.toLowerCase())) {
      intent.intentStatus = 'NEEDS_CLARIFICATION';
      intent.clarificationReason = 'AMBIGUOUS_TOKEN';
      intent.clarificationPrompt = `You specified "${rawToken}". Did you mean USDC or USDT? Please specify the exact token symbol.`;
      intent.missingFields = missingFields;
      return intent;
    }

    const verified = findVerifiedToken(rawToken, intent.chainId);
    if (verified) {
      intent.tokenSymbol = verified.symbol;
      intent.tokenAddress = verified.address;
      intent.tokenDecimals = verified.decimals;

      if (intent.amount !== null) {
        try {
          intent.amountBaseUnits = toBaseUnits(intent.amount, verified.decimals);
        } catch (err: any) {
          intent.intentStatus = 'INVALID_REQUEST';
          intent.clarificationReason = 'INVALID_AMOUNT_FORMAT';
          intent.clarificationPrompt = err.message || 'Precision overflow for token decimals.';
          return intent;
        }
      }
    } else {
      warnings.push(`Token "${rawToken}" is not recognized in the verified registry for ${intent.networkName}.`);
      intent.tokenSymbol = rawToken.toUpperCase();
    }
  } else {
    missingFields.push('token');
  }

  intent.missingFields = missingFields;
  intent.warnings = warnings;

  // 5. Evaluate overall intent status and formulate follow-up question
  if (missingFields.length > 0 || !intent.resolvedRecipientAddress) {
    intent.intentStatus = 'NEEDS_CLARIFICATION';

    if (missingFields.includes('amount') && missingFields.includes('token') && missingFields.includes('recipient')) {
      intent.clarificationReason = 'MISSING_AMOUNT';
      intent.clarificationPrompt = 'Please specify the amount, token, and recipient (e.g. "Send 100 USDC to 0x...").';
    } else if (missingFields.includes('amount') && missingFields.includes('token')) {
      intent.clarificationReason = 'MISSING_AMOUNT';
      intent.clarificationPrompt = `How much and which token would you like to send to ${intent.recipientInput || 'the recipient'}?`;
    } else if (missingFields.includes('amount')) {
      intent.clarificationReason = 'MISSING_AMOUNT';
      intent.clarificationPrompt = `How much ${intent.tokenSymbol || 'funds'} would you like to send? Please specify an amount greater than zero.`;
    } else if (missingFields.includes('token')) {
      intent.clarificationReason = 'MISSING_TOKEN';
      const netTokens = SUPPORTED_NETWORKS[intent.chainId].tokens.map((t) => t.symbol).join(', ');
      intent.clarificationPrompt = `Which token would you like to send? Verified tokens on ${intent.networkName} include: ${netTokens}.`;
    } else if (!intent.resolvedRecipientAddress) {
      intent.clarificationReason = 'MISSING_RECIPIENT';
      intent.clarificationPrompt = intent.recipientInput
        ? `Could not resolve recipient "${intent.recipientInput}". Please provide a verified 42-character 0x... EVM address.`
        : 'Who should receive the payment? Please provide a valid 0x... EVM address.';
    }
    return intent;
  }

  intent.intentStatus = 'READY_FOR_VALIDATION';
  return intent;
}

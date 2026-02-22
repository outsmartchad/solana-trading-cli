/**
 * Vendored from @percolator/core — error definitions for Percolator program.
 * Source: https://github.com/dcccrypto/percolator-launch
 */

interface ErrorInfo {
  name: string;
  hint: string;
}

export const PERCOLATOR_ERRORS: Record<number, ErrorInfo> = {
  0: { name: "InvalidMagic", hint: "The slab account has invalid data. Ensure you're using the correct slab address." },
  1: { name: "InvalidVersion", hint: "Slab version mismatch. The program may have been upgraded." },
  2: { name: "AlreadyInitialized", hint: "This account is already initialized." },
  3: { name: "NotInitialized", hint: "The slab is not initialized. Run init-market first." },
  4: { name: "InvalidSlabLen", hint: "Slab account has wrong size." },
  5: { name: "InvalidOracleKey", hint: "Oracle account doesn't match config." },
  6: { name: "OracleStale", hint: "Oracle price is too old." },
  7: { name: "OracleConfTooWide", hint: "Oracle confidence interval is too wide." },
  8: { name: "InvalidVaultAta", hint: "Vault token account is invalid." },
  9: { name: "InvalidMint", hint: "Token mint doesn't match." },
  10: { name: "ExpectedSigner", hint: "Missing required signature." },
  11: { name: "ExpectedWritable", hint: "Account must be writable." },
  12: { name: "OracleInvalid", hint: "Oracle data is invalid." },
  13: { name: "EngineInsufficientBalance", hint: "Not enough collateral." },
  14: { name: "EngineUndercollateralized", hint: "Account is undercollateralized." },
  15: { name: "EngineUnauthorized", hint: "Not authorized for this operation." },
  16: { name: "EngineInvalidMatchingEngine", hint: "Matcher program/context doesn't match LP config." },
  17: { name: "EnginePnlNotWarmedUp", hint: "PnL not warmed up yet." },
  18: { name: "EngineOverflow", hint: "Numeric overflow. Try a smaller amount." },
  19: { name: "EngineAccountNotFound", hint: "Account not found at this index." },
  20: { name: "EngineNotAnLPAccount", hint: "Expected an LP account but got a user account." },
  21: { name: "EnginePositionSizeMismatch", hint: "Position size mismatch between user and LP." },
  22: { name: "EngineRiskReductionOnlyMode", hint: "Market is in risk-reduction mode." },
  23: { name: "EngineAccountKindMismatch", hint: "Wrong account type." },
  24: { name: "InvalidTokenAccount", hint: "Token account is invalid." },
  25: { name: "InvalidTokenProgram", hint: "Invalid token program." },
  26: { name: "InvalidConfigParam", hint: "Invalid configuration parameter." },
  27: { name: "HyperpTradeNoCpiDisabled", hint: "TradeNoCpi is disabled for this market. Use TradeCpi." },
  28: { name: "InsuranceMintAlreadyExists", hint: "Insurance LP mint already exists." },
  29: { name: "InsuranceMintNotCreated", hint: "Insurance LP mint not created yet." },
  30: { name: "InsuranceBelowThreshold", hint: "Insurance fund balance below threshold." },
  31: { name: "InsuranceZeroAmount", hint: "Amount must be greater than zero." },
  32: { name: "InsuranceSupplyMismatch", hint: "Insurance LP token supply mismatch." },
  33: { name: "MarketPaused", hint: "Market is paused." },
};

export function decodeError(code: number): ErrorInfo | undefined {
  return PERCOLATOR_ERRORS[code];
}

export function getErrorName(code: number): string {
  return PERCOLATOR_ERRORS[code]?.name ?? `Unknown(${code})`;
}

export function getErrorHint(code: number): string | undefined {
  return PERCOLATOR_ERRORS[code]?.hint;
}

export function parseErrorFromLogs(logs: string[]): {
  code: number;
  name: string;
  hint?: string;
} | null {
  for (const log of logs) {
    const match = log.match(/custom program error: 0x([0-9a-fA-F]+)/);
    if (match) {
      const code = parseInt(match[1], 16);
      const info = decodeError(code);
      return {
        code,
        name: info?.name ?? `Unknown(${code})`,
        hint: info?.hint,
      };
    }
  }
  return null;
}

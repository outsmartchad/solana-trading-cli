/**
 * Vendored from @percolator/core — trading math utilities.
 * Source: https://github.com/dcccrypto/percolator-launch
 */

export function computeMarkPnl(
  positionSize: bigint,
  entryPrice: bigint,
  oraclePrice: bigint,
): bigint {
  if (positionSize === 0n || oraclePrice === 0n) return 0n;
  const absPos = positionSize < 0n ? -positionSize : positionSize;
  const diff = positionSize > 0n ? oraclePrice - entryPrice : entryPrice - oraclePrice;
  return (diff * absPos) / oraclePrice;
}

export function computeLiqPrice(
  entryPrice: bigint,
  capital: bigint,
  positionSize: bigint,
  maintenanceMarginBps: bigint,
): bigint {
  if (positionSize === 0n || entryPrice === 0n) return 0n;
  const absPos = positionSize < 0n ? -positionSize : positionSize;
  const capitalPerUnitE6 = (capital * 1_000_000n) / absPos;
  if (positionSize > 0n) {
    const adjusted = (capitalPerUnitE6 * 10000n) / (10000n + maintenanceMarginBps);
    const liq = entryPrice - adjusted;
    return liq > 0n ? liq : 0n;
  } else {
    if (maintenanceMarginBps >= 10000n) return 18446744073709551615n;
    const adjusted = (capitalPerUnitE6 * 10000n) / (10000n - maintenanceMarginBps);
    return entryPrice + adjusted;
  }
}

export function computePreTradeLiqPrice(
  oracleE6: bigint,
  margin: bigint,
  posSize: bigint,
  maintBps: bigint,
  feeBps: bigint,
  direction: "long" | "short",
): bigint {
  if (oracleE6 === 0n || margin === 0n || posSize === 0n) return 0n;
  const absPos = posSize < 0n ? -posSize : posSize;
  const fee = (absPos * feeBps) / 10000n;
  const effectiveCapital = margin > fee ? margin - fee : 0n;
  const signedPos = direction === "long" ? absPos : -absPos;
  return computeLiqPrice(oracleE6, effectiveCapital, signedPos, maintBps);
}

export function computeTradingFee(notional: bigint, tradingFeeBps: bigint): bigint {
  return (notional * tradingFeeBps) / 10000n;
}

export function computePnlPercent(pnlTokens: bigint, capital: bigint): number {
  if (capital === 0n) return 0;
  const scaledPct = (pnlTokens * 10_000n) / capital;
  return Number(scaledPct) / 100;
}

export function computeEstimatedEntryPrice(
  oracleE6: bigint,
  tradingFeeBps: bigint,
  direction: "long" | "short",
): bigint {
  if (oracleE6 === 0n) return 0n;
  const feeImpact = (oracleE6 * tradingFeeBps) / 10000n;
  return direction === "long" ? oracleE6 + feeImpact : oracleE6 - feeImpact;
}

export function computeFundingRateAnnualized(fundingRateBpsPerSlot: bigint): number {
  const bpsPerSlot = Number(fundingRateBpsPerSlot);
  const slotsPerYear = 2.5 * 60 * 60 * 24 * 365;
  return (bpsPerSlot * slotsPerYear) / 100;
}

export function computeRequiredMargin(notional: bigint, initialMarginBps: bigint): bigint {
  return (notional * initialMarginBps) / 10000n;
}

export function computeMaxLeverage(initialMarginBps: bigint): number {
  if (initialMarginBps === 0n) return 1;
  return Number(10000n / initialMarginBps);
}

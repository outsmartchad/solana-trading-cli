/**
 * Autonomous LP Manager — Pool Selector.
 *
 * Scores and ranks pools by volume, TVL, fee APR, and other metrics
 * to help find the best yield opportunities for LP.
 *
 * Data sources: DexScreener API for volume/TVL, on-chain for price.
 */

import type { PoolScore } from "./types";

// ---------------------------------------------------------------------------
// Pool scoring
// ---------------------------------------------------------------------------

/**
 * Fetch and score Meteora pools for a given token.
 * Returns pools ranked by composite score (highest first).
 */
export async function selectBestPool(
  tokenMint: string,
  dex?: "meteora-dlmm" | "meteora-damm-v2",
): Promise<PoolScore[]> {
  // Fetch pool data from DexScreener
  const pairs = await fetchDexScreenerPairs(tokenMint);

  if (pairs.length === 0) return [];

  // Filter to Meteora pairs if requested
  const filtered = pairs.filter((p: any) => {
    if (dex === "meteora-dlmm") return p.dexId === "meteora" && p.labels?.includes("DLMM");
    if (dex === "meteora-damm-v2") return p.dexId === "meteora" && !p.labels?.includes("DLMM");
    return p.dexId === "meteora";
  });

  // Score each pool
  const scores: PoolScore[] = filtered.map((pair: any) => {
    const volume24h = pair.volume?.h24 ?? 0;
    const tvlUsd = pair.liquidity?.usd ?? 0;
    const volumeTvlRatio = tvlUsd > 0 ? volume24h / tvlUsd : 0;

    // Estimate APR from 24h fee revenue
    // Assume standard fee tier (~0.25% for DLMM, ~0.3% for DAMM)
    const feeRate = pair.labels?.includes("DLMM") ? 0.0025 : 0.003;
    const dailyFeeRevenue = volume24h * feeRate;
    const estimatedApr = tvlUsd > 0 ? (dailyFeeRevenue / tvlUsd) * 365 * 100 : 0;

    // Pool age
    const createdAt = pair.pairCreatedAt ?? 0;
    const ageHours = createdAt > 0 ? (Date.now() - createdAt) / (1000 * 60 * 60) : 0;

    // Composite score (0-100)
    const score = computeScore(volume24h, tvlUsd, volumeTvlRatio, estimatedApr, ageHours);

    return {
      poolAddress: pair.pairAddress ?? "",
      dex: pair.labels?.includes("DLMM") ? "meteora-dlmm" : "meteora-damm-v2",
      pair: `${pair.baseToken?.symbol ?? "?"}/${pair.quoteToken?.symbol ?? "?"}`,
      baseMint: pair.baseToken?.address ?? "",
      quoteMint: pair.quoteToken?.address ?? "",
      volume24h,
      tvlUsd,
      volumeTvlRatio,
      estimatedApr,
      ageHours,
      lpCount: 0, // Not available from DexScreener
      score,
    };
  });

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);
  return scores;
}

// ---------------------------------------------------------------------------
// Scoring algorithm
// ---------------------------------------------------------------------------

function computeScore(
  volume24h: number,
  tvlUsd: number,
  volumeTvlRatio: number,
  estimatedApr: number,
  ageHours: number,
): number {
  let score = 0;

  // Volume/TVL ratio (0-30 points) — higher = more fee revenue per $ locked
  // Typical good range: 0.5-3.0
  score += Math.min(volumeTvlRatio * 10, 30);

  // Estimated APR (0-30 points) — capped at 300%+ for max score
  score += Math.min(estimatedApr / 10, 30);

  // TVL (0-20 points) — some liquidity needed for confidence, but not too much
  // Sweet spot: $10k-$1M
  if (tvlUsd >= 10_000 && tvlUsd <= 1_000_000) {
    score += 20;
  } else if (tvlUsd >= 5_000) {
    score += 10;
  } else if (tvlUsd >= 1_000) {
    score += 5;
  }

  // Volume (0-10 points) — minimum activity
  if (volume24h >= 100_000) score += 10;
  else if (volume24h >= 10_000) score += 5;
  else if (volume24h >= 1_000) score += 2;

  // Age penalty (0-10 points) — prefer pools that have survived a few hours
  if (ageHours >= 24) score += 10;
  else if (ageHours >= 6) score += 5;
  else if (ageHours < 1) score -= 5; // very new = risky

  return Math.max(0, Math.min(100, score));
}

// ---------------------------------------------------------------------------
// DexScreener API
// ---------------------------------------------------------------------------

async function fetchDexScreenerPairs(tokenMint: string): Promise<any[]> {
  const url = `https://api.dexscreener.com/latest/dex/tokens/${tokenMint}`;
  const maxRetries = 3;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const resp = await fetch(url);
      if (resp.status === 429) {
        // Rate limited — wait and retry
        await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
        continue;
      }
      if (!resp.ok) return [];
      const data = await resp.json();
      return data.pairs ?? [];
    } catch {
      if (i < maxRetries - 1) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }
  return [];
}

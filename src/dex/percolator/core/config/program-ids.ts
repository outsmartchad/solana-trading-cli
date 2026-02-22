/**
 * Vendored from @percolator/core — program ID configuration.
 * Source: https://github.com/dcccrypto/percolator-launch
 */
import { PublicKey } from "@solana/web3.js";

export const PROGRAM_IDS = {
  devnet: {
    small: "FxfD37s1AZTeWfFQps9Zpebi2dNQ9QSSDtfMKdbsfKrD",
    medium: "FwfBKZXbYr4vTK23bMFkbgKq3npJ3MSDxEaKmq9Aj4Qn",
    large: "g9msRSV3sJmmE3r5Twn9HuBsxzuuRGTjKCVTKudm9in",
    matcher: "4HcGCsyjAqnFua5ccuXyt8KRRQzKFbGTJkVChpS7Yfzy",
  },
  mainnet: {
    small: "GM8zjJ8LTBMv9xEsverh6H6wLyevgMHEJXcEzyY3rY24",
    medium: "",
    large: "",
    matcher: "DHP6DtwXP1yJsz8YzfoeigRFPB979gzmumkmCxDLSkUX",
  },
} as const;

export type Network = "devnet" | "mainnet";
export type SlabTier = "small" | "medium" | "large";

export function getProgramId(network?: Network, tier: SlabTier = "small"): PublicKey {
  if (process.env.PROGRAM_ID) return new PublicKey(process.env.PROGRAM_ID);
  const targetNetwork = network ?? (process.env.NETWORK as Network) ?? "devnet";
  const programId = PROGRAM_IDS[targetNetwork][tier];
  if (!programId) throw new Error(`Program not deployed for ${targetNetwork}/${tier}`);
  return new PublicKey(programId);
}

export function getMatcherProgramId(network?: Network): PublicKey {
  if (process.env.MATCHER_PROGRAM_ID) return new PublicKey(process.env.MATCHER_PROGRAM_ID);
  const targetNetwork = network ?? (process.env.NETWORK as Network) ?? "devnet";
  const programId = PROGRAM_IDS[targetNetwork].matcher;
  if (!programId) throw new Error(`Matcher program not deployed on ${targetNetwork}`);
  return new PublicKey(programId);
}

export function getCurrentNetwork(): Network {
  const network = process.env.NETWORK?.toLowerCase();
  if (network === "mainnet" || network === "mainnet-beta") return "mainnet";
  return "devnet";
}

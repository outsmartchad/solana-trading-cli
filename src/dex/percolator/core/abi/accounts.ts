/**
 * Vendored from @percolator/core — account specs for Percolator instructions.
 * Source: https://github.com/dcccrypto/percolator-launch
 */
import {
  PublicKey,
  AccountMeta,
  SYSVAR_CLOCK_PUBKEY,
  SYSVAR_RENT_PUBKEY,
  SystemProgram,
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

export interface AccountSpec {
  name: string;
  signer: boolean;
  writable: boolean;
}

export const ACCOUNTS_INIT_MARKET: readonly AccountSpec[] = [
  { name: "admin", signer: true, writable: true },
  { name: "slab", signer: false, writable: true },
  { name: "mint", signer: false, writable: false },
  { name: "vault", signer: false, writable: false },
  { name: "tokenProgram", signer: false, writable: false },
  { name: "clock", signer: false, writable: false },
  { name: "rent", signer: false, writable: false },
  { name: "dummyAta", signer: false, writable: false },
  { name: "systemProgram", signer: false, writable: false },
] as const;

export const ACCOUNTS_INIT_USER: readonly AccountSpec[] = [
  { name: "user", signer: true, writable: true },
  { name: "slab", signer: false, writable: true },
  { name: "userAta", signer: false, writable: true },
  { name: "vault", signer: false, writable: true },
  { name: "tokenProgram", signer: false, writable: false },
] as const;

export const ACCOUNTS_INIT_LP: readonly AccountSpec[] = [
  { name: "user", signer: true, writable: true },
  { name: "slab", signer: false, writable: true },
  { name: "userAta", signer: false, writable: true },
  { name: "vault", signer: false, writable: true },
  { name: "tokenProgram", signer: false, writable: false },
] as const;

export const ACCOUNTS_DEPOSIT_COLLATERAL: readonly AccountSpec[] = [
  { name: "user", signer: true, writable: true },
  { name: "slab", signer: false, writable: true },
  { name: "userAta", signer: false, writable: true },
  { name: "vault", signer: false, writable: true },
  { name: "tokenProgram", signer: false, writable: false },
  { name: "clock", signer: false, writable: false },
] as const;

export const ACCOUNTS_WITHDRAW_COLLATERAL: readonly AccountSpec[] = [
  { name: "user", signer: true, writable: true },
  { name: "slab", signer: false, writable: true },
  { name: "vault", signer: false, writable: true },
  { name: "userAta", signer: false, writable: true },
  { name: "vaultPda", signer: false, writable: false },
  { name: "tokenProgram", signer: false, writable: false },
  { name: "clock", signer: false, writable: false },
  { name: "oracleIdx", signer: false, writable: false },
] as const;

export const ACCOUNTS_KEEPER_CRANK: readonly AccountSpec[] = [
  { name: "caller", signer: true, writable: true },
  { name: "slab", signer: false, writable: true },
  { name: "clock", signer: false, writable: false },
  { name: "oracle", signer: false, writable: false },
] as const;

export const ACCOUNTS_TRADE_NOCPI: readonly AccountSpec[] = [
  { name: "user", signer: true, writable: true },
  { name: "lp", signer: true, writable: true },
  { name: "slab", signer: false, writable: true },
  { name: "clock", signer: false, writable: false },
  { name: "oracle", signer: false, writable: false },
] as const;

export const ACCOUNTS_LIQUIDATE_AT_ORACLE: readonly AccountSpec[] = [
  { name: "unused", signer: false, writable: false },
  { name: "slab", signer: false, writable: true },
  { name: "clock", signer: false, writable: false },
  { name: "oracle", signer: false, writable: false },
] as const;

export const ACCOUNTS_CLOSE_ACCOUNT: readonly AccountSpec[] = [
  { name: "user", signer: true, writable: true },
  { name: "slab", signer: false, writable: true },
  { name: "vault", signer: false, writable: true },
  { name: "userAta", signer: false, writable: true },
  { name: "vaultPda", signer: false, writable: false },
  { name: "tokenProgram", signer: false, writable: false },
  { name: "clock", signer: false, writable: false },
  { name: "oracle", signer: false, writable: false },
] as const;

export const ACCOUNTS_TRADE_CPI: readonly AccountSpec[] = [
  { name: "user", signer: true, writable: true },
  { name: "lpOwner", signer: false, writable: false },
  { name: "slab", signer: false, writable: true },
  { name: "clock", signer: false, writable: false },
  { name: "oracle", signer: false, writable: false },
  { name: "matcherProg", signer: false, writable: false },
  { name: "matcherCtx", signer: false, writable: true },
  { name: "lpPda", signer: false, writable: false },
] as const;

export const ACCOUNTS_SET_ORACLE_AUTHORITY: readonly AccountSpec[] = [
  { name: "admin", signer: true, writable: true },
  { name: "slab", signer: false, writable: true },
] as const;

export const ACCOUNTS_PUSH_ORACLE_PRICE: readonly AccountSpec[] = [
  { name: "authority", signer: true, writable: true },
  { name: "slab", signer: false, writable: true },
] as const;

export const ACCOUNTS_INIT_VAMM: readonly AccountSpec[] = [
  { name: "lpOwner", signer: true, writable: true },
  { name: "matcherCtx", signer: false, writable: true },
  { name: "slab", signer: false, writable: false },
  { name: "lpPda", signer: false, writable: false },
] as const;

export const ACCOUNTS_CREATE_INSURANCE_MINT: readonly AccountSpec[] = [
  { name: "admin", signer: true, writable: false },
  { name: "slab", signer: false, writable: false },
  { name: "insLpMint", signer: false, writable: true },
  { name: "vaultAuthority", signer: false, writable: false },
  { name: "collateralMint", signer: false, writable: false },
  { name: "systemProgram", signer: false, writable: false },
  { name: "tokenProgram", signer: false, writable: false },
  { name: "rent", signer: false, writable: false },
  { name: "payer", signer: true, writable: true },
] as const;

export const ACCOUNTS_DEPOSIT_INSURANCE_LP: readonly AccountSpec[] = [
  { name: "depositor", signer: true, writable: false },
  { name: "slab", signer: false, writable: true },
  { name: "depositorAta", signer: false, writable: true },
  { name: "vault", signer: false, writable: true },
  { name: "tokenProgram", signer: false, writable: false },
  { name: "insLpMint", signer: false, writable: true },
  { name: "depositorLpAta", signer: false, writable: true },
  { name: "vaultAuthority", signer: false, writable: false },
] as const;

export const ACCOUNTS_WITHDRAW_INSURANCE_LP: readonly AccountSpec[] = [
  { name: "withdrawer", signer: true, writable: false },
  { name: "slab", signer: false, writable: true },
  { name: "withdrawerAta", signer: false, writable: true },
  { name: "vault", signer: false, writable: true },
  { name: "tokenProgram", signer: false, writable: false },
  { name: "insLpMint", signer: false, writable: true },
  { name: "withdrawerLpAta", signer: false, writable: true },
  { name: "vaultAuthority", signer: false, writable: false },
] as const;

export function buildAccountMetas(
  spec: readonly AccountSpec[],
  keys: PublicKey[]
): AccountMeta[] {
  if (keys.length !== spec.length) {
    throw new Error(
      `Account count mismatch: expected ${spec.length}, got ${keys.length}`
    );
  }
  return spec.map((s, i) => ({
    pubkey: keys[i],
    isSigner: s.signer,
    isWritable: s.writable,
  }));
}

export const WELL_KNOWN = {
  tokenProgram: TOKEN_PROGRAM_ID,
  clock: SYSVAR_CLOCK_PUBKEY,
  rent: SYSVAR_RENT_PUBKEY,
  systemProgram: SystemProgram.programId,
} as const;

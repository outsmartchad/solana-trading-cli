import { PublicKey } from "@solana/web3.js";
import { AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { connection, wallet } from "../helpers/config";
import {
  WhirlpoolContext,
  buildWhirlpoolClient,
  ORCA_WHIRLPOOL_PROGRAM_ID,
} from "@orca-so/whirlpools-sdk";
export const ourWallet = new Wallet(wallet);
export const provider = new AnchorProvider(connection, ourWallet, {
  commitment: "confirmed",
});
export const ctx = WhirlpoolContext.withProvider(
  provider,
  ORCA_WHIRLPOOL_PROGRAM_ID
);
export const client = buildWhirlpoolClient(ctx);
export const PROGRAM_ID = "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc";
export const MAINNET_WHIRLPOOLS_CONFIG = new PublicKey(
  "2LecshUwdy9xi7meFgHtFJQNSKk4KdTrcpvaB56dP2NQ"
);
export const DEVNET_WHIRLPOOLS_CONFIG = new PublicKey(
  "FcrweFY1G9HJAHG5inkGB6pKg1HZ6x9UC2WioAfWrGkR"
);
export const wsol = "So11111111111111111111111111111111111111112";
export const usdc = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export const usdt = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";
export const USDC = { mint: new PublicKey(usdc), decimals: 6 };
export const WSOL = { mint: new PublicKey(wsol), decimals: 9 };
export const USDT = { mint: new PublicKey(usdt), decimals: 6 };
export const tick_spacing = 256;

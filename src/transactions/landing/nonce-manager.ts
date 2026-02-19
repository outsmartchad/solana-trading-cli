/**
 * Durable Nonce Account Manager
 *
 * Manages durable nonce accounts for concurrent TX landing safety.
 *
 * Problem: The "concurrent" landing strategy fires the SAME transaction to
 * 9+ providers in parallel. Without a durable nonce, if multiple providers
 * land it, the user gets DUPLICATE BUYS — spending 2-9x more SOL than intended.
 *
 * Solution: Durable nonce transactions use a nonce account's stored blockhash.
 * Once consumed by the first successful landing, all other copies become
 * invalid on-chain. This guarantees exactly-once execution.
 *
 * How it works:
 * 1. NonceManager.create() creates a nonce account on-chain (~0.0015 SOL)
 * 2. Before concurrent submission, NonceManager.get() fetches the current nonce
 * 3. NonceManager.buildAdvanceIx() is prepended as the FIRST instruction
 * 4. The nonce value replaces the blockhash in the transaction message
 * 5. Providers treat the nonce as a regular blockhash — no provider changes needed
 *
 * Config is stored at ~/.outsmart/nonce.json
 */

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
  TransactionInstruction,
  NonceAccount,
  NONCE_ACCOUNT_LENGTH,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";

import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

// ---------------------------------------------------------------------------
// Config types
// ---------------------------------------------------------------------------

interface NonceConfig {
  /** Base58 address of the nonce account */
  nonceAccountAddress: string;
  /** Path to the nonce keypair JSON file */
  nonceKeypairPath: string;
  /** Base58 address of the authority (user's wallet) */
  authorityPubkey: string;
  /** ISO timestamp of when the nonce account was created */
  createdAt: string;
}

// ---------------------------------------------------------------------------
// NonceManager class
// ---------------------------------------------------------------------------

export class NonceManager {
  private connection: Connection;
  private authority: Keypair;
  private nonceAddress: PublicKey | null = null;
  private configLoaded = false;

  /**
   * @param connection - Solana RPC connection
   * @param authority - Wallet keypair that controls the nonce account
   */
  constructor(connection: Connection, authority: Keypair) {
    this.connection = connection;
    this.authority = authority;
  }

  // -----------------------------------------------------------------------
  // Static config paths
  // -----------------------------------------------------------------------

  /** Directory for outsmart config files */
  static get configDir(): string {
    const home = process.env.HOME || process.env.USERPROFILE || "~";
    return path.join(home, ".outsmart");
  }

  /** Path to nonce config JSON */
  static get configPath(): string {
    return path.join(NonceManager.configDir, "nonce.json");
  }

  /** Path to nonce keypair JSON */
  static get keypairPath(): string {
    return path.join(NonceManager.configDir, "nonce-keypair.json");
  }

  // -----------------------------------------------------------------------
  // Config I/O
  // -----------------------------------------------------------------------

  private readConfig(): NonceConfig | null {
    try {
      if (!fs.existsSync(NonceManager.configPath)) return null;
      const raw = fs.readFileSync(NonceManager.configPath, "utf8");
      return JSON.parse(raw) as NonceConfig;
    } catch {
      return null;
    }
  }

  private writeConfig(config: NonceConfig): void {
    fs.mkdirSync(NonceManager.configDir, { recursive: true });
    fs.writeFileSync(
      NonceManager.configPath,
      JSON.stringify(config, null, 2),
      { encoding: "utf8", mode: 0o600 },
    );
  }

  private deleteConfig(): void {
    try {
      if (fs.existsSync(NonceManager.configPath)) {
        fs.unlinkSync(NonceManager.configPath);
      }
      if (fs.existsSync(NonceManager.keypairPath)) {
        fs.unlinkSync(NonceManager.keypairPath);
      }
    } catch {
      // Best-effort cleanup
    }
  }

  // -----------------------------------------------------------------------
  // Core operations
  // -----------------------------------------------------------------------

  /**
   * Check if a valid nonce account exists (config + on-chain).
   */
  async exists(): Promise<boolean> {
    const config = this.readConfig();
    if (!config) return false;

    try {
      const pubkey = new PublicKey(config.nonceAccountAddress);
      const accountInfo = await this.connection.getAccountInfo(pubkey);
      if (!accountInfo) return false;

      // Verify it's actually a nonce account by trying to decode it
      NonceAccount.fromAccountData(accountInfo.data);
      this.nonceAddress = pubkey;
      this.configLoaded = true;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create a new nonce account on-chain.
   *
   * Cost: ~0.0015 SOL (rent-exempt minimum for nonce account).
   *
   * @returns The nonce account address and initial nonce value
   */
  async create(): Promise<{ nonceAccount: PublicKey; nonce: string }> {
    // Generate a new keypair for the nonce account
    const nonceKeypair = Keypair.generate();

    // Calculate minimum rent for nonce account
    const rent = await this.connection.getMinimumBalanceForRentExemption(
      NONCE_ACCOUNT_LENGTH,
    );

    // Build the create + initialize instructions
    const createAccountIx = SystemProgram.createAccount({
      fromPubkey: this.authority.publicKey,
      newAccountPubkey: nonceKeypair.publicKey,
      lamports: rent,
      space: NONCE_ACCOUNT_LENGTH,
      programId: SystemProgram.programId,
    });

    const initNonceIx = SystemProgram.nonceInitialize({
      noncePubkey: nonceKeypair.publicKey,
      authorizedPubkey: this.authority.publicKey,
    });

    // Build, sign, and send the transaction
    const { blockhash, lastValidBlockHeight } =
      await this.connection.getLatestBlockhash("confirmed");

    const message = new TransactionMessage({
      payerKey: this.authority.publicKey,
      recentBlockhash: blockhash,
      instructions: [createAccountIx, initNonceIx],
    }).compileToV0Message();

    const tx = new VersionedTransaction(message);
    tx.sign([this.authority, nonceKeypair]);

    const signature = await this.connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
      maxRetries: 3,
    });

    // Wait for confirmation
    await this.connection.confirmTransaction(
      { signature, blockhash, lastValidBlockHeight },
      "confirmed",
    );

    // Save the keypair securely
    fs.mkdirSync(NonceManager.configDir, { recursive: true });
    fs.writeFileSync(
      NonceManager.keypairPath,
      JSON.stringify(Array.from(nonceKeypair.secretKey)),
      { encoding: "utf8", mode: 0o600 },
    );

    // Save config
    const config: NonceConfig = {
      nonceAccountAddress: nonceKeypair.publicKey.toBase58(),
      nonceKeypairPath: NonceManager.keypairPath,
      authorityPubkey: this.authority.publicKey.toBase58(),
      createdAt: new Date().toISOString(),
    };
    this.writeConfig(config);

    // Set internal state
    this.nonceAddress = nonceKeypair.publicKey;
    this.configLoaded = true;

    // Fetch the initial nonce value
    const accountInfo = await this.connection.getAccountInfo(
      nonceKeypair.publicKey,
    );
    if (!accountInfo) {
      throw new Error("Nonce account created but could not be read back");
    }
    const nonceAccount = NonceAccount.fromAccountData(accountInfo.data);

    console.log(
      `[nonce] Created nonce account: ${nonceKeypair.publicKey.toBase58()}`,
    );
    console.log(
      `[nonce] Cost: ${(rent / LAMPORTS_PER_SOL).toFixed(6)} SOL (rent-exempt)`,
    );

    return {
      nonceAccount: nonceKeypair.publicKey,
      nonce: nonceAccount.nonce,
    };
  }

  /**
   * Load the nonce account from config and fetch its current on-chain state.
   *
   * @returns Nonce address, current nonce value, and authority
   * @throws Error if no nonce config exists or account is invalid
   */
  async load(): Promise<{
    address: PublicKey;
    nonce: string;
    authority: PublicKey;
  }> {
    const config = this.readConfig();
    if (!config) {
      throw new Error(
        "No nonce account configured. Run NonceManager.create() first, " +
        "or use the 'outsmart nonce create' command.",
      );
    }

    const address = new PublicKey(config.nonceAccountAddress);
    const accountInfo = await this.connection.getAccountInfo(address);
    if (!accountInfo) {
      throw new Error(
        `Nonce account ${config.nonceAccountAddress} not found on-chain. ` +
        "It may have been closed. Run NonceManager.create() to create a new one.",
      );
    }

    const nonceAccount = NonceAccount.fromAccountData(accountInfo.data);

    this.nonceAddress = address;
    this.configLoaded = true;

    return {
      address,
      nonce: nonceAccount.nonce,
      authority: nonceAccount.authorizedPubkey,
    };
  }

  /**
   * Get the current nonce value (fetches fresh from chain every time).
   *
   * IMPORTANT: Nonce value changes after each use. Always call get() fresh
   * before building a transaction.
   */
  async get(): Promise<{ nonce: string; address: PublicKey }> {
    if (!this.nonceAddress) {
      await this.load();
    }

    const accountInfo = await this.connection.getAccountInfo(
      this.nonceAddress!,
    );
    if (!accountInfo) {
      throw new Error(
        `Nonce account ${this.nonceAddress!.toBase58()} no longer exists on-chain.`,
      );
    }

    const nonceAccount = NonceAccount.fromAccountData(accountInfo.data);
    return {
      nonce: nonceAccount.nonce,
      address: this.nonceAddress!,
    };
  }

  /**
   * Build a nonceAdvance instruction.
   *
   * This MUST be the FIRST instruction in any transaction using a durable nonce.
   * The Solana runtime recognizes the nonceAdvance instruction and validates
   * the nonce value as the blockhash.
   *
   * @returns TransactionInstruction for SystemProgram.nonceAdvance
   */
  buildAdvanceIx(): TransactionInstruction {
    if (!this.nonceAddress) {
      throw new Error(
        "Nonce account not loaded. Call load() or create() first.",
      );
    }

    return SystemProgram.nonceAdvance({
      noncePubkey: this.nonceAddress,
      authorizedPubkey: this.authority.publicKey,
    });
  }

  /**
   * Ensure a nonce account exists, prompting the user to create one if needed.
   *
   * In non-interactive mode (piped stdin), defaults to false (skip nonce creation).
   *
   * @returns true if a nonce account exists (or was just created), false if user declined
   */
  async ensureExists(): Promise<boolean> {
    if (await this.exists()) {
      return true;
    }

    // Check if stdin is interactive (TTY)
    if (!process.stdin.isTTY) {
      console.warn(
        "[nonce] No nonce account found. Non-interactive mode — skipping creation.",
      );
      console.warn(
        "[nonce] Concurrent landing without nonce risks duplicate buys.",
      );
      return false;
    }

    // Prompt the user
    const answer = await this.promptUser(
      "Concurrent TX landing requires a durable nonce account (~0.0015 SOL).\n" +
      "Without it, duplicate buys are possible. Create one now? [Y/n] ",
    );

    const normalized = answer.trim().toLowerCase();
    if (normalized === "" || normalized === "y" || normalized === "yes") {
      try {
        await this.create();
        return true;
      } catch (err) {
        console.error("[nonce] Failed to create nonce account:", err);
        return false;
      }
    }

    console.warn(
      "[nonce] Nonce creation declined. Concurrent strategy will fall back to race.",
    );
    return false;
  }

  /**
   * Close the nonce account and reclaim the rent (~0.0015 SOL).
   *
   * Withdraws all lamports back to the authority wallet and deletes
   * the local config files.
   */
  async close(): Promise<{ txSignature: string; confirmed: boolean }> {
    if (!this.nonceAddress) {
      const config = this.readConfig();
      if (!config) {
        throw new Error("No nonce account to close.");
      }
      this.nonceAddress = new PublicKey(config.nonceAccountAddress);
    }

    // Get nonce account balance
    const accountInfo = await this.connection.getAccountInfo(
      this.nonceAddress,
    );
    if (!accountInfo) {
      // Already closed — just clean up config
      this.deleteConfig();
      this.nonceAddress = null;
      this.configLoaded = false;
      return { txSignature: "", confirmed: true };
    }

    const withdrawIx = SystemProgram.nonceWithdraw({
      noncePubkey: this.nonceAddress,
      authorizedPubkey: this.authority.publicKey,
      toPubkey: this.authority.publicKey,
      lamports: accountInfo.lamports,
    });

    const { blockhash, lastValidBlockHeight } =
      await this.connection.getLatestBlockhash("confirmed");

    const message = new TransactionMessage({
      payerKey: this.authority.publicKey,
      recentBlockhash: blockhash,
      instructions: [withdrawIx],
    }).compileToV0Message();

    const tx = new VersionedTransaction(message);
    tx.sign([this.authority]);

    const signature = await this.connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
      maxRetries: 3,
    });

    await this.connection.confirmTransaction(
      { signature, blockhash, lastValidBlockHeight },
      "confirmed",
    );

    const reclaimedSol = accountInfo.lamports / LAMPORTS_PER_SOL;
    console.log(
      `[nonce] Closed nonce account ${this.nonceAddress.toBase58()}. ` +
      `Reclaimed ${reclaimedSol.toFixed(6)} SOL.`,
    );

    // Clean up config
    this.deleteConfig();
    this.nonceAddress = null;
    this.configLoaded = false;

    return { txSignature: signature, confirmed: true };
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  /**
   * Get the nonce account address, if loaded.
   */
  getAddress(): PublicKey | null {
    return this.nonceAddress;
  }

  /**
   * Prompt the user for input via readline.
   */
  private promptUser(question: string): Promise<string> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve) => {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer);
      });
    });
  }
}

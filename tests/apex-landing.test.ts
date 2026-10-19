/**
 * CI-safe tests for the OrbitFlare Apex landing provider — NO network, NO SOL.
 *
 * axios is mocked, so these check the transaction and request the provider builds.
 */

import type axios from "axios";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  VersionedTransaction,
} from "@solana/web3.js";

import { getTipAccountsForProvider } from "../src/transactions/landing/tip-accounts";

// tests/setup.ts has already loaded the landing modules with the real axios, so load
// a fresh copy of the provider against a mocked one.
jest.mock("axios");
let mockedAxios: jest.Mocked<typeof axios>;
let createProvider: typeof import("../src/transactions/landing/providers/apex").createProvider;

beforeAll(() => {
  jest.isolateModules(() => {
    mockedAxios = require("axios");
    ({ createProvider } = require("../src/transactions/landing/providers/apex"));
  });
});

const BLOCKHASH = "GHtXQBsoZHVnNFa9YevAzFr17DJjgHXk3ycTKD5xD3Zi";
const MEMO_PROGRAM = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
const ENV_KEYS = ["APEX_API_KEY", "APEX_REGION", "APEX_URL", "APEX_MEV_PROTECT"];

const signer = Keypair.generate();
const memo = new TransactionInstruction({
  programId: MEMO_PROGRAM,
  keys: [],
  data: Buffer.from("apex test"),
});
const opts = { dex: "raydium-amm-v4", operation: "buy" };

let savedEnv: Record<string, string | undefined>;

beforeEach(() => {
  savedEnv = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  for (const k of ENV_KEYS) delete process.env[k];
  mockedAxios.post.mockReset();
  mockedAxios.get.mockReset();
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
});

/** The transaction the provider posted, decoded. */
function sentTx(): VersionedTransaction {
  const body = mockedAxios.post.mock.calls[0][1] as any;
  return VersionedTransaction.deserialize(Buffer.from(body.params[0], "base64"));
}

/** Top-level SystemProgram transfers in the transaction, as [to, lamports]. */
function transfers(tx: VersionedTransaction): [string, number][] {
  const keys = tx.message.staticAccountKeys;
  return tx.message.compiledInstructions
    .filter((ix) => keys[ix.programIdIndex].equals(SystemProgram.programId))
    .map((ix) => [keys[ix.accountKeyIndexes[1]].toBase58(), Number(Buffer.from(ix.data).readBigUInt64LE(4))]);
}

describe("Apex landing provider", () => {
  test("is enabled only with APEX_API_KEY", () => {
    expect(createProvider().isEnabled()).toBe(false);
    process.env.APEX_API_KEY = "key";
    expect(createProvider().isEnabled()).toBe(true);
  });

  test("refuses to send without a key", async () => {
    const r = await createProvider().submit([memo], signer, BLOCKHASH, opts);
    expect(r).toMatchObject({ provider: "apex", accepted: false, error: "APEX_API_KEY not set" });
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  test("sends a signed transaction with exactly one Apex tip to the global endpoint", async () => {
    process.env.APEX_API_KEY = "test-key";
    mockedAxios.post.mockResolvedValue({ data: { jsonrpc: "2.0", id: 1, result: "SIG" } });

    const r = await createProvider().submit([memo], signer, BLOCKHASH, opts);
    expect(r).toMatchObject({ provider: "apex", accepted: true, signature: "SIG" });

    const [url, body, config] = mockedAxios.post.mock.calls[0] as any[];
    expect(url).toBe("http://global.apex.orbitflare.com");
    expect(config.headers).toEqual({ "x-api-key": "test-key" });
    expect(body.method).toBe("sendTransaction");
    expect(body.params[1]).toEqual({ encoding: "base64" });
    expect(body.params[2]).toBe(false);

    const tx = sentTx();
    expect(tx.message.recentBlockhash).toBe(BLOCKHASH);
    expect(tx.message.staticAccountKeys[0].equals(signer.publicKey)).toBe(true);
    const tips = transfers(tx);
    expect(tips).toHaveLength(1);
    expect(getTipAccountsForProvider("apex")).toContain(tips[0][0]);
    expect(tips[0][0].startsWith("APeX")).toBe(true);
    expect(tips[0][1]).toBe(1_000_000);
  });

  test("uses the caller's tip, region and MEV protection", async () => {
    process.env.APEX_API_KEY = "k";
    process.env.APEX_REGION = "FRA";
    process.env.APEX_MEV_PROTECT = "true";
    mockedAxios.post.mockResolvedValue({ data: { result: "SIG" } });

    await createProvider().submit([memo], signer, { blockhash: BLOCKHASH, lastValidBlockHeight: 1 }, { ...opts, tipSol: 0.0025 });

    const [url, body] = mockedAxios.post.mock.calls[0] as any[];
    expect(url).toBe("http://fra.apex.orbitflare.com");
    expect(body.params[2]).toBe(true);
    expect(transfers(sentTx())[0][1]).toBe(2_500_000);
  });

  test("APEX_URL overrides the region", async () => {
    process.env.APEX_API_KEY = "k";
    process.env.APEX_REGION = "tyo";
    process.env.APEX_URL = "http://127.0.0.1:8080";
    mockedAxios.post.mockResolvedValue({ data: { result: "SIG" } });

    await createProvider().submit([memo], signer, BLOCKHASH, opts);
    expect(mockedAxios.post.mock.calls[0][0]).toBe("http://127.0.0.1:8080");
  });

  test("leaves the tip floor to Apex, since a key's tier can set its own", async () => {
    process.env.APEX_API_KEY = "k";
    mockedAxios.post.mockResolvedValue({
      data: { jsonrpc: "2.0", id: 1, error: { code: -32602, message: "tip 500000 is below your floor of 1000000 lamports" } },
    });
    const r = await createProvider().submit([memo], signer, BLOCKHASH, { ...opts, tipSol: 0.0005 });
    expect(transfers(sentTx())[0][1]).toBe(500_000);
    expect(r).toMatchObject({ accepted: false, error: "tip 500000 is below your floor of 1000000 lamports" });
  });

  test("an unknown region is an error, not a request", async () => {
    process.env.APEX_API_KEY = "k";
    process.env.APEX_REGION = "mars";
    const r = await createProvider().submit([memo], signer, BLOCKHASH, opts);
    expect(r.accepted).toBe(false);
    expect(r.error).toContain('Unknown APEX_REGION "mars"');
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  test("surfaces Apex's JSON-RPC error", async () => {
    process.env.APEX_API_KEY = "k";
    mockedAxios.post.mockResolvedValue({
      data: { jsonrpc: "2.0", id: 1, error: { code: -32001, message: "invalid API key" } },
    });
    const r = await createProvider().submit([memo], signer, BLOCKHASH, opts);
    expect(r).toMatchObject({ accepted: false, error: "invalid API key" });
  });

  test("ping hits /ping on the endpoint", async () => {
    process.env.APEX_REGION = "ams";
    mockedAxios.get.mockResolvedValue({ data: "pong" });
    await createProvider().ping!();
    expect(mockedAxios.get.mock.calls[0][0]).toBe("http://ams.apex.orbitflare.com/ping");
  });
});

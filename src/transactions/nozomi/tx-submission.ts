import {
  PublicKey,
  Keypair,
  Connection,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
  TransactionInstruction,
  BlockhashWithExpiryBlockHeight,
} from "@solana/web3.js";
import { getConnection, jito_fee } from "../../helpers/config";
import axios from "axios";

// Nozomi tip account
const NOZOMI_TIP = new PublicKey("TEMPaMeCRFAS9EKF53Jd6KpHxgL47uWLcpFArU1Fanq");

const listOfValidators = [
  "TEMPaMeCRFAS9EKF53Jd6KpHxgL47uWLcpFArU1Fanq",
  "noz3jAjPiHuBPqiSPkkugaJDkJscPuRhYnSpbi8UvC4",
  "noz3str9KXfpKknefHji8L1mPgimezaiUyCHYMDv1GE",
  "noz6uoYCDijhu1V7cutCpwxNiSovEwLdRHPwmgCGDNo",
  "noz9EPNcT7WH6Sou3sr3GGjHQYVkN3DNirpbvDkv9YJ",
  "nozc5yT15LazbLTFVZzoNZCwjh3yUtW86LoUyqsBu4L",
  "nozFrhfnNGoyqwVuwPAW4aaGqempx4PU6g6D9CJMv7Z",
  "nozievPk7HyK1Rqy1MPJwVQ7qQg2QoJGyP71oeDwbsu",
  "noznbgwYnBLDHu8wcQVCEw6kDrXkPdKkydGJGNXGvL7",
  "nozNVWs5N8mgzuD3qigrCG2UoKxZttxzZ85pvAQVrbP",
  "nozpEGbwx4BcGp6pvEdAh1JoC2CQGZdU6HbNP1v2p6P",
  "nozrhjhkCr3zXT3BiT4WCodYCUFeQvcdUkM7MqhKqge",
  "nozrwQtWhEdrA6W8dkbt9gnUaMs52PdAv5byipnadq3",
  "nozUacTVWub3cL4mJmGCYjKZTnE9RbdY5AP46iQgbPJ",
  "nozWCyTPppJjRuw2fpzDhhWbW355fzosWSzrrMYB1Qk",
  "nozWNju6dY353eMkMqURqwQEoM3SFgEKC6psLCSfUne",
  "nozxNBgWohjR75vdspfxR5H9ceC7XXH99xpxhVGt3Bb",
];

// Read API keys from environment -- NEVER hardcode
const NOZOMI_API_KEY = process.env.NOZOMI_API_KEY || "";
const NOZOMI_LOW_LATENCY_API_KEYS = (process.env.NOZOMI_LOW_LATENCY_API_KEY || "")
  .split(",")
  .filter(Boolean);

// Use HTTPS -- never plain HTTP for transaction submission
const NOZOMI_BASE_URL = process.env.NOZOMI_URL || "https://ams1.secure.nozomi.temporal.xyz/?c=";

export function getRandomValidator(): PublicKey {
  const randomIndex = Math.floor(Math.random() * listOfValidators.length);
  return new PublicKey(listOfValidators[randomIndex]);
}

function getRandomNozomiAPIKey(): string {
  if (NOZOMI_LOW_LATENCY_API_KEYS.length > 0) {
    return NOZOMI_LOW_LATENCY_API_KEYS[Math.floor(Math.random() * NOZOMI_LOW_LATENCY_API_KEYS.length)];
  }
  return NOZOMI_API_KEY;
}

export function getNozomiConnection(): Connection {
  const apiKey = getRandomNozomiAPIKey();
  if (!apiKey) {
    throw new Error("NOZOMI_API_KEY or NOZOMI_LOW_LATENCY_API_KEY not set. Configure via 'outsmart init' or .env");
  }
  return new Connection(`${NOZOMI_BASE_URL}${apiKey}`);
}

export interface NozomiResult {
  success: boolean;
  signature?: string;
  error?: string;
}

/**
 * Sends a transaction via Nozomi with tip.
 * NOTE: Does NOT mutate the input ixs array.
 */
export async function sendNozomiTx(
  ixs: TransactionInstruction[],
  signer: Keypair,
  blockhash: string | BlockhashWithExpiryBlockHeight,
  tipSol: number = jito_fee
): Promise<NozomiResult> {
  const apiKey = getRandomNozomiAPIKey();
  if (!apiKey) {
    return { success: false, error: "Nozomi API key not configured" };
  }

  const validator = getRandomValidator();

  // Build tip instruction
  const tipIx = SystemProgram.transfer({
    fromPubkey: signer.publicKey,
    toPubkey: validator,
    lamports: Math.round(tipSol * LAMPORTS_PER_SOL),
  });

  // Build transaction (don't mutate input array)
  const allIxs = [...ixs, tipIx];
  const tx = new Transaction().add(...allIxs);

  if (typeof blockhash === "string") {
    tx.recentBlockhash = blockhash;
  } else {
    tx.recentBlockhash = blockhash.blockhash;
    tx.lastValidBlockHeight = blockhash.lastValidBlockHeight;
  }

  tx.feePayer = signer.publicKey;
  tx.sign(signer);

  const b64Tx = Buffer.from(tx.serialize()).toString("base64");
  const url = `${NOZOMI_BASE_URL}${apiKey}`;

  try {
    const response = await axios.post(
      url,
      {
        jsonrpc: "2.0",
        id: 1,
        method: "sendTransaction",
        params: [b64Tx, { encoding: "base64" }],
      },
      { timeout: 10000 }
    );

    const signature = response.data?.result;
    if (signature) {
      console.log("Nozomi tx sent:", signature);
      return { success: true, signature };
    }

    return { success: false, error: response.data?.error?.message || "Unknown Nozomi error" };
  } catch (error: any) {
    const msg = error?.response?.data?.error?.message || error?.message || "Nozomi request failed";
    console.error(`Nozomi error: ${msg}`);
    return { success: false, error: msg };
  }
}

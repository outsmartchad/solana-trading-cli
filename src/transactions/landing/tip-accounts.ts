/**
 * TX Landing — Tip Account Registry
 *
 * Master lookup of all known SWQoS tip accounts across all providers.
 * These are public on-chain addresses (NOT secrets). Used to identify
 * tip transfers when analyzing transactions.
 */

import { TipAccount } from "./types";

/**
 * All known tip accounts, organized by provider.
 */
export const TIP_ACCOUNTS: readonly TipAccount[] = [
  // 0slot
  { provider: "zero-slot", address: "Eb2KpSC8uMt9GmzyAEm5Eb1AAAgTjRaXWFjKyFXHZxF3" },
  { provider: "zero-slot", address: "FCjUJZ1qozm1e8romw216qyfQMaaWKxWsuySnumVCCNe" },
  { provider: "zero-slot", address: "ENxTEjSQ1YabmUpXAdCgevnHQ9MHdLv8tzFiuiYJqa13" },
  { provider: "zero-slot", address: "6rYLG55Q9RpsPGvqdPNJs4z5WTxJVatMB8zV3WJhs5EK" },
  { provider: "zero-slot", address: "Cix2bHfqPcKcM233mzxbLk14kSggUUiz2A87fJtGivXr" },

  // nozomi
  { provider: "nozomi", address: "TEMPaMeCRFAS9EKF53Jd6KpHxgL47uWLcpFArU1Fanq" },
  { provider: "nozomi", address: "noz3jAjPiHuBPqiSPkkugaJDkJscPuRhYnSpbi8UvC4" },
  { provider: "nozomi", address: "noz3str9KXfpKknefHji8L1mPgimezaiUyCHYMDv1GE" },
  { provider: "nozomi", address: "noz6uoYCDijhu1V7cutCpwxNiSovEwLdRHPwmgCGDNo" },
  { provider: "nozomi", address: "noz9EPNcT7WH6Sou3sr3GGjHQYVkN3DNirpbvDkv9YJ" },
  { provider: "nozomi", address: "nozc5yT15LazbLTFVZzoNZCwjh3yUtW86LoUyqsBu4L" },
  { provider: "nozomi", address: "nozFrhfnNGoyqwVuwPAW4aaGqempx4PU6g6D9CJMv7Z" },
  { provider: "nozomi", address: "nozievPk7HyK1Rqy1MPJwVQ7qQg2QoJGyP71oeDwbsu" },
  { provider: "nozomi", address: "noznbgwYnBLDHu8wcQVCEw6kDrXkPdKkydGJGNXGvL7" },
  { provider: "nozomi", address: "nozNVWs5N8mgzuD3qigrCG2UoKxZttxzZ85pvAQVrbP" },
  { provider: "nozomi", address: "nozpEGbwx4BcGp6pvEdAh1JoC2CQGZdU6HbNP1v2p6P" },
  { provider: "nozomi", address: "nozrhjhkCr3zXT3BiT4WCodYCUFeQvcdUkM7MqhKqge" },
  { provider: "nozomi", address: "nozrwQtWhEdrA6W8dkbt9gnUaMs52PdAv5byipnadq3" },
  { provider: "nozomi", address: "nozUacTVWub3cL4mJmGCYjKZTnE9RbdY5AP46iQgbPJ" },
  { provider: "nozomi", address: "nozWCyTPppJjRuw2fpzDhhWbW355fzosWSzrrMYB1Qk" },
  { provider: "nozomi", address: "nozWNju6dY353eMkMqURqwQEoM3SFgEKC6psLCSfUne" },
  { provider: "nozomi", address: "nozxNBgWohjR75vdspfxR5H9ceC7XXH99xpxhVGt3Bb" },

  // helius-sender
  { provider: "helius-sender", address: "4ACfpUFoaSD9bfPdeu6DBt89gB6ENTeHBXCAi87NhDEE" },
  { provider: "helius-sender", address: "D2L6yPZ2FmmmTKPgzaMKdhu6EWZcTpLy1Vhx8uvZe7NZ" },
  { provider: "helius-sender", address: "9bnz4RShgq1hAnLnZbP8kbgBg1kEmcJBYQq3gQbmnSta" },
  { provider: "helius-sender", address: "5VY91ws6B2hMmBFRsXkoAAdsPHBJwRfBht4DXox3xkwn" },
  { provider: "helius-sender", address: "2nyhqdwKcJZR2vcqCyrYsaPVdAnFoJjiksCXJ7hfEYgD" },
  { provider: "helius-sender", address: "2q5pghRs6arqVjRvT5gfgWfWcHWmw1ZuCzphgd5KfWGJ" },
  { provider: "helius-sender", address: "wyvPkWjVZz1M8fHQnMMCDTQDbkManefNNhweYk5WkcF" },
  { provider: "helius-sender", address: "3KCKozbAaF75qEU33jtzozcJ29yJuaLJTy2jFdzUY8bT" },
  { provider: "helius-sender", address: "4vieeGHPYPG2MmyPRcYjdiDmmhN3ww7hsFNap8pVN3Ey" },
  { provider: "helius-sender", address: "4TQLFNWK8AovT1gFvda5jfw2oJeRMKEmw7aH6MGBJ3or" },

  // blockrazor
  { provider: "blockrazor", address: "Gywj98ophM7GmkDdaWs4isqZnDdFCW7B46TXmKfvyqSm" },
  { provider: "blockrazor", address: "FjmZZrFvhnqqb9ThCuMVnENaM3JGVuGWNyCAxRJcFpg9" },
  { provider: "blockrazor", address: "6No2i3aawzHsjtThw81iq1EXPJN6rh8eSJCLaYZfKDTG" },
  { provider: "blockrazor", address: "A9cWowVAiHe9pJfKAj3TJiN9VpbzMUq6E4kEvf5mUT22" },
  { provider: "blockrazor", address: "68Pwb4jS7eZATjDfhmTXgRJjCiZmw1L7Huy4HNpnxJ3o" },
  { provider: "blockrazor", address: "4ABhJh5rZPjv63RBJBuyWzBK3g9gWMUQdTZP2kiW31V9" },
  { provider: "blockrazor", address: "B2M4NG5eyZp5SBQrSdtemzk5TqVuaWGQnowGaCBt8GyM" },
  { provider: "blockrazor", address: "5jA59cXMKQqZAVdtopv8q3yyw9SYfiE3vUCbt7p8MfVf" },
  { provider: "blockrazor", address: "5YktoWygr1Bp9wiS1xtMtUki1PeYuuzuCF98tqwYxf61" },
  { provider: "blockrazor", address: "295Avbam4qGShBYK7E9H5Ldew4B3WyJGmgmXfiWdeeyV" },
  { provider: "blockrazor", address: "EDi4rSy2LZgKJX74mbLTFk4mxoTgT6F7HxxzG2HBAFyK" },
  { provider: "blockrazor", address: "BnGKHAC386n4Qmv9xtpBVbRaUTKixjBe3oagkPFKtoy6" },
  { provider: "blockrazor", address: "Dd7K2Fp7AtoN8xCghKDRmyqr5U169t48Tw5fEd3wT9mq" },
  { provider: "blockrazor", address: "AP6qExwrbRgBAVaehg4b5xHENX815sMabtBzUzVB4v8S" },

  // node1.me
  { provider: "node1", address: "node1PqAa3BWWzUnTHVbw8NJHC874zn9ngAkXjgWEej" },
  { provider: "node1", address: "node1UzzTxAAeBTpfZkQPJXBAqixsbdth11ba1NXLBG" },
  { provider: "node1", address: "node1Qm1bV4fwYnCurP8otJ9s5yrkPq7SPZ5uhj3Tsv" },
  { provider: "node1", address: "node1PUber6SFmSQgvf2ECmXsHP5o3boRSGhvJyPMX1" },
  { provider: "node1", address: "node1AyMbeqiVN6eoQzEAwCA6Pk826hrdqdAHR7cdJ3" },
  { provider: "node1", address: "node1YtWCoTwwVYTFLfS19zquRQzYX332hs1HEuRBjC" },

  // bloxroute
  { provider: "bloxroute", address: "HWEoBxYs7ssKuudEjzjmpfJVX7Dvi7wescFsVx2L5yoY" },
  { provider: "bloxroute", address: "95cfoy472fcQHaw4tPGBTKpn6ZQnfEPfBgDQx6gcRmRg" },
  { provider: "bloxroute", address: "3UQUKjhMKaY2S6bjcQD6yHB7utcZt5bfarRCmctpRtUd" },
  { provider: "bloxroute", address: "FogxVNs6Mm2w9rnGL1vkARSwJxvLE8mujTv3LK8RnUhF" },

  // astralane
  { provider: "astralane", address: "astra4uejePWneqNaJKuFFA8oonqCE1sqF6b45kDMZm" },
  { provider: "astralane", address: "astrazznxsGUhWShqgNtAdfrzP2G83DzcWVJDxwV9bF" },
  { provider: "astralane", address: "astra9xWY93QyfG6yM8zwsKsRodscjQ2uU2HKNL5prk" },
  { provider: "astralane", address: "astraRVUuTHjpwEVvNBeQEgwYx9w9CFyfxjYoobCZhL" },
  { provider: "astralane", address: "astraEJ2fEj8Xmy6KLG7B3VfbKfsHXhHrNdCQx7iGJK" },
  { provider: "astralane", address: "astraubkDw81n4LuutzSQ8uzHCv4BhPVhfvTcYv8SKC" },
  { provider: "astralane", address: "astraZW5GLFefxNPAatceHhYjfA1ciq9gvfEg2S47xk" },
  { provider: "astralane", address: "astrawVNP4xDBKT7rAdxrLYiTSTdqtUr63fSMduivXK" },

  // stellium
  { provider: "stellium", address: "ste11JV3MLMM7x7EJUM2sXcJC1H7F4jBLnP9a9PG8PH" },
  { provider: "stellium", address: "ste11MWPjXCRfQryCshzi86SGhuXjF4Lv6xMXD2AoSt" },
  { provider: "stellium", address: "ste11p5x8tJ53H1NbNQsRBg1YNRd4GcVpxtDw8PBpmb" },
  { provider: "stellium", address: "ste11p7e2KLYou5bwtt35H7BM6uMdo4pvioGjJXKFcN" },
  { provider: "stellium", address: "ste11TMV68LMi1BguM4RQujtbNCZvf1sjsASpqgAvSX" },

  // flashblock
  { provider: "flashblock", address: "FLaShB3iXXTWE1vu9wQsChUKq3HFtpMAhb8kAh1pf1wi" },
  { provider: "flashblock", address: "FLashhsorBmM9dLpuq6qATawcpqk1Y2aqaZfkd48iT3W" },
  { provider: "flashblock", address: "FLaSHJNm5dWYzEgnHJWWJP5ccu128Mu61NJLxUf7mUXU" },
  { provider: "flashblock", address: "FLaSHR4Vv7sttd6TyDF4yR1bJyAxRwWKbohDytEMu3wL" },
  { provider: "flashblock", address: "FLASHRzANfcAKDuQ3RXv9hbkBy4WVEKDzoAgxJ56DiE4" },
  { provider: "flashblock", address: "FLasHstqx11M8W56zrSEqkCyhMCCpr6ze6Mjdvqope5s" },
  { provider: "flashblock", address: "FLAShWTjcweNT4NSotpjpxAkwxUr2we3eXQGhpTVzRwy" },
  { provider: "flashblock", address: "FLasHXTqrbNvpWFB6grN47HGZfK6pze9HLNTgbukfPSk" },
  { provider: "flashblock", address: "FLAshyAyBcKb39KPxSzXcepiS8iDYUhDGwJcJDPX4g2B" },
  { provider: "flashblock", address: "FLAsHZTRcf3Dy1APaz6j74ebdMC6Xx4g6i9YxjyrDybR" },

  // nextblock
  { provider: "nextblock", address: "NEXTbLoCkB51HpLBLojQfpyVAMorm3zzKg7w9NFdqid" },
  { provider: "nextblock", address: "nextBLoCkPMgmG8ZgJtABeScP35qLa2AMCNKntAP7Xc" },
  { provider: "nextblock", address: "NextbLoCkVtMGcV47JzewQdvBpLqT9TxQFozQkN98pE" },
  { provider: "nextblock", address: "NexTbLoCkWykbLuB1NkjXgFWkX9oAtcoagQegygXXA2" },
  { provider: "nextblock", address: "NeXTBLoCKs9F1y5PJS9CKrFNNLU1keHW71rfh7KgA1X" },
  { provider: "nextblock", address: "NexTBLockJYZ7QD7p2byrUa6df8ndV2WSd8GkbWqfbb" },
  { provider: "nextblock", address: "neXtBLock1LeC67jYd1QdAa32kbVeubsfPNTJC1V5At" },
  { provider: "nextblock", address: "nEXTBLockYgngeRmRrjDV31mGSekVPqZoMGhQEZtPVG" },

  // soyas
  { provider: "soyas", address: "soyas4s6L8KWZ8rsSk1mF3d1mQScoTGGAgjk98bF8nP" },
  { provider: "soyas", address: "soyascXFW5wEEYiwfEmHy2pNwomqzvggJosGVD6TJdY" },
  { provider: "soyas", address: "soyasDBdKjADwPz3xk82U3TNPRDKEWJj7wWLajNHZ1L" },
  { provider: "soyas", address: "soyasE2abjBAynmHbGWgEwk4ctBy7JMTUCNrMbjcnyH" },
] as const;

/**
 * Fast O(1) lookup: is this address a known SWQoS tip account?
 */
const _tipLookup: Set<string> = new Set(TIP_ACCOUNTS.map((t) => t.address));

export function isTipAccount(address: string): boolean {
  return _tipLookup.has(address);
}

/**
 * Get the provider name for a tip account address, or undefined.
 */
export function getTipAccountProvider(address: string): string | undefined {
  return TIP_ACCOUNTS.find((t) => t.address === address)?.provider;
}

/**
 * Get all tip accounts for a specific provider.
 */
export function getTipAccountsForProvider(provider: string): string[] {
  return TIP_ACCOUNTS.filter((t) => t.provider === provider).map((t) => t.address);
}

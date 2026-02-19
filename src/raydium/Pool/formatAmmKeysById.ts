import {
  LIQUIDITY_STATE_LAYOUT_V4,
  MARKET_STATE_LAYOUT_V3,
  SPL_MINT_LAYOUT,
  Liquidity,
  Market,
  MAINNET_PROGRAM_ID,
  LiquidityStateV4,
  publicKey,
  struct,
} from "@raydium-io/raydium-sdk";
import { PublicKey } from "@solana/web3.js";
const MINIMAL_MARKET_STATE_LAYOUT_V3 = struct([
  publicKey("eventQueue"),
  publicKey("bids"),
  publicKey("asks"),
]);
import { connection } from "../../helpers/config";
import {initSdk} from "../raydium_config"
let sdkCache = { sdk: null, expiry: 0 };
// Promise<ApiPoolInfoV4>
/**
 * Formats AMM keys by ID.
 * @param {string} id - The ID of the AMM.
 * @returns {Object} - The formatted AMM keys.
 * @throws {Error} - If there is an error retrieving the account information.
 */
export async function formatAmmKeysById_swap(id:PublicKey) {
  const account = await connection.getAccountInfo(id);
  if (account === null) throw Error(" get id info error ");
  const info = LIQUIDITY_STATE_LAYOUT_V4.decode(account.data);

  const marketId = info.marketId;
  const marketAccount_minimal = await connection.getAccountInfo(marketId, {
    commitment: "confirmed",
    dataSlice: {
      offset: MARKET_STATE_LAYOUT_V3.offsetOf("eventQueue"),
      length: 32 * 3,
    },
  });
  const marketAccount = await connection.getAccountInfo(marketId);
  if (marketAccount === null || marketAccount_minimal === null)
    throw Error(" get market info error");
  const marketInfo_minimal = MINIMAL_MARKET_STATE_LAYOUT_V3.decode(
    marketAccount_minimal.data
  );
  const marketInfo = MARKET_STATE_LAYOUT_V3.decode(marketAccount.data);
  const lpMint = info.lpMint;
  const lpMintAccount = await connection.getAccountInfo(lpMint);
  if (lpMintAccount === null) throw Error(" get lp mint info error");
  const lpMintInfo = SPL_MINT_LAYOUT.decode(lpMintAccount.data);

  return {
    id,
    baseMint: info.baseMint,
    quoteMint: info.quoteMint,
    lpMint: info.lpMint,
    baseDecimals: info.baseDecimal.toNumber(),
    quoteDecimals: info.quoteDecimal.toNumber(),
    lpDecimals: 5,
    version: 4,
    programId: MAINNET_PROGRAM_ID.AmmV4,
    authority: Liquidity.getAssociatedAuthority({
      programId: MAINNET_PROGRAM_ID.AmmV4,
    }).publicKey,
    openOrders: info.openOrders,
    targetOrders: info.targetOrders,
    baseVault: info.baseVault,
    quoteVault: info.quoteVault,
    marketVersion: 3,
    marketProgramId: info.marketProgramId,
    marketId: info.marketId,
    marketAuthority: Market.getAssociatedAuthority({
      programId: info.marketProgramId,
      marketId: info.marketId,
    }).publicKey,
    marketBaseVault: marketInfo.baseVault,
    marketQuoteVault: marketInfo.quoteVault,
    marketBids: marketInfo_minimal.bids,
    marketAsks: marketInfo_minimal.asks,
    marketEventQueue: marketInfo_minimal.eventQueue,
    withdrawQueue: info.withdrawQueue,
    lpVault: info.lpVault,
    lookupTableAccount: PublicKey.default,
  };
}

export async function formatAmmKeysById_pool(id:PublicKey) {
  const account = await connection.getAccountInfo(id);
  if (account === null) throw Error(" get id info error ");
  const info = LIQUIDITY_STATE_LAYOUT_V4.decode(account.data);

  const marketId = info.marketId;
  const marketAccount = await connection.getAccountInfo(marketId);
  if (marketAccount === null) throw Error(" get market info error");
  const marketInfo = MARKET_STATE_LAYOUT_V3.decode(marketAccount.data);

  const lpMint = info.lpMint;
  const lpMintAccount = await connection.getAccountInfo(lpMint);
  if (lpMintAccount === null) throw Error(" get lp mint info error");
  const lpMintInfo = SPL_MINT_LAYOUT.decode(lpMintAccount.data);

  return {
    id,
    baseMint: info.baseMint.toString(),
    quoteMint: info.quoteMint.toString(),
    lpMint: info.lpMint.toString(),
    baseDecimals: info.baseDecimal.toNumber(),
    quoteDecimals: info.quoteDecimal.toNumber(),
    lpDecimals: lpMintInfo.decimals,
    version: 4,
    programId: account.owner.toString(),
    authority: Liquidity.getAssociatedAuthority({
      programId: account.owner,
    }).publicKey.toString(),
    openOrders: info.openOrders.toString(),
    targetOrders: info.targetOrders.toString(),
    baseVault: info.baseVault.toString(),
    quoteVault: info.quoteVault.toString(),
    withdrawQueue: info.withdrawQueue.toString(),
    lpVault: info.lpVault.toString(),
    marketVersion: 3,
    marketProgramId: info.marketProgramId.toString(),
    marketId: info.marketId.toString(),
    marketAuthority: Market.getAssociatedAuthority({
      programId: info.marketProgramId,
      marketId: info.marketId,
    }).publicKey.toString(),
    marketBaseVault: marketInfo.baseVault.toString(),
    marketQuoteVault: marketInfo.quoteVault.toString(),
    marketBids: marketInfo.bids.toString(),
    marketAsks: marketInfo.asks.toString(),
    marketEventQueue: marketInfo.eventQueue.toString(),
    lookupTableAccount: PublicKey.default.toString(),
  };
}




// usage of below two method:  (it's the same as above but faster and more efficient in my vps)
//   const poolKeys: any = await formatAmmKeysById_swap_1(
// new PublicKey(input.targetPool)
// );

// const poolInfo = await fetchPoolInfo(poolKeys, new PublicKey(input.targetPool));


export async function formatAmmKeysById_swap_1(id: PublicKey):Promise<any> {
  let raydium:any = null
  if(sdkCache.sdk){
      raydium = sdkCache.sdk;
  }
  else {
      raydium = await initSdk();
      sdkCache.sdk = raydium;
  }

  const MAX_RETRIES = 10;
  let poolKeys2 = await raydium.liquidity.getAmmPoolKeys(id.toBase58());
  for (let attempt = 0; (poolKeys2 === null || poolKeys2 === undefined) && attempt < MAX_RETRIES; attempt++) {
    poolKeys2 = await raydium.liquidity.getAmmPoolKeys(id.toBase58());
  }
  if (poolKeys2 === null || poolKeys2 === undefined) {
    console.log("Failed to get AMM pool keys after maximum retries");
    return null;
  }
  if(poolKeys2.programId !== '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8') return null;
  return {
    id: new PublicKey(poolKeys2.id),
    baseMint: new PublicKey(poolKeys2.mintA.address),
    quoteMint: new PublicKey(poolKeys2.mintB.address),
    lpMint: new PublicKey(poolKeys2.mintLp.address),
    baseDecimals: poolKeys2.mintA.decimals,
    quoteDecimals: poolKeys2.mintB.decimals,
    lpDecimals: poolKeys2.mintLp.decimals,
    version: 4,
    programId: new PublicKey(poolKeys2.programId),
    authority: new PublicKey(poolKeys2.authority),
    openOrders: new PublicKey(poolKeys2.openOrders),
    targetOrders: new PublicKey(poolKeys2.targetOrders),
    baseVault: new PublicKey(poolKeys2.vault.A),
    quoteVault: new PublicKey(poolKeys2.vault.B),
    marketVersion: 3,
    marketProgramId: new PublicKey(poolKeys2.marketProgramId),
    marketId: new PublicKey(poolKeys2.marketId),
    marketAuthority: new PublicKey(poolKeys2.marketAuthority),
    marketBaseVault: new PublicKey(poolKeys2.marketBaseVault),
    marketQuoteVault: new PublicKey(poolKeys2.marketQuoteVault),
    marketBids: new PublicKey(poolKeys2.marketBids),
    marketAsks: new PublicKey(poolKeys2.marketAsks),
    marketEventQueue: new PublicKey(poolKeys2.marketEventQueue),
    withdrawQueue: new PublicKey("11111111111111111111111111111111"),
    lpVault: new PublicKey("11111111111111111111111111111111"),
    lookupTableAccount: new PublicKey("11111111111111111111111111111111")
  }
}

export async function fetchPoolInfo(poolKeys: any, poolId: PublicKey){
  if(poolKeys===null)return null;
  let raydium:any = null
  if(sdkCache.sdk){
      raydium = sdkCache.sdk;
  }
  else {
      raydium = await initSdk();
      sdkCache.sdk = raydium;
  }
  
  const MAX_RETRIES_RPC = 10;
  let rpcData = await raydium.liquidity.getRpcPoolInfo(poolId.toBase58());
  for (let attempt = 0; (rpcData === null || rpcData === undefined) && attempt < MAX_RETRIES_RPC; attempt++) {
    rpcData = await raydium.liquidity.getRpcPoolInfo(poolId.toBase58());
  }
  if (rpcData === null || rpcData === undefined) {
    console.log("Failed to get RPC pool info after maximum retries");
    return null;
  }
  return {
    status: rpcData.status,
    baseDecimals: rpcData.baseDecimal.toNumber(),
    quoteDecimals: rpcData.quoteDecimal.toNumber(),
    lpDecimals: poolKeys.lpDecimals,
    baseReserve: rpcData.baseReserve,
    quoteReserve: rpcData.quoteReserve,
    lpSupply: rpcData.lpReserve,
    startTime: rpcData.poolOpenTime
  }
}


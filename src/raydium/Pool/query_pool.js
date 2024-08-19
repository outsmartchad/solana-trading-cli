const { Connection, PublicKey } = require("@solana/web3.js");
const { OpenOrders } = require("@project-serum/serum");
const { gql, GraphQLClient } = require("graphql-request");
const { shyft_api_key } = require("../../helpers/config");
const {Liquidity} = require("@raydium-io/raydium-sdk");
const { token } = require("@metaplex-foundation/js");
const {getDecimals} = require(
  "../../helpers/util"
)
const graphQLEndpoint = `https://programs.shyft.to/v0/graphql/?api_key=${shyft_api_key}`;
const rpcEndpoint = `https://rpc.shyft.to/?api_key=${shyft_api_key}`;



async function generateV4PoolInfo(tokenAddress) {
  // RAY-USDC
  const poolInfo = Liquidity.getAssociatedPoolKeys({
    version: 4,
    marketVersion: 3,
    baseMint: new PublicKey('So11111111111111111111111111111111111111112'),
    quoteMint: new PublicKey(tokenAddress),
    baseDecimals: await getDecimals(new PublicKey(tokenAddress)),
    quoteDecimals: 9,
    programId: new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8'),

    marketId: new PublicKey('DZjbn4XC8qoHKikZqzmhemykVzmossoayV9ffbsUqxVj'),
    marketProgramId: new PublicKey('srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX'),
  })
  console.log(poolInfo)
  return { poolInfo }
}

async function howToUse() {
  generateV4PoolInfo().then(({ poolInfo }) => {
    console.log('poolInfo: ', poolInfo)
  })
}
const graphQLClient = new GraphQLClient(graphQLEndpoint, {
  method: `POST`,
  jsonSerializer: {
    parse: JSON.parse,
    stringify: JSON.stringify,
  },
});
// Get Pools By Token Address
/**
 * Queries the liquidity pool by token.
 * @param {string} token - The token to query the liquidity pool for.
 * @returns {Promise<Object>} - The response object containing the liquidity pool information.
 */
async function queryLpByToken(token) {
  // Get all proposalsV2 accounts
  const query = gql`
    query MyQuery(
      $where: Raydium_LiquidityPoolv4_bool_exp
      $order_by: [Raydium_LiquidityPoolv4_order_by!]
    ) {
      Raydium_LiquidityPoolv4(where: $where, order_by: $order_by) {
        _updatedAt
        amountWaveRatio
        baseDecimal
        baseLotSize
        baseMint
        baseNeedTakePnl
        baseTotalPnl
        baseVault
        depth
        lpMint
        lpReserve
        lpVault
        marketId
        marketProgramId
        maxOrder
        maxPriceMultiplier
        minPriceMultiplier
        minSeparateDenominator
        minSeparateNumerator
        minSize
        nonce
        openOrders
        orderbookToInitTime
        owner
        pnlDenominator
        pnlNumerator
        poolOpenTime
        punishCoinAmount
        punishPcAmount
        quoteDecimal
        quoteLotSize
        quoteMint
        quoteNeedTakePnl
        quoteTotalPnl
        quoteVault
        resetFlag
        state
        status
        swapBase2QuoteFee
        swapBaseInAmount
        swapBaseOutAmount
        swapFeeDenominator
        swapFeeNumerator
        swapQuote2BaseFee
        swapQuoteInAmount
        swapQuoteOutAmount
        systemDecimalValue
        targetOrders
        tradeFeeDenominator
        tradeFeeNumerator
        volMaxCutRatio
        withdrawQueue
        pubkey
      }
    }
  `;

  const variables = {
    where: {
      baseMint: {
        _eq: token,
      },
    },
    order_by: [
      {
        lpReserve: "desc",
      },
    ],
  };

  const response = await graphQLClient.request(query, variables);
  return response;
}
// Get Token Supply Percentage In Pool
/**
 * Queries a liquidity pool by address.
 * @param {string} address - The address of the liquidity pool.
 * @returns {Promise<Object>} - The result of the GraphQL query.
 */
async function queryLpByAddress(address) {
  // We only fetch fields necessary for us
  const query = gql`
    query MyQuery($where: Raydium_LiquidityPoolv4_bool_exp) {
  Raydium_LiquidityPoolv4(
    where: {pubkey: {_eq: ${JSON.stringify(address)}}}
  ) {
    baseDecimal
    baseMint
    baseNeedTakePnl
    baseVault
    marketId
    marketProgramId
    openOrders
    quoteDecimal
    quoteMint
    quoteNeedTakePnl
    quoteVault
  }
}`;

  return await graphQLClient.request(query);
}

//We have to check how much tokens are present in openbook market as well
/**
 * Parses the pool information and calculates various metrics related to the pool.
 * @param {Object} poolInfo - The pool information object.
 * @returns {Promise<void>} - A promise that resolves once the pool information is parsed.
 */
async function parsePoolInfo(poolInfo) {
  const OPENBOOK_PROGRAM_ID = new PublicKey(
    "srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX"
  );

  //to load openOorders from openbook
  const connection = new Connection(rpcEndpoint, "confirmed");

  const openOrders = await OpenOrders.load(
    connection,
    new PublicKey(poolInfo.openOrders),
    OPENBOOK_PROGRAM_ID
  );

  const baseDecimal = 10 ** poolInfo.baseDecimal; // e.g. 10 ^ 6
  const quoteDecimal = 10 ** poolInfo.quoteDecimal;
  console.log("baseToken: ", poolInfo.baseMint);
  console.log("quoteToken: ", poolInfo.quoteMint);

  const baseTokenAmount = await connection.getTokenAccountBalance(
    new PublicKey(poolInfo.baseVault)
  );
  const quoteTokenAmount = await connection.getTokenAccountBalance(
    new PublicKey(poolInfo.quoteVault)
  );

  const basePnl = poolInfo.baseNeedTakePnl / baseDecimal;
  const quotePnl = poolInfo.quoteNeedTakePnl / quoteDecimal;

  const openOrdersBaseTokenTotal = openOrders.baseTokenTotal / baseDecimal;
  const openOrdersQuoteTokenTotal = openOrders.quoteTokenTotal / quoteDecimal;

  const base =
    (baseTokenAmount.value?.uiAmount || 0) + openOrdersBaseTokenTotal - basePnl;
  //You can do the same for quote tokens also. This doesnt work for SOL.
  const quote =
    (quoteTokenAmount.value?.uiAmount || 0) +
    openOrdersQuoteTokenTotal -
    quotePnl;

  //We get the current token supply through RPC and find the percentage
  const baseSupply = await connection.getTokenSupply(
    new PublicKey(poolInfo.baseMint)
  );
  console.log(`Total Base tokens: ${baseSupply.value.uiAmount}`);
  console.log(`Base tokens in Pool: ${base}`);
  console.log(
    `Pecentage of total base tokens in Pool: ${
      (base / baseSupply?.value?.uiAmount) * 100
    } %`
  );
}

// Sort Liquidity Pools
/**
 * Queries the liquidity pool for a given pair of tokens.
 * @param {string} tokenOne - The first token of the pair.
 * @param {string} tokenTwo - The second token of the pair.
 * @returns {Promise<object>} - The response object containing the liquidity pool data.
 */
async function queryLpPair(tokenOne, tokenTwo) {
  const query = gql`
    query MyQuery(
      $where: Raydium_LiquidityPoolv4_bool_exp
      $order_by: [Raydium_LiquidityPoolv4_order_by!]
    ) {
      Raydium_LiquidityPoolv4(where: $where, order_by: $order_by) {
        amountWaveRatio
        baseDecimal
        baseLotSize
        baseMint
        baseNeedTakePnl
        baseTotalPnl
        baseVault
        depth
        lpMint
        lpReserve
        lpVault
        marketId
        marketProgramId
        maxOrder
        maxPriceMultiplier
        minPriceMultiplier
        minSeparateDenominator
        minSeparateNumerator
        minSize
        nonce
        openOrders
        orderbookToInitTime
        owner
        pnlDenominator
        pnlNumerator
        poolOpenTime
        punishCoinAmount
        punishPcAmount
        quoteDecimal
        quoteLotSize
        quoteMint
        quoteNeedTakePnl
        quoteTotalPnl
        quoteVault
        resetFlag
        state
        status
        swapBase2QuoteFee
        swapBaseInAmount
        swapBaseOutAmount
        swapFeeDenominator
        swapFeeNumerator
        swapQuote2BaseFee
        swapQuoteInAmount
        swapQuoteOutAmount
        systemDecimalValue
        targetOrders
        tradeFeeDenominator
        tradeFeeNumerator
        volMaxCutRatio
        withdrawQueue
        pubkey
      }
    }
  `;

  const variables = {
    where: {
      baseMint: {
        _eq: tokenOne,
      },
      quoteMint: {
        _eq: tokenTwo,
      },
    },
    order_by: [
      {
        lpReserve: "desc",
      },
    ],
  };

  const response = await graphQLClient.request(query, variables);
  return response;
}
/**
 * Retrieves the pool ID associated with the given token.
 * @param {string} token - The token to query the pool ID for.
 * @returns {Promise<string|null>} The pool ID if found, or null if no pool is found.
 */
async function getPoolId(token) {
  const poolId = await queryLpByToken(token);
  if (poolId.Raydium_LiquidityPoolv4.length === 0) {
    console.log(`Cannot find any liquidity pool related to ${token}`);
    return null;
  }

  return poolId.Raydium_LiquidityPoolv4[0].pubkey;
}

/**
 * Retrieves the pool ID for a given base token.
 * @param {string} baseToken - The base token.
 * @returns {string|null} - The pool ID if found, otherwise null.
 */
async function getPoolIdByPair(baseToken) {
  // token/SOL pair
  const quoteToken = "So11111111111111111111111111111111111111112";
  const poolId = await queryLpPair(baseToken, quoteToken);
  if (poolId.Raydium_LiquidityPoolv4.length === 0) {
    console.log(
      `Cannot find any liquidity pool related to ${baseToken}/${quoteToken}`
    );
    console.log(`It may be a token launched on pump.fun, we try to find ${quoteToken}/${baseToken}`)
    const poolIdByPair = await queryLpPair(quoteToken, baseToken);
    if (poolIdByPair.Raydium_LiquidityPoolv4.length === 0) {
      console.log(
        `Cannot find any liquidity pool related to ${quoteToken}/${baseToken}`
      );
      throw new Error(`Cannot find any liquidity pool related to ${quoteToken}`);
      return null;
    }else{
      return poolIdByPair.Raydium_LiquidityPoolv4[0].pubkey;
    }
    return null;
  }
  return poolId.Raydium_LiquidityPoolv4[0].pubkey;
}
async function main() {
  // getting the pool address for npch
  //const poolId = await getPoolIdByPair("token_address")
  //console.log(poolId)
  // get token supply by token address
  //   const poolInfo: any = await queryLpByAddress('TOKEN_ADDRESS');
  //   await parsePoolInfo(poolInfo.Raydium_LiquidityPoolv4[0]);
  // get the pair of liquidity pool of two tokens
  // like sol/slerf
  // const poolIdByPair = await getPoolIdByPair(
  //   'TOKEN_ADDRESS',
  //   'So11111111111111111111111111111111111111112',
  // );
  // console.log(poolIdByPair);
  
}
//main().catch(console.error);
module.exports = {
  getPoolIdByPair,
  queryLpByToken,
  queryLpByAddress,
  parsePoolInfo,
  queryLpPair,
  getPoolId,
};

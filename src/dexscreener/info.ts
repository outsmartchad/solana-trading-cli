import {wsol} from "../helpers/config";

export async function getInfoFromDexscreener(tokenAddress: string) {
  let data: any = {};

  const url = "https://api.dexscreener.com/latest/dex/tokens/" + tokenAddress;
  let res = {
    pairAge: "",
    name: "",
    address: "",
    priceInUSD: 0,
    marketCap: 0,
    dexscreenerURL: "",
    twitterURL: "",
    telegramURL: "",
    websiteURL: "",
    buyers5m: 0,
    buyers1h: 0,
    buyers6h: 0,
    buyers24h: 0,
    volume5m: 0,
    volume1h: 0,
    volume6h: 0,
    volume24h: 0,
    liquidityInSOL: 0,
    poolId: "",
  };
  try {
    const MAX_RETRIES = 10;
    let response: any = await fetch(url);
    for (let attempt = 0; (response === undefined || response === null || response.status !== 200) && attempt < MAX_RETRIES; attempt++) {
      console.log(`retrying (${attempt + 1}/${MAX_RETRIES})`);
      if (response?.status === 429) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
      response = await fetch(url);
    }
    if (!response || response.status !== 200) {
      console.log("Failed to fetch from dexscreener after maximum retries");
      return res;
    }
    data = await response.json();
    //console.log(data);
    let raydiumPair;

    // find the first pair in raydium
    for (const pair of data.pairs) {
      if (pair.dexId === "raydium") {
        raydiumPair = pair;
        break;
      }
    }
    //console.log(raydiumPair);
    const info = raydiumPair.info;

    const createTimestamp = raydiumPair.pairCreatedAt;
    res.address = tokenAddress;

    const pairAgeTimestamp = Date.now() - createTimestamp;
    // convert pair age to day and hour format
    const days = Math.floor(pairAgeTimestamp / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (pairAgeTimestamp % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    const mins = Math.floor(
      (pairAgeTimestamp % (1000 * 60 * 60)) / (1000 * 60)
    );
    const seconds = Math.floor((pairAgeTimestamp % (1000 * 60)) / 1000);
    res.pairAge = days + "d " + hours + "h " + mins + "m " + seconds + "s";
    if(raydiumPair.baseToken.address === wsol) res.name = raydiumPair.quoteToken.name;
    else res.name = raydiumPair.baseToken.name;
    // res.name = await getTokenName(tokenAddress);
    res.poolId = raydiumPair.pairAddress;
    res.marketCap = raydiumPair.marketCap;
    res.priceInUSD = raydiumPair.priceUsd;
    res.dexscreenerURL = raydiumPair.url;
    res.volume5m = raydiumPair.volume.m5;
    res.volume1h = raydiumPair.volume.h1;
    res.volume6h = raydiumPair.volume.h6;
    res.volume24h = raydiumPair.volume.h24;
    res.buyers5m = raydiumPair.txns.m5.buys;
    res.buyers1h = raydiumPair.txns.h1.buys;
    res.buyers6h = raydiumPair.txns.h6.buys;
    res.buyers24h = raydiumPair.txns.h24.buys;
    if (raydiumPair.liquidity.base > raydiumPair.liquidity.quote)
      res.liquidityInSOL = raydiumPair.liquidity.quote;
    else res.liquidityInSOL = raydiumPair.liquidity.base;
    if (info !== undefined && info.socials.length > 0) {
      for (const site of info.socials) {
        if (site.type === "twitter") res.twitterURL = site.url;
        if (site.type === "telegram") res.telegramURL = site.url;
      }
    }
    if (info !== undefined && info.websites.length > 0)
      res.websiteURL = info.websites[0].url;
    //console.log(res);
    return res;
  } catch (error) {
    console.log(error);
    return res;
  }
}

//getInfoFromDexscreener("4cfyJweLzYvvPAjztjWs8QpzXqSuHsY572EwsebWpump");

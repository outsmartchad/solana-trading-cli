"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RAYDIUM_MAINNET = exports.ENDPOINT = void 0;
exports.ENDPOINT = 'https://api.raydium.io';
exports.RAYDIUM_MAINNET = {
    time: '/v2/main/chain/time',
    info: '/v2/main/info',
    pairs: '/v2/main/pairs',
    price: '/v2/main/price',
    rpcs: '/v2/main/rpcs',
    version: '/v2/main/version',
    farmApr: '/v2/main/farm/info',
    farmAprLine: '/v2/main/farm-apr-tv',
    tokenInfo: '/v2/sdk/token/raydium.mainnet.json',
    poolInfo: '/v2/sdk/liquidity/mainnet.json',
    dailyPoolInfo: '/v2/sdk/liquidity/date',
    uiPoolInfo: '/v2/sdk/liquidity/mainnet.ui.json',
    searchPool: '/v2/sdk/liquidity/mint/',
    farmInfo: '/v2/sdk/farm-v2/mainnet.json',
    idoInfo: '/v2/main/ido/pools',
    idoProjectInfo: '/v2/main/ido/project/<id>',
    // CLMM
    clmmPools: '/v2/ammV3/ammPools',
    clmmConfigs: '/v2/ammV3/ammConfigs',
    clmmPositionLine: '/v2/ammV3/positionLine/<poolId>',
};
//# sourceMappingURL=apiLink.js.map
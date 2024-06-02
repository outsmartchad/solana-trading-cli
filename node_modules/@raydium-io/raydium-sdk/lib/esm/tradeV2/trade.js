import { createTransferInstruction, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import { Base, InstructionType, minExpirationTime, } from '../base';
import { Clmm } from '../clmm';
import { MAX_SQRT_PRICE_X64, MIN_SQRT_PRICE_X64 } from '../clmm/utils/constants';
import { jsonInfo2PoolKeys, parseSimulateLogToJson, parseSimulateValue, simulateMultipleInstruction, splitTxAndSigners, } from '../common';
import { CurrencyAmount, ONE, Price, Token, TokenAmount, ZERO } from '../entity';
import { initStableModelLayout, Liquidity } from '../liquidity';
import { WSOL } from '../token';
import { routeInstruction } from './instrument';
export class TradeV2 extends Base {
    static getAllRoute({ inputMint, outputMint, apiPoolList, clmmList, allowedRouteToken2022 = false, }) {
        inputMint = inputMint.toString() === PublicKey.default.toString() ? new PublicKey(WSOL.mint) : inputMint;
        outputMint = outputMint.toString() === PublicKey.default.toString() ? new PublicKey(WSOL.mint) : outputMint;
        const needSimulate = {};
        const needTickArray = {};
        const needCheckToken = new Set();
        const directPath = [];
        const routePathDict = {}; // {[route mint: string]: {in: [] , out: []}}
        for (const itemAmmPool of clmmList ?? []) {
            if ((itemAmmPool.mintA.mint.equals(inputMint) && itemAmmPool.mintB.mint.equals(outputMint)) ||
                (itemAmmPool.mintA.mint.equals(outputMint) && itemAmmPool.mintB.mint.equals(inputMint))) {
                directPath.push(itemAmmPool);
                needTickArray[itemAmmPool.id.toString()] = itemAmmPool;
            }
            if (itemAmmPool.mintA.mint.equals(inputMint) &&
                (itemAmmPool.mintB.programId.equals(TOKEN_PROGRAM_ID) || allowedRouteToken2022)) {
                const t = itemAmmPool.mintB.mint.toString();
                if (routePathDict[t] === undefined)
                    routePathDict[t] = {
                        mintProgram: itemAmmPool.mintB.programId,
                        in: [],
                        out: [],
                        mDecimals: itemAmmPool.mintB.decimals,
                    };
                routePathDict[t].in.push(itemAmmPool);
            }
            if (itemAmmPool.mintB.mint.equals(inputMint) &&
                (itemAmmPool.mintA.programId.equals(TOKEN_PROGRAM_ID) || allowedRouteToken2022)) {
                const t = itemAmmPool.mintA.mint.toString();
                if (routePathDict[t] === undefined)
                    routePathDict[t] = {
                        mintProgram: itemAmmPool.mintA.programId,
                        in: [],
                        out: [],
                        mDecimals: itemAmmPool.mintA.decimals,
                    };
                routePathDict[t].in.push(itemAmmPool);
            }
            if (itemAmmPool.mintA.mint.equals(outputMint) &&
                (itemAmmPool.mintB.programId.equals(TOKEN_PROGRAM_ID) || allowedRouteToken2022)) {
                const t = itemAmmPool.mintB.mint.toString();
                if (routePathDict[t] === undefined)
                    routePathDict[t] = {
                        mintProgram: itemAmmPool.mintB.programId,
                        in: [],
                        out: [],
                        mDecimals: itemAmmPool.mintB.decimals,
                    };
                routePathDict[t].out.push(itemAmmPool);
            }
            if (itemAmmPool.mintB.mint.equals(outputMint) &&
                (itemAmmPool.mintA.programId.equals(TOKEN_PROGRAM_ID) || allowedRouteToken2022)) {
                const t = itemAmmPool.mintA.mint.toString();
                if (routePathDict[t] === undefined)
                    routePathDict[t] = {
                        mintProgram: itemAmmPool.mintA.programId,
                        in: [],
                        out: [],
                        mDecimals: itemAmmPool.mintA.decimals,
                    };
                routePathDict[t].out.push(itemAmmPool);
            }
        }
        const addLiquidityPools = [];
        const _inputMint = inputMint.toString();
        const _outputMint = outputMint.toString();
        for (const itemAmmPool of (apiPoolList ?? {}).official ?? []) {
            if ((itemAmmPool.baseMint === _inputMint && itemAmmPool.quoteMint === _outputMint) ||
                (itemAmmPool.baseMint === _outputMint && itemAmmPool.quoteMint === _inputMint)) {
                directPath.push(itemAmmPool);
                needSimulate[itemAmmPool.id] = itemAmmPool;
                addLiquidityPools.push(itemAmmPool);
            }
            if (itemAmmPool.baseMint === _inputMint) {
                if (routePathDict[itemAmmPool.quoteMint] === undefined)
                    routePathDict[itemAmmPool.quoteMint] = {
                        mintProgram: TOKEN_PROGRAM_ID,
                        in: [],
                        out: [],
                        mDecimals: itemAmmPool.quoteDecimals,
                    };
                routePathDict[itemAmmPool.quoteMint].in.push(itemAmmPool);
            }
            if (itemAmmPool.quoteMint === _inputMint) {
                if (routePathDict[itemAmmPool.baseMint] === undefined)
                    routePathDict[itemAmmPool.baseMint] = {
                        mintProgram: TOKEN_PROGRAM_ID,
                        in: [],
                        out: [],
                        mDecimals: itemAmmPool.baseDecimals,
                    };
                routePathDict[itemAmmPool.baseMint].in.push(itemAmmPool);
            }
            if (itemAmmPool.baseMint === _outputMint) {
                if (routePathDict[itemAmmPool.quoteMint] === undefined)
                    routePathDict[itemAmmPool.quoteMint] = {
                        mintProgram: TOKEN_PROGRAM_ID,
                        in: [],
                        out: [],
                        mDecimals: itemAmmPool.quoteDecimals,
                    };
                routePathDict[itemAmmPool.quoteMint].out.push(itemAmmPool);
            }
            if (itemAmmPool.quoteMint === _outputMint) {
                if (routePathDict[itemAmmPool.baseMint] === undefined)
                    routePathDict[itemAmmPool.baseMint] = {
                        mintProgram: TOKEN_PROGRAM_ID,
                        in: [],
                        out: [],
                        mDecimals: itemAmmPool.baseDecimals,
                    };
                routePathDict[itemAmmPool.baseMint].out.push(itemAmmPool);
            }
        }
        const _insertAddLiquidityPool = addLiquidityPools.length === 0;
        for (const itemAmmPool of (apiPoolList ?? {}).unOfficial ?? []) {
            if ((itemAmmPool.baseMint === _inputMint && itemAmmPool.quoteMint === _outputMint) ||
                (itemAmmPool.baseMint === _outputMint && itemAmmPool.quoteMint === _inputMint)) {
                directPath.push(itemAmmPool);
                needSimulate[itemAmmPool.id] = itemAmmPool;
                if (_insertAddLiquidityPool)
                    addLiquidityPools.push(itemAmmPool);
            }
            if (itemAmmPool.baseMint === _inputMint) {
                if (routePathDict[itemAmmPool.quoteMint] === undefined)
                    routePathDict[itemAmmPool.quoteMint] = {
                        mintProgram: TOKEN_PROGRAM_ID,
                        in: [],
                        out: [],
                        mDecimals: itemAmmPool.quoteDecimals,
                    };
                routePathDict[itemAmmPool.quoteMint].in.push(itemAmmPool);
            }
            if (itemAmmPool.quoteMint === _inputMint) {
                if (routePathDict[itemAmmPool.baseMint] === undefined)
                    routePathDict[itemAmmPool.baseMint] = {
                        mintProgram: TOKEN_PROGRAM_ID,
                        in: [],
                        out: [],
                        mDecimals: itemAmmPool.baseDecimals,
                    };
                routePathDict[itemAmmPool.baseMint].in.push(itemAmmPool);
            }
            if (itemAmmPool.baseMint === _outputMint) {
                if (routePathDict[itemAmmPool.quoteMint] === undefined)
                    routePathDict[itemAmmPool.quoteMint] = {
                        mintProgram: TOKEN_PROGRAM_ID,
                        in: [],
                        out: [],
                        mDecimals: itemAmmPool.quoteDecimals,
                    };
                routePathDict[itemAmmPool.quoteMint].out.push(itemAmmPool);
            }
            if (itemAmmPool.quoteMint === _outputMint) {
                if (routePathDict[itemAmmPool.baseMint] === undefined)
                    routePathDict[itemAmmPool.baseMint] = {
                        mintProgram: TOKEN_PROGRAM_ID,
                        in: [],
                        out: [],
                        mDecimals: itemAmmPool.baseDecimals,
                    };
                routePathDict[itemAmmPool.baseMint].out.push(itemAmmPool);
            }
        }
        for (const t of Object.keys(routePathDict)) {
            if (routePathDict[t].in.length === 1 &&
                routePathDict[t].out.length === 1 &&
                String(routePathDict[t].in[0].id) === String(routePathDict[t].out[0].id)) {
                delete routePathDict[t];
                continue;
            }
            if (routePathDict[t].in.length === 0 || routePathDict[t].out.length === 0) {
                delete routePathDict[t];
                continue;
            }
            const info = routePathDict[t];
            for (const infoIn of info.in) {
                for (const infoOut of info.out) {
                    if (infoIn.version === 6 && needTickArray[infoIn.id.toString()] === undefined) {
                        needTickArray[infoIn.id.toString()] = infoIn;
                        if (infoIn.mintA.programId.equals(TOKEN_2022_PROGRAM_ID))
                            needCheckToken.add(infoIn.mintA.mint.toString());
                        if (infoIn.mintB.programId.equals(TOKEN_2022_PROGRAM_ID))
                            needCheckToken.add(infoIn.mintB.mint.toString());
                    }
                    else if (infoIn.version !== 6 && needSimulate[infoIn.id] === undefined) {
                        needSimulate[infoIn.id] = infoIn;
                    }
                    if (infoOut.version === 6 && needTickArray[infoOut.id.toString()] === undefined) {
                        needTickArray[infoOut.id.toString()] = infoOut;
                        if (infoOut.mintA.programId.equals(TOKEN_2022_PROGRAM_ID))
                            needCheckToken.add(infoOut.mintA.mint.toString());
                        if (infoOut.mintB.programId.equals(TOKEN_2022_PROGRAM_ID))
                            needCheckToken.add(infoOut.mintB.mint.toString());
                    }
                    else if (infoOut.version !== 6 && needSimulate[infoOut.id] === undefined) {
                        needSimulate[infoOut.id] = infoOut;
                    }
                }
            }
        }
        for (const item of directPath) {
            if (item.version === 6) {
                if (item.mintA.programId.equals(TOKEN_2022_PROGRAM_ID))
                    needCheckToken.add(item.mintA.mint.toString());
                if (item.mintB.programId.equals(TOKEN_2022_PROGRAM_ID))
                    needCheckToken.add(item.mintB.mint.toString());
            }
        }
        return {
            directPath,
            addLiquidityPools,
            routePathDict,
            needSimulate: Object.values(needSimulate),
            needTickArray: Object.values(needTickArray),
            needCheckToken: [...needCheckToken],
        };
    }
    static async fetchMultipleInfo({ connection, pools, batchRequest = true, }) {
        if (pools.find((i) => i.version === 5))
            await initStableModelLayout(connection);
        const instructions = pools.map((pool) => Liquidity.makeSimulatePoolInfoInstruction({ poolKeys: jsonInfo2PoolKeys(pool) }));
        const logs = await simulateMultipleInstruction(connection, instructions.map((i) => i.innerTransaction.instructions).flat(), 'GetPoolData', batchRequest);
        const poolsInfo = {};
        for (const log of logs) {
            const json = parseSimulateLogToJson(log, 'GetPoolData');
            const ammId = JSON.parse(json)['amm_id'];
            const status = new BN(parseSimulateValue(json, 'status'));
            const baseDecimals = Number(parseSimulateValue(json, 'coin_decimals'));
            const quoteDecimals = Number(parseSimulateValue(json, 'pc_decimals'));
            const lpDecimals = Number(parseSimulateValue(json, 'lp_decimals'));
            const baseReserve = new BN(parseSimulateValue(json, 'pool_coin_amount'));
            const quoteReserve = new BN(parseSimulateValue(json, 'pool_pc_amount'));
            const lpSupply = new BN(parseSimulateValue(json, 'pool_lp_supply'));
            // TODO fix it when split stable
            let startTime = '0';
            try {
                startTime = parseSimulateValue(json, 'pool_open_time');
            }
            catch (error) {
                //
            }
            poolsInfo[ammId] = {
                ammId,
                status,
                baseDecimals,
                quoteDecimals,
                lpDecimals,
                baseReserve,
                quoteReserve,
                lpSupply,
                startTime: new BN(startTime),
            };
        }
        return poolsInfo;
    }
    static getAddLiquidityDefaultPool({ addLiquidityPools, poolInfosCache, }) {
        if (addLiquidityPools.length === 0)
            return undefined;
        if (addLiquidityPools.length === 1)
            return addLiquidityPools[0];
        addLiquidityPools.sort((a, b) => b.version - a.version);
        if (addLiquidityPools[0].version !== addLiquidityPools[1].version)
            return addLiquidityPools[0];
        const _addLiquidityPools = addLiquidityPools.filter((i) => i.version === addLiquidityPools[0].version);
        _addLiquidityPools.sort((a, b) => this.ComparePoolSize(a, b, poolInfosCache));
        return _addLiquidityPools[0];
    }
    static ComparePoolSize(a, b, ammIdToPoolInfo) {
        const aInfo = ammIdToPoolInfo[a.id];
        const bInfo = ammIdToPoolInfo[b.id];
        if (aInfo === undefined)
            return 1;
        if (bInfo === undefined)
            return -1;
        if (a.baseMint === b.baseMint) {
            const sub = aInfo.baseReserve.sub(bInfo.baseReserve);
            return sub.gte(ZERO) ? -1 : 1;
        }
        else {
            const sub = aInfo.baseReserve.sub(bInfo.quoteReserve);
            return sub.gte(ZERO) ? -1 : 1;
        }
    }
    static getAllRouteComputeAmountOut({ inputTokenAmount, outputToken, directPath, routePathDict, simulateCache, tickCache, mintInfos, slippage, chainTime, epochInfo, feeConfig, }) {
        const _amountInFee = feeConfig === undefined
            ? new BN(0)
            : inputTokenAmount.raw.mul(new BN(feeConfig.feeBps.toNumber())).div(new BN(10000));
        const _amoutIn = inputTokenAmount.raw.sub(_amountInFee);
        const amountIn = inputTokenAmount instanceof TokenAmount
            ? new TokenAmount(inputTokenAmount.token, _amoutIn)
            : new CurrencyAmount(inputTokenAmount.currency, _amoutIn);
        const _inFeeConfig = feeConfig === undefined
            ? undefined
            : {
                feeAmount: _amountInFee,
                feeAccount: feeConfig.feeAccount,
            };
        const outRoute = [];
        for (const itemPool of directPath) {
            try {
                outRoute.push({
                    ...this.computeAmountOut({
                        itemPool,
                        tickCache,
                        simulateCache,
                        chainTime,
                        epochInfo,
                        mintInfos,
                        slippage,
                        outputToken,
                        amountIn,
                    }),
                    feeConfig: _inFeeConfig,
                });
            }
            catch (e) {
                /* empty */
            }
        }
        for (const [routeMint, info] of Object.entries(routePathDict)) {
            const routeToken = new Token(info.mintProgram, routeMint, info.mDecimals);
            const maxFirstIn = info.in
                .map((i) => {
                try {
                    return {
                        pool: i,
                        data: this.computeAmountOut({
                            itemPool: i,
                            tickCache,
                            simulateCache,
                            chainTime,
                            epochInfo,
                            mintInfos,
                            slippage,
                            outputToken: routeToken,
                            amountIn,
                        }),
                    };
                }
                catch (e) {
                    return undefined;
                }
            })
                .sort((_a, _b) => {
                const a = _a === undefined ? ZERO : _a.data.amountOut.amount.raw.sub(_a.data.amountOut.fee?.raw ?? ZERO);
                const b = _b === undefined ? ZERO : _b.data.amountOut.amount.raw.sub(_b.data.amountOut.fee?.raw ?? ZERO);
                return a.lt(b) ? 1 : -1;
            })[0];
            if (maxFirstIn === undefined)
                continue;
            const routeAmountIn = new TokenAmount(routeToken, maxFirstIn.data.amountOut.amount.raw.sub(maxFirstIn.data.amountOut.fee?.raw ?? ZERO));
            for (const iOutPool of info.out) {
                try {
                    const outC = this.computeAmountOut({
                        itemPool: iOutPool,
                        tickCache,
                        simulateCache,
                        chainTime,
                        epochInfo,
                        mintInfos,
                        slippage,
                        outputToken,
                        amountIn: routeAmountIn,
                    });
                    outRoute.push({
                        allTrade: maxFirstIn.data.allTrade && outC.allTrade ? true : false,
                        amountIn: maxFirstIn.data.amountIn,
                        amountOut: outC.amountOut,
                        minAmountOut: outC.minAmountOut,
                        currentPrice: undefined,
                        executionPrice: new Price(maxFirstIn.data.amountIn.amount.token ??
                            maxFirstIn.data.amountIn.amount.currency, maxFirstIn.data.amountIn.amount.raw, outC.amountOut.amount.token ?? outC.amountOut.amount.currency, outC.amountOut.amount.raw.sub(outC.amountOut.fee?.raw ?? ZERO)),
                        priceImpact: maxFirstIn.data.priceImpact.add(outC.priceImpact),
                        fee: [maxFirstIn.data.fee[0], outC.fee[0]],
                        routeType: 'route',
                        poolKey: [maxFirstIn.pool, iOutPool],
                        remainingAccounts: [maxFirstIn.data.remainingAccounts[0], outC.remainingAccounts[0]],
                        minMiddleAmountFee: outC.amountOut.fee?.raw
                            ? new TokenAmount(maxFirstIn.data.amountOut.amount.token ??
                                maxFirstIn.data.amountOut.amount.currency, (maxFirstIn.data.amountOut.fee?.raw ?? ZERO).add(outC.amountOut.fee?.raw ?? ZERO))
                            : undefined,
                        middleToken: maxFirstIn.data.amountOut.amount.token,
                        poolReady: maxFirstIn.data.poolReady && outC.poolReady,
                        poolType: [maxFirstIn.data.poolType, outC.poolType],
                        feeConfig: _inFeeConfig,
                        expirationTime: minExpirationTime(maxFirstIn.data.expirationTime, outC.expirationTime),
                        slippage: outC.slippage,
                        clmmExPriceX64: [maxFirstIn.data.clmmExPriceX64[0], outC.clmmExPriceX64[0]],
                    });
                }
                catch (e) {
                    /* empty */
                }
            }
        }
        return outRoute
            .filter((i) => i.allTrade)
            .sort((a, b) => (a.amountOut.amount.raw.sub(b.amountOut.amount.raw).gt(ZERO) ? -1 : 1));
    }
    static computeAmountOut({ itemPool, tickCache, simulateCache, chainTime, epochInfo, mintInfos, slippage, outputToken, amountIn, }) {
        if (itemPool.version === 6) {
            const { allTrade, realAmountIn, amountOut, minAmountOut, expirationTime, currentPrice, executionPrice, priceImpact, fee, remainingAccounts, executionPriceX64, } = Clmm.computeAmountOutFormat({
                poolInfo: itemPool,
                tickArrayCache: tickCache[itemPool.id.toString()],
                amountIn,
                currencyOut: outputToken,
                slippage,
                token2022Infos: mintInfos,
                epochInfo,
                catchLiquidityInsufficient: true,
            });
            return {
                allTrade,
                amountIn: realAmountIn,
                amountOut,
                minAmountOut,
                currentPrice,
                executionPrice,
                priceImpact,
                fee: [fee],
                remainingAccounts: [remainingAccounts],
                routeType: 'amm',
                poolKey: [itemPool],
                poolReady: itemPool.startTime < chainTime,
                poolType: 'CLMM',
                expirationTime: minExpirationTime(realAmountIn.expirationTime, expirationTime),
                slippage,
                clmmExPriceX64: [executionPriceX64],
            };
        }
        else {
            if (![1, 6, 7].includes(simulateCache[itemPool.id].status.toNumber()))
                throw Error('swap error');
            const { amountOut, minAmountOut, currentPrice, executionPrice, priceImpact, fee } = Liquidity.computeAmountOut({
                poolKeys: jsonInfo2PoolKeys(itemPool),
                poolInfo: simulateCache[itemPool.id],
                amountIn,
                currencyOut: outputToken,
                slippage,
            });
            return {
                amountIn: { amount: amountIn, fee: undefined, expirationTime: undefined },
                amountOut: { amount: amountOut, fee: undefined, expirationTime: undefined },
                minAmountOut: { amount: minAmountOut, fee: undefined, expirationTime: undefined },
                currentPrice,
                executionPrice,
                priceImpact,
                fee: [fee],
                routeType: 'amm',
                poolKey: [itemPool],
                remainingAccounts: [],
                poolReady: simulateCache[itemPool.id].startTime.toNumber() < chainTime,
                poolType: itemPool.version === 5 ? 'STABLE' : undefined,
                expirationTime: undefined,
                allTrade: true,
                slippage,
                clmmExPriceX64: [undefined],
            };
        }
    }
    static makeSwapInstruction({ routeProgram, ownerInfo, inputMint, swapInfo }) {
        const slippage = swapInfo.slippage.numerator.toNumber() / swapInfo.slippage.denominator.toNumber();
        if (swapInfo.routeType === 'amm') {
            if (swapInfo.poolKey[0].version === 6) {
                const _poolKey = swapInfo.poolKey[0];
                const sqrtPriceLimitX64 = inputMint.equals(_poolKey.mintA.mint)
                    ? slippage > 0.5 || MIN_SQRT_PRICE_X64.add(ONE).gt(swapInfo.clmmExPriceX64[0].div(new BN(10)))
                        ? MIN_SQRT_PRICE_X64.add(ONE)
                        : swapInfo.clmmExPriceX64[0].div(new BN(10))
                    : slippage > 0.5 || MAX_SQRT_PRICE_X64.sub(ONE).lt(swapInfo.clmmExPriceX64[0].mul(new BN(10)))
                        ? MAX_SQRT_PRICE_X64.sub(ONE)
                        : swapInfo.clmmExPriceX64[0].mul(new BN(10));
                return Clmm.makeSwapBaseInInstructions({
                    poolInfo: _poolKey,
                    ownerInfo: {
                        wallet: ownerInfo.wallet,
                        tokenAccountA: _poolKey.mintA.mint.equals(inputMint) ? ownerInfo.sourceToken : ownerInfo.destinationToken,
                        tokenAccountB: _poolKey.mintA.mint.equals(inputMint) ? ownerInfo.destinationToken : ownerInfo.sourceToken,
                    },
                    inputMint,
                    amountIn: swapInfo.amountIn.amount.raw,
                    amountOutMin: swapInfo.minAmountOut.amount.raw.sub(swapInfo.minAmountOut.fee?.raw ?? ZERO),
                    sqrtPriceLimitX64,
                    remainingAccounts: swapInfo.remainingAccounts[0],
                });
            }
            else {
                const _poolKey = swapInfo.poolKey[0];
                return Liquidity.makeSwapInstruction({
                    poolKeys: jsonInfo2PoolKeys(_poolKey),
                    userKeys: {
                        tokenAccountIn: ownerInfo.sourceToken,
                        tokenAccountOut: ownerInfo.destinationToken,
                        owner: ownerInfo.wallet,
                    },
                    amountIn: swapInfo.amountIn.amount.raw,
                    amountOut: swapInfo.minAmountOut.amount.raw.sub(swapInfo.minAmountOut.fee?.raw ?? ZERO),
                    fixedSide: 'in',
                });
            }
        }
        else if (swapInfo.routeType === 'route') {
            const poolKey1 = swapInfo.poolKey[0];
            const poolKey2 = swapInfo.poolKey[1];
            if (ownerInfo.routeToken === undefined)
                throw Error('owner route token account check error');
            return {
                address: {},
                innerTransaction: {
                    instructions: [
                        routeInstruction(routeProgram, ownerInfo.wallet, ownerInfo.sourceToken, ownerInfo.routeToken, ownerInfo.destinationToken, inputMint.toString(), swapInfo.middleToken.mint.toString(), poolKey1, poolKey2, swapInfo.amountIn.amount.raw, swapInfo.minAmountOut.amount.raw.sub(swapInfo.minAmountOut.fee?.raw ?? ZERO), swapInfo.remainingAccounts),
                    ],
                    signers: [],
                    lookupTableAddress: [
                        poolKey1.lookupTableAccount ? new PublicKey(poolKey1.lookupTableAccount) : PublicKey.default,
                        poolKey2.lookupTableAccount ? new PublicKey(poolKey2.lookupTableAccount) : PublicKey.default,
                    ].filter((i) => i && !i.equals(PublicKey.default)),
                    instructionTypes: [InstructionType.routeSwap],
                },
            };
        }
        else {
            throw Error('route type error');
        }
    }
    static async makeSwapInstructionSimple({ connection, swapInfo, ownerInfo, computeBudgetConfig, routeProgram, makeTxVersion, lookupTableCache, }) {
        const frontInstructions = [];
        const endInstructions = [];
        const frontInstructionsType = [];
        const endInstructionsType = [];
        const signers = [];
        const amountIn = swapInfo.amountIn;
        const amountOut = swapInfo.amountOut;
        const useSolBalance = !(amountIn.amount instanceof TokenAmount);
        const outSolBalance = !(amountOut.amount instanceof TokenAmount);
        const inputMint = amountIn.amount instanceof TokenAmount ? amountIn.amount.token.mint : Token.WSOL.mint;
        const inputProgramId = amountIn.amount instanceof TokenAmount ? amountIn.amount.token.programId : Token.WSOL.programId;
        const outputMint = amountOut.amount instanceof TokenAmount ? amountOut.amount.token.mint : Token.WSOL.mint;
        const outputProgramId = amountOut.amount instanceof TokenAmount ? amountOut.amount.token.programId : Token.WSOL.programId;
        const sourceToken = await this._selectOrCreateTokenAccount({
            programId: inputProgramId,
            mint: inputMint,
            tokenAccounts: useSolBalance ? [] : ownerInfo.tokenAccounts,
            createInfo: useSolBalance
                ? {
                    connection,
                    payer: ownerInfo.wallet,
                    amount: amountIn.amount.raw,
                    frontInstructions,
                    endInstructions,
                    signers,
                    frontInstructionsType,
                    endInstructionsType,
                }
                : undefined,
            owner: ownerInfo.wallet,
            associatedOnly: useSolBalance ? false : ownerInfo.associatedOnly,
            checkCreateATAOwner: ownerInfo.checkCreateATAOwner,
        });
        if (sourceToken === undefined) {
            throw Error('input account check error');
        }
        const destinationToken = await this._selectOrCreateTokenAccount({
            programId: outputProgramId,
            mint: outputMint,
            tokenAccounts: ownerInfo.tokenAccounts,
            createInfo: {
                connection,
                payer: ownerInfo.wallet,
                amount: 0,
                frontInstructions,
                endInstructions: outSolBalance ? endInstructions : undefined,
                signers,
                frontInstructionsType,
                endInstructionsType,
            },
            owner: ownerInfo.wallet,
            associatedOnly: ownerInfo.associatedOnly,
            checkCreateATAOwner: ownerInfo.checkCreateATAOwner,
        });
        let routeToken = undefined;
        if (swapInfo.routeType === 'route') {
            const middleMint = swapInfo.middleToken;
            routeToken = await this._selectOrCreateTokenAccount({
                programId: middleMint.programId,
                mint: middleMint.mint,
                tokenAccounts: ownerInfo.tokenAccounts,
                createInfo: {
                    connection,
                    payer: ownerInfo.wallet,
                    amount: 0,
                    frontInstructions,
                    endInstructions,
                    signers,
                    frontInstructionsType,
                    endInstructionsType,
                },
                owner: ownerInfo.wallet,
                associatedOnly: false,
                checkCreateATAOwner: ownerInfo.checkCreateATAOwner,
            });
        }
        const ins = this.makeSwapInstruction({
            routeProgram,
            inputMint,
            swapInfo,
            ownerInfo: {
                wallet: ownerInfo.wallet,
                sourceToken,
                routeToken,
                destinationToken,
            },
        });
        const transferIns = [];
        const transferInsType = [];
        if (swapInfo.feeConfig !== undefined) {
            transferIns.push(createTransferInstruction(sourceToken, swapInfo.feeConfig.feeAccount, ownerInfo.wallet, swapInfo.feeConfig.feeAmount.toNumber()));
            transferInsType.push(InstructionType.transferAmount);
        }
        const transferAddCheck = await splitTxAndSigners({
            connection,
            makeTxVersion,
            computeBudgetConfig,
            payer: ownerInfo.wallet,
            innerTransaction: [
                { instructionTypes: transferInsType, instructions: transferIns, signers: [] },
                ins.innerTransaction,
            ],
            lookupTableCache,
        });
        return {
            address: ins.address,
            innerTransactions: await splitTxAndSigners({
                connection,
                makeTxVersion,
                computeBudgetConfig,
                payer: ownerInfo.wallet,
                innerTransaction: [
                    { instructionTypes: frontInstructionsType, instructions: frontInstructions, signers },
                    ...(transferAddCheck.length > 1
                        ? []
                        : [{ instructionTypes: transferInsType, instructions: transferIns, signers: [] }]),
                    ins.innerTransaction,
                    { instructionTypes: endInstructionsType, instructions: endInstructions, signers: [] },
                ],
                lookupTableCache,
            }),
        };
    }
}
//# sourceMappingURL=trade.js.map
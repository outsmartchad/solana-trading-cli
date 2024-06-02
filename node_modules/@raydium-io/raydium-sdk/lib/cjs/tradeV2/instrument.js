"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.routeInstruction = exports.route2Instruction = exports.route1Instruction = void 0;
const spl_token_1 = require("@solana/spl-token");
const web3_js_1 = require("@solana/web3.js");
const clmm_1 = require("../clmm");
const common_1 = require("../common");
const marshmallow_1 = require("../marshmallow");
function route1Instruction(programId, poolKeyA, poolKeyB, userSourceToken, userRouteToken, 
// userDestinationToken: PublicKey,
userPdaAccount, ownerWallet, inputMint, amountIn, amountOut, tickArrayA) {
    const dataLayout = (0, marshmallow_1.struct)([(0, marshmallow_1.u8)('instruction'), (0, marshmallow_1.u64)('amountIn'), (0, marshmallow_1.u64)('amountOut')]);
    const keys = [
        { pubkey: common_1.SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: spl_token_1.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: new web3_js_1.PublicKey(String(poolKeyA.programId)), isSigner: false, isWritable: false },
        { pubkey: new web3_js_1.PublicKey(String(poolKeyA.id)), isSigner: false, isWritable: true },
        { pubkey: new web3_js_1.PublicKey(String(poolKeyB.id)), isSigner: false, isWritable: true },
        { pubkey: userSourceToken, isSigner: false, isWritable: true },
        { pubkey: userRouteToken, isSigner: false, isWritable: true },
        { pubkey: userPdaAccount, isSigner: false, isWritable: true },
        { pubkey: ownerWallet, isSigner: true, isWritable: false },
    ];
    if (poolKeyA.version === 6) {
        const poolKey = poolKeyA;
        keys.push(...[
            { pubkey: poolKey.ammConfig.id, isSigner: false, isWritable: false },
            { pubkey: poolKey.id, isSigner: false, isWritable: true },
            {
                pubkey: poolKey.mintA.mint.equals(inputMint) ? poolKey.mintA.vault : poolKey.mintB.vault,
                isSigner: false,
                isWritable: true,
            },
            {
                pubkey: poolKey.mintA.mint.equals(inputMint) ? poolKey.mintB.vault : poolKey.mintA.vault,
                isSigner: false,
                isWritable: true,
            },
            { pubkey: poolKey.observationId, isSigner: false, isWritable: true },
            ...tickArrayA.map((i) => ({ pubkey: i, isSigner: false, isWritable: true })),
        ]);
    }
    else if (poolKeyA.version === 5) {
        const poolKey = (0, common_1.jsonInfo2PoolKeys)(poolKeyA);
        keys.push(...[
            { pubkey: poolKey.authority, isSigner: false, isWritable: false },
            { pubkey: poolKey.marketProgramId, isSigner: false, isWritable: false },
            { pubkey: poolKey.id, isSigner: false, isWritable: true },
            { pubkey: new web3_js_1.PublicKey('CDSr3ssLcRB6XYPJwAfFt18MZvEZp4LjHcvzBVZ45duo'), isSigner: false, isWritable: false },
            { pubkey: poolKey.openOrders, isSigner: false, isWritable: true },
            { pubkey: poolKey.baseVault, isSigner: false, isWritable: true },
            { pubkey: poolKey.quoteVault, isSigner: false, isWritable: true },
            { pubkey: poolKey.marketId, isSigner: false, isWritable: true },
            { pubkey: poolKey.marketBids, isSigner: false, isWritable: true },
            { pubkey: poolKey.marketAsks, isSigner: false, isWritable: true },
            { pubkey: poolKey.marketEventQueue, isSigner: false, isWritable: true },
            { pubkey: poolKey.id, isSigner: false, isWritable: true },
            { pubkey: poolKey.id, isSigner: false, isWritable: true },
        ]);
    }
    else if (poolKeyA.version === 4) {
        const poolKey = (0, common_1.jsonInfo2PoolKeys)(poolKeyA);
        keys.push(...[
            { pubkey: poolKey.authority, isSigner: false, isWritable: false },
            { pubkey: poolKey.marketProgramId, isSigner: false, isWritable: false },
            { pubkey: poolKey.marketAuthority, isSigner: false, isWritable: false },
            { pubkey: poolKey.openOrders, isSigner: false, isWritable: true },
            { pubkey: poolKey.baseVault, isSigner: false, isWritable: true },
            { pubkey: poolKey.quoteVault, isSigner: false, isWritable: true },
            { pubkey: poolKey.marketId, isSigner: false, isWritable: true },
            { pubkey: poolKey.marketBids, isSigner: false, isWritable: true },
            { pubkey: poolKey.marketAsks, isSigner: false, isWritable: true },
            { pubkey: poolKey.marketEventQueue, isSigner: false, isWritable: true },
            ...(poolKey.marketProgramId.toString() === 'srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX'
                ? [
                    { pubkey: poolKey.marketBaseVault, isSigner: false, isWritable: true },
                    { pubkey: poolKey.marketQuoteVault, isSigner: false, isWritable: true },
                ]
                : [
                    { pubkey: poolKey.id, isSigner: false, isWritable: true },
                    { pubkey: poolKey.id, isSigner: false, isWritable: true },
                ]),
        ]);
    }
    const data = Buffer.alloc(dataLayout.span);
    dataLayout.encode({
        instruction: 4,
        amountIn,
        amountOut,
    }, data);
    return new web3_js_1.TransactionInstruction({
        keys,
        programId,
        data,
    });
}
exports.route1Instruction = route1Instruction;
function route2Instruction(programId, poolKeyA, poolKeyB, 
// userSourceToken: PublicKey,
userRouteToken, userDestinationToken, userPdaAccount, ownerWallet, routeMint, 
// tickArrayA?: PublicKey[],
tickArrayB) {
    const dataLayout = (0, marshmallow_1.struct)([(0, marshmallow_1.u8)('instruction')]);
    const keys = [
        { pubkey: common_1.SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: spl_token_1.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: new web3_js_1.PublicKey(String(poolKeyB.programId)), isSigner: false, isWritable: false },
        { pubkey: new web3_js_1.PublicKey(String(poolKeyB.id)), isSigner: false, isWritable: true },
        { pubkey: new web3_js_1.PublicKey(String(poolKeyA.id)), isSigner: false, isWritable: true },
        { pubkey: userRouteToken, isSigner: false, isWritable: true },
        { pubkey: userDestinationToken, isSigner: false, isWritable: true },
        { pubkey: userPdaAccount, isSigner: false, isWritable: true },
        { pubkey: ownerWallet, isSigner: true, isWritable: false },
    ];
    if (poolKeyB.version === 6) {
        const poolKey = poolKeyB;
        keys.push(...[
            { pubkey: poolKey.ammConfig.id, isSigner: false, isWritable: false },
            { pubkey: poolKey.id, isSigner: false, isWritable: true },
            {
                pubkey: poolKey.mintA.mint.equals(routeMint) ? poolKey.mintA.vault : poolKey.mintB.vault,
                isSigner: false,
                isWritable: true,
            },
            {
                pubkey: poolKey.mintA.mint.equals(routeMint) ? poolKey.mintB.vault : poolKey.mintA.vault,
                isSigner: false,
                isWritable: true,
            },
            { pubkey: poolKey.observationId, isSigner: false, isWritable: true },
            ...tickArrayB.map((i) => ({ pubkey: i, isSigner: false, isWritable: true })),
        ]);
    }
    else if (poolKeyB.version === 5) {
        const poolKey = (0, common_1.jsonInfo2PoolKeys)(poolKeyB);
        keys.push(...[
            { pubkey: poolKey.authority, isSigner: false, isWritable: false },
            { pubkey: poolKey.marketProgramId, isSigner: false, isWritable: false },
            { pubkey: poolKey.id, isSigner: false, isWritable: true },
            { pubkey: new web3_js_1.PublicKey('CDSr3ssLcRB6XYPJwAfFt18MZvEZp4LjHcvzBVZ45duo'), isSigner: false, isWritable: false },
            { pubkey: poolKey.openOrders, isSigner: false, isWritable: true },
            { pubkey: poolKey.baseVault, isSigner: false, isWritable: true },
            { pubkey: poolKey.quoteVault, isSigner: false, isWritable: true },
            { pubkey: poolKey.marketId, isSigner: false, isWritable: true },
            { pubkey: poolKey.marketBids, isSigner: false, isWritable: true },
            { pubkey: poolKey.marketAsks, isSigner: false, isWritable: true },
            { pubkey: poolKey.marketEventQueue, isSigner: false, isWritable: true },
            { pubkey: poolKey.id, isSigner: false, isWritable: true },
            { pubkey: poolKey.id, isSigner: false, isWritable: true },
        ]);
    }
    else if (poolKeyB.version === 4) {
        const poolKey = (0, common_1.jsonInfo2PoolKeys)(poolKeyB);
        keys.push(...[
            { pubkey: poolKey.authority, isSigner: false, isWritable: false },
            { pubkey: poolKey.marketProgramId, isSigner: false, isWritable: false },
            { pubkey: poolKey.marketAuthority, isSigner: false, isWritable: false },
            { pubkey: poolKey.openOrders, isSigner: false, isWritable: true },
            { pubkey: poolKey.baseVault, isSigner: false, isWritable: true },
            { pubkey: poolKey.quoteVault, isSigner: false, isWritable: true },
            { pubkey: poolKey.marketId, isSigner: false, isWritable: true },
            { pubkey: poolKey.marketBids, isSigner: false, isWritable: true },
            { pubkey: poolKey.marketAsks, isSigner: false, isWritable: true },
            { pubkey: poolKey.marketEventQueue, isSigner: false, isWritable: true },
            ...(poolKey.marketProgramId.toString() === 'srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX'
                ? [
                    { pubkey: poolKey.marketBaseVault, isSigner: false, isWritable: true },
                    { pubkey: poolKey.marketQuoteVault, isSigner: false, isWritable: true },
                ]
                : [
                    { pubkey: poolKey.id, isSigner: false, isWritable: true },
                    { pubkey: poolKey.id, isSigner: false, isWritable: true },
                ]),
        ]);
    }
    const data = Buffer.alloc(dataLayout.span);
    dataLayout.encode({
        instruction: 5,
    }, data);
    return new web3_js_1.TransactionInstruction({
        keys,
        programId,
        data,
    });
}
exports.route2Instruction = route2Instruction;
function routeInstruction(programId, wallet, userSourceToken, userRouteToken, userDestinationToken, inputMint, routeMint, poolKeyA, poolKeyB, amountIn, amountOut, remainingAccounts) {
    const dataLayout = (0, marshmallow_1.struct)([(0, marshmallow_1.u8)('instruction'), (0, marshmallow_1.u64)('amountIn'), (0, marshmallow_1.u64)('amountOut')]);
    const keys = [
        { pubkey: wallet, isSigner: true, isWritable: false },
        { pubkey: spl_token_1.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ];
    keys.push(...makeInnerInsKey(poolKeyA, inputMint, userSourceToken, userRouteToken, remainingAccounts[0]));
    keys.push(...makeInnerInsKey(poolKeyB, routeMint, userRouteToken, userDestinationToken, remainingAccounts[1]));
    const data = Buffer.alloc(dataLayout.span);
    dataLayout.encode({
        instruction: 8,
        amountIn,
        amountOut,
    }, data);
    return new web3_js_1.TransactionInstruction({
        keys,
        programId,
        data,
    });
}
exports.routeInstruction = routeInstruction;
function makeInnerInsKey(itemPool, inMint, userInAccount, userOutAccount, remainingAccount) {
    if (itemPool.version === 4) {
        const poolKey = (0, common_1.jsonInfo2PoolKeys)(itemPool);
        return [
            { pubkey: poolKey.programId, isSigner: false, isWritable: false },
            { pubkey: userInAccount, isSigner: false, isWritable: true },
            { pubkey: userOutAccount, isSigner: false, isWritable: true },
            { pubkey: poolKey.id, isSigner: false, isWritable: true },
            { pubkey: poolKey.authority, isSigner: false, isWritable: false },
            { pubkey: poolKey.marketProgramId, isSigner: false, isWritable: false },
            { pubkey: poolKey.marketAuthority, isSigner: false, isWritable: false },
            { pubkey: poolKey.openOrders, isSigner: false, isWritable: true },
            { pubkey: poolKey.baseVault, isSigner: false, isWritable: true },
            { pubkey: poolKey.quoteVault, isSigner: false, isWritable: true },
            { pubkey: poolKey.marketId, isSigner: false, isWritable: true },
            { pubkey: poolKey.marketBids, isSigner: false, isWritable: true },
            { pubkey: poolKey.marketAsks, isSigner: false, isWritable: true },
            { pubkey: poolKey.marketEventQueue, isSigner: false, isWritable: true },
            ...(poolKey.marketProgramId.toString() === 'srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX'
                ? [
                    { pubkey: poolKey.marketBaseVault, isSigner: false, isWritable: true },
                    { pubkey: poolKey.marketQuoteVault, isSigner: false, isWritable: true },
                ]
                : [
                    { pubkey: poolKey.id, isSigner: false, isWritable: true },
                    { pubkey: poolKey.id, isSigner: false, isWritable: true },
                ]),
        ];
    }
    else if (itemPool.version === 5) {
        const poolKey = (0, common_1.jsonInfo2PoolKeys)(itemPool);
        return [
            { pubkey: poolKey.programId, isSigner: false, isWritable: false },
            { pubkey: userInAccount, isSigner: false, isWritable: true },
            { pubkey: userOutAccount, isSigner: false, isWritable: true },
            { pubkey: poolKey.id, isSigner: false, isWritable: true },
            { pubkey: poolKey.authority, isSigner: false, isWritable: false },
            { pubkey: poolKey.marketProgramId, isSigner: false, isWritable: false },
            { pubkey: poolKey.id, isSigner: false, isWritable: true },
            { pubkey: new web3_js_1.PublicKey('CDSr3ssLcRB6XYPJwAfFt18MZvEZp4LjHcvzBVZ45duo'), isSigner: false, isWritable: false },
            { pubkey: poolKey.openOrders, isSigner: false, isWritable: true },
            { pubkey: poolKey.baseVault, isSigner: false, isWritable: true },
            { pubkey: poolKey.quoteVault, isSigner: false, isWritable: true },
            { pubkey: poolKey.marketId, isSigner: false, isWritable: true },
            { pubkey: poolKey.marketBids, isSigner: false, isWritable: true },
            { pubkey: poolKey.marketAsks, isSigner: false, isWritable: true },
            { pubkey: poolKey.marketEventQueue, isSigner: false, isWritable: true },
            { pubkey: poolKey.id, isSigner: false, isWritable: true },
            { pubkey: poolKey.id, isSigner: false, isWritable: true },
        ];
    }
    else if (itemPool.version === 6) {
        const baseIn = itemPool.mintA.mint.toString() === inMint;
        return [
            { pubkey: new web3_js_1.PublicKey(String(itemPool.programId)), isSigner: false, isWritable: false },
            { pubkey: userInAccount, isSigner: false, isWritable: true },
            { pubkey: userOutAccount, isSigner: false, isWritable: true },
            { pubkey: itemPool.ammConfig.id, isSigner: false, isWritable: false },
            { pubkey: itemPool.id, isSigner: false, isWritable: true },
            { pubkey: baseIn ? itemPool.mintA.vault : itemPool.mintB.vault, isSigner: false, isWritable: true },
            { pubkey: baseIn ? itemPool.mintB.vault : itemPool.mintA.vault, isSigner: false, isWritable: true },
            { pubkey: itemPool.observationId, isSigner: false, isWritable: true },
            ...(itemPool.mintA.programId.equals(spl_token_1.TOKEN_2022_PROGRAM_ID) ||
                itemPool.mintB.programId.equals(spl_token_1.TOKEN_2022_PROGRAM_ID)
                ? [
                    { pubkey: spl_token_1.TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
                    { pubkey: common_1.MEMO_PROGRAM_ID, isSigner: false, isWritable: false },
                    { pubkey: baseIn ? itemPool.mintA.mint : itemPool.mintB.mint, isSigner: false, isWritable: false },
                    { pubkey: baseIn ? itemPool.mintB.mint : itemPool.mintA.mint, isSigner: false, isWritable: false },
                ]
                : []),
            ...(remainingAccount !== null && remainingAccount !== void 0 ? remainingAccount : []).map((i) => ({ pubkey: i, isSigner: false, isWritable: true })),
            {
                pubkey: (0, clmm_1.getPdaExBitmapAccount)(new web3_js_1.PublicKey(String(itemPool.programId)), itemPool.id).publicKey,
                isSigner: false,
                isWritable: true,
            },
        ];
    }
    else {
        throw Error('make swap ins error');
    }
}
//# sourceMappingURL=instrument.js.map
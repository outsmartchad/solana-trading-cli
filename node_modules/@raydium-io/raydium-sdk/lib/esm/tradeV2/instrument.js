import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import { getPdaExBitmapAccount } from '../clmm';
import { MEMO_PROGRAM_ID, SYSTEM_PROGRAM_ID, jsonInfo2PoolKeys } from '../common';
import { struct, u64, u8 } from '../marshmallow';
export function route1Instruction(programId, poolKeyA, poolKeyB, userSourceToken, userRouteToken, 
// userDestinationToken: PublicKey,
userPdaAccount, ownerWallet, inputMint, amountIn, amountOut, tickArrayA) {
    const dataLayout = struct([u8('instruction'), u64('amountIn'), u64('amountOut')]);
    const keys = [
        { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: new PublicKey(String(poolKeyA.programId)), isSigner: false, isWritable: false },
        { pubkey: new PublicKey(String(poolKeyA.id)), isSigner: false, isWritable: true },
        { pubkey: new PublicKey(String(poolKeyB.id)), isSigner: false, isWritable: true },
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
        const poolKey = jsonInfo2PoolKeys(poolKeyA);
        keys.push(...[
            { pubkey: poolKey.authority, isSigner: false, isWritable: false },
            { pubkey: poolKey.marketProgramId, isSigner: false, isWritable: false },
            { pubkey: poolKey.id, isSigner: false, isWritable: true },
            { pubkey: new PublicKey('CDSr3ssLcRB6XYPJwAfFt18MZvEZp4LjHcvzBVZ45duo'), isSigner: false, isWritable: false },
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
        const poolKey = jsonInfo2PoolKeys(poolKeyA);
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
    return new TransactionInstruction({
        keys,
        programId,
        data,
    });
}
export function route2Instruction(programId, poolKeyA, poolKeyB, 
// userSourceToken: PublicKey,
userRouteToken, userDestinationToken, userPdaAccount, ownerWallet, routeMint, 
// tickArrayA?: PublicKey[],
tickArrayB) {
    const dataLayout = struct([u8('instruction')]);
    const keys = [
        { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: new PublicKey(String(poolKeyB.programId)), isSigner: false, isWritable: false },
        { pubkey: new PublicKey(String(poolKeyB.id)), isSigner: false, isWritable: true },
        { pubkey: new PublicKey(String(poolKeyA.id)), isSigner: false, isWritable: true },
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
        const poolKey = jsonInfo2PoolKeys(poolKeyB);
        keys.push(...[
            { pubkey: poolKey.authority, isSigner: false, isWritable: false },
            { pubkey: poolKey.marketProgramId, isSigner: false, isWritable: false },
            { pubkey: poolKey.id, isSigner: false, isWritable: true },
            { pubkey: new PublicKey('CDSr3ssLcRB6XYPJwAfFt18MZvEZp4LjHcvzBVZ45duo'), isSigner: false, isWritable: false },
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
        const poolKey = jsonInfo2PoolKeys(poolKeyB);
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
    return new TransactionInstruction({
        keys,
        programId,
        data,
    });
}
export function routeInstruction(programId, wallet, userSourceToken, userRouteToken, userDestinationToken, inputMint, routeMint, poolKeyA, poolKeyB, amountIn, amountOut, remainingAccounts) {
    const dataLayout = struct([u8('instruction'), u64('amountIn'), u64('amountOut')]);
    const keys = [
        { pubkey: wallet, isSigner: true, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ];
    keys.push(...makeInnerInsKey(poolKeyA, inputMint, userSourceToken, userRouteToken, remainingAccounts[0]));
    keys.push(...makeInnerInsKey(poolKeyB, routeMint, userRouteToken, userDestinationToken, remainingAccounts[1]));
    const data = Buffer.alloc(dataLayout.span);
    dataLayout.encode({
        instruction: 8,
        amountIn,
        amountOut,
    }, data);
    return new TransactionInstruction({
        keys,
        programId,
        data,
    });
}
function makeInnerInsKey(itemPool, inMint, userInAccount, userOutAccount, remainingAccount) {
    if (itemPool.version === 4) {
        const poolKey = jsonInfo2PoolKeys(itemPool);
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
        const poolKey = jsonInfo2PoolKeys(itemPool);
        return [
            { pubkey: poolKey.programId, isSigner: false, isWritable: false },
            { pubkey: userInAccount, isSigner: false, isWritable: true },
            { pubkey: userOutAccount, isSigner: false, isWritable: true },
            { pubkey: poolKey.id, isSigner: false, isWritable: true },
            { pubkey: poolKey.authority, isSigner: false, isWritable: false },
            { pubkey: poolKey.marketProgramId, isSigner: false, isWritable: false },
            { pubkey: poolKey.id, isSigner: false, isWritable: true },
            { pubkey: new PublicKey('CDSr3ssLcRB6XYPJwAfFt18MZvEZp4LjHcvzBVZ45duo'), isSigner: false, isWritable: false },
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
            { pubkey: new PublicKey(String(itemPool.programId)), isSigner: false, isWritable: false },
            { pubkey: userInAccount, isSigner: false, isWritable: true },
            { pubkey: userOutAccount, isSigner: false, isWritable: true },
            { pubkey: itemPool.ammConfig.id, isSigner: false, isWritable: false },
            { pubkey: itemPool.id, isSigner: false, isWritable: true },
            { pubkey: baseIn ? itemPool.mintA.vault : itemPool.mintB.vault, isSigner: false, isWritable: true },
            { pubkey: baseIn ? itemPool.mintB.vault : itemPool.mintA.vault, isSigner: false, isWritable: true },
            { pubkey: itemPool.observationId, isSigner: false, isWritable: true },
            ...(itemPool.mintA.programId.equals(TOKEN_2022_PROGRAM_ID) ||
                itemPool.mintB.programId.equals(TOKEN_2022_PROGRAM_ID)
                ? [
                    { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
                    { pubkey: MEMO_PROGRAM_ID, isSigner: false, isWritable: false },
                    { pubkey: baseIn ? itemPool.mintA.mint : itemPool.mintB.mint, isSigner: false, isWritable: false },
                    { pubkey: baseIn ? itemPool.mintB.mint : itemPool.mintA.mint, isSigner: false, isWritable: false },
                ]
                : []),
            ...(remainingAccount ?? []).map((i) => ({ pubkey: i, isSigner: false, isWritable: true })),
            {
                pubkey: getPdaExBitmapAccount(new PublicKey(String(itemPool.programId)), itemPool.id).publicKey,
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
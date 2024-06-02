import { TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { TransactionInstruction } from '@solana/web3.js';
import { ASSOCIATED_TOKEN_PROGRAM_ID, MEMO_PROGRAM_ID, METADATA_PROGRAM_ID, RENT_PROGRAM_ID, SYSTEM_PROGRAM_ID, TOKEN_PROGRAM_ID, } from '../common';
import { ZERO, parseBigNumberish } from '../entity';
import { bool, s32, struct, u128, u64, u8 } from '../marshmallow';
const anchorDataBuf = {
    createPool: [233, 146, 209, 142, 207, 104, 64, 188],
    initReward: [95, 135, 192, 196, 242, 129, 230, 68],
    setRewardEmissions: [112, 52, 167, 75, 32, 201, 211, 137],
    openPosition: [77, 184, 74, 214, 112, 86, 241, 199],
    closePosition: [123, 134, 81, 0, 49, 68, 98, 98],
    increaseLiquidity: [133, 29, 89, 223, 69, 238, 176, 10],
    decreaseLiquidity: [58, 127, 188, 62, 79, 82, 196, 96],
    swap: [43, 4, 237, 11, 26, 201, 30, 98], // [248, 198, 158, 145, 225, 117, 135, 200],
    collectReward: [18, 237, 166, 197, 34, 16, 213, 144],
};
export function createPoolInstruction(programId, poolId, poolCreator, ammConfigId, observationId, mintA, mintVaultA, mintProgramIdA, mintB, mintVaultB, mintProgramIdB, exTickArrayBitmap, sqrtPriceX64, startTime) {
    const dataLayout = struct([u128('sqrtPriceX64'), u64('startTime')]);
    const keys = [
        { pubkey: poolCreator, isSigner: true, isWritable: true },
        { pubkey: ammConfigId, isSigner: false, isWritable: false },
        { pubkey: poolId, isSigner: false, isWritable: true },
        { pubkey: mintA, isSigner: false, isWritable: false },
        { pubkey: mintB, isSigner: false, isWritable: false },
        { pubkey: mintVaultA, isSigner: false, isWritable: true },
        { pubkey: mintVaultB, isSigner: false, isWritable: true },
        { pubkey: observationId, isSigner: false, isWritable: false },
        { pubkey: exTickArrayBitmap, isSigner: false, isWritable: true },
        { pubkey: mintProgramIdA, isSigner: false, isWritable: false },
        { pubkey: mintProgramIdB, isSigner: false, isWritable: false },
        { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: RENT_PROGRAM_ID, isSigner: false, isWritable: false },
    ];
    const data = Buffer.alloc(dataLayout.span);
    dataLayout.encode({
        sqrtPriceX64,
        startTime,
    }, data);
    const aData = Buffer.from([...anchorDataBuf.createPool, ...data]);
    return new TransactionInstruction({
        keys,
        programId,
        data: aData,
    });
}
export function openPositionFromLiquidityInstruction(programId, payer, poolId, positionNftOwner, positionNftMint, positionNftAccount, metadataAccount, protocolPosition, tickArrayLower, tickArrayUpper, personalPosition, ownerTokenAccountA, ownerTokenAccountB, tokenVaultA, tokenVaultB, tokenMintA, tokenMintB, tickLowerIndex, tickUpperIndex, tickArrayLowerStartIndex, tickArrayUpperStartIndex, liquidity, amountMaxA, amountMaxB, withMetadata, exTickArrayBitmap) {
    const dataLayout = struct([
        s32('tickLowerIndex'),
        s32('tickUpperIndex'),
        s32('tickArrayLowerStartIndex'),
        s32('tickArrayUpperStartIndex'),
        u128('liquidity'),
        u64('amountMaxA'),
        u64('amountMaxB'),
        bool('withMetadata'),
        u8('optionBaseFlag'),
        bool('baseFlag'),
    ]);
    const remainingAccounts = [
        ...(exTickArrayBitmap ? [{ pubkey: exTickArrayBitmap, isSigner: false, isWritable: true }] : []),
    ];
    const keys = [
        { pubkey: payer, isSigner: true, isWritable: true },
        { pubkey: positionNftOwner, isSigner: false, isWritable: false },
        { pubkey: positionNftMint, isSigner: true, isWritable: true },
        { pubkey: positionNftAccount, isSigner: false, isWritable: true },
        { pubkey: metadataAccount, isSigner: false, isWritable: true },
        { pubkey: poolId, isSigner: false, isWritable: true },
        { pubkey: protocolPosition, isSigner: false, isWritable: true },
        { pubkey: tickArrayLower, isSigner: false, isWritable: true },
        { pubkey: tickArrayUpper, isSigner: false, isWritable: true },
        { pubkey: personalPosition, isSigner: false, isWritable: true },
        { pubkey: ownerTokenAccountA, isSigner: false, isWritable: true },
        { pubkey: ownerTokenAccountB, isSigner: false, isWritable: true },
        { pubkey: tokenVaultA, isSigner: false, isWritable: true },
        { pubkey: tokenVaultB, isSigner: false, isWritable: true },
        { pubkey: RENT_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: METADATA_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: tokenMintA, isSigner: false, isWritable: false },
        { pubkey: tokenMintB, isSigner: false, isWritable: false },
        ...remainingAccounts,
    ];
    const data = Buffer.alloc(dataLayout.span);
    dataLayout.encode({
        tickLowerIndex,
        tickUpperIndex,
        tickArrayLowerStartIndex,
        tickArrayUpperStartIndex,
        liquidity,
        amountMaxA,
        amountMaxB,
        withMetadata: withMetadata === 'create',
        baseFlag: false,
        optionBaseFlag: 0,
    }, data);
    const aData = Buffer.from([...anchorDataBuf.openPosition, ...data]);
    return new TransactionInstruction({
        keys,
        programId,
        data: aData,
    });
}
export function openPositionFromBaseInstruction(programId, payer, poolId, positionNftOwner, positionNftMint, positionNftAccount, metadataAccount, protocolPosition, tickArrayLower, tickArrayUpper, personalPosition, ownerTokenAccountA, ownerTokenAccountB, tokenVaultA, tokenVaultB, tokenMintA, tokenMintB, tickLowerIndex, tickUpperIndex, tickArrayLowerStartIndex, tickArrayUpperStartIndex, withMetadata, base, baseAmount, otherAmountMax, exTickArrayBitmap) {
    const dataLayout = struct([
        s32('tickLowerIndex'),
        s32('tickUpperIndex'),
        s32('tickArrayLowerStartIndex'),
        s32('tickArrayUpperStartIndex'),
        u128('liquidity'),
        u64('amountMaxA'),
        u64('amountMaxB'),
        bool('withMetadata'),
        u8('optionBaseFlag'),
        bool('baseFlag'),
    ]);
    const remainingAccounts = [
        ...(exTickArrayBitmap ? [{ pubkey: exTickArrayBitmap, isSigner: false, isWritable: true }] : []),
    ];
    const keys = [
        { pubkey: payer, isSigner: true, isWritable: true },
        { pubkey: positionNftOwner, isSigner: false, isWritable: false },
        { pubkey: positionNftMint, isSigner: true, isWritable: true },
        { pubkey: positionNftAccount, isSigner: false, isWritable: true },
        { pubkey: metadataAccount, isSigner: false, isWritable: true },
        { pubkey: poolId, isSigner: false, isWritable: true },
        { pubkey: protocolPosition, isSigner: false, isWritable: true },
        { pubkey: tickArrayLower, isSigner: false, isWritable: true },
        { pubkey: tickArrayUpper, isSigner: false, isWritable: true },
        { pubkey: personalPosition, isSigner: false, isWritable: true },
        { pubkey: ownerTokenAccountA, isSigner: false, isWritable: true },
        { pubkey: ownerTokenAccountB, isSigner: false, isWritable: true },
        { pubkey: tokenVaultA, isSigner: false, isWritable: true },
        { pubkey: tokenVaultB, isSigner: false, isWritable: true },
        { pubkey: RENT_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: METADATA_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: tokenMintA, isSigner: false, isWritable: false },
        { pubkey: tokenMintB, isSigner: false, isWritable: false },
        ...remainingAccounts,
    ];
    const data = Buffer.alloc(dataLayout.span);
    dataLayout.encode({
        tickLowerIndex,
        tickUpperIndex,
        tickArrayLowerStartIndex,
        tickArrayUpperStartIndex,
        liquidity: ZERO,
        amountMaxA: base === 'MintA' ? baseAmount : otherAmountMax,
        amountMaxB: base === 'MintA' ? otherAmountMax : baseAmount,
        withMetadata: withMetadata === 'create',
        baseFlag: base === 'MintA',
        optionBaseFlag: 1,
    }, data);
    const aData = Buffer.from([...anchorDataBuf.openPosition, ...data]);
    return new TransactionInstruction({
        keys,
        programId,
        data: aData,
    });
}
export function closePositionInstruction(programId, positionNftOwner, positionNftMint, positionNftAccount, personalPosition) {
    const dataLayout = struct([]);
    const keys = [
        { pubkey: positionNftOwner, isSigner: true, isWritable: true },
        { pubkey: positionNftMint, isSigner: false, isWritable: true },
        { pubkey: positionNftAccount, isSigner: false, isWritable: true },
        { pubkey: personalPosition, isSigner: false, isWritable: true },
        { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ];
    const data = Buffer.alloc(dataLayout.span);
    dataLayout.encode({}, data);
    const aData = Buffer.from([...anchorDataBuf.closePosition, ...data]);
    return new TransactionInstruction({
        keys,
        programId,
        data: aData,
    });
}
export function increasePositionFromLiquidityInstruction(programId, positionNftOwner, positionNftAccount, personalPosition, poolId, protocolPosition, tickArrayLower, tickArrayUpper, ownerTokenAccountA, ownerTokenAccountB, mintVaultA, mintVaultB, mintMintA, mintMintB, liquidity, amountMaxA, amountMaxB, exTickArrayBitmap) {
    const dataLayout = struct([
        u128('liquidity'),
        u64('amountMaxA'),
        u64('amountMaxB'),
        u8('optionBaseFlag'),
        bool('baseFlag'),
    ]);
    const remainingAccounts = [
        ...(exTickArrayBitmap ? [{ pubkey: exTickArrayBitmap, isSigner: false, isWritable: true }] : []),
    ];
    const keys = [
        { pubkey: positionNftOwner, isSigner: true, isWritable: false },
        { pubkey: positionNftAccount, isSigner: false, isWritable: false },
        { pubkey: poolId, isSigner: false, isWritable: true },
        { pubkey: protocolPosition, isSigner: false, isWritable: true },
        { pubkey: personalPosition, isSigner: false, isWritable: true },
        { pubkey: tickArrayLower, isSigner: false, isWritable: true },
        { pubkey: tickArrayUpper, isSigner: false, isWritable: true },
        { pubkey: ownerTokenAccountA, isSigner: false, isWritable: true },
        { pubkey: ownerTokenAccountB, isSigner: false, isWritable: true },
        { pubkey: mintVaultA, isSigner: false, isWritable: true },
        { pubkey: mintVaultB, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: mintMintA, isSigner: false, isWritable: false },
        { pubkey: mintMintB, isSigner: false, isWritable: false },
        ...remainingAccounts,
    ];
    const data = Buffer.alloc(dataLayout.span);
    dataLayout.encode({
        liquidity,
        amountMaxA,
        amountMaxB,
        optionBaseFlag: 0,
        baseFlag: false,
    }, data);
    const aData = Buffer.from([...anchorDataBuf.increaseLiquidity, ...data]);
    return new TransactionInstruction({
        keys,
        programId,
        data: aData,
    });
}
export function increasePositionFromBaseInstruction(programId, positionNftOwner, positionNftAccount, personalPosition, poolId, protocolPosition, tickArrayLower, tickArrayUpper, ownerTokenAccountA, ownerTokenAccountB, mintVaultA, mintVaultB, mintMintA, mintMintB, base, baseAmount, otherAmountMax, exTickArrayBitmap) {
    const dataLayout = struct([
        u128('liquidity'),
        u64('amountMaxA'),
        u64('amountMaxB'),
        u8('optionBaseFlag'),
        bool('baseFlag'),
    ]);
    const remainingAccounts = [
        ...(exTickArrayBitmap ? [{ pubkey: exTickArrayBitmap, isSigner: false, isWritable: true }] : []),
    ];
    const keys = [
        { pubkey: positionNftOwner, isSigner: true, isWritable: false },
        { pubkey: positionNftAccount, isSigner: false, isWritable: false },
        { pubkey: poolId, isSigner: false, isWritable: true },
        { pubkey: protocolPosition, isSigner: false, isWritable: true },
        { pubkey: personalPosition, isSigner: false, isWritable: true },
        { pubkey: tickArrayLower, isSigner: false, isWritable: true },
        { pubkey: tickArrayUpper, isSigner: false, isWritable: true },
        { pubkey: ownerTokenAccountA, isSigner: false, isWritable: true },
        { pubkey: ownerTokenAccountB, isSigner: false, isWritable: true },
        { pubkey: mintVaultA, isSigner: false, isWritable: true },
        { pubkey: mintVaultB, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: mintMintA, isSigner: false, isWritable: false },
        { pubkey: mintMintB, isSigner: false, isWritable: false },
        ...remainingAccounts,
    ];
    const data = Buffer.alloc(dataLayout.span);
    dataLayout.encode({
        liquidity: ZERO,
        amountMaxA: base === 'MintA' ? baseAmount : otherAmountMax,
        amountMaxB: base === 'MintA' ? otherAmountMax : baseAmount,
        baseFlag: base === 'MintA',
        optionBaseFlag: 1,
    }, data);
    const aData = Buffer.from([...anchorDataBuf.increaseLiquidity, ...data]);
    return new TransactionInstruction({
        keys,
        programId,
        data: aData,
    });
}
export function decreaseLiquidityInstruction(programId, positionNftOwner, positionNftAccount, personalPosition, poolId, protocolPosition, tickArrayLower, tickArrayUpper, ownerTokenAccountA, ownerTokenAccountB, mintVaultA, mintVaultB, mintMintA, mintMintB, rewardAccounts, liquidity, amountMinA, amountMinB, exTickArrayBitmap) {
    const dataLayout = struct([u128('liquidity'), u64('amountMinA'), u64('amountMinB')]);
    const remainingAccounts = [
        ...(exTickArrayBitmap ? [{ pubkey: exTickArrayBitmap, isSigner: false, isWritable: true }] : []),
        ...rewardAccounts
            .map((i) => [
            { pubkey: i.poolRewardVault, isSigner: false, isWritable: true },
            { pubkey: i.ownerRewardVault, isSigner: false, isWritable: true },
            { pubkey: i.rewardMint, isSigner: false, isWritable: false },
        ])
            .flat(),
    ];
    const keys = [
        { pubkey: positionNftOwner, isSigner: true, isWritable: false },
        { pubkey: positionNftAccount, isSigner: false, isWritable: false },
        { pubkey: personalPosition, isSigner: false, isWritable: true },
        { pubkey: poolId, isSigner: false, isWritable: true },
        { pubkey: protocolPosition, isSigner: false, isWritable: true },
        { pubkey: mintVaultA, isSigner: false, isWritable: true },
        { pubkey: mintVaultB, isSigner: false, isWritable: true },
        { pubkey: tickArrayLower, isSigner: false, isWritable: true },
        { pubkey: tickArrayUpper, isSigner: false, isWritable: true },
        { pubkey: ownerTokenAccountA, isSigner: false, isWritable: true },
        { pubkey: ownerTokenAccountB, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: MEMO_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: mintMintA, isSigner: false, isWritable: false },
        { pubkey: mintMintB, isSigner: false, isWritable: false },
        ...remainingAccounts,
    ];
    const data = Buffer.alloc(dataLayout.span);
    dataLayout.encode({
        liquidity,
        amountMinA,
        amountMinB,
    }, data);
    const aData = Buffer.from([...anchorDataBuf.decreaseLiquidity, ...data]);
    return new TransactionInstruction({
        keys,
        programId,
        data: aData,
    });
}
export function swapInstruction(programId, payer, poolId, ammConfigId, inputTokenAccount, outputTokenAccount, inputVault, outputVault, inputMint, outputMint, tickArray, observationId, amount, otherAmountThreshold, sqrtPriceLimitX64, isBaseInput, exTickArrayBitmap) {
    const dataLayout = struct([
        u64('amount'),
        u64('otherAmountThreshold'),
        u128('sqrtPriceLimitX64'),
        bool('isBaseInput'),
    ]);
    const remainingAccounts = [
        ...(exTickArrayBitmap ? [{ pubkey: exTickArrayBitmap, isSigner: false, isWritable: true }] : []),
        ...tickArray.map((i) => ({ pubkey: i, isSigner: false, isWritable: true })),
    ];
    const keys = [
        { pubkey: payer, isSigner: true, isWritable: false },
        { pubkey: ammConfigId, isSigner: false, isWritable: false },
        { pubkey: poolId, isSigner: false, isWritable: true },
        { pubkey: inputTokenAccount, isSigner: false, isWritable: true },
        { pubkey: outputTokenAccount, isSigner: false, isWritable: true },
        { pubkey: inputVault, isSigner: false, isWritable: true },
        { pubkey: outputVault, isSigner: false, isWritable: true },
        { pubkey: observationId, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: MEMO_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: inputMint, isSigner: false, isWritable: false },
        { pubkey: outputMint, isSigner: false, isWritable: false },
        ...remainingAccounts,
    ];
    const data = Buffer.alloc(dataLayout.span);
    dataLayout.encode({
        amount,
        otherAmountThreshold,
        sqrtPriceLimitX64,
        isBaseInput,
    }, data);
    const aData = Buffer.from([...anchorDataBuf.swap, ...data]);
    return new TransactionInstruction({
        keys,
        programId,
        data: aData,
    });
}
export function initRewardInstruction(programId, payer, poolId, operationId, ammConfigId, ownerTokenAccount, rewardProgramId, rewardMint, rewardVault, openTime, endTime, emissionsPerSecondX64) {
    const dataLayout = struct([u64('openTime'), u64('endTime'), u128('emissionsPerSecondX64')]);
    const keys = [
        { pubkey: payer, isSigner: true, isWritable: true },
        { pubkey: ownerTokenAccount, isSigner: false, isWritable: true },
        { pubkey: ammConfigId, isSigner: false, isWritable: false },
        { pubkey: poolId, isSigner: false, isWritable: true },
        { pubkey: operationId, isSigner: false, isWritable: true },
        { pubkey: rewardMint, isSigner: false, isWritable: false },
        { pubkey: rewardVault, isSigner: false, isWritable: true },
        { pubkey: rewardProgramId, isSigner: false, isWritable: false },
        { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: RENT_PROGRAM_ID, isSigner: false, isWritable: false },
    ];
    const data = Buffer.alloc(dataLayout.span);
    dataLayout.encode({
        openTime: parseBigNumberish(openTime),
        endTime: parseBigNumberish(endTime),
        emissionsPerSecondX64,
    }, data);
    const aData = Buffer.from([...anchorDataBuf.initReward, ...data]);
    return new TransactionInstruction({
        keys,
        programId,
        data: aData,
    });
}
export function setRewardInstruction(programId, payer, poolId, operationId, ammConfigId, ownerTokenAccount, rewardVault, rewardMint, rewardIndex, openTime, endTime, emissionsPerSecondX64) {
    const dataLayout = struct([u8('rewardIndex'), u128('emissionsPerSecondX64'), u64('openTime'), u64('endTime')]);
    const keys = [
        { pubkey: payer, isSigner: true, isWritable: true },
        { pubkey: ammConfigId, isSigner: false, isWritable: false },
        { pubkey: poolId, isSigner: false, isWritable: true },
        { pubkey: operationId, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: rewardVault, isSigner: false, isWritable: true },
        { pubkey: ownerTokenAccount, isSigner: false, isWritable: true },
        { pubkey: rewardMint, isSigner: false, isWritable: true },
    ];
    const data = Buffer.alloc(dataLayout.span);
    dataLayout.encode({
        rewardIndex,
        emissionsPerSecondX64,
        openTime: parseBigNumberish(openTime),
        endTime: parseBigNumberish(endTime),
    }, data);
    const aData = Buffer.from([...anchorDataBuf.setRewardEmissions, ...data]);
    return new TransactionInstruction({
        keys,
        programId,
        data: aData,
    });
}
export function collectRewardInstruction(programId, payer, poolId, ownerTokenAccount, rewardVault, rewardMint, rewardIndex) {
    const dataLayout = struct([u8('rewardIndex')]);
    const keys = [
        { pubkey: payer, isSigner: true, isWritable: true },
        { pubkey: ownerTokenAccount, isSigner: false, isWritable: true },
        { pubkey: poolId, isSigner: false, isWritable: true },
        { pubkey: rewardVault, isSigner: false, isWritable: true },
        { pubkey: rewardMint, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: MEMO_PROGRAM_ID, isSigner: false, isWritable: false },
    ];
    const data = Buffer.alloc(dataLayout.span);
    dataLayout.encode({
        rewardIndex,
    }, data);
    const aData = Buffer.from([...anchorDataBuf.collectReward, ...data]);
    return new TransactionInstruction({
        keys,
        programId,
        data: aData,
    });
}
//# sourceMappingURL=instrument.js.map
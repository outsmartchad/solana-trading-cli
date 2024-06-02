"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectRewardInstruction = exports.setRewardInstruction = exports.initRewardInstruction = exports.swapInstruction = exports.decreaseLiquidityInstruction = exports.increasePositionFromBaseInstruction = exports.increasePositionFromLiquidityInstruction = exports.closePositionInstruction = exports.openPositionFromBaseInstruction = exports.openPositionFromLiquidityInstruction = exports.createPoolInstruction = void 0;
const spl_token_1 = require("@solana/spl-token");
const web3_js_1 = require("@solana/web3.js");
const common_1 = require("../common");
const entity_1 = require("../entity");
const marshmallow_1 = require("../marshmallow");
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
function createPoolInstruction(programId, poolId, poolCreator, ammConfigId, observationId, mintA, mintVaultA, mintProgramIdA, mintB, mintVaultB, mintProgramIdB, exTickArrayBitmap, sqrtPriceX64, startTime) {
    const dataLayout = (0, marshmallow_1.struct)([(0, marshmallow_1.u128)('sqrtPriceX64'), (0, marshmallow_1.u64)('startTime')]);
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
        { pubkey: common_1.SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: common_1.RENT_PROGRAM_ID, isSigner: false, isWritable: false },
    ];
    const data = Buffer.alloc(dataLayout.span);
    dataLayout.encode({
        sqrtPriceX64,
        startTime,
    }, data);
    const aData = Buffer.from([...anchorDataBuf.createPool, ...data]);
    return new web3_js_1.TransactionInstruction({
        keys,
        programId,
        data: aData,
    });
}
exports.createPoolInstruction = createPoolInstruction;
function openPositionFromLiquidityInstruction(programId, payer, poolId, positionNftOwner, positionNftMint, positionNftAccount, metadataAccount, protocolPosition, tickArrayLower, tickArrayUpper, personalPosition, ownerTokenAccountA, ownerTokenAccountB, tokenVaultA, tokenVaultB, tokenMintA, tokenMintB, tickLowerIndex, tickUpperIndex, tickArrayLowerStartIndex, tickArrayUpperStartIndex, liquidity, amountMaxA, amountMaxB, withMetadata, exTickArrayBitmap) {
    const dataLayout = (0, marshmallow_1.struct)([
        (0, marshmallow_1.s32)('tickLowerIndex'),
        (0, marshmallow_1.s32)('tickUpperIndex'),
        (0, marshmallow_1.s32)('tickArrayLowerStartIndex'),
        (0, marshmallow_1.s32)('tickArrayUpperStartIndex'),
        (0, marshmallow_1.u128)('liquidity'),
        (0, marshmallow_1.u64)('amountMaxA'),
        (0, marshmallow_1.u64)('amountMaxB'),
        (0, marshmallow_1.bool)('withMetadata'),
        (0, marshmallow_1.u8)('optionBaseFlag'),
        (0, marshmallow_1.bool)('baseFlag'),
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
        { pubkey: common_1.RENT_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: common_1.SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: common_1.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: common_1.ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: common_1.METADATA_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: spl_token_1.TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
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
    return new web3_js_1.TransactionInstruction({
        keys,
        programId,
        data: aData,
    });
}
exports.openPositionFromLiquidityInstruction = openPositionFromLiquidityInstruction;
function openPositionFromBaseInstruction(programId, payer, poolId, positionNftOwner, positionNftMint, positionNftAccount, metadataAccount, protocolPosition, tickArrayLower, tickArrayUpper, personalPosition, ownerTokenAccountA, ownerTokenAccountB, tokenVaultA, tokenVaultB, tokenMintA, tokenMintB, tickLowerIndex, tickUpperIndex, tickArrayLowerStartIndex, tickArrayUpperStartIndex, withMetadata, base, baseAmount, otherAmountMax, exTickArrayBitmap) {
    const dataLayout = (0, marshmallow_1.struct)([
        (0, marshmallow_1.s32)('tickLowerIndex'),
        (0, marshmallow_1.s32)('tickUpperIndex'),
        (0, marshmallow_1.s32)('tickArrayLowerStartIndex'),
        (0, marshmallow_1.s32)('tickArrayUpperStartIndex'),
        (0, marshmallow_1.u128)('liquidity'),
        (0, marshmallow_1.u64)('amountMaxA'),
        (0, marshmallow_1.u64)('amountMaxB'),
        (0, marshmallow_1.bool)('withMetadata'),
        (0, marshmallow_1.u8)('optionBaseFlag'),
        (0, marshmallow_1.bool)('baseFlag'),
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
        { pubkey: common_1.RENT_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: common_1.SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: common_1.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: common_1.ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: common_1.METADATA_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: spl_token_1.TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
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
        liquidity: entity_1.ZERO,
        amountMaxA: base === 'MintA' ? baseAmount : otherAmountMax,
        amountMaxB: base === 'MintA' ? otherAmountMax : baseAmount,
        withMetadata: withMetadata === 'create',
        baseFlag: base === 'MintA',
        optionBaseFlag: 1,
    }, data);
    const aData = Buffer.from([...anchorDataBuf.openPosition, ...data]);
    return new web3_js_1.TransactionInstruction({
        keys,
        programId,
        data: aData,
    });
}
exports.openPositionFromBaseInstruction = openPositionFromBaseInstruction;
function closePositionInstruction(programId, positionNftOwner, positionNftMint, positionNftAccount, personalPosition) {
    const dataLayout = (0, marshmallow_1.struct)([]);
    const keys = [
        { pubkey: positionNftOwner, isSigner: true, isWritable: true },
        { pubkey: positionNftMint, isSigner: false, isWritable: true },
        { pubkey: positionNftAccount, isSigner: false, isWritable: true },
        { pubkey: personalPosition, isSigner: false, isWritable: true },
        { pubkey: common_1.SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: common_1.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ];
    const data = Buffer.alloc(dataLayout.span);
    dataLayout.encode({}, data);
    const aData = Buffer.from([...anchorDataBuf.closePosition, ...data]);
    return new web3_js_1.TransactionInstruction({
        keys,
        programId,
        data: aData,
    });
}
exports.closePositionInstruction = closePositionInstruction;
function increasePositionFromLiquidityInstruction(programId, positionNftOwner, positionNftAccount, personalPosition, poolId, protocolPosition, tickArrayLower, tickArrayUpper, ownerTokenAccountA, ownerTokenAccountB, mintVaultA, mintVaultB, mintMintA, mintMintB, liquidity, amountMaxA, amountMaxB, exTickArrayBitmap) {
    const dataLayout = (0, marshmallow_1.struct)([
        (0, marshmallow_1.u128)('liquidity'),
        (0, marshmallow_1.u64)('amountMaxA'),
        (0, marshmallow_1.u64)('amountMaxB'),
        (0, marshmallow_1.u8)('optionBaseFlag'),
        (0, marshmallow_1.bool)('baseFlag'),
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
        { pubkey: common_1.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: spl_token_1.TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
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
    return new web3_js_1.TransactionInstruction({
        keys,
        programId,
        data: aData,
    });
}
exports.increasePositionFromLiquidityInstruction = increasePositionFromLiquidityInstruction;
function increasePositionFromBaseInstruction(programId, positionNftOwner, positionNftAccount, personalPosition, poolId, protocolPosition, tickArrayLower, tickArrayUpper, ownerTokenAccountA, ownerTokenAccountB, mintVaultA, mintVaultB, mintMintA, mintMintB, base, baseAmount, otherAmountMax, exTickArrayBitmap) {
    const dataLayout = (0, marshmallow_1.struct)([
        (0, marshmallow_1.u128)('liquidity'),
        (0, marshmallow_1.u64)('amountMaxA'),
        (0, marshmallow_1.u64)('amountMaxB'),
        (0, marshmallow_1.u8)('optionBaseFlag'),
        (0, marshmallow_1.bool)('baseFlag'),
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
        { pubkey: common_1.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: spl_token_1.TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: mintMintA, isSigner: false, isWritable: false },
        { pubkey: mintMintB, isSigner: false, isWritable: false },
        ...remainingAccounts,
    ];
    const data = Buffer.alloc(dataLayout.span);
    dataLayout.encode({
        liquidity: entity_1.ZERO,
        amountMaxA: base === 'MintA' ? baseAmount : otherAmountMax,
        amountMaxB: base === 'MintA' ? otherAmountMax : baseAmount,
        baseFlag: base === 'MintA',
        optionBaseFlag: 1,
    }, data);
    const aData = Buffer.from([...anchorDataBuf.increaseLiquidity, ...data]);
    return new web3_js_1.TransactionInstruction({
        keys,
        programId,
        data: aData,
    });
}
exports.increasePositionFromBaseInstruction = increasePositionFromBaseInstruction;
function decreaseLiquidityInstruction(programId, positionNftOwner, positionNftAccount, personalPosition, poolId, protocolPosition, tickArrayLower, tickArrayUpper, ownerTokenAccountA, ownerTokenAccountB, mintVaultA, mintVaultB, mintMintA, mintMintB, rewardAccounts, liquidity, amountMinA, amountMinB, exTickArrayBitmap) {
    const dataLayout = (0, marshmallow_1.struct)([(0, marshmallow_1.u128)('liquidity'), (0, marshmallow_1.u64)('amountMinA'), (0, marshmallow_1.u64)('amountMinB')]);
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
        { pubkey: common_1.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: spl_token_1.TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: common_1.MEMO_PROGRAM_ID, isSigner: false, isWritable: false },
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
    return new web3_js_1.TransactionInstruction({
        keys,
        programId,
        data: aData,
    });
}
exports.decreaseLiquidityInstruction = decreaseLiquidityInstruction;
function swapInstruction(programId, payer, poolId, ammConfigId, inputTokenAccount, outputTokenAccount, inputVault, outputVault, inputMint, outputMint, tickArray, observationId, amount, otherAmountThreshold, sqrtPriceLimitX64, isBaseInput, exTickArrayBitmap) {
    const dataLayout = (0, marshmallow_1.struct)([
        (0, marshmallow_1.u64)('amount'),
        (0, marshmallow_1.u64)('otherAmountThreshold'),
        (0, marshmallow_1.u128)('sqrtPriceLimitX64'),
        (0, marshmallow_1.bool)('isBaseInput'),
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
        { pubkey: common_1.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: spl_token_1.TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: common_1.MEMO_PROGRAM_ID, isSigner: false, isWritable: false },
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
    return new web3_js_1.TransactionInstruction({
        keys,
        programId,
        data: aData,
    });
}
exports.swapInstruction = swapInstruction;
function initRewardInstruction(programId, payer, poolId, operationId, ammConfigId, ownerTokenAccount, rewardProgramId, rewardMint, rewardVault, openTime, endTime, emissionsPerSecondX64) {
    const dataLayout = (0, marshmallow_1.struct)([(0, marshmallow_1.u64)('openTime'), (0, marshmallow_1.u64)('endTime'), (0, marshmallow_1.u128)('emissionsPerSecondX64')]);
    const keys = [
        { pubkey: payer, isSigner: true, isWritable: true },
        { pubkey: ownerTokenAccount, isSigner: false, isWritable: true },
        { pubkey: ammConfigId, isSigner: false, isWritable: false },
        { pubkey: poolId, isSigner: false, isWritable: true },
        { pubkey: operationId, isSigner: false, isWritable: true },
        { pubkey: rewardMint, isSigner: false, isWritable: false },
        { pubkey: rewardVault, isSigner: false, isWritable: true },
        { pubkey: rewardProgramId, isSigner: false, isWritable: false },
        { pubkey: common_1.SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: common_1.RENT_PROGRAM_ID, isSigner: false, isWritable: false },
    ];
    const data = Buffer.alloc(dataLayout.span);
    dataLayout.encode({
        openTime: (0, entity_1.parseBigNumberish)(openTime),
        endTime: (0, entity_1.parseBigNumberish)(endTime),
        emissionsPerSecondX64,
    }, data);
    const aData = Buffer.from([...anchorDataBuf.initReward, ...data]);
    return new web3_js_1.TransactionInstruction({
        keys,
        programId,
        data: aData,
    });
}
exports.initRewardInstruction = initRewardInstruction;
function setRewardInstruction(programId, payer, poolId, operationId, ammConfigId, ownerTokenAccount, rewardVault, rewardMint, rewardIndex, openTime, endTime, emissionsPerSecondX64) {
    const dataLayout = (0, marshmallow_1.struct)([(0, marshmallow_1.u8)('rewardIndex'), (0, marshmallow_1.u128)('emissionsPerSecondX64'), (0, marshmallow_1.u64)('openTime'), (0, marshmallow_1.u64)('endTime')]);
    const keys = [
        { pubkey: payer, isSigner: true, isWritable: true },
        { pubkey: ammConfigId, isSigner: false, isWritable: false },
        { pubkey: poolId, isSigner: false, isWritable: true },
        { pubkey: operationId, isSigner: false, isWritable: true },
        { pubkey: common_1.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: spl_token_1.TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: rewardVault, isSigner: false, isWritable: true },
        { pubkey: ownerTokenAccount, isSigner: false, isWritable: true },
        { pubkey: rewardMint, isSigner: false, isWritable: true },
    ];
    const data = Buffer.alloc(dataLayout.span);
    dataLayout.encode({
        rewardIndex,
        emissionsPerSecondX64,
        openTime: (0, entity_1.parseBigNumberish)(openTime),
        endTime: (0, entity_1.parseBigNumberish)(endTime),
    }, data);
    const aData = Buffer.from([...anchorDataBuf.setRewardEmissions, ...data]);
    return new web3_js_1.TransactionInstruction({
        keys,
        programId,
        data: aData,
    });
}
exports.setRewardInstruction = setRewardInstruction;
function collectRewardInstruction(programId, payer, poolId, ownerTokenAccount, rewardVault, rewardMint, rewardIndex) {
    const dataLayout = (0, marshmallow_1.struct)([(0, marshmallow_1.u8)('rewardIndex')]);
    const keys = [
        { pubkey: payer, isSigner: true, isWritable: true },
        { pubkey: ownerTokenAccount, isSigner: false, isWritable: true },
        { pubkey: poolId, isSigner: false, isWritable: true },
        { pubkey: rewardVault, isSigner: false, isWritable: true },
        { pubkey: rewardMint, isSigner: false, isWritable: false },
        { pubkey: common_1.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: spl_token_1.TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: common_1.MEMO_PROGRAM_ID, isSigner: false, isWritable: false },
    ];
    const data = Buffer.alloc(dataLayout.span);
    dataLayout.encode({
        rewardIndex,
    }, data);
    const aData = Buffer.from([...anchorDataBuf.collectReward, ...data]);
    return new web3_js_1.TransactionInstruction({
        keys,
        programId,
        data: aData,
    });
}
exports.collectRewardInstruction = collectRewardInstruction;
//# sourceMappingURL=instrument.js.map
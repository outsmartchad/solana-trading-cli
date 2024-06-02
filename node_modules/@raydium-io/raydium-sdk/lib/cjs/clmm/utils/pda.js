"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPdaExBitmapAccount = exports.getPdaOperationAccount = exports.getPdaMetadataKey = exports.getPdaPersonalPositionAddress = exports.getPdaProtocolPositionAddress = exports.getPdaTickArrayAddress = exports.getPdaPoolRewardVaulId = exports.getPdaPoolVaultId = exports.getPdaPoolId = exports.getPdaAmmConfigId = exports.POOL_TICK_ARRAY_BITMAP_SEED = exports.OPERATION_SEED = exports.TICK_ARRAY_SEED = exports.POSITION_SEED = exports.POOL_REWARD_VAULT_SEED = exports.POOL_VAULT_SEED = exports.POOL_SEED = exports.AMM_CONFIG_SEED = void 0;
const common_1 = require("../../common");
const util_1 = require("./util");
exports.AMM_CONFIG_SEED = Buffer.from('amm_config', 'utf8');
exports.POOL_SEED = Buffer.from('pool', 'utf8');
exports.POOL_VAULT_SEED = Buffer.from('pool_vault', 'utf8');
exports.POOL_REWARD_VAULT_SEED = Buffer.from('pool_reward_vault', 'utf8');
exports.POSITION_SEED = Buffer.from('position', 'utf8');
exports.TICK_ARRAY_SEED = Buffer.from('tick_array', 'utf8');
exports.OPERATION_SEED = Buffer.from('operation', 'utf8');
exports.POOL_TICK_ARRAY_BITMAP_SEED = Buffer.from('pool_tick_array_bitmap_extension', 'utf8');
function getPdaAmmConfigId(programId, index) {
    return (0, common_1.findProgramAddress)([exports.AMM_CONFIG_SEED, (0, util_1.u16ToBytes)(index)], programId);
}
exports.getPdaAmmConfigId = getPdaAmmConfigId;
function getPdaPoolId(programId, ammConfigId, mintA, mintB) {
    return (0, common_1.findProgramAddress)([exports.POOL_SEED, ammConfigId.toBuffer(), mintA.toBuffer(), mintB.toBuffer()], programId);
}
exports.getPdaPoolId = getPdaPoolId;
function getPdaPoolVaultId(programId, poolId, vaultMint) {
    return (0, common_1.findProgramAddress)([exports.POOL_VAULT_SEED, poolId.toBuffer(), vaultMint.toBuffer()], programId);
}
exports.getPdaPoolVaultId = getPdaPoolVaultId;
function getPdaPoolRewardVaulId(programId, poolId, rewardMint) {
    return (0, common_1.findProgramAddress)([exports.POOL_REWARD_VAULT_SEED, poolId.toBuffer(), rewardMint.toBuffer()], programId);
}
exports.getPdaPoolRewardVaulId = getPdaPoolRewardVaulId;
function getPdaTickArrayAddress(programId, poolId, startIndex) {
    return (0, common_1.findProgramAddress)([exports.TICK_ARRAY_SEED, poolId.toBuffer(), (0, util_1.i32ToBytes)(startIndex)], programId);
}
exports.getPdaTickArrayAddress = getPdaTickArrayAddress;
function getPdaProtocolPositionAddress(programId, poolId, tickLower, tickUpper) {
    return (0, common_1.findProgramAddress)([exports.POSITION_SEED, poolId.toBuffer(), (0, util_1.i32ToBytes)(tickLower), (0, util_1.i32ToBytes)(tickUpper)], programId);
}
exports.getPdaProtocolPositionAddress = getPdaProtocolPositionAddress;
function getPdaPersonalPositionAddress(programId, nftMint) {
    return (0, common_1.findProgramAddress)([exports.POSITION_SEED, nftMint.toBuffer()], programId);
}
exports.getPdaPersonalPositionAddress = getPdaPersonalPositionAddress;
function getPdaMetadataKey(mint) {
    return (0, common_1.findProgramAddress)([Buffer.from('metadata', 'utf8'), common_1.METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer()], common_1.METADATA_PROGRAM_ID);
}
exports.getPdaMetadataKey = getPdaMetadataKey;
function getPdaOperationAccount(programId) {
    return (0, common_1.findProgramAddress)([exports.OPERATION_SEED], programId);
}
exports.getPdaOperationAccount = getPdaOperationAccount;
function getPdaExBitmapAccount(programId, poolId) {
    return (0, common_1.findProgramAddress)([exports.POOL_TICK_ARRAY_BITMAP_SEED, poolId.toBuffer()], programId);
}
exports.getPdaExBitmapAccount = getPdaExBitmapAccount;
//# sourceMappingURL=pda.js.map
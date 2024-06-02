import { findProgramAddress, METADATA_PROGRAM_ID } from '../../common';
import { i32ToBytes, u16ToBytes } from './util';
export const AMM_CONFIG_SEED = Buffer.from('amm_config', 'utf8');
export const POOL_SEED = Buffer.from('pool', 'utf8');
export const POOL_VAULT_SEED = Buffer.from('pool_vault', 'utf8');
export const POOL_REWARD_VAULT_SEED = Buffer.from('pool_reward_vault', 'utf8');
export const POSITION_SEED = Buffer.from('position', 'utf8');
export const TICK_ARRAY_SEED = Buffer.from('tick_array', 'utf8');
export const OPERATION_SEED = Buffer.from('operation', 'utf8');
export const POOL_TICK_ARRAY_BITMAP_SEED = Buffer.from('pool_tick_array_bitmap_extension', 'utf8');
export function getPdaAmmConfigId(programId, index) {
    return findProgramAddress([AMM_CONFIG_SEED, u16ToBytes(index)], programId);
}
export function getPdaPoolId(programId, ammConfigId, mintA, mintB) {
    return findProgramAddress([POOL_SEED, ammConfigId.toBuffer(), mintA.toBuffer(), mintB.toBuffer()], programId);
}
export function getPdaPoolVaultId(programId, poolId, vaultMint) {
    return findProgramAddress([POOL_VAULT_SEED, poolId.toBuffer(), vaultMint.toBuffer()], programId);
}
export function getPdaPoolRewardVaulId(programId, poolId, rewardMint) {
    return findProgramAddress([POOL_REWARD_VAULT_SEED, poolId.toBuffer(), rewardMint.toBuffer()], programId);
}
export function getPdaTickArrayAddress(programId, poolId, startIndex) {
    return findProgramAddress([TICK_ARRAY_SEED, poolId.toBuffer(), i32ToBytes(startIndex)], programId);
}
export function getPdaProtocolPositionAddress(programId, poolId, tickLower, tickUpper) {
    return findProgramAddress([POSITION_SEED, poolId.toBuffer(), i32ToBytes(tickLower), i32ToBytes(tickUpper)], programId);
}
export function getPdaPersonalPositionAddress(programId, nftMint) {
    return findProgramAddress([POSITION_SEED, nftMint.toBuffer()], programId);
}
export function getPdaMetadataKey(mint) {
    return findProgramAddress([Buffer.from('metadata', 'utf8'), METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer()], METADATA_PROGRAM_ID);
}
export function getPdaOperationAccount(programId) {
    return findProgramAddress([OPERATION_SEED], programId);
}
export function getPdaExBitmapAccount(programId, poolId) {
    return findProgramAddress([POOL_TICK_ARRAY_BITMAP_SEED, poolId.toBuffer()], programId);
}
//# sourceMappingURL=pda.js.map
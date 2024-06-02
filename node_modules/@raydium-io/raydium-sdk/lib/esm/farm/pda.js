import { findProgramAddress } from '../common';
export function getRegistrarAddress(programId, realm, communityTokenMint) {
    return findProgramAddress([realm.toBuffer(), Buffer.from('registrar', 'utf8'), communityTokenMint.toBuffer()], programId);
}
export function getVotingTokenMint(programId, poolId) {
    return findProgramAddress([poolId.toBuffer(), Buffer.from('voting_mint_seed', 'utf8')], programId);
}
export function getVotingMintAuthority(programId, poolId) {
    return findProgramAddress([poolId.toBuffer()], programId);
}
export function getVoterAddress(programId, registrar, authority) {
    return findProgramAddress([registrar.toBuffer(), Buffer.from('voter', 'utf8'), authority.toBuffer()], programId);
}
export function getVoterWeightRecordAddress(programId, registrar, authority) {
    return findProgramAddress([registrar.toBuffer(), Buffer.from('voter-weight-record', 'utf8'), authority.toBuffer()], programId);
}
export function getTokenOwnerRecordAddress(programId, realm, governingTokenMint, governingTokenOwner) {
    return findProgramAddress([
        Buffer.from('governance', 'utf8'),
        realm.toBuffer(),
        governingTokenMint.toBuffer(),
        governingTokenOwner.toBuffer(),
    ], programId);
}
//# sourceMappingURL=pda.js.map
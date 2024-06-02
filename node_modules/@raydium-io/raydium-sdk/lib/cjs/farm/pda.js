"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTokenOwnerRecordAddress = exports.getVoterWeightRecordAddress = exports.getVoterAddress = exports.getVotingMintAuthority = exports.getVotingTokenMint = exports.getRegistrarAddress = void 0;
const common_1 = require("../common");
function getRegistrarAddress(programId, realm, communityTokenMint) {
    return (0, common_1.findProgramAddress)([realm.toBuffer(), Buffer.from('registrar', 'utf8'), communityTokenMint.toBuffer()], programId);
}
exports.getRegistrarAddress = getRegistrarAddress;
function getVotingTokenMint(programId, poolId) {
    return (0, common_1.findProgramAddress)([poolId.toBuffer(), Buffer.from('voting_mint_seed', 'utf8')], programId);
}
exports.getVotingTokenMint = getVotingTokenMint;
function getVotingMintAuthority(programId, poolId) {
    return (0, common_1.findProgramAddress)([poolId.toBuffer()], programId);
}
exports.getVotingMintAuthority = getVotingMintAuthority;
function getVoterAddress(programId, registrar, authority) {
    return (0, common_1.findProgramAddress)([registrar.toBuffer(), Buffer.from('voter', 'utf8'), authority.toBuffer()], programId);
}
exports.getVoterAddress = getVoterAddress;
function getVoterWeightRecordAddress(programId, registrar, authority) {
    return (0, common_1.findProgramAddress)([registrar.toBuffer(), Buffer.from('voter-weight-record', 'utf8'), authority.toBuffer()], programId);
}
exports.getVoterWeightRecordAddress = getVoterWeightRecordAddress;
function getTokenOwnerRecordAddress(programId, realm, governingTokenMint, governingTokenOwner) {
    return (0, common_1.findProgramAddress)([
        Buffer.from('governance', 'utf8'),
        realm.toBuffer(),
        governingTokenMint.toBuffer(),
        governingTokenOwner.toBuffer(),
    ], programId);
}
exports.getTokenOwnerRecordAddress = getTokenOwnerRecordAddress;
//# sourceMappingURL=pda.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.voterStakeRegistryWithdraw = exports.voterStakeRegistryUpdateVoterWeightRecord = exports.voterStakeRegistryDeposit = exports.voterStakeRegistryCreateDepositEntry = exports.voterStakeRegistryCreateVoter = exports.governanceCreateTokenOwnerRecord = void 0;
const web3_js_1 = require("@solana/web3.js");
const common_1 = require("../common");
const entity_1 = require("../entity");
const marshmallow_1 = require("../marshmallow");
const anchorDataBuf = {
    voterStakeRegistryCreateVoter: Buffer.from([6, 24, 245, 52, 243, 255, 148, 25]), // CreateVoter
    voterStakeRegistryCreateDepositEntry: Buffer.from([185, 131, 167, 186, 159, 125, 19, 67]), // CreateDepositEntry
    voterStakeRegistryDeposit: Buffer.from([242, 35, 198, 137, 82, 225, 242, 182]), // Deposit
    voterStakeRegistryWithdraw: Buffer.from([183, 18, 70, 156, 148, 109, 161, 34]), // Withdraw
    voterStakeRegistryUpdateVoterWeightRecord: Buffer.from([45, 185, 3, 36, 109, 190, 115, 169]), // UpdateVoterWeightRecord
};
function governanceCreateTokenOwnerRecord(programId, realm, governingTokenOwner, governingTokenMint, payer, tokenOwnerRecordAddress) {
    const dataLayout = (0, marshmallow_1.struct)([(0, marshmallow_1.u8)('ins')]);
    const keys = [
        (0, common_1.AccountMetaReadonly)(realm, false),
        (0, common_1.AccountMetaReadonly)(governingTokenOwner, false),
        (0, common_1.AccountMeta)(tokenOwnerRecordAddress, false),
        (0, common_1.AccountMetaReadonly)(governingTokenMint, false),
        (0, common_1.AccountMeta)(payer, true),
        (0, common_1.AccountMetaReadonly)(common_1.SYSTEM_PROGRAM_ID, false),
    ];
    const data = Buffer.alloc(dataLayout.span);
    dataLayout.encode({ ins: 23 }, data);
    return new web3_js_1.TransactionInstruction({
        keys,
        programId,
        data,
    });
}
exports.governanceCreateTokenOwnerRecord = governanceCreateTokenOwnerRecord;
function voterStakeRegistryCreateVoter(programId, registrar, voter, voterWeightRecord, voterAuthority, payer, voterBump, voterWeightRecordBump) {
    const dataLayout = (0, marshmallow_1.struct)([(0, marshmallow_1.u8)('voterBump'), (0, marshmallow_1.u8)('voterWeightRecordBump')]);
    const keys = [
        (0, common_1.AccountMetaReadonly)(registrar, false),
        (0, common_1.AccountMeta)(voter, false),
        (0, common_1.AccountMetaReadonly)(voterAuthority, true),
        (0, common_1.AccountMeta)(voterWeightRecord, false),
        (0, common_1.AccountMeta)(payer, true),
        (0, common_1.AccountMetaReadonly)(common_1.SYSTEM_PROGRAM_ID, false),
        (0, common_1.AccountMetaReadonly)(common_1.RENT_PROGRAM_ID, false),
        (0, common_1.AccountMetaReadonly)(common_1.INSTRUCTION_PROGRAM_ID, false),
    ];
    const data = Buffer.alloc(dataLayout.span);
    dataLayout.encode({ voterBump, voterWeightRecordBump }, data);
    const aData = Buffer.from([...anchorDataBuf.voterStakeRegistryCreateVoter, ...data]);
    return new web3_js_1.TransactionInstruction({
        keys,
        programId,
        data: aData,
    });
}
exports.voterStakeRegistryCreateVoter = voterStakeRegistryCreateVoter;
function voterStakeRegistryCreateDepositEntry(programId, registrar, voter, voterVault, voterAuthority, payer, depositMint, depositEntryIndex, kind, startTs, periods, allowClawback) {
    const dataLayout = (0, marshmallow_1.struct)([
        (0, marshmallow_1.u8)('depositEntryIndex'),
        (0, marshmallow_1.u8)('kind'),
        (0, marshmallow_1.u8)('option'),
        (0, marshmallow_1.u64)('startTs'),
        (0, marshmallow_1.u32)('periods'),
        (0, marshmallow_1.bool)('allowClawback'),
    ]);
    const keys = [
        (0, common_1.AccountMetaReadonly)(registrar, false),
        (0, common_1.AccountMeta)(voter, false),
        (0, common_1.AccountMeta)(voterVault, false),
        (0, common_1.AccountMetaReadonly)(voterAuthority, true),
        (0, common_1.AccountMeta)(payer, true),
        (0, common_1.AccountMetaReadonly)(depositMint, false),
        (0, common_1.AccountMetaReadonly)(common_1.SYSTEM_PROGRAM_ID, false),
        (0, common_1.AccountMetaReadonly)(common_1.TOKEN_PROGRAM_ID, false),
        (0, common_1.AccountMetaReadonly)(common_1.ASSOCIATED_TOKEN_PROGRAM_ID, false),
        (0, common_1.AccountMetaReadonly)(common_1.RENT_PROGRAM_ID, false),
    ];
    const data = Buffer.alloc(dataLayout.span);
    dataLayout.encode({
        depositEntryIndex,
        kind,
        option: startTs === undefined ? 0 : 1,
        startTs: startTs !== null && startTs !== void 0 ? startTs : entity_1.ZERO,
        periods,
        allowClawback,
    }, data);
    const aData = Buffer.from([...anchorDataBuf.voterStakeRegistryCreateDepositEntry, ...data]);
    return new web3_js_1.TransactionInstruction({
        keys,
        programId,
        data: aData,
    });
}
exports.voterStakeRegistryCreateDepositEntry = voterStakeRegistryCreateDepositEntry;
function voterStakeRegistryDeposit(programId, registrar, voter, voterVault, depositToken, depositAuthority, userStakerInfoV2, pool, votingMint, votingMintAuthority, stakeProgramId, depositEntryIndex, amount) {
    const dataLayout = (0, marshmallow_1.struct)([(0, marshmallow_1.u8)('depositEntryIndex'), (0, marshmallow_1.u64)('amount')]);
    const keys = [
        (0, common_1.AccountMetaReadonly)(registrar, false),
        (0, common_1.AccountMeta)(voter, false),
        (0, common_1.AccountMeta)(voterVault, false),
        (0, common_1.AccountMeta)(depositToken, false),
        (0, common_1.AccountMetaReadonly)(depositAuthority, true),
        (0, common_1.AccountMetaReadonly)(common_1.TOKEN_PROGRAM_ID, false),
        (0, common_1.AccountMeta)(userStakerInfoV2, false),
        (0, common_1.AccountMetaReadonly)(pool, false),
        (0, common_1.AccountMeta)(votingMint, false),
        (0, common_1.AccountMetaReadonly)(votingMintAuthority, false),
        (0, common_1.AccountMetaReadonly)(stakeProgramId, false),
        (0, common_1.AccountMetaReadonly)(common_1.INSTRUCTION_PROGRAM_ID, false),
    ];
    const data = Buffer.alloc(dataLayout.span);
    dataLayout.encode({
        depositEntryIndex,
        amount,
    }, data);
    const aData = Buffer.from([...anchorDataBuf.voterStakeRegistryDeposit, ...data]);
    return new web3_js_1.TransactionInstruction({
        keys,
        programId,
        data: aData,
    });
}
exports.voterStakeRegistryDeposit = voterStakeRegistryDeposit;
function voterStakeRegistryUpdateVoterWeightRecord(programId, registrar, voter, voterWeightRecord) {
    const dataLayout = (0, marshmallow_1.struct)([]);
    const keys = [
        (0, common_1.AccountMetaReadonly)(registrar, false),
        (0, common_1.AccountMetaReadonly)(voter, false),
        (0, common_1.AccountMeta)(voterWeightRecord, false),
        (0, common_1.AccountMetaReadonly)(common_1.SYSTEM_PROGRAM_ID, false),
    ];
    const data = Buffer.alloc(dataLayout.span);
    dataLayout.encode({}, data);
    const aData = Buffer.from([...anchorDataBuf.voterStakeRegistryUpdateVoterWeightRecord, ...data]);
    return new web3_js_1.TransactionInstruction({
        keys,
        programId,
        data: aData,
    });
}
exports.voterStakeRegistryUpdateVoterWeightRecord = voterStakeRegistryUpdateVoterWeightRecord;
function voterStakeRegistryWithdraw(programId, registrar, voter, voterAuthority, tokenOwnerRecord, voterWeightRecord, vault, destination, userStakerInfoV2, pool, votingMint, votingMintAuthority, stakeProgramId, depositEntryIndex, amount) {
    const dataLayout = (0, marshmallow_1.struct)([(0, marshmallow_1.u8)('depositEntryIndex'), (0, marshmallow_1.u64)('amount')]);
    const keys = [
        (0, common_1.AccountMetaReadonly)(registrar, false),
        (0, common_1.AccountMeta)(voter, false),
        (0, common_1.AccountMetaReadonly)(voterAuthority, true),
        (0, common_1.AccountMetaReadonly)(tokenOwnerRecord, false),
        (0, common_1.AccountMeta)(voterWeightRecord, false),
        (0, common_1.AccountMeta)(vault, false),
        (0, common_1.AccountMeta)(destination, false),
        (0, common_1.AccountMetaReadonly)(common_1.TOKEN_PROGRAM_ID, false),
        (0, common_1.AccountMeta)(userStakerInfoV2, false),
        (0, common_1.AccountMetaReadonly)(pool, false),
        (0, common_1.AccountMeta)(votingMint, false),
        (0, common_1.AccountMetaReadonly)(votingMintAuthority, false),
        (0, common_1.AccountMetaReadonly)(stakeProgramId, false),
        (0, common_1.AccountMetaReadonly)(common_1.INSTRUCTION_PROGRAM_ID, false),
    ];
    const data = Buffer.alloc(dataLayout.span);
    dataLayout.encode({
        depositEntryIndex,
        amount,
    }, data);
    const aData = Buffer.from([...anchorDataBuf.voterStakeRegistryWithdraw, ...data]);
    return new web3_js_1.TransactionInstruction({
        keys,
        programId,
        data: aData,
    });
}
exports.voterStakeRegistryWithdraw = voterStakeRegistryWithdraw;
//# sourceMappingURL=importInstruction.js.map
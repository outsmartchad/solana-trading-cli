var _a;
import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import BN from 'bn.js';
import { Base, InstructionType } from '../base';
import { TOKEN_PROGRAM_ID, findProgramAddress, getMultipleAccountsInfo, splitTxAndSigners } from '../common';
import { Token } from '../entity';
import { blob, publicKey, seq, struct, u64, u8 } from '../marshmallow';
export class Utils1216 extends Base {
    // pda
    static getPdaPoolId(programId, ammId) {
        return findProgramAddress([this.SEED_CONFIG.pool.id, ammId.toBuffer()], programId);
    }
    static getPdaOwnerId(programId, poolId, owner, version) {
        return findProgramAddress([
            this.SEED_CONFIG.owner.id,
            poolId.toBuffer(),
            owner.toBuffer(),
            // new BN(version).toBuffer()
            Buffer.from(new BN(version).toArray()),
        ], programId);
    }
    static async getAllInfo({ connection, programId, poolIds, wallet, chainTime, }) {
        if (poolIds.length === 0)
            return [];
        const allPoolPda = poolIds.map((id) => this.getPdaPoolId(programId, id).publicKey);
        const allOwnerPda = [];
        for (let itemVersion = 0; itemVersion < this.VERSION_PROJECT.length; itemVersion++) {
            allOwnerPda.push(...allPoolPda.map((id) => this.getPdaOwnerId(programId, id, wallet, itemVersion).publicKey));
        }
        const pdaInfo = await getMultipleAccountsInfo(connection, [...allPoolPda, ...allOwnerPda]);
        const info = [];
        for (let index = 0; index < pdaInfo.length; index++) {
            const version = Math.floor(index / poolIds.length);
            const i = index % poolIds.length;
            const itemPoolId = allPoolPda[i];
            const itemOwnerId = allOwnerPda[index];
            const itemPoolInfoS = pdaInfo[i];
            const itemOwnerInfoS = pdaInfo[poolIds.length + index];
            if (!(itemPoolInfoS && itemOwnerInfoS))
                continue;
            if (itemPoolInfoS.data.length !== this.POOL_LAYOUT.span || itemOwnerInfoS.data.length !== this.OWNER_LAYOUT.span)
                continue;
            const itemPoolInfo = this.POOL_LAYOUT.decode(itemPoolInfoS.data);
            const itemOwnerInfo = this.OWNER_LAYOUT.decode(itemOwnerInfoS.data);
            const openTime = itemPoolInfo.openTime.toNumber();
            const endTime = itemPoolInfo.endTime.toNumber();
            const hasCanClaimToken = itemOwnerInfo.tokenInfo.map((i) => i.debtAmount.gt(new BN(0))).filter((i) => !i).length !== 3;
            const inCanClaimTime = chainTime > openTime && chainTime < endTime && itemPoolInfo.status === 1;
            const canClaim = hasCanClaimToken && inCanClaimTime;
            info.push({
                programId,
                poolId: itemPoolId,
                ammId: itemPoolInfo.ammId,
                ownerAccountId: itemOwnerId,
                snapshotLpAmount: itemOwnerInfo.lpAmount,
                project: this.VERSION_PROJECT[version],
                openTime,
                endTime,
                canClaim,
                canClaimErrorType: !hasCanClaimToken ? 'alreadyClaimIt' : !inCanClaimTime ? 'outOfOperationalTime' : undefined,
                tokenInfo: itemPoolInfo.tokenInfo.map((itemPoolToken, i) => ({
                    programId: TOKEN_PROGRAM_ID,
                    mintAddress: itemPoolToken.mintAddress,
                    mintVault: itemPoolToken.mintVault,
                    mintDecimals: itemPoolToken.mintDecimals,
                    perLpLoss: itemPoolToken.perLpLoss,
                    debtAmount: itemOwnerInfo.tokenInfo[i].debtAmount.add(itemOwnerInfo.tokenInfo[i].claimedAmount),
                })),
            });
        }
        return info;
    }
    static async makeClaimInstructionSimple({ connection, poolInfo, ownerInfo, makeTxVersion, lookupTableCache, }) {
        const frontInstructions = [];
        const frontInstructionsType = [];
        const endInstructions = [];
        const endInstructionsType = [];
        const instructions = [];
        const instructionsType = [];
        const signers = [];
        const ownerVaultList = [];
        for (const itemToken of poolInfo.tokenInfo) {
            ownerVaultList.push(await this._selectOrCreateTokenAccount({
                programId: itemToken.programId,
                mint: itemToken.mintAddress,
                tokenAccounts: itemToken.mintAddress.equals(Token.WSOL.mint) ? [] : ownerInfo.tokenAccounts,
                owner: ownerInfo.wallet,
                createInfo: {
                    connection,
                    payer: ownerInfo.wallet,
                    amount: 0,
                    frontInstructions,
                    endInstructions: itemToken.mintAddress.equals(Token.WSOL.mint) ? endInstructions : [],
                    frontInstructionsType,
                    endInstructionsType,
                    signers,
                },
                associatedOnly: itemToken.mintAddress.equals(Token.WSOL.mint) ? false : ownerInfo.associatedOnly,
                checkCreateATAOwner: ownerInfo.checkCreateATAOwner,
            }));
        }
        instructions.push(this.makeClaimInstruction({
            programId: poolInfo.programId,
            poolInfo,
            ownerInfo: {
                wallet: ownerInfo.wallet,
                ownerPda: poolInfo.ownerAccountId,
                claimAddress: ownerVaultList,
            },
        }));
        instructionsType.push(InstructionType.util1216OwnerClaim);
        return {
            address: {},
            innerTransactions: await splitTxAndSigners({
                connection,
                makeTxVersion,
                computeBudgetConfig: undefined,
                payer: ownerInfo.wallet,
                innerTransaction: [
                    { instructionTypes: frontInstructionsType, instructions: frontInstructions, signers },
                    { instructionTypes: instructionsType, instructions, signers: [] },
                    { instructionTypes: endInstructionsType, instructions: endInstructions, signers: [] },
                ],
                lookupTableCache,
            }),
        };
    }
    static async makeClaimAllInstructionSimple({ connection, poolInfos, ownerInfo, makeTxVersion, lookupTableCache, }) {
        const frontInstructions = [];
        const frontInstructionsType = [];
        const endInstructions = [];
        const endInstructionsType = [];
        const instructions = [];
        const instructionsType = [];
        const signers = [];
        const tempNewVault = {};
        for (const poolInfo of poolInfos) {
            const ownerVaultList = [];
            for (const itemToken of poolInfo.tokenInfo) {
                const tempVault = tempNewVault[itemToken.mintAddress.toString()] ??
                    (await this._selectOrCreateTokenAccount({
                        programId: itemToken.programId,
                        mint: itemToken.mintAddress,
                        tokenAccounts: itemToken.mintAddress.equals(Token.WSOL.mint) ? [] : ownerInfo.tokenAccounts,
                        owner: ownerInfo.wallet,
                        createInfo: {
                            connection,
                            payer: ownerInfo.wallet,
                            amount: 0,
                            frontInstructions,
                            endInstructions: itemToken.mintAddress.equals(Token.WSOL.mint) ? endInstructions : [],
                            frontInstructionsType,
                            endInstructionsType,
                            signers,
                        },
                        associatedOnly: itemToken.mintAddress.equals(Token.WSOL.mint) ? false : ownerInfo.associatedOnly,
                        checkCreateATAOwner: ownerInfo.checkCreateATAOwner,
                    }));
                tempNewVault[itemToken.mintAddress.toString()] = tempVault;
                ownerVaultList.push(tempVault);
            }
            instructions.push(this.makeClaimInstruction({
                programId: poolInfo.programId,
                poolInfo,
                ownerInfo: {
                    wallet: ownerInfo.wallet,
                    ownerPda: poolInfo.ownerAccountId,
                    claimAddress: ownerVaultList,
                },
            }));
            instructionsType.push(InstructionType.util1216OwnerClaim);
        }
        return {
            address: {},
            innerTransactions: await splitTxAndSigners({
                connection,
                makeTxVersion,
                computeBudgetConfig: undefined,
                payer: ownerInfo.wallet,
                innerTransaction: [
                    { instructionTypes: frontInstructionsType, instructions: frontInstructions, signers },
                    { instructionTypes: instructionsType, instructions, signers: [] },
                    { instructionTypes: endInstructionsType, instructions: endInstructions, signers: [] },
                ],
                lookupTableCache,
            }),
        };
    }
    static makeClaimInstruction({ programId, poolInfo, ownerInfo, }) {
        const dataLayout = struct([]);
        const keys = [
            { pubkey: ownerInfo.wallet, isSigner: true, isWritable: true },
            { pubkey: poolInfo.poolId, isSigner: false, isWritable: true },
            { pubkey: ownerInfo.ownerPda, isSigner: false, isWritable: true },
            ...ownerInfo.claimAddress.map((i) => ({ pubkey: i, isSigner: false, isWritable: true })),
            ...poolInfo.tokenInfo.map(({ mintVault }) => ({ pubkey: mintVault, isSigner: false, isWritable: true })),
            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        ];
        const data = Buffer.alloc(dataLayout.span);
        dataLayout.encode({}, data);
        const aData = Buffer.from([...[10, 66, 208, 184, 161, 6, 191, 98], ...data]);
        return new TransactionInstruction({
            keys,
            programId,
            data: aData,
        });
    }
}
_a = Utils1216;
Utils1216.CLAIMED_NUM = 3;
Utils1216.POOL_LAYOUT = struct([
    blob(8),
    u8('bump'),
    u8('status'),
    u64('openTime'),
    u64('endTime'),
    publicKey('ammId'),
    seq(struct([
        u8('mintDecimals'),
        publicKey('mintAddress'),
        publicKey('mintVault'),
        u64('perLpLoss'),
        u64('totalClaimedAmount'),
    ]), _a.CLAIMED_NUM, 'tokenInfo'),
    seq(u64(), 10, 'padding'),
]);
Utils1216.OWNER_LAYOUT = struct([
    blob(8),
    u8('bump'),
    u8('version'),
    publicKey('poolId'),
    publicKey('owner'),
    u64('lpAmount'),
    seq(struct([publicKey('mintAddress'), u64('debtAmount'), u64('claimedAmount')]), _a.CLAIMED_NUM, 'tokenInfo'),
    seq(u64(), 4, 'padding'),
]);
Utils1216.DEFAULT_POOL_ID = [
    '58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2',
    '6UmmUiYoBjSrhakAobJw8BvkmJtDVxaeBtbt7rxWo1mg',
    'AVs9TA4nWDzfPJE9gGVNJMVhcQy3V9PGazuz33BfG2RA',
    'DVa7Qmb5ct9RCpaU7UTpSaf3GVMYz17vNVU67XpdCRut',
    '7XawhbbxtsRcQA8KTkHT9f9nc6d69UwqCDh6U5EEbEmX',
    '6a1CsrpeZubDjEJE9s1CMVheB6HWM5d7m1cj2jkhyXhj',
    'EoNrn8iUhwgJySD1pHu8Qxm5gSQqLK3za4m8xzD2RuEb',
    'AceAyRTWt4PyB2pHqf2qhDgNZDtKVNaxgL8Ru3V4aN1P',
    '6tmFJbMk5yVHFcFy7X2K8RwHjKLr6KVFLYXpgpBNeAxB',
].map((i) => new PublicKey(i));
Utils1216.SEED_CONFIG = {
    pool: {
        id: Buffer.from('pool_seed', 'utf8'),
    },
    owner: {
        id: Buffer.from('user_claim_seed', 'utf8'),
    },
};
Utils1216.VERSION_PROJECT = [undefined, 'Francium', 'Tulip', 'Larix'];
//# sourceMappingURL=utils1216.js.map
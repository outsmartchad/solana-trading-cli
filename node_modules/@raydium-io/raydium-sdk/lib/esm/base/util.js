import { getTransferFeeConfig, unpackMint } from '@solana/spl-token';
import { PublicKey, Transaction, TransactionMessage, VersionedTransaction, } from '@solana/web3.js';
import BN from 'bn.js';
import { getMultipleAccountsInfoWithCustomFlags, getMultipleLookupTableInfo, splitTxAndSigners, TOKEN_PROGRAM_ID, } from '../common';
import { ONE, ZERO } from '../entity';
import { Spl } from '../spl';
import { WSOL } from '../token';
import { InstructionType, TxVersion } from './type';
export function getWSOLAmount({ tokenAccounts }) {
    const WSOL_MINT = new PublicKey(WSOL.mint);
    const amounts = tokenAccounts.filter((i) => i.accountInfo.mint.equals(WSOL_MINT)).map((i) => i.accountInfo.amount);
    const amount = amounts.reduce((a, b) => a.add(b), new BN(0));
    return amount;
}
export async function unwarpSol({ ownerInfo, tokenAccounts, makeTxVersion, connection, }) {
    const WSOL_MINT = new PublicKey(WSOL.mint);
    const instructionsInfo = tokenAccounts
        .filter((i) => i.accountInfo.mint.equals(WSOL_MINT))
        .map((i) => ({
        amount: i.accountInfo.amount,
        tx: Spl.makeCloseAccountInstruction({
            programId: TOKEN_PROGRAM_ID,
            tokenAccount: i.pubkey,
            owner: ownerInfo.wallet,
            payer: ownerInfo.payer,
            instructionsType: [],
        }),
    }));
    return {
        address: {},
        innerTransactions: await splitTxAndSigners({
            connection,
            makeTxVersion,
            payer: ownerInfo.payer,
            innerTransaction: instructionsInfo.map((i) => ({
                instructionTypes: [InstructionType.closeAccount],
                instructions: [i.tx],
                signers: [],
            })),
        }),
    };
}
export async function buildSimpleTransaction({ connection, makeTxVersion, payer, innerTransactions, recentBlockhash, addLookupTableInfo, }) {
    if (makeTxVersion !== TxVersion.V0 && makeTxVersion !== TxVersion.LEGACY)
        throw Error(' make tx version args error');
    const _recentBlockhash = recentBlockhash ?? (await connection.getLatestBlockhash()).blockhash;
    const txList = [];
    for (const itemIx of innerTransactions) {
        txList.push(_makeTransaction({
            makeTxVersion,
            instructions: itemIx.instructions,
            payer,
            recentBlockhash: _recentBlockhash,
            signers: itemIx.signers,
            lookupTableInfos: Object.values({
                ...(addLookupTableInfo ?? {}),
                ...(itemIx.lookupTableAddress ?? {}),
            }),
        }));
    }
    return txList;
}
export async function buildTransaction({ connection, makeTxVersion, payer, innerTransactions, recentBlockhash, lookupTableCache, }) {
    if (makeTxVersion !== TxVersion.V0 && makeTxVersion !== TxVersion.LEGACY)
        throw Error(' make tx version args error');
    const _recentBlockhash = recentBlockhash ?? (await connection.getLatestBlockhash()).blockhash;
    const _lookupTableCache = lookupTableCache ?? {};
    const lta = [
        ...new Set([
            ...innerTransactions
                .map((i) => i.lookupTableAddress ?? [])
                .flat()
                .map((i) => i.toString()),
        ]),
    ];
    const needCacheLTA = [];
    for (const item of lta) {
        if (_lookupTableCache[item] === undefined) {
            needCacheLTA.push(new PublicKey(item));
        }
    }
    const lookupTableAccountsCache = needCacheLTA.length > 0 ? await getMultipleLookupTableInfo({ connection, address: needCacheLTA }) : {};
    for (const [key, value] of Object.entries(lookupTableAccountsCache)) {
        _lookupTableCache[key] = value;
    }
    const txList = [];
    for (const itemIx of innerTransactions) {
        const _itemLTA = {};
        if (makeTxVersion === TxVersion.V0) {
            for (const item of itemIx.lookupTableAddress ?? []) {
                _itemLTA[item.toString()] = _lookupTableCache[item.toString()];
            }
        }
        txList.push(_makeTransaction({
            makeTxVersion,
            instructions: itemIx.instructions,
            payer,
            recentBlockhash: _recentBlockhash,
            signers: itemIx.signers,
            lookupTableInfos: Object.values(_itemLTA),
        }));
    }
    return txList;
}
function _makeTransaction({ makeTxVersion, instructions, payer, recentBlockhash, signers, lookupTableInfos, }) {
    if (makeTxVersion === TxVersion.LEGACY) {
        const tx = new Transaction();
        tx.add(...instructions);
        tx.feePayer = payer;
        tx.recentBlockhash = recentBlockhash;
        if (signers.length > 0)
            tx.sign(...signers);
        return tx;
    }
    else if (makeTxVersion === TxVersion.V0) {
        const transactionMessage = new TransactionMessage({
            payerKey: payer,
            recentBlockhash,
            instructions,
        });
        const itemV = new VersionedTransaction(transactionMessage.compileToV0Message(lookupTableInfos));
        itemV.sign(signers);
        return itemV;
    }
    else {
        throw Error(' make tx version check error ');
    }
}
const POINT = 10000;
export function getTransferAmountFee(amount, feeConfig, epochInfo, addFee) {
    if (feeConfig === undefined) {
        return {
            amount,
            fee: undefined,
            expirationTime: undefined,
        };
    }
    const nowFeeConfig = epochInfo.epoch < feeConfig.newerTransferFee.epoch ? feeConfig.olderTransferFee : feeConfig.newerTransferFee;
    const maxFee = new BN(nowFeeConfig.maximumFee.toString());
    const expirationTime = epochInfo.epoch < feeConfig.newerTransferFee.epoch
        ? ((Number(feeConfig.newerTransferFee.epoch) * epochInfo.slotsInEpoch - epochInfo.absoluteSlot) * 400) / 1000
        : undefined;
    if (addFee) {
        if (nowFeeConfig.transferFeeBasisPoints === POINT) {
            const nowMaxFee = new BN(nowFeeConfig.maximumFee.toString());
            return {
                amount: amount.add(nowMaxFee),
                fee: nowMaxFee,
                expirationTime,
            };
        }
        else {
            const _TAmount = BNDivCeil(amount.mul(new BN(POINT)), new BN(POINT - nowFeeConfig.transferFeeBasisPoints));
            const nowMaxFee = new BN(nowFeeConfig.maximumFee.toString());
            const TAmount = _TAmount.sub(amount).gt(nowMaxFee) ? amount.add(nowMaxFee) : _TAmount;
            const _fee = BNDivCeil(TAmount.mul(new BN(nowFeeConfig.transferFeeBasisPoints)), new BN(POINT));
            const fee = _fee.gt(maxFee) ? maxFee : _fee;
            return {
                amount: TAmount,
                fee,
                expirationTime,
            };
        }
    }
    else {
        const _fee = BNDivCeil(amount.mul(new BN(nowFeeConfig.transferFeeBasisPoints)), new BN(POINT));
        const fee = _fee.gt(maxFee) ? maxFee : _fee;
        return {
            amount,
            fee,
            expirationTime,
        };
    }
}
export function minExpirationTime(expirationTime1, expirationTime2) {
    if (expirationTime1 === undefined)
        return expirationTime2;
    if (expirationTime2 === undefined)
        return expirationTime1;
    return Math.min(expirationTime1, expirationTime2);
}
export async function fetchMultipleMintInfos({ connection, mints }) {
    if (mints.length === 0)
        return {};
    const mintInfos = await getMultipleAccountsInfoWithCustomFlags(connection, mints.map((i) => ({ pubkey: i })));
    const mintK = {};
    for (const i of mintInfos) {
        const t = unpackMint(i.pubkey, i.accountInfo, i.accountInfo?.owner);
        mintK[i.pubkey.toString()] = {
            ...t,
            feeConfig: getTransferFeeConfig(t) ?? undefined,
        };
    }
    return mintK;
}
export function BNDivCeil(bn1, bn2) {
    const { div, mod } = bn1.divmod(bn2);
    if (mod.gt(ZERO)) {
        return div.add(ONE);
    }
    else {
        return div;
    }
}
//# sourceMappingURL=util.js.map
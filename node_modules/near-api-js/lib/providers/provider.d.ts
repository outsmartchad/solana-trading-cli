/**
 * NEAR RPC API request types and responses
 * @module
 */
import { SignedTransaction } from '../transaction';
export interface SyncInfo {
    latest_block_hash: string;
    latest_block_height: number;
    latest_block_time: string;
    latest_state_root: string;
    syncing: boolean;
}
interface Version {
    version: string;
    build: string;
}
export interface NodeStatusResult {
    chain_id: string;
    rpc_addr: string;
    sync_info: SyncInfo;
    validators: string[];
    version: Version;
}
declare type BlockHash = string;
declare type BlockHeight = number;
export declare type BlockId = BlockHash | BlockHeight;
export declare type Finality = 'optimistic' | 'near-final' | 'final';
export declare type BlockReference = {
    blockId: BlockId;
} | {
    finality: Finality;
} | {
    sync_checkpoint: 'genesis' | 'earliest_available';
};
export declare enum ExecutionStatusBasic {
    Unknown = "Unknown",
    Pending = "Pending",
    Failure = "Failure"
}
export interface ExecutionStatus {
    SuccessValue?: string;
    SuccessReceiptId?: string;
    Failure?: ExecutionError;
}
export declare enum FinalExecutionStatusBasic {
    NotStarted = "NotStarted",
    Started = "Started",
    Failure = "Failure"
}
export interface ExecutionError {
    error_message: string;
    error_type: string;
}
export interface FinalExecutionStatus {
    SuccessValue?: string;
    Failure?: ExecutionError;
}
export interface ExecutionOutcomeWithId {
    id: string;
    outcome: ExecutionOutcome;
}
export interface ExecutionOutcome {
    logs: string[];
    receipt_ids: string[];
    gas_burnt: number;
    status: ExecutionStatus | ExecutionStatusBasic;
}
export interface ExecutionOutcomeWithIdView {
    proof: MerklePath;
    block_hash: string;
    id: string;
    outcome: ExecutionOutcome;
}
export interface FinalExecutionOutcome {
    status: FinalExecutionStatus | FinalExecutionStatusBasic;
    transaction: any;
    transaction_outcome: ExecutionOutcomeWithId;
    receipts_outcome: ExecutionOutcomeWithId[];
}
export interface TotalWeight {
    num: number;
}
export interface BlockHeader {
    height: number;
    epoch_id: string;
    next_epoch_id: string;
    hash: string;
    prev_hash: string;
    prev_state_root: string;
    chunk_receipts_root: string;
    chunk_headers_root: string;
    chunk_tx_root: string;
    outcome_root: string;
    chunks_included: number;
    challenges_root: string;
    timestamp: number;
    timestamp_nanosec: string;
    random_value: string;
    validator_proposals: any[];
    chunk_mask: boolean[];
    gas_price: string;
    rent_paid: string;
    validator_reward: string;
    total_supply: string;
    challenges_result: any[];
    last_final_block: string;
    last_ds_final_block: string;
    next_bp_hash: string;
    block_merkle_root: string;
    approvals: string[];
    signature: string;
    latest_protocol_version: number;
}
export declare type ChunkHash = string;
export declare type ShardId = number;
export declare type BlockShardId = [BlockId, ShardId];
export declare type ChunkId = ChunkHash | BlockShardId;
export interface ChunkHeader {
    balance_burnt: string;
    chunk_hash: ChunkHash;
    encoded_length: number;
    encoded_merkle_root: string;
    gas_limit: number;
    gas_used: number;
    height_created: number;
    height_included: number;
    outgoing_receipts_root: string;
    prev_block_hash: string;
    prev_state_num_parts: number;
    prev_state_root_hash: string;
    rent_paid: string;
    shard_id: number;
    signature: string;
    tx_root: string;
    validator_proposals: any[];
    validator_reward: string;
}
export interface ChunkResult {
    header: ChunkHeader;
    receipts: any[];
    transactions: Transaction[];
}
export interface Chunk {
    chunk_hash: string;
    prev_block_hash: string;
    outcome_root: string;
    prev_state_root: string;
    encoded_merkle_root: string;
    encoded_length: number;
    height_created: number;
    height_included: number;
    shard_id: number;
    gas_used: number;
    gas_limit: number;
    rent_paid: string;
    validator_reward: string;
    balance_burnt: string;
    outgoing_receipts_root: string;
    tx_root: string;
    validator_proposals: any[];
    signature: string;
}
export interface Transaction {
    hash: string;
    public_key: string;
    signature: string;
    body: any;
}
export interface BlockResult {
    author: string;
    header: BlockHeader;
    chunks: Chunk[];
}
export interface BlockChange {
    type: string;
    account_id: string;
}
export interface BlockChangeResult {
    block_hash: string;
    changes: BlockChange[];
}
export interface ChangeResult {
    block_hash: string;
    changes: any[];
}
export interface CurrentEpochValidatorInfo {
    account_id: string;
    public_key: string;
    is_slashed: boolean;
    stake: string;
    shards: number[];
    num_produced_blocks: number;
    num_expected_blocks: number;
}
export interface NextEpochValidatorInfo {
    account_id: string;
    public_key: string;
    stake: string;
    shards: number[];
}
export interface ValidatorStakeView {
    account_id: string;
    public_key: string;
    stake: string;
}
export interface NearProtocolConfig {
    runtime_config: NearProtocolRuntimeConfig;
}
export interface NearProtocolRuntimeConfig {
    storage_amount_per_byte: string;
}
export interface EpochValidatorInfo {
    next_validators: NextEpochValidatorInfo[];
    current_validators: CurrentEpochValidatorInfo[];
    next_fisherman: ValidatorStakeView[];
    current_fisherman: ValidatorStakeView[];
    current_proposals: ValidatorStakeView[];
    prev_epoch_kickout: ValidatorStakeView[];
    epoch_start_height: number;
}
export interface MerkleNode {
    hash: string;
    direction: string;
}
export declare type MerklePath = MerkleNode[];
export interface BlockHeaderInnerLiteView {
    height: number;
    epoch_id: string;
    next_epoch_id: string;
    prev_state_root: string;
    outcome_root: string;
    timestamp: number;
    next_bp_hash: string;
    block_merkle_root: string;
}
export interface LightClientBlockLiteView {
    prev_block_hash: string;
    inner_rest_hash: string;
    inner_lite: BlockHeaderInnerLiteView;
}
export interface LightClientProof {
    outcome_proof: ExecutionOutcomeWithIdView;
    outcome_root_proof: MerklePath;
    block_header_lite: LightClientBlockLiteView;
    block_proof: MerklePath;
}
export declare enum IdType {
    Transaction = "transaction",
    Receipt = "receipt"
}
export interface LightClientProofRequest {
    type: IdType;
    light_client_head: string;
    transaction_hash?: string;
    sender_id?: string;
    receipt_id?: string;
    receiver_id?: string;
}
export interface GasPrice {
    gas_price: string;
}
export interface AccessKeyWithPublicKey {
    account_id: string;
    public_key: string;
}
export interface QueryResponseKind {
    block_height: BlockHeight;
    block_hash: BlockHash;
}
export interface AccountView extends QueryResponseKind {
    amount: string;
    locked: string;
    code_hash: string;
    storage_usage: number;
    storage_paid_at: BlockHeight;
}
interface StateItem {
    key: string;
    value: string;
    proof: string[];
}
export interface ViewStateResult extends QueryResponseKind {
    values: StateItem[];
    proof: string[];
}
export interface CodeResult extends QueryResponseKind {
    result: number[];
    logs: string[];
}
export interface ContractCodeView extends QueryResponseKind {
    code_base64: string;
    hash: string;
}
export interface FunctionCallPermissionView {
    FunctionCall: {
        allowance: string;
        receiver_id: string;
        method_names: string[];
    };
}
export interface AccessKeyView extends QueryResponseKind {
    nonce: number;
    permission: 'FullAccess' | FunctionCallPermissionView;
}
export interface AccessKeyInfoView {
    public_key: string;
    access_key: AccessKeyView;
}
export interface AccessKeyList extends QueryResponseKind {
    keys: AccessKeyInfoView[];
}
export interface ViewAccountRequest {
    request_type: 'view_account';
    account_id: string;
}
export interface ViewCodeRequest {
    request_type: 'view_code';
    account_id: string;
}
export interface ViewStateRequest {
    request_type: 'view_state';
    account_id: string;
    prefix_base64: string;
}
export interface ViewAccessKeyRequest {
    request_type: 'view_access_key';
    account_id: string;
    public_key: string;
}
export interface ViewAccessKeyListRequest {
    request_type: 'view_access_key_list';
    account_id: string;
}
export interface CallFunctionRequest {
    request_type: 'call_function';
    account_id: string;
    method_name: string;
    args_base64: string;
}
export declare type RpcQueryRequest = (ViewAccountRequest | ViewCodeRequest | ViewStateRequest | ViewAccountRequest | ViewAccessKeyRequest | ViewAccessKeyListRequest | CallFunctionRequest) & BlockReference;
/** @hidden */
export declare abstract class Provider {
    abstract status(): Promise<NodeStatusResult>;
    abstract sendTransaction(signedTransaction: SignedTransaction): Promise<FinalExecutionOutcome>;
    abstract sendTransactionAsync(signedTransaction: SignedTransaction): Promise<FinalExecutionOutcome>;
    abstract txStatus(txHash: Uint8Array | string, accountId: string): Promise<FinalExecutionOutcome>;
    abstract txStatusReceipts(txHash: Uint8Array, accountId: string): Promise<FinalExecutionOutcome>;
    abstract query<T extends QueryResponseKind>(params: RpcQueryRequest): Promise<T>;
    abstract query<T extends QueryResponseKind>(path: string, data: string): Promise<T>;
    abstract block(blockQuery: BlockId | BlockReference): Promise<BlockResult>;
    abstract blockChanges(blockQuery: BlockId | BlockReference): Promise<BlockChangeResult>;
    abstract chunk(chunkId: ChunkId): Promise<ChunkResult>;
    abstract validators(blockId: BlockId): Promise<EpochValidatorInfo>;
    abstract experimental_genesisConfig(): Promise<NearProtocolConfig>;
    abstract experimental_protocolConfig(blockReference: BlockReference): Promise<NearProtocolConfig>;
    abstract lightClientProof(request: LightClientProofRequest): Promise<LightClientProof>;
    abstract gasPrice(blockId: BlockId): Promise<GasPrice>;
    abstract accessKeyChanges(accountIdArray: string[], BlockQuery: BlockId | BlockReference): Promise<ChangeResult>;
    abstract singleAccessKeyChanges(accessKeyArray: AccessKeyWithPublicKey[], BlockQuery: BlockId | BlockReference): Promise<ChangeResult>;
    abstract accountChanges(accountIdArray: string[], BlockQuery: BlockId | BlockReference): Promise<ChangeResult>;
    abstract contractStateChanges(accountIdArray: string[], BlockQuery: BlockId | BlockReference, keyPrefix: string): Promise<ChangeResult>;
    abstract contractCodeChanges(accountIdArray: string[], BlockQuery: BlockId | BlockReference): Promise<ChangeResult>;
}
/** @hidden */
export declare function getTransactionLastResult(txResult: FinalExecutionOutcome): any;
export {};

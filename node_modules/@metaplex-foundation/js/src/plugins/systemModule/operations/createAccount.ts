import { Keypair, PublicKey, SystemProgram } from '@solana/web3.js';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import type { Metaplex } from '@/Metaplex';
import {
  assertSol,
  Operation,
  OperationHandler,
  OperationScope,
  Signer,
  SolAmount,
  useOperation,
} from '@/types';
import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';

// -----------------
// Operation
// -----------------

const Key = 'CreateAccountOperation' as const;

/**
 * Creates a new uninitialized Solana account.
 *
 * ```ts
 * const { newAccount } = await metaplex
 *   .system()
 *   .createAccount({ space: 100 }); // 100 bytes
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const createAccountOperation = useOperation<CreateAccountOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type CreateAccountOperation = Operation<
  typeof Key,
  CreateAccountInput,
  CreateAccountOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type CreateAccountInput = {
  /** The space in bytes of the account to create. */
  space: number;

  /**
   * The initial balance of the account.
   *
   * @defaultValue By default, this will be the minumum amount of lamports
   * required for the account to be rent-exempt.
   * i.e. it will be equal to `await metaplex.rpc().getRent(space)`.
   */
  lamports?: SolAmount;

  /**
   * The new account as a Signer since it will be mutated on-chain.
   *
   * @defaultValue Defaults to a new generated Keypair, i.e. `Keypair.generate()`
   */
  newAccount?: Signer;

  /**
   * The address of the program that should own the new account.
   *
   * @defaultValue Defaults to the System Program.
   */
  program?: PublicKey;
};

/**
 * @group Operations
 * @category Outputs
 */
export type CreateAccountOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;

  /** The new account created as a Signer. */
  newAccount: Signer;

  /** The lamports used to initialize the account's balance. */
  lamports: SolAmount;
};

/**
 * @group Operations
 * @category Handlers
 */
export const createAccountOperationHandler: OperationHandler<CreateAccountOperation> =
  {
    async handle(
      operation: CreateAccountOperation,
      metaplex: Metaplex,
      scope: OperationScope
    ): Promise<CreateAccountOutput> {
      const builder = await createAccountBuilder(
        metaplex,
        operation.input,
        scope
      );
      scope.throwIfCanceled();
      return builder.sendAndConfirm(metaplex, scope.confirmOptions);
    },
  };

// -----------------
// Builder
// -----------------

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type CreateAccountBuilderParams = Omit<
  CreateAccountInput,
  'confirmOptions'
> & {
  /** A key to distinguish the instruction that creates the account. */
  instructionKey?: string;
};

/**
 * @group Transaction Builders
 * @category Contexts
 */
export type CreateAccountBuilderContext = Omit<CreateAccountOutput, 'response'>;

/**
 * Creates a new uninitialized Solana account.
 *
 * ```ts
 * const transactionBuilder = await metaplex
 *   .system()
 *   .builders()
 *   .createAccount({ space: 100 }); // 100 bytes
 * ```
 *
 * Note that accessing this transaction builder is asynchronous
 * because we may need to contact the cluster to get the
 * rent-exemption for the provided space.
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const createAccountBuilder = async (
  metaplex: Metaplex,
  params: CreateAccountBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder<CreateAccountBuilderContext>> => {
  const { payer = metaplex.rpc().getDefaultFeePayer() } = options;
  const {
    space,
    newAccount = Keypair.generate(),
    program = SystemProgram.programId,
  } = params;

  const lamports = params.lamports ?? (await metaplex.rpc().getRent(space));
  assertSol(lamports);

  return TransactionBuilder.make<CreateAccountBuilderContext>()
    .setFeePayer(payer)
    .setContext({
      newAccount,
      lamports,
    })
    .add({
      instruction: SystemProgram.createAccount({
        fromPubkey: payer.publicKey,
        newAccountPubkey: newAccount.publicKey,
        space,
        lamports: lamports.basisPoints.toNumber(),
        programId: program,
      }),
      signers: [payer, newAccount],
      key: params.instructionKey ?? 'createAccount',
    });
};

import { createMintInstruction as createMintFromGuardInstruction } from '@metaplex-foundation/mpl-candy-guard';
import { createMintInstruction as createMintFromMachineInstruction } from '@metaplex-foundation/mpl-candy-machine-core';
import {
  Keypair,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  SYSVAR_SLOT_HASHES_PUBKEY,
  TransactionInstruction,
} from '@solana/web3.js';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { CandyMachineBotTaxError } from '../errors';
import {
  CandyGuardsMintSettings,
  CandyGuardsSettings,
  DefaultCandyGuardMintSettings,
  DefaultCandyGuardSettings,
} from '../guards';
import { CandyMachine } from '../models';
import { Option, TransactionBuilder, TransactionBuilderOptions } from '@/utils';
import {
  makeConfirmOptionsFinalizedOnMainnet,
  Operation,
  OperationHandler,
  OperationScope,
  PublicKey,
  Signer,
  token as tokenAmount,
} from '@/types';
import { NftWithToken } from '@/plugins/nftModule';
import { Metaplex } from '@/Metaplex';

// -----------------
// Operation
// -----------------

const Key = 'MintFromCandyMachineOperation' as const;

/**
 * Mints the next NFT from a given candy machine.
 *
 * ```ts
 * const { nft } = await metaplex
 *   .candyMachines()
 *   .mint({
 *     candyMachine,
 *     collectionUpdateAuthority,
 *   };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const mintFromCandyMachineOperation = _mintFromCandyMachineOperation;
// eslint-disable-next-line @typescript-eslint/naming-convention
function _mintFromCandyMachineOperation<
  Settings extends CandyGuardsSettings = DefaultCandyGuardSettings,
  MintSettings extends CandyGuardsMintSettings = DefaultCandyGuardMintSettings
>(
  input: MintFromCandyMachineInput<Settings, MintSettings>
): MintFromCandyMachineOperation<Settings, MintSettings> {
  return { key: Key, input };
}
_mintFromCandyMachineOperation.key = Key;

/**
 * @group Operations
 * @category Types
 */
export type MintFromCandyMachineOperation<
  Settings extends CandyGuardsSettings = DefaultCandyGuardSettings,
  MintSettings extends CandyGuardsMintSettings = DefaultCandyGuardMintSettings
> = Operation<
  typeof Key,
  MintFromCandyMachineInput<Settings, MintSettings>,
  MintFromCandyMachineOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type MintFromCandyMachineInput<
  Settings extends CandyGuardsSettings = DefaultCandyGuardSettings,
  MintSettings extends CandyGuardsMintSettings = DefaultCandyGuardMintSettings
> = {
  /**
   * The Candy Machine to mint from.
   * We only need a subset of the `CandyMachine` model but we
   * need enough information regarding its settings to know how
   * to mint from it.
   *
   * This includes its address, the address of its Collection NFT and,
   * optionally, the Candy Guard account associated with it.
   */
  candyMachine: Pick<
    CandyMachine<Settings>,
    'address' | 'collectionMintAddress' | 'candyGuard'
  >;

  /**
   * The address of the update authority of the Collection NFT
   * that is being assigned to each minted NFT.
   */
  collectionUpdateAuthority: PublicKey;

  /**
   * The authority that is allowed to mint NFTs from the Candy Machine.
   *
   * @defaultValue
   * `metaplex.identity()` if the Candy Machine has no associated Candy Guard.
   * Otherwise, this parameter will be ignored.
   */
  mintAuthority?: Signer;

  /**
   * The mint account to create as a Signer.
   * This expects a brand new Keypair with no associated account.
   *
   * @defaultValue `Keypair.generate()`
   */
  mint?: Signer;

  /**
   * The owner of the minted NFT.
   *
   * Defaults to the wallet that is paying for it, i.e. `payer`.
   *
   * @defaultValue `payer.publicKey`
   */
  owner?: PublicKey;

  /**
   * The new token account to create as a Signer.
   *
   * This property would typically be ignored as, by default, it will create a
   * associated token account from the `owner` and `mint` properties.
   *
   * When provided, the `owner` property will be ignored.
   *
   * @defaultValue associated token address of `owner` and `mint`.
   */
  token?: Signer;

  /**
   * The label of the group to mint from.
   *
   * If groups are configured on the Candy Machine,
   * you must specify a group label to mint from.
   *
   * When set to `null` it will mint using the default
   * guards, provided no groups are configured.
   *
   * @defaultValue `null`
   */
  group?: Option<string>;

  /**
   * Guard-specific data required to mint from the Candy Machine.
   *
   * Some guards require additional data to be provided at mint time.
   * For instance, the `allowList` guard will require a Merkle proof
   * ensuring the minting address is allowed to mint.
   *
   * You only need to provide configuration data for the guards
   * that are set up within the group your are minting from.
   *
   * @defaultValue `{}`
   */
  guards?: Partial<MintSettings>;
};

/**
 * @group Operations
 * @category Outputs
 */
export type MintFromCandyMachineOutput = {
  /** The minted NFT. */
  nft: NftWithToken;

  /** The mint account of the minted NFT as a Signer. */
  mintSigner: Signer;

  /** The address of the minted NFT's token account. */
  tokenAddress: PublicKey;

  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const mintFromCandyMachineOperationHandler: OperationHandler<MintFromCandyMachineOperation> =
  {
    async handle<
      Settings extends CandyGuardsSettings = DefaultCandyGuardSettings,
      MintSettings extends CandyGuardsMintSettings = DefaultCandyGuardMintSettings
    >(
      operation: MintFromCandyMachineOperation<Settings, MintSettings>,
      metaplex: Metaplex,
      scope: OperationScope
    ): Promise<MintFromCandyMachineOutput> {
      const builder = await mintFromCandyMachineBuilder<Settings, MintSettings>(
        metaplex,
        operation.input,
        scope
      );
      scope.throwIfCanceled();

      const confirmOptions = makeConfirmOptionsFinalizedOnMainnet(
        metaplex,
        scope.confirmOptions
      );
      const output = await builder.sendAndConfirm(metaplex, confirmOptions);
      scope.throwIfCanceled();

      let nft: NftWithToken;
      try {
        nft = (await metaplex.nfts().findByMint(
          {
            mintAddress: output.mintSigner.publicKey,
            tokenAddress: output.tokenAddress,
          },
          scope
        )) as NftWithToken;
      } catch (error) {
        const { candyGuard } = operation.input.candyMachine;
        if (!candyGuard) {
          throw error;
        }

        const activeGuards = metaplex
          .candyMachines()
          .guards()
          .resolveGroupSettings(
            candyGuard.guards,
            candyGuard.groups,
            operation.input.group ?? null
          );

        if (!('botTax' in activeGuards)) {
          throw error;
        }

        throw new CandyMachineBotTaxError(
          metaplex.rpc().getSolanaExporerUrl(output.response.signature),
          error as Error
        );
      }

      return { nft, ...output };
    },
  };

// -----------------
// Builder
// -----------------

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type MintFromCandyMachineBuilderParams<
  Settings extends CandyGuardsSettings = DefaultCandyGuardSettings,
  MintSettings extends CandyGuardsMintSettings = DefaultCandyGuardMintSettings
> = Omit<
  MintFromCandyMachineInput<Settings, MintSettings>,
  'confirmOptions'
> & {
  /** A key to distinguish the instruction that creates the mint account of the NFT. */
  createMintAccountInstructionKey?: string;

  /** A key to distinguish the instruction that initializes the mint account of the NFT. */
  initializeMintInstructionKey?: string;

  /** A key to distinguish the instruction that creates the associated token account of the NFT. */
  createAssociatedTokenAccountInstructionKey?: string;

  /** A key to distinguish the instruction that creates the token account of the NFT. */
  createTokenAccountInstructionKey?: string;

  /** A key to distinguish the instruction that initializes the token account of the NFT. */
  initializeTokenInstructionKey?: string;

  /** A key to distinguish the instruction that mints the one token. */
  mintTokensInstructionKey?: string;

  /** A key to distinguish the instruction that mints from the Candy Machine. */
  mintFromCandyMachineInstructionKey?: string;
};

/**
 * @group Transaction Builders
 * @category Contexts
 */
export type MintFromCandyMachineBuilderContext = Omit<
  MintFromCandyMachineOutput,
  'response' | 'nft'
>;

/**
 * Mints the next NFT from a given candy machine.
 *
 * ```ts
 * const transactionBuilder = await metaplex
 *   .candyMachines()
 *   .builders()
 *   .mint({
 *     candyMachine,
 *     collectionUpdateAuthority,
 *   });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const mintFromCandyMachineBuilder = async <
  Settings extends CandyGuardsSettings = DefaultCandyGuardSettings,
  MintSettings extends CandyGuardsMintSettings = DefaultCandyGuardMintSettings
>(
  metaplex: Metaplex,
  params: MintFromCandyMachineBuilderParams<Settings, MintSettings>,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder<MintFromCandyMachineBuilderContext>> => {
  const { programs, payer = metaplex.rpc().getDefaultFeePayer() } = options;
  const {
    candyMachine,
    collectionUpdateAuthority,
    mintAuthority = metaplex.identity(),
    mint = Keypair.generate(),
    owner = payer.publicKey,
    group = null,
    guards = {},
    token,
  } = params;

  // Programs.
  const candyMachineProgram = metaplex.programs().getCandyMachine(programs);
  const candyGuardProgram = metaplex.programs().getCandyGuard(programs);
  const tokenMetadataProgram = metaplex.programs().getTokenMetadata(programs);
  const tokenProgram = metaplex.programs().getToken(programs);
  const systemProgram = metaplex.programs().getSystem(programs);

  // PDAs.
  const authorityPda = metaplex.candyMachines().pdas().authority({
    candyMachine: candyMachine.address,
    programs,
  });
  const nftMetadata = metaplex.nfts().pdas().metadata({
    mint: mint.publicKey,
    programs,
  });
  const nftMasterEdition = metaplex.nfts().pdas().masterEdition({
    mint: mint.publicKey,
    programs,
  });
  const collectionMetadata = metaplex.nfts().pdas().metadata({
    mint: candyMachine.collectionMintAddress,
    programs,
  });
  const collectionMasterEdition = metaplex.nfts().pdas().masterEdition({
    mint: candyMachine.collectionMintAddress,
    programs,
  });
  const collectionAuthorityRecord = metaplex
    .nfts()
    .pdas()
    .collectionAuthorityRecord({
      mint: candyMachine.collectionMintAddress,
      collectionAuthority: authorityPda,
      programs,
    });

  // Transaction Builder that prepares the mint and token accounts.
  const tokenWithMintBuilder = await metaplex
    .tokens()
    .builders()
    .createTokenWithMint(
      {
        decimals: 0,
        initialSupply: tokenAmount(1),
        mint,
        mintAuthority: payer,
        freezeAuthority: payer.publicKey,
        owner,
        token,
        createMintAccountInstructionKey: params.createMintAccountInstructionKey,
        initializeMintInstructionKey: params.initializeMintInstructionKey,
        createAssociatedTokenAccountInstructionKey:
          params.createAssociatedTokenAccountInstructionKey,
        createTokenAccountInstructionKey:
          params.createTokenAccountInstructionKey,
        initializeTokenInstructionKey: params.initializeTokenInstructionKey,
        mintTokensInstructionKey: params.mintTokensInstructionKey,
      },
      { payer, programs }
    );
  const { tokenAddress } = tokenWithMintBuilder.getContext();

  // Shared mint accounts
  const sharedMintAccounts = {
    candyMachine: candyMachine.address,
    payer: payer.publicKey,
    nftMetadata,
    nftMint: mint.publicKey,
    nftMintAuthority: payer.publicKey,
    nftMasterEdition,
    collectionAuthorityRecord,
    collectionMint: candyMachine.collectionMintAddress,
    collectionMetadata,
    collectionMasterEdition,
    collectionUpdateAuthority,
    candyMachineProgram: candyMachineProgram.address,
    tokenMetadataProgram: tokenMetadataProgram.address,
    tokenProgram: tokenProgram.address,
    systemProgram: systemProgram.address,
    recentSlothashes: SYSVAR_SLOT_HASHES_PUBKEY,
    instructionSysvarAccount: SYSVAR_INSTRUCTIONS_PUBKEY,
  };

  // Mint instruction.
  let mintNftInstruction: TransactionInstruction;
  let mintNftSigners: Signer[];
  if (!!candyMachine.candyGuard) {
    const { candyGuard } = candyMachine;
    const guardClient = metaplex.candyMachines().guards();
    const parsedMintSettings = guardClient.parseMintSettings(
      candyMachine.address,
      candyGuard,
      owner,
      payer,
      mint,
      guards,
      group,
      programs
    );

    mintNftSigners = [payer, mint, ...parsedMintSettings.signers];
    mintNftInstruction = createMintFromGuardInstruction(
      {
        ...sharedMintAccounts,
        candyGuard: candyMachine.candyGuard.address,
        candyMachineAuthorityPda: authorityPda,
      },
      {
        mintArgs: parsedMintSettings.arguments,
        label: group,
      },
      candyGuardProgram.address
    );
    mintNftInstruction.keys.push(...parsedMintSettings.accountMetas);
  } else {
    mintNftSigners = [payer, mint, mintAuthority];
    mintNftInstruction = createMintFromMachineInstruction(
      {
        ...sharedMintAccounts,
        authorityPda,
        mintAuthority: mintAuthority.publicKey,
      },
      candyMachineProgram.address
    );
  }

  return (
    TransactionBuilder.make<MintFromCandyMachineBuilderContext>()
      .setFeePayer(payer)
      .setContext({ tokenAddress, mintSigner: mint })

      // Create token and mint accounts.
      .add(tokenWithMintBuilder)

      // Mint the new NFT.
      .add({
        instruction: mintNftInstruction,
        signers: mintNftSigners,
        key: params.mintFromCandyMachineInstructionKey ?? 'mintNft',
      })
  );
};

import { Buffer } from 'buffer';
import * as beet from '@metaplex-foundation/beet';
import {
  FreezeInstruction,
  FreezeSolPayment,
  freezeSolPaymentBeet,
} from '@metaplex-foundation/mpl-candy-guard';
import {
  MintOwnerMustBeMintPayerError,
  UnrecognizePathForRouteInstructionError,
} from '../errors';
import {
  CandyGuardManifest,
  CandyGuardsRemainingAccount,
  RouteSettingsParserInput,
} from './core';
import { assert } from '@/utils';
import {
  createSerializerFromBeet,
  lamports,
  mapSerializer,
  PublicKey,
  Signer,
  SolAmount,
} from '@/types';

/**
 * The freezeSolPayment guard allows minting frozen NFTs by charging
 * the payer an amount in SOL. Frozen NFTs cannot be transferred
 * or listed on any marketplaces until thawed.
 *
 * The funds are transferred to a freeze escrow until all NFTs are thaw,
 * at which point, they can be transferred (unlocked) to the configured
 * destination account.
 *
 * This object defines the settings that should be
 * provided when creating and/or updating a Candy
 * Machine if you wish to enable this guard.
 *
 * @see {@link FreezeSolPaymentGuardRouteSettings} to learn more about
 * the instructions that can be executed against this guard.
 */
export type FreezeSolPaymentGuardSettings = {
  /** The amount in SOL to charge for. */
  amount: SolAmount;

  /** The configured destination address to send the funds to. */
  destination: PublicKey;
};

/**
 * The settings for the freezeSolPayment guard that should be provided
 * when accessing the guard's special "route" instruction.
 *
 * ## Initialize
 * The `initialize` path creates the freeze escrow account that will
 * hold the funds until all NFTs are thawed. It must be called before
 * any NFTs can be minted.
 *
 * ```ts
 * await metaplex.candyMachines().callGuardRoute({
 *   candyMachine,
 *   guard: 'freezeSolPayment',
 *   settings: {
 *     path: 'initialize',
 *     period: 15 * 24 * 60 * 60, // 15 days.
 *     candyGuardAuthority,
 *   },
 * });
 * ```
 *
 * ## Thaw
 * The `thaw` path unfreezes one NFT if one of the following conditions are met:
 * - All NFTs have been minted.
 * - The configured period has elapsed (max 30 days).
 * - The Candy Machine account was deleted.
 *
 * Anyone can call this instruction. Since the funds are not transferrable
 * until all NFTs are thawed, it creates an incentive for the treasury to
 * thaw all NFTs as soon as possible.
 *
 * ```ts
 * await metaplex.candyMachines().callGuardRoute({
 *   candyMachine,
 *   guard: 'freezeSolPayment',
 *   settings: {
 *     path: 'thaw',
 *     nftMint: nftToThaw.address,
 *     nftOwner: nftToThaw.token.ownerAddress,
 *   },
 * });
 * ```
 *
 * ## Unlock Funds
 * The `unlockFunds` path transfers all of the escrow funds to the
 * configured destination address once all NFTs have been thawed.
 *
 * ```ts
 * await metaplex.candyMachines().callGuardRoute({
 *   candyMachine,
 *   guard: 'freezeSolPayment',
 *   settings: {
 *     path: 'unlockFunds',
 *     candyGuardAuthority,
 *   },
 * });
 * ```
 *
 * @see {@link FreezeSolPaymentGuardSettings} for more
 * information on the freezeSolPayment guard itself.
 */
export type FreezeSolPaymentGuardRouteSettings =
  | {
      /** Selects the path to execute in the route instruction. */
      path: 'initialize';

      /** The freeze period in seconds (maximum 30 days). */
      period: number;

      /** The authority of the Candy Guard as a Signer. */
      candyGuardAuthority: Signer;
    }
  | {
      /** Selects the path to execute in the route instruction. */
      path: 'thaw';

      /** The mint address of the NFT to thaw. */
      nftMint: PublicKey;

      /** The owner address of the NFT to thaw. */
      nftOwner: PublicKey;
    }
  | {
      /** Selects the path to execute in the route instruction. */
      path: 'unlockFunds';

      /** The authority of the Candy Guard as a Signer. */
      candyGuardAuthority: Signer;
    };

/** @internal */
export const freezeSolPaymentGuardManifest: CandyGuardManifest<
  FreezeSolPaymentGuardSettings,
  {},
  FreezeSolPaymentGuardRouteSettings
> = {
  name: 'freezeSolPayment',
  settingsBytes: 40,
  settingsSerializer: mapSerializer<
    FreezeSolPayment,
    FreezeSolPaymentGuardSettings
  >(
    createSerializerFromBeet(freezeSolPaymentBeet),
    (settings) => ({
      amount: lamports(settings.lamports),
      destination: settings.destination,
    }),
    (settings) => ({
      lamports: settings.amount.basisPoints,
      destination: settings.destination,
    })
  ),
  mintSettingsParser: ({
    metaplex,
    settings,
    owner,
    payer,
    mint,
    candyMachine,
    candyGuard,
    programs,
  }) => {
    if (!owner.equals(payer.publicKey)) {
      throw new MintOwnerMustBeMintPayerError('freezeSolPayment');
    }

    const freezeEscrow = metaplex.candyMachines().pdas().freezeEscrow({
      destination: settings.destination,
      candyMachine,
      candyGuard,
      programs,
    });
    const nftAta = metaplex.tokens().pdas().associatedTokenAccount({
      mint: mint.publicKey,
      owner: payer.publicKey,
      programs,
    });

    return {
      arguments: Buffer.from([]),
      remainingAccounts: [
        {
          isSigner: false,
          address: freezeEscrow,
          isWritable: true,
        },
        {
          isSigner: false,
          address: nftAta,
          isWritable: false,
        },
      ],
    };
  },
  routeSettingsParser: (input) => {
    switch (input.routeSettings.path) {
      case 'initialize':
        return initializeRouteInstruction(input);
      case 'thaw':
        return thawRouteInstruction(input);
      case 'unlockFunds':
        return unlockFundsRouteInstruction(input);
      default:
        throw new UnrecognizePathForRouteInstructionError(
          'freezeSolPayment',
          // @ts-ignore
          input.routeSettings.path
        );
    }
  },
};

function initializeRouteInstruction({
  metaplex,
  settings,
  routeSettings,
  candyMachine,
  candyGuard,
  programs,
}: RouteSettingsParserInput<
  FreezeSolPaymentGuardSettings,
  FreezeSolPaymentGuardRouteSettings
>) {
  assert(routeSettings.path === 'initialize');
  const freezeEscrow = metaplex.candyMachines().pdas().freezeEscrow({
    destination: settings.destination,
    candyMachine,
    candyGuard,
    programs,
  });
  const systemProgram = metaplex.programs().getSystem(programs);

  const args = Buffer.alloc(9);
  beet.u8.write(args, 0, FreezeInstruction.Initialize);
  beet.u64.write(args, 1, routeSettings.period);

  return {
    arguments: args,
    remainingAccounts: [
      {
        isSigner: false,
        address: freezeEscrow,
        isWritable: true,
      },
      {
        isSigner: true,
        address: routeSettings.candyGuardAuthority,
        isWritable: false,
      },
      {
        isSigner: false,
        address: systemProgram.address,
        isWritable: false,
      },
    ] as CandyGuardsRemainingAccount[],
  };
}

function thawRouteInstruction({
  metaplex,
  settings,
  routeSettings,
  candyMachine,
  candyGuard,
  programs,
}: RouteSettingsParserInput<
  FreezeSolPaymentGuardSettings,
  FreezeSolPaymentGuardRouteSettings
>) {
  assert(routeSettings.path === 'thaw');
  const freezeEscrow = metaplex.candyMachines().pdas().freezeEscrow({
    destination: settings.destination,
    candyMachine,
    candyGuard,
    programs,
  });
  const nftAta = metaplex.tokens().pdas().associatedTokenAccount({
    mint: routeSettings.nftMint,
    owner: routeSettings.nftOwner,
    programs,
  });
  const nftEdition = metaplex.nfts().pdas().masterEdition({
    mint: routeSettings.nftMint,
    programs,
  });
  const tokenProgram = metaplex.programs().getToken(programs);
  const tokenMetadataProgram = metaplex.programs().getTokenMetadata(programs);

  const args = Buffer.alloc(1);
  beet.u8.write(args, 0, FreezeInstruction.Thaw);

  return {
    arguments: args,
    remainingAccounts: [
      {
        isSigner: false,
        address: freezeEscrow,
        isWritable: true,
      },
      {
        isSigner: false,
        address: routeSettings.nftMint,
        isWritable: false,
      },
      {
        isSigner: false,
        address: routeSettings.nftOwner,
        isWritable: false,
      },
      {
        isSigner: false,
        address: nftAta,
        isWritable: true,
      },
      {
        isSigner: false,
        address: nftEdition,
        isWritable: false,
      },
      {
        isSigner: false,
        address: tokenProgram.address,
        isWritable: false,
      },
      {
        isSigner: false,
        address: tokenMetadataProgram.address,
        isWritable: false,
      },
    ] as CandyGuardsRemainingAccount[],
  };
}

function unlockFundsRouteInstruction({
  metaplex,
  settings,
  routeSettings,
  candyMachine,
  candyGuard,
  programs,
}: RouteSettingsParserInput<
  FreezeSolPaymentGuardSettings,
  FreezeSolPaymentGuardRouteSettings
>) {
  assert(routeSettings.path === 'unlockFunds');
  const freezeEscrow = metaplex.candyMachines().pdas().freezeEscrow({
    destination: settings.destination,
    candyMachine,
    candyGuard,
    programs,
  });
  const systemProgram = metaplex.programs().getSystem(programs);

  const args = Buffer.alloc(1);
  beet.u8.write(args, 0, FreezeInstruction.UnlockFunds);

  return {
    arguments: args,
    remainingAccounts: [
      {
        isSigner: false,
        address: freezeEscrow,
        isWritable: true,
      },
      {
        isSigner: true,
        address: routeSettings.candyGuardAuthority,
        isWritable: false,
      },
      {
        isSigner: false,
        address: settings.destination,
        isWritable: true,
      },
      {
        isSigner: false,
        address: systemProgram.address,
        isWritable: false,
      },
    ] as CandyGuardsRemainingAccount[],
  };
}

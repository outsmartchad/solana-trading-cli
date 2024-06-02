import type { PublicKey } from '@solana/web3.js';
import { CandyMachinesV2BuildersClient } from './CandyMachinesV2BuildersClient';
import { CandyMachineV2 } from './models';
import {
  CreateCandyMachineV2Input,
  createCandyMachineV2Operation,
  DeleteCandyMachineV2Input,
  deleteCandyMachineV2Operation,
  FindCandyMachineV2ByAddressInput,
  findCandyMachineV2ByAddressOperation,
  FindCandyMachinesV2ByPublicKeyFieldInput,
  findCandyMachinesV2ByPublicKeyFieldOperation,
  FindMintedNftsByCandyMachineV2Input,
  findMintedNftsByCandyMachineV2Operation,
  InsertItemsToCandyMachineV2Input,
  insertItemsToCandyMachineV2Operation,
  MintCandyMachineV2Input,
  mintCandyMachineV2Operation,
  UpdateCandyMachineV2Input,
  updateCandyMachineV2Operation,
} from './operations';
import { OperationOptions, toPublicKey } from '@/types';
import type { Metaplex } from '@/Metaplex';

/**
 * This is a client for the Candy Machine module.
 *
 * It enables us to interact with the Candy Machine program in order to
 * create, update and delete Candy Machines as well as mint from them.
 *
 * You may access this client via the `candyMachinesV2()` method of your `Metaplex` instance.
 *
 * ```ts
 * const candyMachineV2Client = metaplex.candyMachinesV2();
 * ```
 *
 * @example
 * You can create a new Candy Machine with minimum input like so.
 * By default, the current identity of the Metaplex instance will be
 * the authority of the Candy Machine.
 *
 * ```ts
 * const { candyMachine } = await metaplex
 *   .candyMachinesV2()
 *   .create({
 *     sellerFeeBasisPoints: 500, // 5% royalties
 *     price: sol(1.3), // 1.3 SOL
 *     itemsAvailable: toBigNumber(1000), // 1000 items available
 *   };
 * ```
 *
 * @see {@link CandyMachine} The `CandyMachine` model
 * @group Modules
 */
export class CandyMachinesV2Client {
  constructor(readonly metaplex: Metaplex) {}

  /**
   * You may use the `builders()` client to access the
   * underlying Transaction Builders of this module.
   *
   * ```ts
   * const buildersClient = metaplex.candyMachinesV2().builders();
   * ```
   */
  builders() {
    return new CandyMachinesV2BuildersClient(this.metaplex);
  }

  /** {@inheritDoc createCandyMachineV2Operation} */
  create(input: CreateCandyMachineV2Input, options?: OperationOptions) {
    return this.metaplex
      .operations()
      .execute(createCandyMachineV2Operation(input), options);
  }

  /** {@inheritDoc deleteCandyMachineV2Operation} */
  delete(input: DeleteCandyMachineV2Input, options?: OperationOptions) {
    return this.metaplex
      .operations()
      .execute(deleteCandyMachineV2Operation(input), options);
  }

  /** {@inheritDoc findCandyMachinesV2ByPublicKeyFieldOperation} */
  findAllBy(
    input: FindCandyMachinesV2ByPublicKeyFieldInput,
    options?: OperationOptions
  ) {
    return this.metaplex
      .operations()
      .execute(findCandyMachinesV2ByPublicKeyFieldOperation(input), options);
  }

  /** {@inheritDoc findCandyMachineV2ByAddressOperation} */
  findByAddress(
    input: FindCandyMachineV2ByAddressInput,
    options?: OperationOptions
  ) {
    return this.metaplex
      .operations()
      .execute(findCandyMachineV2ByAddressOperation(input), options);
  }

  /** {@inheritDoc findMintedNftsByCandyMachineV2Operation} */
  findMintedNfts(
    input: FindMintedNftsByCandyMachineV2Input,
    options?: OperationOptions
  ) {
    return this.metaplex
      .operations()
      .execute(findMintedNftsByCandyMachineV2Operation(input), options);
  }

  /** {@inheritDoc insertItemsToCandyMachineV2Operation} */
  insertItems(
    input: InsertItemsToCandyMachineV2Input,
    options?: OperationOptions
  ) {
    return this.metaplex
      .operations()
      .execute(insertItemsToCandyMachineV2Operation(input), options);
  }

  /** {@inheritDoc mintCandyMachineV2Operation} */
  mint(input: MintCandyMachineV2Input, options?: OperationOptions) {
    return this.metaplex
      .operations()
      .execute(mintCandyMachineV2Operation(input), options);
  }

  /**
   * Helper method that refetches a given Candy Machine.
   *
   * ```ts
   * const candyMachine = await metaplex.candyMachinesV2().refresh(candyMachine);
   * ```
   */
  refresh(
    candyMachine: CandyMachineV2 | PublicKey,
    options?: OperationOptions
  ) {
    return this.findByAddress({ address: toPublicKey(candyMachine) }, options);
  }

  /** {@inheritDoc updateCandyMachineV2Operation} */
  update(input: UpdateCandyMachineV2Input, options?: OperationOptions) {
    return this.metaplex
      .operations()
      .execute(updateCandyMachineV2Operation(input), options);
  }
}

import { CandyMachineBuildersClient } from './CandyMachineBuildersClient';
import { CandyMachineGuardsClient } from './CandyMachineGuardsClient';
import { CandyMachinePdasClient } from './CandyMachinePdasClient';
import {
  CandyGuardsMintSettings,
  CandyGuardsRouteSettings,
  CandyGuardsSettings,
  DefaultCandyGuardMintSettings,
  DefaultCandyGuardRouteSettings,
  DefaultCandyGuardSettings,
} from './guards';
import { CandyGuard, CandyMachine, isCandyMachine } from './models';
import {
  CallCandyGuardRouteInput,
  callCandyGuardRouteOperation,
  CreateCandyGuardInput,
  createCandyGuardOperation,
  CreateCandyMachineInput,
  createCandyMachineOperation,
  DeleteCandyGuardInput,
  deleteCandyGuardOperation,
  DeleteCandyMachineInput,
  deleteCandyMachineOperation,
  FindCandyGuardByAddressInput,
  findCandyGuardByAddressOperation,
  FindCandyGuardsByAuthorityInput,
  findCandyGuardsByAuthorityOperation,
  FindCandyMachineByAddressInput,
  findCandyMachineByAddressOperation,
  InsertCandyMachineItemsInput,
  insertCandyMachineItemsOperation,
  MintFromCandyMachineInput,
  mintFromCandyMachineOperation,
  UnwrapCandyGuardInput,
  unwrapCandyGuardOperation,
  UpdateCandyGuardInput,
  updateCandyGuardOperation,
  UpdateCandyMachineInput,
  updateCandyMachineOperation,
  WrapCandyGuardInput,
  wrapCandyGuardOperation,
} from './operations';
import {
  UpdateCandyGuardAuthorityInput,
  updateCandyGuardAuthorityOperation,
} from './operations/updateCandyGuardAuthority';
import { OperationOptions, toPublicKey } from '@/types';
import type { Metaplex } from '@/Metaplex';

/**
 * This is a client for the Candy Machine V3 module.
 *
 * It enables us to interact with the Candy Machine V3 and Candy Guard programs
 * in order to create, update, delete and mint from Candy Machines as well as
 * registering your own custom Candy Guards.
 *
 * You may access this client via the `candyMachines()` method of your `Metaplex` instance.
 *
 * ```ts
 * const candyMachineClient = metaplex.candyMachines();
 * ```
 *
 * @example
 * You can create a new Candy Machine with minimum input like so.
 * By default, the current identity of the Metaplex instance will be
 * the authority of the Candy Machine and it will immediately create
 * a Candy Guard linked to the new Candy Machine.
 *
 * ```ts
 *  const { candyMachine } = await metaplex
 *    .candyMachines()
 *    .create({
 *      itemsAvailable: toBigNumber(5000),
 *      sellerFeeBasisPoints: 333, // 3.33%
 *      collection: {
 *        address: collectionNft.address,
 *        updateAuthority: collectionUpdateAuthority,
 *      },
 *    });
 * ```
 *
 * @see {@link CandyGuard} The `CandyGuard` model
 * @group Modules
 */
export class CandyMachineClient {
  protected readonly guardsClient: CandyMachineGuardsClient;

  constructor(readonly metaplex: Metaplex) {
    this.guardsClient = new CandyMachineGuardsClient(metaplex);
  }

  /**
   * You may use the `guards()` client to access the default guards
   * available as well as register your own guards.
   *
   * ```ts
   * const guardsClient = metaplex.candyMachines().guards();
   * ```
   */
  guards() {
    return this.guardsClient;
  }

  /**
   * You may use the `builders()` client to access the
   * underlying Transaction Builders of this module.
   *
   * ```ts
   * const buildersClient = metaplex.candyMachines().builders();
   * ```
   */
  builders() {
    return new CandyMachineBuildersClient(this.metaplex);
  }

  /**
   * You may use the `pdas()` client to build PDAs related to this module.
   *
   * ```ts
   * const pdasClient = metaplex.candyMachines().pdas();
   * ```
   */
  pdas() {
    return new CandyMachinePdasClient(this.metaplex);
  }

  /** {@inheritDoc callCandyGuardRouteOperation} */
  callGuardRoute<
    Guard extends keyof RouteSettings & string,
    Settings extends CandyGuardsSettings = DefaultCandyGuardSettings,
    RouteSettings extends CandyGuardsRouteSettings = DefaultCandyGuardRouteSettings
  >(
    input: CallCandyGuardRouteInput<
      Guard,
      Settings extends undefined ? DefaultCandyGuardSettings : Settings,
      RouteSettings extends undefined
        ? DefaultCandyGuardRouteSettings
        : RouteSettings
    >,
    options?: OperationOptions
  ) {
    return this.metaplex
      .operations()
      .execute(callCandyGuardRouteOperation(input), options);
  }

  /** {@inheritDoc createCandyMachineOperation} */
  create<T extends CandyGuardsSettings = DefaultCandyGuardSettings>(
    input: CreateCandyMachineInput<
      T extends undefined ? DefaultCandyGuardSettings : T
    >,
    options?: OperationOptions
  ) {
    return this.metaplex
      .operations()
      .execute(createCandyMachineOperation(input), options);
  }

  /** {@inheritDoc createCandyGuardOperation} */
  createCandyGuard<T extends CandyGuardsSettings = DefaultCandyGuardSettings>(
    input: CreateCandyGuardInput<
      T extends undefined ? DefaultCandyGuardSettings : T
    >,
    options?: OperationOptions
  ) {
    return this.metaplex
      .operations()
      .execute(createCandyGuardOperation(input), options);
  }

  /** {@inheritDoc deleteCandyMachineOperation} */
  delete(input: DeleteCandyMachineInput, options?: OperationOptions) {
    return this.metaplex
      .operations()
      .execute(deleteCandyMachineOperation(input), options);
  }

  /** {@inheritDoc deleteCandyGuardOperation} */
  deleteCandyGuard(input: DeleteCandyGuardInput, options?: OperationOptions) {
    return this.metaplex
      .operations()
      .execute(deleteCandyGuardOperation(input), options);
  }

  /** {@inheritDoc findCandyGuardsByAuthorityOperation} */
  findAllCandyGuardsByAuthority<
    T extends CandyGuardsSettings = DefaultCandyGuardSettings
  >(input: FindCandyGuardsByAuthorityInput, options?: OperationOptions) {
    return this.metaplex
      .operations()
      .execute(findCandyGuardsByAuthorityOperation<T>(input), options);
  }

  /** {@inheritDoc findCandyMachineByAddressOperation} */
  findByAddress<T extends CandyGuardsSettings = DefaultCandyGuardSettings>(
    input: FindCandyMachineByAddressInput,
    options?: OperationOptions
  ) {
    return this.metaplex
      .operations()
      .execute(findCandyMachineByAddressOperation<T>(input), options);
  }

  /** {@inheritDoc findCandyGuardByAddressOperation} */
  findCandyGuardByAddress<
    T extends CandyGuardsSettings = DefaultCandyGuardSettings
  >(input: FindCandyGuardByAddressInput, options?: OperationOptions) {
    return this.metaplex
      .operations()
      .execute(findCandyGuardByAddressOperation<T>(input), options);
  }

  /**
   * Helper method that fetches a Candy Guard via the base
   * address used to derived its PDA.
   *
   * ```ts
   * const candyGuard = await metaplex
   *   .candyMachines()
   *   .findCandyGuardByBaseAddress({ address: base });
   * ```
   */
  findCandyGuardByBaseAddress<
    T extends CandyGuardsSettings = DefaultCandyGuardSettings
  >(input: FindCandyGuardByAddressInput, options?: OperationOptions) {
    const address = this.pdas().candyGuard({ base: input.address });
    return this.findCandyGuardByAddress<T>({ ...input, address }, options);
  }

  /** {@inheritDoc insertCandyMachineItemsOperation} */
  insertItems(input: InsertCandyMachineItemsInput, options?: OperationOptions) {
    return this.metaplex
      .operations()
      .execute(insertCandyMachineItemsOperation(input), options);
  }

  /** {@inheritDoc mintFromCandyMachineOperation} */
  mint<
    Settings extends CandyGuardsSettings = DefaultCandyGuardSettings,
    MintSettings extends CandyGuardsMintSettings = DefaultCandyGuardMintSettings
  >(
    input: MintFromCandyMachineInput<
      Settings extends undefined ? DefaultCandyGuardSettings : Settings,
      MintSettings extends undefined
        ? DefaultCandyGuardMintSettings
        : MintSettings
    >,
    options?: OperationOptions
  ) {
    return this.metaplex
      .operations()
      .execute(mintFromCandyMachineOperation(input), options);
  }

  /**
   * Helper method that refetches a given Candy Machine or Candy Guard.
   *
   * ```ts
   * const candyMachine = await metaplex.candyMachines().refresh(candyMachine);
   * const candyGuard = await metaplex.candyMachines().refresh(candyGuard);
   * ```
   */
  async refresh<
    T extends CandyGuardsSettings,
    M extends CandyMachine<T> | CandyGuard<T>
  >(model: M, options?: OperationOptions): Promise<M> {
    const input = { address: toPublicKey(model) };
    const refreshedModel = isCandyMachine(model)
      ? await this.findByAddress<T>(input, options)
      : await this.findCandyGuardByAddress<T>(input, options);

    return refreshedModel as M;
  }

  /** {@inheritDoc unwrapCandyGuardOperation} */
  unwrapCandyGuard(input: UnwrapCandyGuardInput, options?: OperationOptions) {
    return this.metaplex
      .operations()
      .execute(unwrapCandyGuardOperation(input), options);
  }

  /** {@inheritDoc updateCandyMachineOperation} */
  update<T extends CandyGuardsSettings = DefaultCandyGuardSettings>(
    input: UpdateCandyMachineInput<
      T extends undefined ? DefaultCandyGuardSettings : T
    >,
    options?: OperationOptions
  ) {
    return this.metaplex
      .operations()
      .execute(updateCandyMachineOperation(input), options);
  }

  /** {@inheritDoc updateCandyGuardOperation} */
  updateCandyGuard<T extends CandyGuardsSettings = DefaultCandyGuardSettings>(
    input: UpdateCandyGuardInput<
      T extends undefined ? DefaultCandyGuardSettings : T
    >,
    options?: OperationOptions
  ) {
    return this.metaplex
      .operations()
      .execute(updateCandyGuardOperation(input), options);
  }

  /** {@inheritDoc updateCandyGuardAuthorityOperation} */
  updateCandyGuardAuthority(
    input: UpdateCandyGuardAuthorityInput,
    options?: OperationOptions
  ) {
    return this.metaplex
      .operations()
      .execute(updateCandyGuardAuthorityOperation(input), options);
  }

  /** {@inheritDoc wrapCandyGuardOperation} */
  wrapCandyGuard(input: WrapCandyGuardInput, options?: OperationOptions) {
    return this.metaplex
      .operations()
      .execute(wrapCandyGuardOperation(input), options);
  }
}

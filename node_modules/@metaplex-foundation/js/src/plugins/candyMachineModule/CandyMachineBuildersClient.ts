import {
  CandyGuardsMintSettings,
  CandyGuardsRouteSettings,
  CandyGuardsSettings,
  DefaultCandyGuardMintSettings,
  DefaultCandyGuardRouteSettings,
  DefaultCandyGuardSettings,
} from './guards';
import {
  callCandyGuardRouteBuilder,
  CallCandyGuardRouteBuilderParams,
  createCandyGuardBuilder,
  CreateCandyGuardBuilderParams,
  createCandyMachineBuilder,
  CreateCandyMachineBuilderParams,
  deleteCandyGuardBuilder,
  DeleteCandyGuardBuilderParams,
  deleteCandyMachineBuilder,
  DeleteCandyMachineBuilderParams,
  insertCandyMachineItemsBuilder,
  InsertCandyMachineItemsBuilderParams,
  mintFromCandyMachineBuilder,
  MintFromCandyMachineBuilderParams,
  unwrapCandyGuardBuilder,
  UnwrapCandyGuardBuilderParams,
  updateCandyGuardBuilder,
  UpdateCandyGuardBuilderParams,
  updateCandyMachineBuilder,
  UpdateCandyMachineBuilderParams,
  wrapCandyGuardBuilder,
  WrapCandyGuardBuilderParams,
} from './operations';
import {
  updateCandyGuardAuthorityBuilder,
  UpdateCandyGuardAuthorityBuilderParams,
} from './operations/updateCandyGuardAuthority';
import type { Metaplex } from '@/Metaplex';
import { TransactionBuilderOptions } from '@/utils';

/**
 * This client allows you to access the underlying Transaction Builders
 * for the write operations of the Candy Guard module.
 *
 * @see {@link CandyMachineClient}
 * @group Module Builders
 */
export class CandyMachineBuildersClient {
  constructor(protected readonly metaplex: Metaplex) {}

  /** {@inheritDoc callCandyGuardRouteBuilder} */
  callGuardRoute<
    Guard extends keyof RouteSettings & string,
    Settings extends CandyGuardsSettings = DefaultCandyGuardSettings,
    RouteSettings extends CandyGuardsRouteSettings = DefaultCandyGuardRouteSettings
  >(
    input: CallCandyGuardRouteBuilderParams<Guard, Settings, RouteSettings>,
    options?: TransactionBuilderOptions
  ) {
    return callCandyGuardRouteBuilder(this.metaplex, input, options);
  }

  /** {@inheritDoc createCandyMachineBuilder} */
  create<T extends CandyGuardsSettings = DefaultCandyGuardSettings>(
    input: CreateCandyMachineBuilderParams<T>,
    options?: TransactionBuilderOptions
  ) {
    return createCandyMachineBuilder(this.metaplex, input, options);
  }

  /** {@inheritDoc createCandyGuardBuilder} */
  createCandyGuard<T extends CandyGuardsSettings = DefaultCandyGuardSettings>(
    input: CreateCandyGuardBuilderParams<T>,
    options?: TransactionBuilderOptions
  ) {
    return createCandyGuardBuilder(this.metaplex, input, options);
  }

  /** {@inheritDoc deleteCandyMachineBuilder} */
  delete(
    input: DeleteCandyMachineBuilderParams,
    options?: TransactionBuilderOptions
  ) {
    return deleteCandyMachineBuilder(this.metaplex, input, options);
  }

  /** {@inheritDoc deleteCandyGuardBuilder} */
  deleteCandyGuard(
    input: DeleteCandyGuardBuilderParams,
    options?: TransactionBuilderOptions
  ) {
    return deleteCandyGuardBuilder(this.metaplex, input, options);
  }

  /** {@inheritDoc insertCandyMachineItemsBuilder} */
  insertItems(
    input: InsertCandyMachineItemsBuilderParams,
    options?: TransactionBuilderOptions
  ) {
    return insertCandyMachineItemsBuilder(this.metaplex, input, options);
  }

  /** {@inheritDoc mintFromCandyMachineBuilder} */
  mint<
    Settings extends CandyGuardsSettings = DefaultCandyGuardSettings,
    MintSettings extends CandyGuardsMintSettings = DefaultCandyGuardMintSettings
  >(
    input: MintFromCandyMachineBuilderParams<Settings, MintSettings>,
    options?: TransactionBuilderOptions
  ) {
    return mintFromCandyMachineBuilder(this.metaplex, input, options);
  }

  /** {@inheritDoc unwrapCandyGuardBuilder} */
  unwrapCandyGuard(
    input: UnwrapCandyGuardBuilderParams,
    options?: TransactionBuilderOptions
  ) {
    return unwrapCandyGuardBuilder(this.metaplex, input, options);
  }

  /** {@inheritDoc updateCandyMachineBuilder} */
  update<T extends CandyGuardsSettings = DefaultCandyGuardSettings>(
    input: UpdateCandyMachineBuilderParams<T>,
    options?: TransactionBuilderOptions
  ) {
    return updateCandyMachineBuilder(this.metaplex, input, options);
  }

  /** {@inheritDoc updateCandyGuardBuilder} */
  updateCandyGuard<T extends CandyGuardsSettings = DefaultCandyGuardSettings>(
    input: UpdateCandyGuardBuilderParams<T>,
    options?: TransactionBuilderOptions
  ) {
    return updateCandyGuardBuilder(this.metaplex, input, options);
  }

  /** {@inheritDoc updateCandyGuardAuthorityBuilder} */
  updateCandyGuardAuthority(
    input: UpdateCandyGuardAuthorityBuilderParams,
    options?: TransactionBuilderOptions
  ) {
    return updateCandyGuardAuthorityBuilder(this.metaplex, input, options);
  }

  /** {@inheritDoc wrapCandyGuardBuilder} */
  wrapCandyGuard(
    input: WrapCandyGuardBuilderParams,
    options?: TransactionBuilderOptions
  ) {
    return wrapCandyGuardBuilder(this.metaplex, input, options);
  }
}

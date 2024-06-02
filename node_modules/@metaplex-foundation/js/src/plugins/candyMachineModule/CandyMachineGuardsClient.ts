import { Buffer } from 'buffer';
import * as beet from '@metaplex-foundation/beet';
import { AccountMeta } from '@solana/web3.js';
import { CANDY_GUARD_LABEL_SIZE } from './constants';
import {
  GuardGroupLabelTooLongError,
  GuardGroupRequiredError,
  GuardNotEnabledError,
  GuardRouteNotSupportedError,
  SelectedGuardGroupDoesNotExistError,
  UnregisteredCandyGuardError,
} from './errors';
import {
  CandyGuardManifest,
  CandyGuardsMintSettings,
  CandyGuardsRemainingAccount,
  CandyGuardsRouteSettings,
  CandyGuardsSettings,
  DefaultCandyGuardRouteSettings,
  DefaultCandyGuardSettings,
} from './guards';
import { CandyGuard } from './models';
import { CandyGuardProgram } from './programs';
import { Option, padEmptyChars, removeEmptyChars } from '@/utils';
import {
  deserialize,
  deserializeFeatureFlags,
  Program,
  PublicKey,
  serialize,
  serializeFeatureFlags,
  Signer,
} from '@/types';
import type { Metaplex } from '@/Metaplex';

/**
 * This client enables us to register custom guards from
 * custom Candy Guard programs and interact with them.
 *
 * @see {@link CandyGuardClient}
 * @group Module
 */
export class CandyMachineGuardsClient {
  readonly guards: CandyGuardManifest<any, any, any>[] = [];

  constructor(protected readonly metaplex: Metaplex) {}

  /** Registers one or many guards by providing their manifest. */
  register(...guard: CandyGuardManifest<any, any, any>[]) {
    this.guards.push(...guard);
  }

  /** Gets the manifest of a guard using its name. */
  get(name: string): CandyGuardManifest<any, any, any> {
    const guard = this.guards.find((guard) => guard.name === name);

    if (!guard) {
      throw new UnregisteredCandyGuardError(name);
    }

    return guard;
  }

  /** Gets all registered guard manifests. */
  all(): CandyGuardManifest<any, any, any>[] {
    return this.guards;
  }

  /**
   * Gets all guard manifests for a registered Candy Guard program.
   *
   * It fails if the manifest of any guard expected by the program
   * is not registered. Manifests are returned in the order in which
   * they are defined on the `availableGuards` property of the program.
   */
  forProgram(
    program: string | PublicKey | CandyGuardProgram = 'CandyGuardProgram'
  ): CandyGuardManifest<any, any, any>[] {
    const candyGuardProgram =
      typeof program === 'object' && 'availableGuards' in program
        ? program
        : this.metaplex.programs().get<CandyGuardProgram>(program);

    return candyGuardProgram.availableGuards.map((name) => this.get(name));
  }

  /**
   * Gets all guard manifests for the registered Candy Guard program.
   *
   * @see {@link CandyMachineGuardsClient.forProgram}
   */
  forCandyGuardProgram(
    programs: Program[] = []
  ): CandyGuardManifest<any, any, any>[] {
    const candyGuardProgram = this.metaplex.programs().getCandyGuard(programs);

    return this.forProgram(candyGuardProgram);
  }

  /** Serializes the settings of all guards and groups. */
  serializeSettings<T extends CandyGuardsSettings = DefaultCandyGuardSettings>(
    guards: Partial<T>,
    groups: { label: string; guards: Partial<T> }[] = [],
    programs: Program[] = []
  ): Buffer {
    const availableGuards = this.forCandyGuardProgram(programs);
    this.assertGuardsAreRegistered<T>(
      guards,
      groups,
      availableGuards.map(({ name }) => name)
    );

    const serializeSet = (set: Partial<T>): Buffer => {
      const { features, buffer } = availableGuards.reduce(
        (acc, guard, index) => {
          const value = set[guard.name] ?? null;
          acc.features[index] = Boolean(value);
          if (value) {
            acc.buffer = Buffer.concat([
              acc.buffer,
              serialize(value, guard.settingsSerializer),
            ]);
          }
          return acc;
        },
        {
          features: [] as boolean[],
          buffer: Buffer.from([]),
        }
      );

      const serializedfeatures = serializeFeatureFlags(features, 8, true);
      serializedfeatures.reverse();

      return Buffer.concat([serializedfeatures, buffer]);
    };

    let buffer = serializeSet(guards);

    const groupCountBuffer = Buffer.alloc(4);
    beet.u32.write(groupCountBuffer, 0, groups.length);
    buffer = Buffer.concat([buffer, groupCountBuffer]);

    groups.forEach((group) => {
      if (group.label.length > CANDY_GUARD_LABEL_SIZE) {
        throw new GuardGroupLabelTooLongError(
          group.label,
          CANDY_GUARD_LABEL_SIZE
        );
      }
      const labelBuffer = Buffer.alloc(CANDY_GUARD_LABEL_SIZE);
      labelBuffer.write(
        padEmptyChars(group.label, CANDY_GUARD_LABEL_SIZE),
        0,
        CANDY_GUARD_LABEL_SIZE,
        'utf8'
      );
      buffer = Buffer.concat([buffer, labelBuffer, serializeSet(group.guards)]);
    });

    return buffer;
  }

  /** Deserializes the settings of all guards and groups. */
  deserializeSettings<
    T extends CandyGuardsSettings = DefaultCandyGuardSettings
  >(
    buffer: Buffer,
    program: string | PublicKey | CandyGuardProgram = 'CandyGuardProgram'
  ): { guards: T; groups: { label: string; guards: T }[] } {
    const availableGuards = this.forProgram(program);
    const deserializeSet = () => {
      const serializedFeatures = buffer.slice(0, 8);
      serializedFeatures.reverse();
      const features = deserializeFeatureFlags(serializedFeatures, 64, true);
      buffer = buffer.slice(8);

      return availableGuards.reduce((acc, guard, index) => {
        const isEnabled = features[index] ?? false;
        acc[guard.name] = null;
        if (!isEnabled) return acc;

        const [settings] = deserialize(buffer, guard.settingsSerializer);
        buffer = buffer.slice(guard.settingsBytes);
        acc[guard.name] = settings;
        return acc;
      }, {} as CandyGuardsSettings) as T;
    };

    const guards: T = deserializeSet();
    const groups: { label: string; guards: T }[] = [];
    const groupsCount = beet.u32.read(buffer, 0);
    buffer = buffer.slice(4);

    for (let i = 0; i < groupsCount; i++) {
      const label = removeEmptyChars(
        buffer.slice(0, CANDY_GUARD_LABEL_SIZE).toString('utf8')
      );
      buffer = buffer.slice(CANDY_GUARD_LABEL_SIZE);
      groups.push({ label, guards: deserializeSet() });
    }

    return { guards, groups };
  }

  /**
   * Resolves the set of settings that should be used when minting.
   *
   * If no group exists, the `guards` settings will be used.
   * Otherwise, the `guards` settings will act as default settings and
   * the settings of the selected group will override them.
   */
  resolveGroupSettings<
    T extends CandyGuardsSettings = DefaultCandyGuardSettings
  >(
    guards: T,
    groups: { label: string; guards: T }[] = [],
    groupLabel: Option<string>
  ): T {
    const availableGroups = groups.map((group) => group.label);
    const activeGroup = groups.find((group) => group.label === groupLabel);
    if (groupLabel && !activeGroup) {
      throw new SelectedGuardGroupDoesNotExistError(
        groupLabel,
        availableGroups
      );
    }

    if (groups.length === 0) {
      return guards;
    }

    if (!activeGroup) {
      throw new GuardGroupRequiredError(availableGroups);
    }

    const activeGroupGuardsWithoutNullGuards = Object.fromEntries(
      Object.entries(activeGroup.guards).filter(([, v]) => v != null)
    ) as Partial<T>;

    return {
      ...guards,
      ...activeGroupGuardsWithoutNullGuards,
    };
  }

  /**
   * Parses the arguments and remaining accounts of
   * all relevant guards for the mint instruction.
   */
  parseMintSettings<
    Settings extends CandyGuardsSettings = DefaultCandyGuardSettings,
    MintSettings extends CandyGuardsMintSettings = {}
  >(
    candyMachine: PublicKey,
    candyGuard: CandyGuard<Settings>,
    owner: PublicKey,
    payer: Signer,
    mint: Signer,
    guardMintSettings: Partial<MintSettings>,
    groupLabel: Option<string>,
    programs: Program[] = []
  ): {
    arguments: Buffer;
    accountMetas: AccountMeta[];
    signers: Signer[];
  } {
    const availableGuards = this.forCandyGuardProgram(programs);
    const guardSettings = this.resolveGroupSettings(
      candyGuard.guards,
      candyGuard.groups,
      groupLabel
    );
    const initialAccumulator = {
      arguments: Buffer.from([]),
      accountMetas: [] as AccountMeta[],
      signers: [] as Signer[],
    };

    return availableGuards.reduce((acc, guard) => {
      const settings = guardSettings[guard.name] ?? null;
      const mintSettings = guardMintSettings[guard.name] ?? null;
      if (!guard.mintSettingsParser || !settings) return acc;

      const parsedSettings = guard.mintSettingsParser({
        metaplex: this.metaplex,
        settings,
        mintSettings,
        owner,
        payer,
        mint,
        candyMachine,
        candyGuard: candyGuard.address,
        candyGuardAuthority: candyGuard.authorityAddress,
        programs,
      });

      const accounts = this.getAccountMetas(parsedSettings.remainingAccounts);
      const signers = this.getSigners(parsedSettings.remainingAccounts);
      acc.arguments = Buffer.concat([acc.arguments, parsedSettings.arguments]);
      acc.accountMetas.push(...accounts);
      acc.signers.push(...signers);
      return acc;
    }, initialAccumulator);
  }

  /**
   * Parses the arguments and remaining accounts of
   * the requested guard for the route instruction.
   */
  parseRouteSettings<
    Guard extends keyof RouteSettings & string,
    Settings extends CandyGuardsSettings = DefaultCandyGuardSettings,
    RouteSettings extends CandyGuardsRouteSettings = DefaultCandyGuardRouteSettings
  >(
    candyMachine: PublicKey,
    candyGuard: CandyGuard<Settings>,
    payer: Signer,
    guard: Guard,
    routeSettings: RouteSettings[Guard],
    groupLabel: Option<string>,
    programs: Program[] = []
  ): {
    arguments: Buffer;
    accountMetas: AccountMeta[];
    signers: Signer[];
  } {
    const guardManifest = this.get(guard);
    if (!guardManifest.routeSettingsParser) {
      throw new GuardRouteNotSupportedError(guard);
    }

    const guardSettings = this.resolveGroupSettings(
      candyGuard.guards,
      candyGuard.groups,
      groupLabel
    );
    const settings = guardSettings[guard] ?? null;
    if (!settings) {
      throw new GuardNotEnabledError(guard, groupLabel);
    }

    const parsedSettings = guardManifest.routeSettingsParser({
      metaplex: this.metaplex,
      settings,
      routeSettings,
      payer,
      candyMachine,
      candyGuard: candyGuard.address,
      candyGuardAuthority: candyGuard.authorityAddress,
      programs,
    });

    return {
      arguments: parsedSettings.arguments,
      accountMetas: this.getAccountMetas(parsedSettings.remainingAccounts),
      signers: this.getSigners(parsedSettings.remainingAccounts),
    };
  }

  /** @internal */
  protected getAccountMetas(
    remainingAccounts: CandyGuardsRemainingAccount[]
  ): AccountMeta[] {
    return remainingAccounts.map((account) => ({
      pubkey: account.isSigner ? account.address.publicKey : account.address,
      isSigner: account.isSigner,
      isWritable: account.isWritable,
    }));
  }

  /** @internal */
  protected getSigners(
    remainingAccounts: CandyGuardsRemainingAccount[]
  ): Signer[] {
    return remainingAccounts
      .filter((account) => account.isSigner)
      .map((account) => account.address as Signer);
  }

  /** @internal */
  protected assertGuardsAreRegistered<
    T extends CandyGuardsSettings = DefaultCandyGuardSettings
  >(
    guards: Partial<T>,
    groups: { label: string; guards: Partial<T> }[],
    availableGuardNames: string[]
  ): void {
    const guardNames = new Set<string>();
    const addGuardSet = (guardSet: Partial<T>) => {
      Object.keys(guardSet).forEach((name) => {
        if (!!guardSet[name]) {
          guardNames.add(name);
        }
      });
    };

    addGuardSet(guards);
    groups.forEach((group) => addGuardSet(group.guards));

    guardNames.forEach((name) => {
      if (!availableGuardNames.includes(name)) {
        throw new UnregisteredCandyGuardError(name);
      }
    });
  }
}

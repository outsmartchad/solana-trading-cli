import * as beet from '@metaplex-foundation/beet';
import { CandyMachineConfigLineSettings, CandyMachineItem } from '..';
import { deserializeFeatureFlags } from '@/types';
import { removeEmptyChars } from '@/utils';

/** @internal */
export type CandyMachineHiddenSection = {
  itemsLoaded: number;
  items: CandyMachineItem[];
  itemsLoadedMap: boolean[];
  itemsLeftToMint: number[];
};

/** @internal */
export const deserializeCandyMachineHiddenSection = (
  buffer: Buffer,
  itemsAvailable: number,
  itemsRemaining: number,
  configLineSettings: CandyMachineConfigLineSettings,
  offset = 0
): CandyMachineHiddenSection => {
  // Items loaded.
  const itemsLoaded = beet.u32.read(buffer, offset);
  offset += 4;

  // Raw config lines.
  const { nameLength } = configLineSettings;
  const { uriLength } = configLineSettings;
  const configLineSize = nameLength + uriLength;
  const configLinesSize = configLineSize * itemsAvailable;
  const rawConfigLines = buffer.slice(offset, offset + configLinesSize);
  offset += configLinesSize;

  // Items loaded map.
  const itemsLoadedBuffer = buffer.slice(offset, offset + itemsAvailable);
  const itemsLoadedMap = deserializeFeatureFlags(
    itemsLoadedBuffer,
    itemsAvailable
  );
  const itemsLoadedMapSize = Math.floor(itemsAvailable / 8) + 1;
  offset += itemsLoadedMapSize;

  // Items left to mint for random order only.
  const itemsLeftToMint = beet
    .uniformFixedSizeArray(beet.u32, itemsAvailable)
    .read(buffer, offset)
    .slice(0, itemsRemaining);

  // Helper function to figure out if an item has been minted.
  const itemsMinted = itemsAvailable - itemsRemaining;
  const isMinted = (index: number): boolean =>
    configLineSettings.isSequential
      ? index < itemsMinted
      : !itemsLeftToMint.includes(index);

  // Parse config lines.
  const items: CandyMachineItem[] = [];
  itemsLoadedMap.forEach((loaded, index) => {
    if (!loaded) return;

    const namePosition = index * configLineSize;
    const uriPosition = namePosition + nameLength;
    const name = rawConfigLines
      .slice(namePosition, namePosition + nameLength)
      .toString('utf8');
    const uri = rawConfigLines
      .slice(uriPosition, uriPosition + uriLength)
      .toString('utf8');

    const prefixName = replaceCandyMachineItemPattern(
      configLineSettings.prefixName,
      index
    );
    const prefixUri = replaceCandyMachineItemPattern(
      configLineSettings.prefixUri,
      index
    );

    items.push({
      index,
      minted: isMinted(index),
      name: prefixName + removeEmptyChars(name),
      uri: prefixUri + removeEmptyChars(uri),
    });
  });

  return {
    itemsLoaded,
    items,
    itemsLoadedMap,
    itemsLeftToMint,
  };
};

/** @internal */
export const replaceCandyMachineItemPattern = (
  value: string,
  index: number
): string => {
  return value.replace('$ID+1$', `${index + 1}`).replace('$ID$', `${index}`);
};

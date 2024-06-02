import type { PublicKey } from '@solana/web3.js';
import {
  CandyMachineData,
  configLineBeet,
} from '@metaplex-foundation/mpl-candy-machine';
import { CONFIG_ARRAY_START, CONFIG_LINE_SIZE } from './constants';
import { CandyMachineV2Item } from './models';
import { removeEmptyChars } from '@/utils';
import { BigNumber, toBigNumber } from '@/types';

export function countCandyMachineV2Items(rawData: Buffer): BigNumber {
  const number = rawData.slice(CONFIG_ARRAY_START, CONFIG_ARRAY_START + 4);
  return toBigNumber(number, 'le');
}

export function parseCandyMachineV2Items(
  rawData: Buffer
): CandyMachineV2Item[] {
  const configLinesStart = CONFIG_ARRAY_START + 4;
  const lines = [];
  const count = countCandyMachineV2Items(rawData).toNumber();
  for (let i = 0; i < count; i++) {
    const [line] = configLineBeet.deserialize(
      rawData,
      configLinesStart + i * CONFIG_LINE_SIZE
    );
    lines.push({
      name: removeEmptyChars(line.name),
      uri: removeEmptyChars(line.uri),
    });
  }
  return lines;
}

export function getCandyMachineV2AccountSizeFromData(data: CandyMachineData) {
  if (data.hiddenSettings != null) {
    return CONFIG_ARRAY_START;
  }
  const itemsAvailable = toBigNumber(data.itemsAvailable).toNumber();
  return Math.ceil(
    CONFIG_ARRAY_START +
      4 +
      itemsAvailable * CONFIG_LINE_SIZE +
      8 +
      2 * (itemsAvailable / 8 + 1)
  );
}

export const getCandyMachineV2UuidFromAddress = (
  candyMachineAddress: PublicKey
): string => {
  return candyMachineAddress.toBase58().slice(0, 6);
};
